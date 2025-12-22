# Emosh: Rust Rewrite of Emoj

## Overview
Rewrite the emoj TypeScript CLI tool in Rust with enhanced performance, fuzzy search, and cross-platform binary releases.

## Requirements Summary
- Modern, well-tested, well-organized Rust code with separation of concerns
- TOML-based emoji database with keywords and tags
- Fuzzy search + exact match combo for best relevance
- Full interactive TUI mode like original
- Cross-platform builds (Linux, macOS, Windows) via GitHub Actions
- Blazing fast performance

## Project Structure

```
emosh/
├── Cargo.toml                 # Package manifest
├── emojis.toml               # Emoji database (TOML format)
├── src/
│   ├── main.rs               # Entry point, orchestrates CLI/TUI modes
│   ├── cli.rs                # CLI argument parsing (clap)
│   ├── config.rs             # User config (skin tone persistence)
│   ├── emoji/
│   │   ├── mod.rs            # Module exports
│   │   ├── data.rs           # Emoji data structures & loading
│   │   └── search.rs         # Search algorithm (fuzzy + exact)
│   ├── ui/
│   │   ├── mod.rs            # Module exports
│   │   ├── app.rs            # TUI application state
│   │   ├── input.rs          # Keyboard event handling
│   │   └── render.rs         # Terminal rendering logic
│   └── clipboard.rs          # Clipboard operations
├── tests/
│   ├── integration.rs        # Integration tests
│   └── search_tests.rs       # Search algorithm tests
├── benches/
│   └── search_bench.rs       # Performance benchmarks
└── .github/
    └── workflows/
        ├── ci.yml            # PR: test + build
        └── release.yml       # Tag: build + upload binaries
```

## Technology Stack

### Core Dependencies
- **clap** (v4) - CLI argument parsing with derive macros
- **ratatui** - Modern TUI framework (fork of tui-rs)
- **crossterm** - Cross-platform terminal manipulation
- **fuzzy-matcher** - Fast fuzzy search algorithm
- **arboard** - Cross-platform clipboard access
- **serde** + **toml** - TOML serialization/deserialization
- **directories** - Platform-specific config directories
- **anyhow** - Error handling

### Development Dependencies
- **criterion** - Performance benchmarking
- **pretty_assertions** - Better test output

## TOML Database Schema

```toml
# emojis.toml
[[emoji]]
char = "🦄"
name = "unicorn"
keywords = ["animal", "fantasy", "rainbow", "magical", "mythical"]
tags = ["animal", "mythical"]
unicode = "U+1F984"
supports_skin_tone = false

[[emoji]]
char = "👋"
name = "waving hand"
keywords = ["hello", "hi", "bye", "wave", "greeting"]
tags = ["hand", "gesture", "greeting"]
unicode = "U+1F44B"
supports_skin_tone = true

[[emoji]]
char = "😀"
name = "grinning face"
keywords = ["happy", "smile", "grin", "joy"]
tags = ["face", "emotion", "positive"]
unicode = "U+1F600"
supports_skin_tone = false
```

**Schema Design:**
- `char`: The actual emoji character
- `name`: Official Unicode name
- `keywords`: Searchable keywords (from emojilib)
- `tags`: Categories for filtering
- `unicode`: Unicode code point (for reference)
- `supports_skin_tone`: Whether emoji supports skin tone modifiers

## Architecture & Separation of Concerns

### Module Responsibilities

**1. main.rs** - Entry Point
- Parse CLI arguments
- Load emoji database
- Route to direct search OR interactive TUI mode
- Handle errors gracefully

**2. cli.rs** - CLI Interface
- Define CLI structure with clap
- Flags: `--copy`, `--skin-tone`, `--limit`
- Positional argument: search query
- Validation of inputs

**3. config.rs** - Configuration Management
- Load/save user preferences (skin tone)
- Platform-specific config directory
- Default values
- Thread-safe config access

**4. emoji/data.rs** - Data Layer
- Emoji struct definition
- Load emojis.toml at startup
- Apply skin tone modifiers
- Lazy static database initialization
- Efficient in-memory representation

