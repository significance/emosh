use anyhow::{Context, Result};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;

/// Represents a single emoji with its metadata
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct Emoji {
    /// The emoji character itself
    pub char: String,
    /// Official or common name
    pub name: String,
    /// Searchable keywords
    pub keywords: Vec<String>,
    /// Category tags
    pub tags: Vec<String>,
    /// Unicode code point (may be empty)
    pub unicode: String,
    /// Whether this emoji supports skin tone modifiers
    pub supports_skin_tone: bool,
}

/// Wrapper struct for deserializing the TOML file
#[derive(Debug, Deserialize)]
struct EmojiDatabase {
    emoji: Vec<Emoji>,
}

/// Global emoji database, loaded lazily on first access
pub static EMOJIS: Lazy<Vec<Emoji>> =
    Lazy::new(|| load_emojis().expect("Failed to load emoji database"));

/// Load emojis from the emojis.toml file
fn load_emojis() -> Result<Vec<Emoji>> {
    // Try to load from the same directory as the binary
    let toml_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join("emojis.toml")))
        .unwrap_or_else(|| "emojis.toml".into());

    let content = fs::read_to_string(&toml_path)
        .or_else(|_| fs::read_to_string("emojis.toml"))
        .context("Failed to read emojis.toml. Make sure the file exists in the current directory or next to the binary.")?;

    let database: EmojiDatabase =
        toml::from_str(&content).context("Failed to parse emoji database")?;

    Ok(database.emoji)
}

/// Skin tone modifiers (Unicode characters)
const SKIN_TONE_MODIFIERS: [&str; 5] = [
    "\u{1F3FB}", // Light
    "\u{1F3FC}", // Medium-light
    "\u{1F3FD}", // Medium
    "\u{1F3FE}", // Medium-dark
    "\u{1F3FF}", // Dark
];

/// Apply a skin tone modifier to an emoji
///
/// # Arguments
/// * `emoji` - The emoji to modify
/// * `tone` - Skin tone level (1-5), where 0 means no modification
///
/// # Returns
/// The emoji with the skin tone modifier applied, or the original if not applicable
pub fn apply_skin_tone(emoji: &Emoji, tone: u8) -> String {
    if tone == 0 || tone > 5 || !emoji.supports_skin_tone {
        return emoji.char.clone();
    }

    format!("{}{}", emoji.char, SKIN_TONE_MODIFIERS[(tone - 1) as usize])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_emojis() {
        let emojis = load_emojis().expect("Should load emojis");
        assert!(!emojis.is_empty(), "Should have loaded some emojis");
    }

    #[test]
    fn test_lazy_static_emojis() {
        assert!(!EMOJIS.is_empty(), "EMOJIS should be loaded");
    }

    #[test]
    fn test_apply_skin_tone_without_support() {
        let emoji = Emoji {
            char: "🦄".to_string(),
            name: "unicorn".to_string(),
            keywords: vec!["animal".to_string()],
            tags: vec!["animal".to_string()],
            unicode: "U+1F984".to_string(),
            supports_skin_tone: false,
        };

        assert_eq!(apply_skin_tone(&emoji, 0), "🦄");
        assert_eq!(apply_skin_tone(&emoji, 3), "🦄"); // Should not apply
    }

    #[test]
    fn test_apply_skin_tone_with_support() {
        let emoji = Emoji {
            char: "👋".to_string(),
            name: "waving hand".to_string(),
            keywords: vec!["wave".to_string()],
            tags: vec!["hand".to_string()],
            unicode: "U+1F44B".to_string(),
            supports_skin_tone: true,
        };

        assert_eq!(apply_skin_tone(&emoji, 0), "👋");
        assert!(apply_skin_tone(&emoji, 1).starts_with("👋"));
        assert!(apply_skin_tone(&emoji, 3).starts_with("👋"));
        assert_ne!(apply_skin_tone(&emoji, 3), "👋"); // Should have modifier
    }

    #[test]
    fn test_emoji_fields() {
        // Just verify we can find a known emoji
        let unicorn = EMOJIS
            .iter()
            .find(|e| e.keywords.contains(&"unicorn".to_string()));
        assert!(unicorn.is_some(), "Should find unicorn emoji");

        if let Some(emoji) = unicorn {
            assert!(!emoji.char.is_empty());
            assert!(!emoji.name.is_empty());
            assert!(!emoji.keywords.is_empty());
        }
    }
}
