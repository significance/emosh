# Emosh Project Prompt - Rust Rewrite of Emoj

## Context
You are helping to rewrite an existing TypeScript CLI tool called **emoj** into a modern Rust implementation called **emosh**. The original emoj is a CLI emoji finder that searches emojis by keywords.

## Original Project Details

### Existing emoj Structure
The emoj project is located in the `emoj/` folder with the following structure:

```
emoj/
├── source/
│   ├── cli.tsx          # CLI entry point, argument parsing (meow)
│   ├── index.tsx        # Core emoji search logic
│   └── ui.tsx           # Interactive React/Ink-based TUI
├── .github/workflows/main.yml  # CI workflow
├── test.tsx             # Basic tests
├── package.json         # Dependencies
└── readme.md            # Documentation
```

### Key Features of Original emoj
1. **Two modes of operation:**
   - Direct search: `emoj unicorn` prints results and exits
   - Interactive: `emoj` launches real-time TUI with live search

2. **Interactive TUI features:**
   - React-based terminal UI using Ink framework
   - Real-time search with 200ms debouncing
   - Keyboard controls:
     - Up/Down arrows: Adjust skin tone (0-5)
     - Left/Right arrows: Navigate emoji selection
     - Number keys (1-9): Quick select and exit
     - Enter: Copy selected emoji and exit
     - Tab: Copy selected emoji and continue
     - Escape/Ctrl+C: Exit
   - Visual feedback: Selected emoji highlighted, copy indicators
   - Skin tone support with persistence

3. **CLI flags:**
   - `--copy/-c`: Copy first emoji to clipboard
   - `--skin-tone/-s`: Set default skin tone (0-5)
   - `--limit/-l`: Maximum emojis to display (default: 7)

4. **Search algorithm:**
   - Uses two data sources:
     - `emojilib` package: Keyword mappings
     - `unicode-emoji-json` package: Unicode emoji data
   - Regex-based search:
     - Short words (<4 chars): Exact match only (`^word$`)
     - Long words (≥4 chars): Substring match
     - Creates OR pattern from all words
   - Tests against emoji names and keywords

5. **Key dependencies:**
   - clipboardy: Clipboard operations
   - conf: Persistent config storage
   - emojilib: Emoji keyword database
   - ink + react: Terminal UI framework
   - meow: CLI argument parsing
   - skin-tone: Skin tone modifier support

6. **Configuration:**
   - Stores user preferences (skin tone) in platform-specific config directory
   - Uses `conf` package for config management

## Requirements for Rust Rewrite

### Core Requirements
1. **Modern, well-tested, well-organized Rust code**
   - Excellent separation of concerns
   - Clear module boundaries
   - 90%+ test coverage on core logic

2. **TOML-based emoji database**
   - Create `emojis.toml` with all emoji data from emojilib
   - Schema should include:
     - `char`: The emoji character
     - `name`: Official Unicode name
     - `keywords`: Searchable keywords array
     - `tags`: Category tags array
     - `unicode`: Unicode code point
     - `supports_skin_tone`: Boolean flag

3. **Enhanced search algorithm**
   - **Hybrid approach:** Fuzzy search + exact keyword matching
   - Prioritize exact keyword matches (highest score)
   - Use fuzzy matching for typo tolerance
   - Score-based ranking system
   - Result limiting

4. **Full interactive TUI mode**
   - Replicate all features from original:
     - Real-time search with debouncing
     - Full keyboard navigation
     - Skin tone adjustment
     - Copy functionality with visual feedback
     - Selection highlighting
   - Use modern Rust TUI framework (ratatui)

5. **Cross-platform binary releases**
   - GitHub Actions workflow for building on:
     - Linux (x86_64-unknown-linux-gnu)
     - macOS Intel (x86_64-apple-darwin)
     - macOS Apple Silicon (aarch64-apple-darwin)
     - Windows (x86_64-pc-windows-msvc)
   - Two workflows:
     - `ci.yml`: Run tests and build on every PR
     - `release.yml`: Build optimized binaries and create GitHub release on tags

6. **Blazing fast performance**
   - Startup time: < 50ms
   - Search latency: < 5ms per query
   - Binary size: < 5MB (optimized release)
   - Memory usage: < 10MB

### Technology Stack Preferences
Based on discussion, use these specific technologies:

**Core Dependencies:**
- **clap** (v4): CLI argument parsing with derive macros
- **ratatui**: Modern TUI framework (actively maintained fork of tui-rs)
- **crossterm**: Cross-platform terminal manipulation
- **fuzzy-matcher**: Fast fuzzy search (prefer over skim for simplicity)
- **arboard**: Cross-platform clipboard access
- **serde + toml**: TOML serialization/deserialization
- **directories**: Platform-specific config directories
- **anyhow**: Error handling
- **once_cell** or **lazy_static**: Lazy database initialization

**Development Dependencies:**
- **criterion**: Performance benchmarking
- **pretty_assertions**: Better test output

### Project Structure

```
emosh/
├── Cargo.toml                 # Package manifest with all dependencies
├── emojis.toml               # Emoji database (~2000 entries)
├── src/
│   ├── main.rs               # Entry point, mode routing
│   ├── cli.rs                # CLI argument parsing (clap)
│   ├── config.rs             # Config management (skin tone persistence)
│   ├── emoji/
│   │   ├── mod.rs            # Module exports
│   │   ├── data.rs           # Emoji struct, TOML loading, lazy static
│   │   └── search.rs         # Hybrid search algorithm
│   ├── ui/
│   │   ├── mod.rs            # Module exports
│   │   ├── app.rs            # TUI application state
│   │   ├── input.rs          # Keyboard event handling
│   │   └── render.rs         # Terminal rendering (ratatui)
│   └── clipboard.rs          # Clipboard operations (arboard wrapper)
├── tests/
│   ├── integration.rs        # Integration tests
│   └── search_tests.rs       # Search algorithm tests
├── benches/
│   └── search_bench.rs       # Criterion benchmarks
├── .github/
│   └── workflows/
│       ├── ci.yml            # PR: test + build on all platforms
│       └── release.yml       # Tag: optimized builds + GitHub release
├── README.md                 # User-facing documentation
├── CLAUDE.md                 # Code style guidelines for future development
└── ARCHITECTURE.md           # Design decisions and architecture docs
```

