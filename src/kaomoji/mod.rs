//! Kaomoji (Japanese text emoticons) data and search.

pub mod data;

pub use data::KAOMOJIS;

use crate::emoji::search::{rank, SearchResult};

/// Searches the kaomoji database for faces matching `query`.
///
/// Uses the same ranking as emoji search (exact name > exact keyword > fuzzy)
/// but never triggers the treat keyword intercepts.
///
/// # Examples
/// ```
/// let results = emosh::kaomoji::search("shrug", 7);
/// assert_eq!(results[0].emoji.char, "¯\\_(ツ)_/¯");
/// ```
pub fn search(query: &str, limit: usize) -> Vec<SearchResult> {
    rank(query, &KAOMOJIS, limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn top(query: &str) -> Vec<String> {
        search(query, 7).into_iter().map(|r| r.emoji.name).collect()
    }

    #[test]
    fn test_search_exact_name_shrug_ranks_first() {
        let results = search("shrug", 7);
        assert_eq!(results[0].emoji.char, "¯\\_(ツ)_/¯");
    }

    #[test]
    fn test_search_lenny_ranks_first() {
        assert_eq!(search("lenny", 7)[0].emoji.char, "( ͡° ͜ʖ ͡°)");
    }

    #[test]
    fn test_search_happy_returns_full_page_of_joy_faces() {
        let results = search("happy", 7);
        assert_eq!(results.len(), 7);
        assert!(results
            .iter()
            .all(|r| r.emoji.tags.contains(&"joy".to_string())));
    }

    #[test]
    fn test_search_table_flip_finds_flip_faces() {
        let names = top("table flip");
        assert!(names.iter().any(|n| n.contains("table-flip")), "{names:?}");
    }

    #[test]
    fn test_search_does_not_intercept_treat_keywords() {
        assert!(search("treats", 7)
            .iter()
            .all(|r| !r.emoji.char.contains('\u{200B}')));
    }

    #[test]
    fn test_search_empty_query_returns_nothing() {
        assert!(search("  ", 7).is_empty());
    }
}
