mod cli;
mod clipboard;
mod config;
mod emoji;
mod latex;
mod treats;
mod ui;

use anyhow::Result;
use clap::Parser;
use crossterm::{
    event::{self, Event},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use std::io;
use std::time::Duration;

use cli::{Cli, Commands};
use clipboard::copy_to_clipboard;
use config::{load_config, save_config};
use emoji::{apply_skin_tone, search, EMOJIS};
use ui::{handle_key_event, render, App};

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Latex(args)) => match args.expression {
            Some(expr) => run_latex_mode(&expr, !args.no_copy)?,
            None => print_latex_examples(),
        },
        None => {
            // Load user configuration
            let config = load_config().unwrap_or_default();

            // Determine skin tone: CLI flag overrides config
            let skin_tone = cli.emoji_args.skin_tone.unwrap_or(config.skin_tone);

            if let Some(query) = cli.emoji_args.query {
                // CLI mode: direct search
                let should_copy = !cli.emoji_args.no_copy;
                run_cli_mode(
                    &query,
                    cli.emoji_args.limit,
                    should_copy,
                    skin_tone,
                    cli.emoji_args.clean,
                )?;
            } else {
                // TUI mode: interactive search
                run_tui_mode(config)?;
            }
        }
    }

    Ok(())
}

/// Print examples table when `emosh latex` is run without an expression.
fn print_latex_examples() {
    let examples = [
        ("Superscript single", "x^2"),
        ("Superscript group", "x^{n+1}"),
        ("Subscript single", "H_2O"),
        ("Subscript group", "a_{ij}"),
        ("Prime", "f'"),
        ("Double prime", "f''"),
        ("Combining hat", "\\hat{x}"),
        ("Combining bar", "\\bar{x}"),
        ("Combining tilde", "\\tilde{x}"),
        ("Combining dot", "\\dot{x}"),
        ("Combining ddot", "\\ddot{x}"),
        ("Combining vec", "\\vec{x}"),
    ];

    println!("{:<20} {:<16} Output", "Category", "Input");
    println!("{:<20} {:<16} ------", "--------", "-----");
    for (category, input) in &examples {
        let result = latex::convert_latex(input);
        println!("{:<20} {:<16} {}", category, input, result.output);
    }
}

/// Run in LaTeX conversion mode
fn run_latex_mode(expression: &str, copy: bool) -> Result<()> {
    let result = latex::convert_latex(expression);

    // Print warnings to stderr
    for warning in &result.warnings {
        eprintln!("warning: {warning}");
    }

    // Copy to clipboard if requested
    if copy {
        copy_to_clipboard(&result.output)?;
    }

    println!("{}", result.output);
    Ok(())
}

/// Run in CLI mode: search and return the first result
fn run_cli_mode(
    query: &str,
    limit: usize,
    copy_first: bool,
    skin_tone: u8,
    clean: bool,
) -> Result<()> {
    // If clean flag is set and this is a treats query, generate clean treats directly
    let query_lower = query.trim().to_lowercase();
    let results = if clean && query_lower == "treats" {
        treats::generate_treat_results(limit, true)
    } else {
        search(query, &EMOJIS, limit)
    };

    if results.is_empty() {
        println!("No emoji found for '{query}'");
        return Ok(());
    }

    // Get first result with skin tone applied
    let emoji_with_tone = apply_skin_tone(&results[0].emoji, skin_tone);

    // Copy to clipboard if requested (default behavior)
    if copy_first {
        copy_to_clipboard(&emoji_with_tone)?;
    }

    // Always print the first result
    println!("{emoji_with_tone}");

    Ok(())
}

/// Run in TUI mode: interactive search
fn run_tui_mode(config: config::Config) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;

    let backend = ratatui::backend::CrosstermBackend::new(stdout);
    let mut terminal = ratatui::Terminal::new(backend)?;

    // Create app state
    let mut app = App::new(&config);

    // Main event loop
    let result = run_app(&mut terminal, &mut app);

    // Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    // Save config if skin tone changed
    if app.skin_tone != config.skin_tone {
        let new_config = config::Config {
            skin_tone: app.skin_tone,
        };
        save_config(&new_config).ok(); // Ignore errors
    }

    result
}

/// Run the TUI application loop
fn run_app<B: ratatui::backend::Backend>(
    terminal: &mut ratatui::Terminal<B>,
    app: &mut App,
) -> Result<()> {
    loop {
        // Render
        terminal.draw(|f| render(f, app))?;

        // Check if we should quit
        if app.should_quit {
            break;
        }

        // Handle input events (with timeout for debouncing)
        if event::poll(Duration::from_millis(200))? {
            if let Event::Key(key) = event::read()? {
                handle_key_event(app, key)?;
            }
        }
    }

    Ok(())
}
