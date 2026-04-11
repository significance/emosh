use super::data::Emoji;
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;

/// A search result with an emoji and its relevance score
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub emoji: Emoji,
    pub score: i64,
}

/// Search for emojis matching the given query
///
/// Uses a hybrid algorithm combining exact keyword matching and fuzzy search:
/// 1. Exact keyword match (highest priority, score: 10000)
/// 2. Fuzzy match on name (medium priority)
/// 3. Fuzzy match on keywords (lower priority, 70% of fuzzy score)
///
/// # Arguments
/// * `query` - The search query string
/// * `emojis` - The emoji database to search
/// * `limit` - Maximum number of results to return
///
/// # Returns
/// A vector of search results sorted by relevance score (descending)
///
/// # Examples
/// ```
/// use emosh::emoji::data::EMOJIS;
/// use emosh::emoji::search::search;
///
/// let results = search("unicorn", &EMOJIS, 10);
/// assert!(!results.is_empty());
/// ```
pub fn search(query: &str, emojis: &[Emoji], limit: usize) -> Vec<SearchResult> {
    // Normalize query
    let query_trimmed = query.trim();
    let query_lower = query_trimmed.to_lowercase();

    // Empty query returns nothing
    if query_lower.is_empty() {
        return Vec::new();
    }

    let matcher = SkimMatcherV2::default();
    let mut results: Vec<SearchResult> = emojis
        .iter()
        .filter_map(|emoji| {
            let mut score: i64 = 0;
            let mut has_exact_match = false;

            // 0. Case-sensitive exact name match (e.g. "epsilon" → ε, "Epsilon" → Ε)
            if emoji.name == query_trimmed {
                score = 20000;
                has_exact_match = true;
            }

            // 1. Exact keyword match (highest priority - score 10000)
            if emoji
                .keywords
                .iter()
                .any(|k| k.to_lowercase() == query_lower)
            {
                score = score.max(10000);
                has_exact_match = true;
            }

            // Only do fuzzy matching if we don't have an exact match
            if !has_exact_match {
                // 2. Fuzzy match on name
                let name_lower = emoji.name.to_lowercase();
                if let Some(fuzzy_score) = matcher.fuzzy_match(&name_lower, &query_lower) {
                    score = score.max(fuzzy_score);
                }

                // 3. Fuzzy match on keywords
                for keyword in &emoji.keywords {
                    let keyword_lower = keyword.to_lowercase();
                    if let Some(fuzzy_score) = matcher.fuzzy_match(&keyword_lower, &query_lower) {
                        // Keywords get 70% of the fuzzy score (lower priority than name)
                        let keyword_score = (fuzzy_score * 7) / 10;
                        score = score.max(keyword_score);
                    }
                }
            }

            // Filter out low-quality matches
            if score > 30 {
                Some(SearchResult {
                    emoji: emoji.clone(),
                    score,
                })
            } else {
                None
            }
        })
        .collect();

    // Sort by score descending
    results.sort_by_key(|r| -r.score);

    // Limit results
    results.truncate(limit);

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::emoji::data::Emoji;

    fn create_test_emoji(char: &str, name: &str, keywords: Vec<&str>) -> Emoji {
        Emoji {
            char: char.to_string(),
            name: name.to_string(),
            keywords: keywords.iter().map(|s| s.to_string()).collect(),
            tags: vec!["test".to_string()],
            unicode: "".to_string(),
            supports_skin_tone: false,
        }
    }

    #[test]
    fn test_search_exact_keyword_match() {
        let emojis = vec![
            create_test_emoji("🦄", "unicorn", vec!["animal", "fantasy", "unicorn"]),
            create_test_emoji("🐴", "horse", vec!["animal", "horse"]),
        ];

        let results = search("unicorn", &emojis, 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.char, "🦄");
        assert_eq!(results[0].score, 10000); // Exact match should score 10000
    }

    #[test]
    fn test_search_fuzzy_match_on_name() {
        let emojis = vec![create_test_emoji(
            "🦄",
            "unicorn",
            vec!["animal", "fantasy"],
        )];

        let results = search("unic", &emojis, 10);
        assert!(!results.is_empty());
        assert_eq!(results[0].emoji.char, "🦄");
        assert!(results[0].score > 30); // Fuzzy match should pass threshold
    }

    #[test]
    fn test_search_fuzzy_match_on_keywords() {
        let emojis = vec![create_test_emoji(
            "🦄",
            "unicorn",
            vec!["fantasy", "magical"],
        )];

        let results = search("magic", &emojis, 10);
        assert!(!results.is_empty());
        assert_eq!(results[0].emoji.char, "🦄");
    }

    #[test]
    fn test_search_empty_query() {
        let emojis = vec![create_test_emoji("🦄", "unicorn", vec!["animal"])];

        let results = search("", &emojis, 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_no_matches() {
        let emojis = vec![create_test_emoji("🦄", "unicorn", vec!["animal"])];

        let results = search("xyz123", &emojis, 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_result_limiting() {
        let emojis = vec![
            create_test_emoji("😀", "grinning", vec!["happy", "smile"]),
            create_test_emoji("😃", "smiley", vec!["happy", "smile"]),
            create_test_emoji("😄", "smile", vec!["happy", "smile"]),
            create_test_emoji("😁", "grin", vec!["happy", "smile"]),
        ];

        let results = search("smile", &emojis, 2);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_case_insensitive() {
        let emojis = vec![create_test_emoji(
            "🦄",
            "Unicorn",
            vec!["ANIMAL", "Fantasy"],
        )];

        let results1 = search("unicorn", &emojis, 10);
        let results2 = search("UNICORN", &emojis, 10);
        let results3 = search("UnIcOrN", &emojis, 10);

        assert!(!results1.is_empty());
        assert!(!results2.is_empty());
        assert!(!results3.is_empty());
    }

    #[test]
    fn test_search_score_ordering() {
        let emojis = vec![
            create_test_emoji("🦄", "unicorn", vec!["animal", "fantasy"]),
            create_test_emoji("🐴", "horse", vec!["animal", "unicorn"]), // has keyword "unicorn"
        ];

        let results = search("unicorn", &emojis, 10);
        assert_eq!(results.len(), 2);
        // Both should match but keyword match should score higher
        assert!(results[0].score >= results[1].score);
    }

    #[test]
    fn test_whitespace_trimming() {
        let emojis = vec![create_test_emoji("🦄", "unicorn", vec!["animal"])];

        let results = search("  unicorn  ", &emojis, 10);
        assert!(!results.is_empty());
    }
}