### Hybrid Search Algorithm Design

The search should use a tiered scoring system:

```rust
// Pseudo-code for search ranking
fn search(query: &str, emojis: &[Emoji], limit: usize) -> Vec<SearchResult> {
    for each emoji:
        score = 0

        // 1. Exact keyword match (priority: 100)
        if emoji.keywords contains exact match of query:
            score = 100

        // 2. Fuzzy match on name (priority: medium)
        if fuzzy_match(emoji.name, query):
            score = max(score, fuzzy_score)

        // 3. Fuzzy match on keywords (priority: lower)
        for keyword in emoji.keywords:
            if fuzzy_match(keyword, query):
                score = max(score, fuzzy_score * 0.7)

        if score > threshold (e.g., 30):
            add to results

    sort results by score descending
    return top N results
}
```

### Data Migration Strategy

1. Extract all emoji data from the emoj package's dependencies:
   - Parse emojilib for keywords
   - Parse unicode-emoji-json for names and metadata
2. Combine into TOML format with the defined schema
3. Validate that all emojis load correctly
4. Ensure no data loss in migration

### Implementation Phases

Create a plan with approximately these phases:

1. **Project Setup & Data Migration**: Initialize Rust project, create TOML schema, migrate emoji data
2. **Core Data & Search**: Implement data structures, TOML loading, hybrid search algorithm
3. **CLI Interface**: Implement direct search mode with all flags
4. **Configuration Management**: User config persistence
5. **Interactive TUI**: Full TUI implementation with all keyboard controls
6. **Clipboard Integration**: Cross-platform clipboard support
7. **Testing & Quality**: Comprehensive test suite, benchmarks, linting
8. **GitHub Actions CI/CD**: CI for PRs, release workflow for tags
9. **Documentation**: README, code style guide, architecture docs

### Performance Optimization

Include these optimizations:

```toml
[profile.release]
opt-level = "z"          # Optimize for size
lto = true               # Link-time optimization
codegen-units = 1        # Single codegen unit
strip = true             # Strip symbols
panic = "abort"          # Smaller panic handler
```

## Deliverables

Create the following files in the `emosh/` directory:

1. **plan.md**: Comprehensive implementation plan
   - Overview and requirements summary
   - Project structure
   - Technology stack with justifications
   - TOML schema design
   - Module-by-module architecture breakdown
   - Implementation phases with detailed tasks
   - Critical files list
   - Design decisions (Why ratatui? Why fuzzy-matcher? Why TOML?)
   - Performance targets
   - Success criteria

2. **CLAUDE.md**: Code style guidelines
   - Rust formatting conventions (rustfmt)
   - Naming conventions
   - Error handling patterns (anyhow::Result)
   - Module organization principles
   - Documentation requirements (doc comments)
   - Testing guidelines (90%+ coverage)
   - Performance considerations
   - Common patterns (lazy static, builder pattern)
   - Linting requirements (clippy)
   - Git commit message format

3. **ARCHITECTURE.md**: Design decisions and architecture
   - Design philosophy (separation of concerns, performance first)
   - System architecture diagram (ASCII)
   - Module-by-module breakdown with code examples
   - Data flow diagrams (CLI mode vs TUI mode)
   - Search algorithm detailed design
   - Performance optimization strategies
   - Testing strategy
   - Future enhancement ideas
   - Technical debt to avoid

## Important Notes

### User Preferences (Pre-answered Questions)
- **TUI Mode**: Full interactive TUI like original (not CLI-only)
- **Platforms**: Build for Linux, macOS (Intel + ARM), and Windows
- **Search Type**: Fuzzy + exact match combo (prioritize exact keyword matches)

### Reference Files to Consult
You should read and reference these existing files from the emoj project:
- `emoj/source/cli.tsx` - For CLI argument structure
- `emoj/source/index.tsx` - For search algorithm patterns
- `emoj/source/ui.tsx` - For TUI structure and keyboard bindings
- `emoj/package.json` - For dependency list to replicate
- `emoj/.github/workflows/main.yml` - For CI reference

### Style Guidelines
- Clean, concise markdown
- Include code examples where helpful
- Use tables for comparisons
- Include ASCII diagrams for architecture
- Provide clear rationale for all design decisions
- No unnecessary emojis in documentation

### Success Criteria Checklist
The plan should ensure:
- ✅ All original emoj features replicated
- ✅ Fuzzy search improves result relevance
- ✅ Noticeably faster than original
- ✅ Cross-platform binaries in GitHub releases
- ✅ 90%+ test coverage
- ✅ Clear module boundaries
- ✅ Comprehensive documentation

## Task

Using the above context and requirements:

1. Explore the existing `emoj/` codebase to understand all features
2. Design a comprehensive Rust implementation strategy
3. Create `plan.md`, `CLAUDE.md`, and `ARCHITECTURE.md` in the `emosh/` directory
4. Ensure the plan is detailed enough to execute without ambiguity
5. Include all design decisions with clear rationales
6. Provide code examples and pseudo-code where helpful

The goal is to create a complete blueprint for building a modern, performant, well-architected Rust CLI tool that improves upon the original while maintaining full feature parity.
