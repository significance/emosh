//! Kaomoji database loaded from the embedded `kaomojis.toml`.

use crate::emoji::data::Emoji;
use anyhow::{bail, Context, Result};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::collections::HashSet;

/// Embed the kaomoji database TOML at compile time
const KAOMOJI_DATA: &str = include_str!("../../kaomojis.toml");

/// One `[[kaomoji]]` entry as written in `kaomojis.toml`
#[derive(Debug, Deserialize)]
struct RawKaomoji {
    text: String,
    name: String,
    keywords: Vec<String>,
    tags: Vec<String>,
}

/// Wrapper struct for deserializing the TOML file
#[derive(Debug, Deserialize)]
struct KaomojiDatabase {
    kaomoji: Vec<RawKaomoji>,
}

/// Global kaomoji database, loaded lazily on first access.
///
/// Each face is stored as an [`Emoji`] (`char` holds the face text) so the
/// existing search engine can be reused unchanged.
pub static KAOMOJIS: Lazy<Vec<Emoji>> =
    Lazy::new(|| load_kaomojis().expect("Failed to load kaomoji database"));

/// Load kaomoji from the embedded TOML data
fn load_kaomojis() -> Result<Vec<Emoji>> {
    parse_kaomojis(KAOMOJI_DATA)
}

/// Parse kaomoji TOML into searchable entries
fn parse_kaomojis(source: &str) -> Result<Vec<Emoji>> {
    let database: KaomojiDatabase =
        toml::from_str(source).context("Failed to parse embedded kaomoji database")?;

    validate(&database.kaomoji)?;

    Ok(database
        .kaomoji
        .into_iter()
        .map(|raw| Emoji {
            char: raw.text,
            name: raw.name,
            keywords: raw.keywords,
            tags: raw.tags,
            unicode: String::new(),
            supports_skin_tone: false,
        })
        .collect())
}

/// Check the data invariants: non-empty, unique, and free of control characters
/// (a face containing escape sequences could inject terminal commands).
fn validate(entries: &[RawKaomoji]) -> Result<()> {
    let mut texts = HashSet::new();
    let mut names = HashSet::new();

    for entry in entries {
        if entry.text.is_empty() {
            bail!("kaomoji '{}' has empty text", entry.name);
        }
        if entry.text.chars().any(char::is_control) {
            bail!("kaomoji '{}' contains a control character", entry.name);
        }
        if !texts.insert(entry.text.as_str()) {
            bail!("duplicate text for kaomoji '{}'", entry.name);
        }
        if !names.insert(entry.name.as_str()) {
            bail!("duplicate name '{}'", entry.name);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kaomojis_load_all_seed_faces() {
        assert_eq!(KAOMOJIS.len(), 750);
    }

    #[test]
    fn test_kaomoji_maps_into_emoji_shape() {
        let shrug = KAOMOJIS.iter().find(|k| k.name == "shrug").unwrap();
        assert_eq!(shrug.char, "¯\\_(ツ)_/¯");
        assert_eq!(shrug.tags, vec!["indifference"]);
        assert!(!shrug.supports_skin_tone);
        assert!(shrug.unicode.is_empty());
    }

    fn entry(text: &str, name: &str) -> String {
        format!("[[kaomoji]]\ntext = {text:?}\nname = {name:?}\nkeywords = []\ntags = []\n")
    }

    #[test]
    fn test_parse_rejects_empty_text() {
        let err = parse_kaomojis(&entry("", "blank")).unwrap_err();
        assert!(err.to_string().contains("empty text"));
    }

    #[test]
    fn test_parse_rejects_duplicate_text() {
        let source = format!("{}{}", entry("(^_^)", "a"), entry("(^_^)", "b"));
        let err = parse_kaomojis(&source).unwrap_err();
        assert!(err.to_string().contains("duplicate text"));
    }

    #[test]
    fn test_parse_rejects_duplicate_name() {
        let source = format!("{}{}", entry("(^_^)", "a"), entry("(-_-)", "a"));
        let err = parse_kaomojis(&source).unwrap_err();
        assert!(err.to_string().contains("duplicate name"));
    }

    #[test]
    fn test_parse_rejects_control_characters() {
        // TOML escape, so the control character only exists after parsing
        let source =
            "[[kaomoji]]\ntext = \"(^\\u001b[2J_^)\"\nname = \"evil\"\nkeywords = []\ntags = []\n";
        let err = parse_kaomojis(source).unwrap_err();
        assert!(err.to_string().contains("control character"));
    }

    #[test]
    fn test_parse_invalid_toml_reports_context() {
        let err = parse_kaomojis("not toml [[").unwrap_err();
        assert!(err.to_string().contains("kaomoji database"));
    }
}
