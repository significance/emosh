//! Kaomoji (Japanese text emoticons) data and search.

pub mod data;
pub mod output;

pub use data::KAOMOJIS;

use crate::emoji::data::Emoji;
use crate::emoji::search::{rank, SearchResult};
use crate::treats::Rng;

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

/// Picks one uniformly random face, deterministically for a given `seed`.
pub fn random_face(seed: u64) -> &'static Emoji {
    let mut rng = Rng::from_seed(seed);
    &KAOMOJIS[rng.range(KAOMOJIS.len())]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_face_is_deterministic_per_seed() {
        assert_eq!(random_face(42), random_face(42));
    }

    #[test]
    fn test_random_face_varies_across_seeds_and_covers_database() {
        let distinct: std::collections::HashSet<_> = (0..2000)
            .map(|seed| random_face(seed).name.as_str())
            .collect();
        assert!(
            distinct.len() > 400,
            "only {} distinct faces",
            distinct.len()
        );
    }

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
    fn test_search_table_flip_ranks_classic_flip_first() {
        assert_eq!(search("table flip", 7)[0].emoji.char, "(╯°□°)╯︵ ┻━┻");
        assert!(top("table flip").contains(&"angry-table-flip".to_string()));
    }

    #[test]
    fn test_search_unflip_ranks_first_for_its_name() {
        assert_eq!(search("unflip", 7)[0].emoji.name, "unflip");
    }

    #[test]
    fn test_search_does_not_intercept_treat_keywords() {
        // The emoji search would answer "treats" with watermarked treats
        assert!(search("treats", 7).is_empty());
    }

    #[test]
    fn test_search_empty_query_returns_nothing() {
        assert!(search("  ", 7).is_empty());
    }
}
