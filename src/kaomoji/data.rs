//! Kaomoji database loaded from the embedded `kaomojis.toml`.

use crate::emoji::data::Emoji;
use anyhow::{Context, Result};
use once_cell::sync::Lazy;
use serde::Deserialize;

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

    #[test]
    fn test_parse_invalid_toml_reports_context() {
        let err = parse_kaomojis("not toml [[").unwrap_err();
        assert!(err.to_string().contains("kaomoji database"));
    }
}
