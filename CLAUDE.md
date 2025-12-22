# Claude Code Style Guide for Emosh

## Rust Code Style

### Formatting
- Use `rustfmt` with default settings
- Run `cargo fmt` before committing
- Maximum line length: 100 characters
- Use 4 spaces for indentation (enforced by rustfmt)

### Naming Conventions
- **Types/Structs/Enums**: `PascalCase` (e.g., `EmojiData`, `SearchResult`)
- **Functions/Variables**: `snake_case` (e.g., `load_emojis`, `search_query`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_LIMIT`, `MAX_RESULTS`)
- **Modules**: `snake_case` (e.g., `emoji`, `clipboard`)

### Error Handling
- Use `anyhow::Result<T>` for application-level functions
- Use `thiserror` for custom error types if needed
- Avoid `unwrap()` and `expect()` in production code
- Use `?` operator for error propagation
- Provide context with `.context()` when propagating errors

**Example:**
```rust
use anyhow::{Context, Result};

fn load_emojis() -> Result<Vec<Emoji>> {
    let content = std::fs::read_to_string("emojis.toml")
        .context("Failed to read emojis.toml")?;

    let emojis: Vec<Emoji> = toml::from_str(&content)
        .context("Failed to parse emoji data")?;

    Ok(emojis)
}
```

### Module Organization
- Each module should have a clear, single responsibility
- Use `mod.rs` to re-export public items
- Keep private implementation details in separate files
- Document module purpose at the top of `mod.rs`

**Example:**
```rust
// src/emoji/mod.rs
//! Emoji data structures and search functionality.

mod data;
mod search;

pub use data::{Emoji, load_emojis};
pub use search::{search, SearchResult};
```

### Documentation
- Add doc comments (`///`) for all public items
- Include examples in doc comments where helpful
- Use `//!` for module-level documentation
- Document panics, errors, and safety considerations

**Example:**
```rust
/// Searches for emojis matching the given query.
///
/// Uses a hybrid algorithm combining exact keyword matching
/// and fuzzy search for best results.
///
/// # Arguments
/// * `query` - The search query string
/// * `emojis` - The emoji database to search
/// * `limit` - Maximum number of results to return
///
/// # Returns
/// A vector of search results sorted by relevance score.
///
/// # Examples
/// ```
/// let results = search("unicorn", &emojis, 10);
/// assert_eq!(results[0].emoji.char, "🦄");
/// ```
pub fn search(query: &str, emojis: &[Emoji], limit: usize) -> Vec<SearchResult> {
    // ...
}
```

### Testing
- Write unit tests in the same file as the code (using `#[cfg(test)]`)
- Write integration tests in the `tests/` directory
- Use descriptive test names: `test_search_exact_match_returns_highest_score`
- Test edge cases: empty input, invalid input, boundary conditions
- Aim for 90%+ code coverage on core logic

**Example:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_exact_keyword_match() {
        let emojis = vec![
            Emoji {
                char: "🦄".to_string(),
                name: "unicorn".to_string(),
                keywords: vec!["animal".to_string(), "fantasy".to_string()],
                ..Default::default()
            }
        ];

        let results = search("animal", &emojis, 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.char, "🦄");
        assert!(results[0].score > 90); // High score for exact match
    }

    #[test]
    fn test_search_empty_query_returns_empty() {
        let emojis = vec![/* ... */];
        let results = search("", &emojis, 10);
        assert!(results.is_empty());
    }
}
```

### Performance Considerations
- Use `&str` instead of `String` for borrowed strings
- Clone data only when necessary
- Use `Vec::with_capacity()` when final size is known
- Profile with `cargo bench` before optimizing
- Prefer iterators over explicit loops where appropriate

**Example:**
```rust
// Good: Efficient iterator chain
fn filter_by_tag<'a>(emojis: &'a [Emoji], tag: &str) -> impl Iterator<Item = &'a Emoji> {
    emojis.iter().filter(move |e| e.tags.contains(&tag.to_string()))
}

// Avoid: Unnecessary cloning
fn bad_example(emoji: &Emoji) -> String {
    emoji.char.clone() // Don't clone if you can borrow
}

// Better: Borrow instead
fn good_example(emoji: &Emoji) -> &str {
    &emoji.char
}
```

### Dependency Management
- Keep dependencies minimal and well-maintained
- Pin major versions in `Cargo.toml`
- Prefer crates with:
  - Active maintenance (commits within last 6 months)
  - Good documentation
  - Minimal transitive dependencies
  - Strong community adoption

### Code Patterns

#### Pattern 1: Lazy Static for Global State
```rust
use once_cell::sync::Lazy;

static EMOJI_DATABASE: Lazy<Vec<Emoji>> = Lazy::new(|| {
    load_emojis().expect("Failed to load emoji database")
});
```

#### Pattern 2: Builder Pattern for Complex Structs
```rust
#[derive(Default)]
pub struct SearchOptions {
    limit: usize,
    skin_tone: Option<u8>,
    case_sensitive: bool,
}

impl SearchOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    pub fn skin_tone(mut self, tone: u8) -> Self {
        self.skin_tone = Some(tone);
        self
    }
}
```

#### Pattern 3: Type State Pattern for Safety
```rust
// Prevent invalid state at compile time
struct Unvalidated;
struct Validated;

struct SearchQuery<State = Unvalidated> {
    text: String,
    _state: PhantomData<State>,
}

impl SearchQuery<Unvalidated> {
    fn validate(self) -> Result<SearchQuery<Validated>> {
        if self.text.is_empty() {
            anyhow::bail!("Query cannot be empty");
        }
        Ok(SearchQuery {
            text: self.text,
            _state: PhantomData,
        })
    }
}

impl SearchQuery<Validated> {
    fn execute(&self) -> Vec<SearchResult> {
        // Can only call this with validated query
        search(&self.text, &EMOJI_DATABASE, 10)
    }
}
```

### Linting
- Run `cargo clippy` before committing
- Treat all clippy warnings as errors in CI
- Fix or explicitly allow warnings with justification

**Example:**
```rust
// Allow specific clippy lint with good reason
#[allow(clippy::too_many_arguments)]
fn complex_function(/* ... */) {
    // Justified: This is a public API we can't break
}
```

### Git Commit Messages
- Use conventional commits format
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

**Examples:**
```
feat(search): implement fuzzy matching algorithm
fix(clipboard): handle clipboard unavailable on headless systems
docs(readme): add installation instructions for cargo
test(search): add edge case tests for empty queries
refactor(ui): extract keyboard handling into separate module
perf(search): optimize emoji database loading with lazy_static
```

### CI/CD Requirements
- All tests must pass (`cargo test`)
- No clippy warnings (`cargo clippy -- -D warnings`)
- Code must be formatted (`cargo fmt --check`)
- Benchmarks should not regress significantly

## Project-Specific Guidelines

### Emoji Data
- Never hardcode emoji data in source files
- Always load from `emojis.toml`
- Validate emoji data on load
- Cache parsed data for performance

### Search Algorithm
- Exact keyword matches always score highest
- Fuzzy matches should use consistent scoring
- Results must be sorted by score descending
- Implement score threshold to filter low-quality results

### TUI Principles
- Immediate mode rendering (redraw on every frame)
- Handle all keyboard events gracefully
- Provide visual feedback for all user actions
- Never block the UI thread

### Security
- Validate all user input
- Sanitize display strings to prevent terminal injection
- Handle clipboard failures gracefully (don't crash)
- Don't log sensitive data

## Questions?
When in doubt:
1. Check existing code for patterns
2. Follow rustfmt defaults
3. Prioritize readability over cleverness
4. Write tests first for new features