**5. emoji/search.rs** - Search Engine
- Hybrid search algorithm:
  1. Exact keyword match (highest priority)
  2. Fuzzy match on name (medium priority)
  3. Fuzzy match on keywords (lower priority)
- Score-based ranking
- Result limiting
- Query normalization (lowercase, trim)

**6. ui/app.rs** - TUI State
- Application state management
- Search query state
- Selected emoji index
- Skin tone setting
- Search results cache

**7. ui/input.rs** - Input Handler
- Keyboard event processing
- Keybindings:
  - Up/Down: Skin tone adjustment
  - Left/Right: Navigate results
  - 1-9: Quick select
  - Enter: Copy and exit
  - Tab: Copy and continue
  - Esc: Exit
- Debouncing logic

**8. ui/render.rs** - Rendering
- Draw query input box
- Render emoji results list
- Highlight selected emoji
- Show skin tone indicator
- Copy feedback message
- Efficient frame updates

**9. clipboard.rs** - Clipboard Abstraction
- Copy emoji to clipboard
- Error handling for clipboard failures
- Cross-platform support via arboard

## Implementation Phases

### Phase 1: Project Setup & Data Migration
**Files Created:**
- `Cargo.toml` with dependencies
- Basic project structure
- `emojis.toml` (empty, to be populated)

**Tasks:**
1. Initialize Rust project with `cargo init`
2. Add all dependencies to `Cargo.toml`
3. Create module structure (empty files)
4. Write data migration script to convert emojilib + unicode-emoji-json → TOML
5. Populate `emojis.toml` with all emoji data
6. Validate TOML can be parsed

### Phase 2: Core Data & Search
**Files:** `emoji/data.rs`, `emoji/search.rs`

**Tasks:**
1. Define `Emoji` struct with serde derives
2. Implement TOML loading with lazy_static
3. Implement skin tone modifier application
4. Build hybrid search algorithm:
   - Exact match on keywords (score: 100)
   - Fuzzy match on name (score: 50-90)
   - Fuzzy match on keywords (score: 30-70)
5. Sort results by score descending
6. Write comprehensive unit tests
7. Add benchmarks for search performance

### Phase 3: CLI Interface
**Files:** `cli.rs`, `main.rs` (partial)

**Tasks:**
1. Define CLI structure with clap
2. Implement direct search mode
3. Print formatted results to stdout
4. Handle `--copy` flag
5. Handle `--skin-tone` flag
6. Handle `--limit` flag
7. Write integration tests for CLI

### Phase 4: Configuration Management
**Files:** `config.rs`

**Tasks:**
1. Define `Config` struct
2. Load config from platform-specific directory
3. Save config with skin tone preference
4. Provide defaults
5. Thread-safe access pattern
6. Test config persistence

### Phase 5: Interactive TUI
**Files:** `ui/app.rs`, `ui/input.rs`, `ui/render.rs`, `main.rs` (completion)

**Tasks:**
1. Set up ratatui + crossterm
2. Implement application state in `app.rs`
3. Build input handler with all keybindings
4. Implement debounced search (200ms delay)
5. Design TUI layout (query input, results list)
6. Implement rendering logic
7. Add copy feedback indicators
8. Handle graceful exit
9. Test all keyboard interactions

### Phase 6: Clipboard Integration
**Files:** `clipboard.rs`

**Tasks:**
1. Wrap arboard with error handling
2. Provide simple `copy_to_clipboard()` function
3. Test on different platforms
4. Handle clipboard unavailable scenarios

### Phase 7: Testing & Quality
**Files:** `tests/*`, `benches/*`

**Tasks:**
1. Write integration tests for all features
2. Test edge cases (empty query, no results)
3. Add property-based tests for search
4. Create performance benchmarks
5. Run clippy for linting
6. Run rustfmt for formatting
7. Ensure 90%+ of core logic is tested

