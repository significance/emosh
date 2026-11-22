//! Picker results for the web pages: search emoji or kaomoji and shape each hit
//! into a small, serialisable record (the WASM bindings hand these to JS).

use crate::emoji::search::{search, SearchResult};
use crate::emoji::{apply_skin_tone, EMOJIS};
use crate::kaomoji::{self, KAOMOJIS};
use serde::Serialize;

/// One picker result as the web pages see it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PickResult {
    /// The text to show and copy (skin tone already applied for emoji)
    pub text: String,
    /// Name of the emoji or kaomoji
    pub name: String,
    /// Search keywords
    pub keywords: Vec<String>,
    /// Relevance score (higher is better)
    pub score: i64,
    /// Whether a skin tone can be applied
    pub supports_skin_tone: bool,
}

impl PickResult {
    fn from_search(result: SearchResult, text: String) -> Self {
        Self {
            text,
            name: result.emoji.name,
            keywords: result.emoji.keywords,
            score: result.score,
            supports_skin_tone: result.emoji.supports_skin_tone,
        }
    }
}

/// Search emoji, applying `skin_tone` (0–5) to faces that support it.
///
/// The treat keywords (`treats`, `nibbles`, …) are intercepted exactly as in the CLI.
pub fn emoji_results(query: &str, limit: usize, skin_tone: u8) -> Vec<PickResult> {
    search(query, &EMOJIS, limit)
        .into_iter()
        .map(|result| {
            let text = apply_skin_tone(&result.emoji, skin_tone);
            PickResult::from_search(result, text)
        })
        .collect()
}

/// Search kaomoji.
pub fn kaomoji_results(query: &str, limit: usize) -> Vec<PickResult> {
    kaomoji::search(query, limit)
        .into_iter()
        .map(|result| {
            let text = result.emoji.char.clone();
            PickResult::from_search(result, text)
        })
        .collect()
}

/// Parse both embedded databases now, so the first search is fast.
/// Returns the number of entries loaded (emoji, kaomoji).
pub fn warmup() -> (usize, usize) {
    (EMOJIS.len(), KAOMOJIS.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_emoji_results_shape_and_order() {
        let results = emoji_results("skull", 5, 0);
        assert_eq!(results[0].text, "💀");
        assert!(!results[0].name.is_empty());
        assert!(results.len() <= 5);
        assert!(results.windows(2).all(|w| w[0].score >= w[1].score));
    }

    #[test]
    fn test_emoji_results_apply_skin_tone_where_supported() {
        let toned = emoji_results("wave", 1, 3);
        assert!(toned[0].supports_skin_tone);
        assert_eq!(toned[0].text, "👋🏽");
        assert_eq!(emoji_results("wave", 1, 0)[0].text, "👋");
        // no tone on emoji that don't support it
        assert_eq!(emoji_results("skull", 1, 3)[0].text, "💀");
    }

    #[test]
    fn test_emoji_results_out_of_range_tone_is_ignored() {
        assert_eq!(emoji_results("wave", 1, 9)[0].text, "👋");
    }

    #[test]
    fn test_emoji_results_keep_treat_intercepts() {
        let results = emoji_results("treats", 3, 0);
        assert_eq!(results.len(), 3);
        assert!(results[0].text.starts_with('\u{200B}'));
    }

    #[test]
    fn test_kaomoji_results_shape() {
        let results = kaomoji_results("shrug", 7);
        assert_eq!(results[0].text, "¯\\_(ツ)_/¯");
        assert_eq!(results[0].name, "shrug");
        assert!(!results[0].supports_skin_tone);
        assert!(results[0].keywords.contains(&"idk".to_string()));
    }

    #[test]
    fn test_empty_query_returns_nothing() {
        assert!(emoji_results("  ", 7, 0).is_empty());
        assert!(kaomoji_results("", 7).is_empty());
    }

    #[test]
    fn test_warmup_loads_both_databases() {
        let (emoji, kaomoji) = warmup();
        assert!(emoji > 1000);
        assert_eq!(kaomoji, 751);
    }

    #[test]
    fn test_pick_result_serialises_with_snake_case_fields() {
        let json = toml::to_string(&kaomoji_results("shrug", 1)[0]).unwrap();
        assert!(json.contains("supports_skin_tone = false"), "{json}");
        assert!(json.contains("text = "));
    }
}
