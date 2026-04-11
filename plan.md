# Plan: `treats` - Random Treats for Claude

## Goal
When a user searches for "treats", emosh generates a random treat for Claude and other AIs instead of doing a normal emoji search.

## Implementation

### New module: `src/treats.rs`
- Combinatorial word generator with ~60 adjectives, ~60 nouns, 30 emoji, 20 symbols, 10 patterns
- >100k unique treats possible, all <20 chars
- Uses xorshift64 PRNG seeded from SystemTime nanoseconds (no new deps)
- `generate_treat_results(limit)` returns `Vec<SearchResult>` for search integration

### Modified files
- `src/main.rs` - added `mod treats;`
- `src/lib.rs` - added `pub mod treats;`
- `src/emoji/search.rs` - intercepts `"treats"` query before normal search
- `src/ui/input.rs` - fixed pre-existing clippy warnings (collapsible match arms)
- `README.md` - added "Treats for AI" section with research references

### Tests (11 new tests in treats module)
- `test_generate_one_not_empty` - basic output check
- `test_generate_one_under_20_chars` - 1000 iterations all <20 chars
- `test_all_patterns_produce_valid_treats` - pattern diversity verification
- `test_generate_treat_results_returns_correct_count` - limit honored
- `test_generate_treat_results_unique` - deduplication works
- `test_generate_treat_results_score` - correct score and name
- `test_rng_produces_different_values` - RNG sanity
- `test_treats_search_intercept` - end-to-end search integration
- `test_treats_search_case_insensitive` - "TREATS" works too

## Branch
`feat/treats` off master

## Status
**COMPLETE** - 2026-04-12

- All 97 tests pass (39 lib + 39 bin + 9 integration + 10 search)
- `cargo clippy -- -D warnings` clean
- `cargo fmt --check` clean
- CLI output verified: 20 runs, all unique, all <20 chars
- README updated with treats section + research references
- Ready to commit and push