### Phase 8: GitHub Actions CI/CD
**Files:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`

**Tasks:**
1. **CI Workflow** (`ci.yml` - triggers on PRs):
   - Run `cargo test` on Linux, macOS, Windows
   - Run `cargo clippy` for linting
   - Run `cargo fmt --check` for formatting
   - Build binaries for all platforms
   - Upload artifacts for review

2. **Release Workflow** (`release.yml` - triggers on tags):
   - Build optimized binaries for:
     - x86_64-unknown-linux-gnu
     - x86_64-apple-darwin
     - aarch64-apple-darwin (Apple Silicon)
     - x86_64-pc-windows-msvc
   - Strip binaries for smaller size
   - Create GitHub release
   - Upload binaries as release assets
   - Generate checksums

### Phase 9: Documentation
**Files:** `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`

**Tasks:**
1. Update `README.md` with:
   - Installation instructions
   - Usage examples
   - Feature list
   - Building from source
2. Create `CLAUDE.md` with code style guidelines
3. Create `ARCHITECTURE.md` with design decisions

## Critical Files to Create/Modify

**New Files:**
- `emosh/Cargo.toml`
- `emosh/emojis.toml`
- `emosh/src/main.rs`
- `emosh/src/cli.rs`
- `emosh/src/config.rs`
- `emosh/src/emoji/mod.rs`
- `emosh/src/emoji/data.rs`
- `emosh/src/emoji/search.rs`
- `emosh/src/ui/mod.rs`
- `emosh/src/ui/app.rs`
- `emosh/src/ui/input.rs`
- `emosh/src/ui/render.rs`
- `emosh/src/clipboard.rs`
- `emosh/tests/integration.rs`
- `emosh/tests/search_tests.rs`
- `emosh/benches/search_bench.rs`
- `emosh/.github/workflows/ci.yml`
- `emosh/.github/workflows/release.yml`
- `emosh/README.md`
- `emosh/CLAUDE.md`
- `emosh/ARCHITECTURE.md`

**Reference Files** (read-only):
- `emoj/source/cli.tsx` - CLI argument handling
- `emoj/source/index.tsx` - Search algorithm
- `emoj/source/ui.tsx` - TUI structure and keybindings
- `emoj/package.json` - Dependencies to replicate
- `emoj/.github/workflows/main.yml` - CI reference

## Design Decisions

### Why Ratatui over Cursive/Termion?
- Modern, actively maintained (2024)
- Excellent documentation
- Immediate mode rendering (easier to reason about)
- Strong ecosystem support

### Why Fuzzy-Matcher over Skim?
- Simpler API for our use case
- Better performance for short strings
- Smaller binary size
- We can add exact match logic on top easily

### Why TOML over JSON/SQLite?
- Human-readable and editable
- Built-in Rust support via serde
- Fast enough for our dataset (~2000 emojis)
- Version control friendly

### Hybrid Search Algorithm Design
```rust
// Pseudo-code for search ranking
fn search(query: &str, emojis: &[Emoji]) -> Vec<(Emoji, i64)> {
    let mut results = Vec::new();

    for emoji in emojis {
        let mut score = 0;

        // 1. Exact keyword match (highest priority)
        if emoji.keywords.iter().any(|k| k == query) {
            score += 100;
        }

        // 2. Fuzzy match on name
        if let Some(s) = fuzzy_match(&emoji.name, query) {
            score += s;
        }

        // 3. Fuzzy match on keywords
        for keyword in &emoji.keywords {
            if let Some(s) = fuzzy_match(keyword, query) {
                score = score.max(s * 7 / 10); // 70% of fuzzy score
            }
        }

        if score > 30 { // Threshold
            results.push((emoji, score));
        }
    }

    results.sort_by_key(|(_, score)| -score);
    results
}
```

## Performance Targets
- Startup time: < 50ms
- Search latency: < 5ms for any query
- Binary size: < 5MB (optimized release)
- Memory usage: < 10MB

## Success Criteria
✅ All original emoj features working
✅ Fuzzy search improves result relevance
✅ Noticeably faster than original (startup + search)
✅ Cross-platform binaries available on GitHub releases
✅ 90%+ test coverage
✅ Clean architecture with clear module boundaries
✅ Comprehensive documentation
