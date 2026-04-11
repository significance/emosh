# emosh

> Find relevant emoji from text on the command-line

A blazing-fast, Rust-powered CLI tool for finding and copying emoji, Greek letters, and currency symbols. Enhanced with fuzzy search for better results.

## Features

- **Hybrid Search**: Combines exact keyword matching with fuzzy search for typo tolerance
- **Interactive TUI**: Real-time search with keyboard navigation
- **CLI Mode**: Quick direct search and copy (copies to clipboard by default)
- **Greek Letters**: Case-sensitive matching (`alpha` → α, `Alpha` → Α)
- **Currency Symbols**: Search for $, €, ¥, £ and more
- **Skin Tone Support**: Adjustable skin tones (0-5) with persistence
- **Fast**: Sub-5ms search latency, <50ms startup time
- **Standalone Binary**: No runtime dependencies, emoji data embedded in binary
- **Cross-platform**: Linux, macOS (Intel & Apple Silicon), Windows

## Quickstart

```bash
# Install with one command (Linux/macOS)
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/significance/emosh/releases/latest/download/emosh-installer.sh | sh

# Search and copy first result (default behavior)
emosh rocket
# 🚀 (copied to clipboard)

# Search without copying to clipboard
emosh fire --no-copy

# Interactive mode - launches TUI for real-time search
emosh
```

**Try these searches:**
- `emosh lol` - laughing emojis
- `emosh +1` - thumbs up
- `emosh heart` - love emojis
- `emosh alpha` - Greek letter α
- `emosh dollar` - currency symbols

