use emosh::emoji::{search, EMOJIS};

#[test]
fn test_signal_desktop_keyword_grin() {
    // Test that "grin" returns 😁 as the first result (Signal Desktop paradigm)
    let results = search("grin", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'grin'");
    assert_eq!(
        results[0].emoji.char, "😁",
        "First result for 'grin' should be 😁 (U+1F601)"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_smile() {
    // Test that "smile" returns 😄 as the first result
    let results = search("smile", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'smile'");
    assert_eq!(
        results[0].emoji.char, "😄",
        "First result for 'smile' should be 😄 (U+1F604)"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_smiley() {
    // Test that "smiley" returns 😃 as the first result
    let results = search("smiley", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'smiley'");
    assert_eq!(
        results[0].emoji.char, "😃",
        "First result for 'smiley' should be 😃 (U+1F603)"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_grinning() {
    // Test that "grinning" returns 😀 as the first result
    let results = search("grinning", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'grinning'");
    assert_eq!(
        results[0].emoji.char, "😀",
        "First result for 'grinning' should be 😀 (U+1F600)"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_heart() {
    // Test that "heart" returns ❤️ as the first result
    let results = search("heart", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'heart'");
    assert_eq!(
        results[0].emoji.char, "❤️",
        "First result for 'heart' should be ❤️"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_thumbsup() {
    // Test that "thumbsup" returns 👍 as the first result
    let results = search("thumbsup", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for 'thumbsup'");
    assert_eq!(
        results[0].emoji.char, "👍",
        "First result for 'thumbsup' should be 👍"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_signal_desktop_keyword_plus_one() {
    // Test that "+1" returns 👍 as the first result
    let results = search("+1", &EMOJIS, 10);
    assert!(!results.is_empty(), "Should find results for '+1'");
    assert_eq!(
        results[0].emoji.char, "👍",
        "First result for '+1' should be 👍"
    );
    assert_eq!(
        results[0].score, 10000,
        "Exact keyword match should have score 10000"
    );
}

#[test]
fn test_no_keyword_conflicts() {
    // Ensure that "grin" does NOT match 😀 (grinning)
    // because we removed conflicting keywords
    let results = search("grin", &EMOJIS, 10);
    assert!(!results.is_empty());

    // First result should be 😁 with exact match score
    assert_eq!(results[0].emoji.char, "😁");
    assert_eq!(results[0].score, 10000);

    // If 😀 appears in results, it should have a lower fuzzy score
    let grinning_result = results.iter().find(|r| r.emoji.char == "😀");
    if let Some(result) = grinning_result {
        assert!(
            result.score < 10000,
            "😀 should have fuzzy score < 10000 for 'grin' query"
        );
    }
}

#[test]
fn test_emoji_data_loaded() {
    // Verify emoji data is loaded correctly
    assert!(!EMOJIS.is_empty(), "EMOJIS should be loaded and not empty");
    assert!(
        EMOJIS.len() > 1000,
        "Should have loaded a reasonable number of emojis"
    );
}

#[test]
fn test_keywords_are_lowercase_searchable() {
    // Test that keywords can be searched case-insensitively
    let results_lower = search("grin", &EMOJIS, 10);
    let results_upper = search("GRIN", &EMOJIS, 10);
    let results_mixed = search("GrIn", &EMOJIS, 10);

    assert_eq!(results_lower[0].emoji.char, results_upper[0].emoji.char);
    assert_eq!(results_lower[0].emoji.char, results_mixed[0].emoji.char);
    assert_eq!(results_lower[0].emoji.char, "😁");
}
