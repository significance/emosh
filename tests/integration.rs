// Integration tests for emosh CLI and TUI functionality

use emosh::emoji::{apply_skin_tone, search, EMOJIS};

#[test]
fn test_cli_search_returns_first_result() {
    // Simulate CLI mode behavior: search and return first result
    let query = "grin";
    let results = search(query, &EMOJIS, 7);

    assert!(
        !results.is_empty(),
        "CLI search should return at least one result"
    );

    let first_result = &results[0];
    assert_eq!(
        first_result.emoji.char, "😁",
        "First result for 'grin' should be 😁"
    );
}

#[test]
fn test_cli_with_skin_tone() {
    // Test that skin tone is properly applied to first result
    let query = "thumbsup";
    let results = search(query, &EMOJIS, 7);

    assert!(!results.is_empty());

    let first_emoji = &results[0].emoji;
    assert_eq!(first_emoji.char, "👍");

    // Apply skin tone 3 (medium)
    let with_tone = apply_skin_tone(first_emoji, 3);
    assert_eq!(with_tone, "👍🏽", "Should apply medium skin tone");

    // Apply default tone (0)
    let default_tone = apply_skin_tone(first_emoji, 0);
    assert_eq!(default_tone, "👍", "Should keep default with tone 0");
}

#[test]
fn test_cli_search_no_results() {
    // Test behavior when no results are found
    let query = "xyznonexistentemoji123";
    let results = search(query, &EMOJIS, 7);

    assert!(
        results.is_empty(),
        "Should return empty results for non-matching query"
    );
}

#[test]
fn test_cli_search_with_limit() {
    // Test that limit parameter works correctly
    let query = "smile";
    let limit = 3;
    let results = search(query, &EMOJIS, limit);

    assert!(results.len() <= limit, "Should respect the limit parameter");
    assert!(!results.is_empty(), "Should find smile emojis");
}

#[test]
fn test_search_prioritizes_exact_keyword_match() {
    // Test that exact keyword matches score higher than fuzzy matches
    let query = "grin";
    let results = search(query, &EMOJIS, 10);

    assert!(!results.is_empty());

    // First result should have score 10000 (exact match)
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );

    // All subsequent results should have score < 10000 or also be exact matches
    for result in results.iter().skip(1) {
        if result.score == 10000 {
            // This is also an exact match (has "grin" as keyword)
            assert!(
                result.emoji.keywords.iter().any(|k| k == "grin"),
                "Score 10000 should only be for exact keyword matches"
            );
        } else {
            // This is a fuzzy match
            assert!(
                result.score < 10000,
                "Fuzzy matches should have score < 10000"
            );
        }
    }
}

#[test]
fn test_skin_tone_emojis() {
    // Test that skin tone emojis work correctly
    let skin_tone_emojis = vec![
        ("wave", "👋", "👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"),
        ("thumbsup", "👍", "👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿"),
    ];

    for (query, default, tone1, tone2, tone3, tone4, tone5) in skin_tone_emojis {
        let results = search(query, &EMOJIS, 5);
        assert!(!results.is_empty(), "Should find emoji for '{}'", query);

        let emoji = &results[0].emoji;

        assert_eq!(
            apply_skin_tone(emoji, 0),
            default,
            "Tone 0 should be default"
        );
        assert_eq!(apply_skin_tone(emoji, 1), tone1, "Tone 1 should be light");
        assert_eq!(
            apply_skin_tone(emoji, 2),
            tone2,
            "Tone 2 should be medium-light"
        );
        assert_eq!(apply_skin_tone(emoji, 3), tone3, "Tone 3 should be medium");
        assert_eq!(
            apply_skin_tone(emoji, 4),
            tone4,
            "Tone 4 should be medium-dark"
        );
        assert_eq!(apply_skin_tone(emoji, 5), tone5, "Tone 5 should be dark");
    }
}

#[test]
fn test_emoji_without_skin_tone_support() {
    // Test that emojis without skin tone support remain unchanged
    let query = "heart";
    let results = search(query, &EMOJIS, 5);
    assert!(!results.is_empty());

    let emoji = &results[0].emoji;
    assert_eq!(emoji.char, "❤️");

    // All skin tones should return the same emoji
    for tone in 0..=5 {
        assert_eq!(
            apply_skin_tone(emoji, tone),
            "❤️",
            "Heart should not change with skin tone {}",
            tone
        );
    }
}

#[test]
fn test_multiple_keywords_per_emoji() {
    // Test that emojis with multiple keywords are searchable by any keyword
    let queries = vec![
        ("thumbsup", "👍"),
        ("+1", "👍"),
        ("grin", "😁"),
        ("laughing", "😆"),
        ("satisfied", "😆"),
    ];

    for (query, expected_char) in queries {
        let results = search(query, &EMOJIS, 10);
        assert!(
            !results.is_empty(),
            "Should find results for query '{}'",
            query
        );

        // Check if the expected emoji is in the results (should be first for exact matches)
        let found = results.iter().any(|r| r.emoji.char == expected_char);
        assert!(
            found,
            "Query '{}' should find emoji '{}'",
            query, expected_char
        );
    }
}

#[test]
fn test_fuzzy_search_fallback() {
    // Test that fuzzy search works when exact match is not available
    let query = "unic"; // Should fuzzy match "unicorn"
    let results = search(query, &EMOJIS, 10);

    assert!(!results.is_empty(), "Fuzzy search should find results");

    // Should find unicorn emoji
    let has_unicorn = results.iter().any(|r| r.emoji.char == "🦄");
    assert!(has_unicorn, "Should fuzzy match unicorn for 'unic'");
}