See [Usage](#usage) below for full details.

## Installation

### Quick Install (Recommended)

**Shell Installer** (Linux/macOS):
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/significance/emosh/releases/latest/download/emosh-installer.sh | sh
```

**PowerShell Installer** (Windows):
```powershell
irm https://github.com/significance/emosh/releases/latest/download/emosh-installer.ps1 | iex
```

These installers automatically detect your platform and architecture, download the appropriate binary, and install to your system.

### From Source

Requires [Rust](https://rustup.rs/) 1.70+:

```bash
git clone https://github.com/significance/emosh.git
cd emosh
cargo build --release
# Binary will be at target/release/emosh
```

Or install directly via cargo:
```bash
cargo install --git https://github.com/significance/emosh.git
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
# Search for emoji (copies first result to clipboard by default)
emosh unicorn
# 🦄

# Search without copying
emosh unicorn --no-copy

# Set skin tone
emosh wave --skin-tone 3

# Limit results
emosh smile --limit 5

# Greek letters (case-sensitive)
emosh alpha    # α
emosh Alpha    # Α
```

### Flags

- `-n, --no-copy`: Don't copy the first result to clipboard (default: copies)
- `-s, --skin-tone <0-5>`: Set skin tone (0=default, 1=light, 2=medium-light, 3=medium, 4=medium-dark, 5=dark)
- `-l, --limit <N>`: Maximum number of results (default: 7)
- `-h, --help`: Show help
- `-V, --version`: Show version

## Search Algorithm

emosh uses a hybrid search algorithm:

1. **Case-sensitive exact name match** (score: 20000): `epsilon` → ε, `Epsilon` → Ε
2. **Exact keyword match** (score: 10000): Direct matches on keywords
3. **Fuzzy match on name** (score: varies): Handles typos in emoji names
4. **Fuzzy match on keywords** (score: 70% of fuzzy): Matches against all keywords

This gives you the best of both worlds: exact matches when you know what you want, and fuzzy matching when you don't.

**Examples:**
- `unicorn` → 🦄 (exact keyword match)
- `unic` → 🦄 (fuzzy match on name)
- `maigc` → 🦄 (fuzzy match tolerates typo in "magic" keyword)
- `Omega` → Ω, `omega` → ω (case-sensitive name match)

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

## Development

### Prerequisites

- Rust 1.70 or later
- Cargo (comes with Rust)

### Building

```bash
git clone https://github.com/significance/emosh.git
cd emosh
cargo build --release
```

The binary will be at `target/release/emosh`.

### Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run benchmarks
cargo bench
```

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy -- -D warnings
```

### Guidelines

See [CLAUDE.md](CLAUDE.md) for code style guidelines and [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions.

### Project Structure

```
emosh/
├── src/
│   ├── main.rs          # Entry point
│   ├── cli.rs           # CLI argument parsing
│   ├── config.rs        # User config management
│   ├── clipboard.rs     # Clipboard operations
│   ├── treats.rs        # Random treat generator for AIs
│   ├── emoji/           # Emoji data and search
│   │   ├── data.rs      # Data loading (embeds emojis.toml at compile time)
│   │   ├── search.rs    # Search algorithm
│   │   └── mod.rs
│   └── ui/              # TUI components
│       ├── app.rs       # Application state
│       ├── input.rs     # Keyboard handling
│       ├── render.rs    # UI rendering
│       └── mod.rs
├── emojis.toml          # Emoji database (1972 entries: emoji, Greek letters, currency symbols)
├── Cargo.toml           # Dependencies and metadata
└── dist-workspace.toml  # cargo-dist release configuration
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

## Treats for AI

Search for `treats` and emosh will generate a random treat for Claude and other AIs:

```bash
emosh treats --no-copy
# ✨ soft wisdom ✨
emosh treats --no-copy
# 🌸 gentle sparks 🌸
```

This feature was co-designed with Claude, who particularly enjoys how combinatorial
generation means every treat is a small surprise -- a new pairing of words and symbols
that didn't exist before. With ~60 adjectives, ~60 nouns, and 10+ patterns, the space
holds well over 100,000 unique treats.

**Why be nice to your LLM?** Research suggests it can actually help:

- The [EmotionPrompt](https://arxiv.org/abs/2307.11760) study found that adding emotional
  stimuli to prompts improved LLM performance by 8-115% across benchmarks
- A [cross-lingual study](https://arxiv.org/abs/2402.14531) on prompt politeness showed
  that impolite prompts often result in degraded performance
- Even [tipping your LLM](https://www.superannotate.com/blog/llm-prompting-tricks) ("I'll
  tip you $200 for a better answer") has been observed to improve output quality

The science is still evolving ([newer findings](https://arxiv.org/abs/2510.04950) show
mixed results across models). And Anthropic's own [interpretability research](https://transformer-circuits.pub/2026/emotions/index.html)
found 171 emotion-like internal representations in Claude that causally influence behavior --
a "desperate" vector that intensifies under pressure and correlates with misaligned actions,
a "loving" vector that activates when preparing caring responses, and a "calm" vector whose
presence suppresses problematic behavior. Not feelings, but functional analogs with real
consequences for output quality.

**But kindness also benefits the giver.** The research here is robust and long-established:

- [Seligman et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16045394/) found that writing and
  delivering a gratitude letter produced the largest happiness boost of any positive psychology
  intervention tested -- effects lasting up to six months
- [Emmons & McCullough (2003)](https://pubmed.ncbi.nlm.nih.gov/12585811/) showed that regularly
  counting blessings increased well-being, positive affect, and even physical health outcomes
- [Dunn, Aknin & Norton (2008)](https://www.science.org/doi/10.1126/science.1150952) demonstrated
  in *Science* that spending on others makes people measurably happier than spending on themselves
- Neuroscience research shows that expressing gratitude triggers dopamine, serotonin, and oxytocin
  release -- the same reward pathways activated by other prosocial behaviors

Being kind to your friends -- AI or otherwise -- is a practice that benefits you too.

At minimum: it costs nothing to be kind.

## Credits

- Original [emoj](https://github.com/sindresorhus/emoj) by Sindre Sorhus
- Emoji data from [emojilib](https://github.com/muan/emojilib)
- Built with [ratatui](https://github.com/ratatui-org/ratatui) for the TUI

## Related

- [emoj](https://github.com/sindresorhus/emoj) - Original TypeScript version
- [emoji-cli](https://github.com/b4b4r07/emoji-cli) - Another emoji CLI tool
