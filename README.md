# emosh

> Find relevant emoji from text on the command-line

A blazing-fast, Rust-powered CLI tool for finding and copying emoji. Enhanced with fuzzy search for better results.

## Features

- **Hybrid Search**: Combines exact keyword matching with fuzzy search for typo tolerance
- **Interactive TUI**: Real-time search with keyboard navigation
- **CLI Mode**: Quick direct search and copy
- **Skin Tone Support**: Adjustable skin tones (0-5) with persistence
- **Fast**: Sub-5ms search latency, <50ms startup time
- **Cross-platform**: Linux, macOS (Intel & Apple Silicon), Windows

## Quickstart

```bash
# Install from source (requires Rust)
cargo install --git https://github.com/yourusername/emosh.git

# Search and copy first result (default behavior)
emosh rocket
# 🚀 (copied to clipboard)

# Search without copying to clipboard
emosh fire --no-copy
# 🔥

# Interactive mode - launches TUI for real-time search
emosh
```

**Try these searches:**
- `emosh lol` - laughing emojis
- `emosh +1` - thumbs up
- `emosh heart` - love emojis
- `emosh tada` - celebration

See [Usage](#usage) below for full details.

## Installation

### Quick Install (Recommended)

**One-line installer** (Linux/macOS):
```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/emosh/master/install.sh | bash
```

This automatically detects your platform and installs the latest release to `~/.local/bin`.

### Package Managers

**Cargo** (Rust package manager):
```bash
cargo install emosh
```

**Homebrew** (macOS/Linux):
```bash
# Coming soon
brew install emosh
```

### Manual Installation

Download the latest binary for your platform from the [releases page](https://github.com/yourusername/emosh/releases):

**Linux:**
```bash
wget https://github.com/yourusername/emosh/releases/latest/download/emosh-linux-x86_64.tar.gz
tar -xzf emosh-linux-x86_64.tar.gz
sudo mv emosh /usr/local/bin/
```

**macOS:**
```bash
# Intel
curl -L https://github.com/yourusername/emosh/releases/latest/download/emosh-macos-x86_64.tar.gz | tar -xz
sudo mv emosh /usr/local/bin/

# Apple Silicon
curl -L https://github.com/yourusername/emosh/releases/latest/download/emosh-macos-aarch64.tar.gz | tar -xz
sudo mv emosh /usr/local/bin/
```

**Windows:**
Download `emosh-windows-x86_64.zip` from releases and extract to a directory in your PATH.

### From Source

Requires [Rust](https://rustup.rs/) 1.70+:

```bash
git clone https://github.com/yourusername/emosh.git
cd emosh
cargo install --path .
```

## Usage

### Interactive Mode

Launch the TUI by running without arguments:

```bash
emosh
```

**Keyboard Controls:**
- Type to search
- `↑`/`↓`: Adjust skin tone
- `←`/`→`: Navigate results
- `1-9`: Quick select emoji by number
- `Enter`: Copy selected emoji and exit
- `Tab`: Copy selected emoji and continue
- `Esc`: Exit without copying

### CLI Mode

Search directly from the command line:

```bash
# Search for emoji
emosh unicorn
# Output:
# 1. 🌈  rainbow
# 2. 🦄  unicorn

# Copy first result to clipboard
emosh unicorn --copy

# Set skin tone
emosh wave --skin-tone 3

# Limit results
emosh smile --limit 5
```

### Flags

- `-c, --copy`: Copy first result to clipboard
- `-s, --skin-tone <0-5>`: Set skin tone (0=default, 1=light, 2=medium-light, 3=medium, 4=medium-dark, 5=dark)
- `-l, --limit <N>`: Maximum number of results (default: 7)
- `-h, --help`: Show help
- `-V, --version`: Show version

## Search Algorithm

emosh uses a hybrid search algorithm:

1. **Exact keyword match** (score: 100): Direct matches get highest priority
2. **Fuzzy match on name** (score: varies): Handles typos in emoji names
3. **Fuzzy match on keywords** (score: 70% of fuzzy): Matches against all keywords

This gives you the best of both worlds: exact matches when you know what you want, and fuzzy matching when you don't.

**Examples:**
- `unicorn` → 🦄 (exact keyword match)
- `unic` → 🦄 (fuzzy match on name)
- `maigc` → 🦄 (fuzzy match tolerates typo in "magic" keyword)

## Configuration

Skin tone preferences are saved automatically to:
- **Linux**: `~/.config/emosh/config.toml`
- **macOS**: `~/Library/Application Support/com.emosh.emosh/config.toml`
- **Windows**: `%APPDATA%\emosh\config\config.toml`

## Performance

Performance targets (achieved on M1 MacBook Pro):
- Startup time: <50ms ✓
- Search latency: <5ms ✓
- Binary size: <5MB ✓
- Memory usage: <10MB ✓

## Building from Source

### Prerequisites

- Rust 1.70 or later
- Cargo (comes with Rust)

### Build

```bash
git clone https://github.com/yourusername/emosh.git
cd emosh
cargo build --release
```

The binary will be at `target/release/emosh`.

### Run Tests

```bash
cargo test
```

### Run Benchmarks

```bash
cargo bench
```

## Development

See [CLAUDE.md](CLAUDE.md) for code style guidelines and [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions.

### Project Structure

```
emosh/
├── src/
│   ├── main.rs          # Entry point
│   ├── cli.rs           # CLI argument parsing
│   ├── config.rs        # User config management
│   ├── clipboard.rs     # Clipboard operations
│   ├── emoji/           # Emoji data and search
│   │   ├── data.rs      # Data loading
│   │   ├── search.rs    # Search algorithm
│   │   └── mod.rs
│   └── ui/              # TUI components
│       ├── app.rs       # Application state
│       ├── input.rs     # Keyboard handling
│       ├── render.rs    # UI rendering
│       └── mod.rs
├── emojis.toml          # Emoji database (1898 emoji)
└── Cargo.toml           # Dependencies
```

## Comparison with Original emoj

| Feature | emoj (TypeScript) | emosh (Rust) |
|---------|-------------------|--------------|
| Search algorithm | Regex-based | Hybrid (exact + fuzzy) |
| Startup time | ~200ms | <50ms |
| Search latency | ~20ms | <5ms |
| Binary size | N/A (Node.js) | ~4MB |
| TUI framework | React/Ink | ratatui |
| Fuzzy search | No | Yes |
| Skin tone support | Yes | Yes |
| Clipboard | Yes | Yes |
| Cross-platform | Yes | Yes |

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `cargo fmt` and `cargo clippy`
5. Submit a pull request

## License

MIT

## Credits

- Original [emoj](https://github.com/sindresorhus/emoj) by Sindre Sorhus
- Emoji data from [emojilib](https://github.com/muan/emojilib)
- Built with [ratatui](https://github.com/ratatui-org/ratatui) for the TUI

## Related

- [emoj](https://github.com/sindresorhus/emoj) - Original TypeScript version
- [emoji-cli](https://github.com/b4b4r07/emoji-cli) - Another emoji CLI tool
