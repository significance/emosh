use clap::{Args, Parser, Subcommand};

/// Find relevant emoji from text on the command-line
#[derive(Parser, Debug)]
#[command(
    name = "emosh",
    version,
    about = "Find relevant emoji from text on the command-line",
    long_about = "emosh is a blazing-fast emoji finder. \
                  Run without arguments for interactive mode, \
                  or provide a query for direct search.",
    args_conflicts_with_subcommands = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,

    #[command(flatten)]
    pub emoji_args: EmojiArgs,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Convert LaTeX math notation to Unicode characters
    Latex(LatexArgs),
}

#[derive(Args, Debug)]
pub struct LatexArgs {
    /// LaTeX expression to convert (e.g., "x^2", "H_2O", "\\hat{x}")
    pub expression: Option<String>,

    /// Don't copy result to clipboard
    #[arg(short = 'n', long)]
    pub no_copy: bool,
}

#[derive(Args, Debug)]
pub struct EmojiArgs {
    /// Search query (if provided, runs in CLI mode; otherwise launches interactive TUI)
    pub query: Option<String>,

    /// Don't copy the first result to clipboard (default: copies to clipboard)
    #[arg(short = 'n', long)]
    pub no_copy: bool,

    /// Clean output for treats (no explanation suffix, just the treat)
    #[arg(short, long)]
    pub clean: bool,

    /// Skin tone (0-5): 0=default, 1=light, 2=medium-light, 3=medium, 4=medium-dark, 5=dark
    #[arg(short, long, value_parser = clap::value_parser!(u8).range(0..=5))]
    pub skin_tone: Option<u8>,

    /// Maximum number of results to display
    #[arg(short, long, default_value = "7")]
    pub limit: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_with_query() {
        let cli = Cli::parse_from(["emosh", "unicorn"]);
        assert!(cli.command.is_none());
        assert_eq!(cli.emoji_args.query, Some("unicorn".to_string()));
        assert!(!cli.emoji_args.no_copy);
        assert_eq!(cli.emoji_args.skin_tone, None);
        assert_eq!(cli.emoji_args.limit, 7);
    }

    #[test]
    fn test_cli_with_flags() {
        let cli = Cli::parse_from([
            "emosh",
            "unicorn",
            "--no-copy",
            "--skin-tone",
            "3",
            "--limit",
            "10",
        ]);
        assert!(cli.command.is_none());
        assert_eq!(cli.emoji_args.query, Some("unicorn".to_string()));
        assert!(cli.emoji_args.no_copy);
        assert_eq!(cli.emoji_args.skin_tone, Some(3));
        assert_eq!(cli.emoji_args.limit, 10);
    }

    #[test]
    fn test_cli_without_query() {
        let cli = Cli::parse_from(["emosh"]);
        assert!(cli.command.is_none());
        assert_eq!(cli.emoji_args.query, None);
    }

    #[test]
    fn test_cli_latex_subcommand() {
        let cli = Cli::parse_from(["emosh", "latex", "x^2"]);
        match cli.command {
            Some(Commands::Latex(args)) => {
                assert_eq!(args.expression, Some("x^2".to_string()));
                assert!(!args.no_copy);
            }
            _ => panic!("expected Latex subcommand"),
        }
    }

    #[test]
    fn test_cli_latex_no_expression() {
        let cli = Cli::parse_from(["emosh", "latex"]);
        match cli.command {
            Some(Commands::Latex(args)) => {
                assert!(args.expression.is_none());
            }
            _ => panic!("expected Latex subcommand"),
        }
    }

    #[test]
    fn test_cli_latex_with_no_copy() {
        let cli = Cli::parse_from(["emosh", "latex", "H_2O", "--no-copy"]);
        match cli.command {
            Some(Commands::Latex(args)) => {
                assert_eq!(args.expression, Some("H_2O".to_string()));
                assert!(args.no_copy);
            }
            _ => panic!("expected Latex subcommand"),
        }
    }
}
