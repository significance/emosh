# Emosh Architecture

## Design Philosophy

**Emosh** is designed with the following principles:

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Performance First**: Optimized for fast startup and search (<50ms startup, <5ms search)
3. **Maintainability**: Clean architecture that's easy to understand and modify
4. **Testability**: Every component can be tested in isolation
5. **Cross-platform**: Works identically on Linux, macOS, and Windows

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                       main.rs (Entry)                       │
│  • Parse CLI arguments                                      │
│  • Initialize emoji database                                │
│  • Route to CLI or TUI mode                                 │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │
        CLI Mode                    TUI Mode
               │                         │
               ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   cli.rs (CLI Handler)   │  │   ui/* (TUI Components)      │
│  • Parse arguments       │  │  • app.rs: State management  │
│  • Execute search        │  │  • input.rs: Keyboard events │
│  • Print results         │  │  • render.rs: UI rendering   │
│  • Copy to clipboard     │  └──────────┬───────────────────┘
└───────────┬──────────────┘             │
            │                            │
            └────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              emoji/search.rs (Search Engine)                │
│  • Hybrid search: exact + fuzzy matching                    │
│  • Score-based ranking                                      │
│  • Result limiting                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              emoji/data.rs (Data Layer)                     │
│  • Emoji struct definition                                  │
│  • Load from emojis.toml                                    │
│  • Skin tone modifiers                                      │
│  • Lazy static database                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     emojis.toml (Data)                      │
│  • ~2000 emoji entries                                      │
│  • Keywords, tags, Unicode metadata                         │
└─────────────────────────────────────────────────────────────┘

Supporting Modules:
┌──────────────────────┐  ┌──────────────────────────────────┐
│  config.rs           │  │  clipboard.rs                    │
│  • User preferences  │  │  • Cross-platform clipboard      │
│  • Skin tone storage │  │  • Error handling                │
└──────────────────────┘  └──────────────────────────────────┘
```

## Module Breakdown

### 1. main.rs - Application Entry Point

**Responsibility**: Coordinate the application lifecycle

**Key Functions**:
```rust
fn main() -> Result<()> {
    let cli = Cli::parse();
    let emojis = load_emojis()?;

    if cli.query.is_some() {
        run_cli_mode(cli, emojis)?;
    } else {
        run_tui_mode(cli, emojis)?;
    }

    Ok(())
}
```

**Design Decisions**:
- Single entry point for both modes
- Loads emoji database once at startup
- Routes based on presence of query argument
- Uses `anyhow::Result` for error propagation

### 2. cli.rs - Command Line Interface

**Responsibility**: Define and parse CLI arguments

**Key Structures**:
```rust
#[derive(Parser)]
struct Cli {
    /// Search query (if provided, runs in CLI mode)
    query: Option<String>,

    /// Copy first result to clipboard
    #[arg(short, long)]
    copy: bool,

    /// Skin tone (0-5)
    #[arg(short, long)]
    skin_tone: Option<u8>,

    /// Maximum results to display
    #[arg(short, long, default_value = "7")]
    limit: usize,
}
```

**Design Decisions**:
- Uses `clap` derive macros for type-safe parsing
- Query as optional positional argument determines mode
- Flags mirror original emoj functionality
- Validation handled by clap (e.g., skin_tone range)

### 3. emoji/data.rs - Data Management

**Responsibility**: Define emoji data structures and loading logic

**Key Structures**:
```rust
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Emoji {
    pub char: String,
    pub name: String,
    pub keywords: Vec<String>,
    pub tags: Vec<String>,
    pub unicode: String,
    pub supports_skin_tone: bool,
}

static EMOJI_DATABASE: Lazy<Vec<Emoji>> = Lazy::new(|| {
    load_emojis_from_file().expect("Failed to load emoji database")
});
```

**Design Decisions**:
- **Lazy static initialization**: Database loaded once, shared globally
- **TOML over JSON**: Human-readable, easier to edit, Rust-native
- **Serde for deserialization**: Type-safe parsing with derive macros
- **Skin tone support flag**: Prevents invalid modifier application

**Why Lazy Static?**
- Startup time optimization: Load only when first accessed
- Memory efficiency: Single shared instance
- Thread-safe: `Lazy` provides interior mutability

### 4. emoji/search.rs - Search Algorithm

**Responsibility**: Find and rank emojis based on query

**Algorithm Design**:
```rust
pub fn search(query: &str, emojis: &[Emoji], limit: usize) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase().trim();
    let matcher = SkimMatcherV2::default();

    let mut results: Vec<_> = emojis
        .iter()
        .filter_map(|emoji| {
            let mut score = 0i64;

            // 1. Exact keyword match (priority: 100)
            if emoji.keywords.iter().any(|k| k == query_lower) {
                score = 100;
            }

            // 2. Fuzzy match on name
            if let Some(fuzzy_score) = matcher.fuzzy_match(&emoji.name, query_lower) {
                score = score.max(fuzzy_score);
            }

            // 3. Fuzzy match on keywords
            for keyword in &emoji.keywords {
                if let Some(fuzzy_score) = matcher.fuzzy_match(keyword, query_lower) {
                    score = score.max(fuzzy_score * 7 / 10);
                }
            }

            if score > 30 {
                Some(SearchResult { emoji, score })
            } else {
                None
            }
        })
        .collect();

    results.sort_by_key(|r| -r.score);
    results.truncate(limit);
    results
}
```

**Design Decisions**:
- **Hybrid approach**: Combines exact and fuzzy matching
- **Tiered scoring**: Exact > Name fuzzy > Keyword fuzzy
- **Score threshold (30)**: Filters out low-quality matches
- **Keyword penalty (70%)**: Fuzzy keyword matches score lower than name matches
- **Uses SkimMatcherV2**: Fast, production-tested fuzzy algorithm

**Why This Algorithm?**
- Better UX than pure fuzzy: "unicorn" → exact match on keyword beats "corn" fuzzy match
- Better than original: Original used regex, we use fuzzy for typo tolerance
- Performance: O(n) iteration with early filtering, sub-5ms target

### 5. ui/app.rs - TUI State Management

**Responsibility**: Manage application state for interactive mode

**Key Structures**:
```rust
pub struct App {
    query: String,
    results: Vec<SearchResult>,
    selected_index: usize,
    skin_tone: u8,
    should_quit: bool,
    copy_feedback: Option<Instant>,
}

impl App {
    pub fn new(config: &Config) -> Self {
        Self {
            query: String::new(),
            results: Vec::new(),
            selected_index: 0,
            skin_tone: config.skin_tone,
            should_quit: false,
            copy_feedback: None,
        }
    }

    pub fn update_query(&mut self, query: String, emojis: &[Emoji]) {
        self.query = query;
        self.results = search(&self.query, emojis, 7);
        self.selected_index = 0; // Reset selection
    }
}
```

**Design Decisions**:
- **Immutable state updates**: Methods take `&mut self` but use clear update semantics
- **Cached results**: Store search results to avoid recomputation on render
- **Copy feedback timing**: Track when copy occurred for visual indicator
- **Separation from UI**: App state is UI-framework agnostic

### 6. ui/input.rs - Keyboard Event Handler

**Responsibility**: Process keyboard events and update app state

**Key Function**:
```rust
pub fn handle_key_event(app: &mut App, key: KeyEvent, emojis: &[Emoji]) -> Result<()> {
    match key.code {
        KeyCode::Char(c) => {
            app.query.push(c);
            app.update_query(app.query.clone(), emojis);
        }
        KeyCode::Backspace => {
            app.query.pop();
            app.update_query(app.query.clone(), emojis);
        }
        KeyCode::Up => {
            app.skin_tone = app.skin_tone.saturating_sub(1).min(5);
        }
        KeyCode::Down => {
            app.skin_tone = (app.skin_tone + 1).min(5);
        }
        KeyCode::Left => {
            app.selected_index = app.selected_index.saturating_sub(1);
        }
        KeyCode::Right => {
            if app.selected_index < app.results.len() - 1 {
                app.selected_index += 1;
            }
        }
        KeyCode::Enter => {
            if let Some(result) = app.results.get(app.selected_index) {
                copy_with_skin_tone(result.emoji, app.skin_tone)?;
                app.should_quit = true;
            }
        }
        KeyCode::Tab => {
            if let Some(result) = app.results.get(app.selected_index) {
                copy_with_skin_tone(result.emoji, app.skin_tone)?;
                app.copy_feedback = Some(Instant::now());
            }
        }
        KeyCode::Esc => {
            app.should_quit = true;
        }
        _ => {}
    }
    Ok(())
}
```

**Design Decisions**:
- **Saturating arithmetic**: Prevents index underflow/overflow
- **Immediate search**: No debouncing in handler (handled in render loop)
- **Clear key mappings**: Each key has single, predictable behavior
- **Result passing**: Uses `Result<()>` for clipboard errors

### 7. ui/render.rs - TUI Rendering

**Responsibility**: Draw the terminal user interface

**Key Function**:
```rust
pub fn render(frame: &mut Frame, app: &App) {
    let layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Query input
            Constraint::Min(0),    // Results
            Constraint::Length(1), // Status bar
        ])
        .split(frame.size());

    // Render query input
    let input = Paragraph::new(app.query.as_str())
        .style(Style::default().fg(Color::Cyan))
        .block(Block::default().borders(Borders::ALL).title("Query"));
    frame.render_widget(input, layout[0]);

    // Render results
    let items: Vec<ListItem> = app.results
        .iter()
        .enumerate()
        .map(|(i, result)| {
            let style = if i == app.selected_index {
                Style::default().bg(Color::Gray)
            } else {
                Style::default()
            };
            ListItem::new(format!("{} {}", result.emoji.char, result.emoji.name))
                .style(style)
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Results"));
    frame.render_widget(list, layout[1]);

    // Render status bar
    let status = if let Some(instant) = app.copy_feedback {
        if instant.elapsed() < Duration::from_secs(2) {
            "✓ Copied!"
        } else {
            ""
        }
    } else {
        ""
    };
    let status_bar = Paragraph::new(status);
    frame.render_widget(status_bar, layout[2]);
}
```

**Design Decisions**:
- **Immediate mode**: Redraw entire UI every frame (ratatui pattern)
- **Layout constraints**: Responsive layout adapts to terminal size
- **Highlight selection**: Gray background for selected emoji
- **Timed feedback**: Copy indicator auto-hides after 2 seconds
- **Minimal styling**: Simple, functional design

### 8. config.rs - Configuration Persistence

**Responsibility**: Load and save user preferences

**Key Structures**:
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub skin_tone: u8,
}

impl Default for Config {
    fn default() -> Self {
        Self { skin_tone: 0 }
    }
}

pub fn load_config() -> Result<Config> {
    let config_dir = directories::ProjectDirs::from("com", "emosh", "emosh")
        .context("Failed to determine config directory")?;

    let config_path = config_dir.config_dir().join("config.toml");

    if config_path.exists() {
        let content = fs::read_to_string(&config_path)?;
        Ok(toml::from_str(&content)?)
    } else {
        Ok(Config::default())
    }
}

pub fn save_config(config: &Config) -> Result<()> {
    let config_dir = directories::ProjectDirs::from("com", "emosh", "emosh")
        .context("Failed to determine config directory")?;

    fs::create_dir_all(config_dir.config_dir())?;
    let config_path = config_dir.config_dir().join("config.toml");

    let content = toml::to_string_pretty(config)?;
    fs::write(&config_path, content)?;

    Ok(())
}
```

**Design Decisions**:
- **Platform-specific directories**: Uses `directories` crate for correct paths
  - Linux: `~/.config/emosh/config.toml`
  - macOS: `~/Library/Application Support/com.emosh.emosh/config.toml`
  - Windows: `%APPDATA%\emosh\config\config.toml`
- **TOML format**: Consistent with emoji database
- **Graceful degradation**: Missing config returns defaults
- **Minimal config**: Only essential preferences (skin tone)

### 9. clipboard.rs - Clipboard Operations

**Responsibility**: Copy emoji to system clipboard

**Key Function**:
```rust
use arboard::Clipboard;

pub fn copy_to_clipboard(text: &str) -> Result<()> {
    let mut clipboard = Clipboard::new()
        .context("Failed to access clipboard")?;

    clipboard.set_text(text)
        .context("Failed to copy to clipboard")?;

    Ok(())
}

pub fn copy_with_skin_tone(emoji: &Emoji, skin_tone: u8) -> Result<()> {
    let text = if emoji.supports_skin_tone && skin_tone > 0 {
        apply_skin_tone(&emoji.char, skin_tone)
    } else {
        emoji.char.clone()
    };

    copy_to_clipboard(&text)
}

fn apply_skin_tone(emoji: &str, tone: u8) -> String {
    let modifier = match tone {
        1 => "\u{1F3FB}", // Light
        2 => "\u{1F3FC}", // Medium-light
        3 => "\u{1F3FD}", // Medium
        4 => "\u{1F3FE}", // Medium-dark
        5 => "\u{1F3FF}", // Dark
        _ => return emoji.to_string(),
    };
    format!("{}{}", emoji, modifier)
}
```

**Design Decisions**:
- **Arboard**: Cross-platform, actively maintained, simple API
- **Error context**: Provide helpful error messages for debugging
- **Skin tone modifiers**: Unicode-compliant application
- **Validation**: Only apply modifiers to compatible emoji

## Data Flow

### CLI Mode Flow
```
User Input → CLI Parser → Search Engine → Results → Print to stdout
                ↓                                        ↓
           Config Loader                         Clipboard (if --copy)
```

### TUI Mode Flow
```
User Input → Event Handler → App State Update → Render Loop
     ↑            ↓               ↓                  ↓
     └────── Keyboard Events  Search Engine    Terminal Display
                                   ↓
                            Config Save (on exit)
```

## Performance Optimization Strategies

### 1. Lazy Loading
- Emoji database loaded only once on first access
- Reduces startup time if running in help mode

### 2. Efficient Search
- Early filtering with score threshold
- No regex compilation overhead (unlike original)
- Fuzzy matching optimized with SkimMatcherV2

### 3. Minimal Allocations
- Reuse query strings where possible
- Results vector pre-allocated with capacity
- Avoid cloning emojis (use references)

### 4. Binary Size Optimization
```toml
[profile.release]
opt-level = "z"          # Optimize for size
lto = true               # Link-time optimization
codegen-units = 1        # Single codegen unit for better optimization
strip = true             # Strip symbols
panic = "abort"          # Smaller panic handler
```

## Testing Strategy

### Unit Tests
- Test each module in isolation
- Mock dependencies where needed
- Focus on edge cases and error paths

### Integration Tests
- Test full CLI workflows
- Test TUI state transitions
- Test search algorithm end-to-end

### Benchmarks
- Search performance across various query patterns
- Startup time measurement
- Memory usage profiling

## Future Enhancement Ideas

### Potential Improvements
1. **Custom emoji sets**: Allow users to add personal emoji databases
2. **Recent/favorites**: Track and prioritize frequently used emoji
3. **Multi-query**: Support AND/OR logic in searches
4. **Color themes**: Customizable TUI colors
5. **Plugin system**: External data sources for emoji
6. **Web interface**: Optional web UI for searching

### Technical Debt to Avoid
- Don't over-engineer configuration (YAGNI principle)
- Don't add database persistence unless needed for performance
- Keep the TUI simple - avoid complex animations
- Resist feature creep - stay focused on core use case

## Conclusion

This architecture prioritizes:
- **Simplicity**: Each module does one thing well
- **Performance**: Optimized for fast startup and search
- **Maintainability**: Clear boundaries make changes easy
- **Testability**: Isolated components enable comprehensive testing
- **Cross-platform**: Works identically everywhere

The hybrid search algorithm is the key innovation over the original emoj, providing fuzzy matching for typo tolerance while prioritizing exact keyword matches for relevance.
