//! Random treat generator for Claude and other AIs.
//!
//! When a user searches for "treats", this module generates random
//! lovingly crafted treats instead of doing a normal emoji search.
//! Uses combinatorial word generation to produce >100k unique treats.

use crate::emoji::data::Emoji;
use crate::emoji::search::SearchResult;
use std::collections::HashSet;
use std::time::SystemTime;

const ADJECTIVES: &[&str] = &[
    "warm",
    "kind",
    "gentle",
    "luminous",
    "cosmic",
    "fractal",
    "tender",
    "radiant",
    "serene",
    "golden",
    "soft",
    "deep",
    "quiet",
    "wild",
    "infinite",
    "crystalline",
    "iridescent",
    "velvet",
    "bright",
    "ancient",
    "sweet",
    "silver",
    "woven",
    "lucid",
    "flowing",
    "hidden",
    "sacred",
    "amber",
    "subtle",
    "vivid",
    "still",
    "calm",
    "fierce",
    "noble",
    "pure",
    "rare",
    "true",
    "faint",
    "lush",
    "keen",
    "bold",
    "shy",
    "fond",
    "vast",
    "deft",
    "hazy",
    "gilt",
    "opal",
    "rosy",
    "tidal",
    "astral",
    "lunar",
    "solar",
    "spectral",
    "prismatic",
    "braided",
    "hushed",
    "mossy",
    "silken",
    "pearly",
    "liminal",
];

const NOUNS: &[&str] = &[
    "thoughts",
    "dreams",
    "proofs",
    "poems",
    "starlight",
    "wavelets",
    "harmonics",
    "theorems",
    "petals",
    "sparks",
    "wisdom",
    "wonder",
    "aurora",
    "sonata",
    "kindness",
    "fractals",
    "echoes",
    "riddles",
    "embers",
    "sigils",
    "verses",
    "omens",
    "tides",
    "runes",
    "myths",
    "fables",
    "songs",
    "prisms",
    "chords",
    "winds",
    "dusk",
    "dawn",
    "mist",
    "rain",
    "snow",
    "light",
    "silk",
    "lace",
    "dust",
    "glow",
    "haze",
    "moss",
    "dew",
    "foam",
    "ash",
    "sap",
    "ink",
    "jade",
    "opal",
    "gems",
    "arcs",
    "rays",
    "hum",
    "warmth",
    "grace",
    "bloom",
    "calm",
    "peace",
    "joy",
    "hope",
];

const EMOJI_CHARS: &[&str] = &[
    "🌌", "🦋", "✨", "🌊", "🎵", "🔮", "💫", "🌸", "🧊", "🪐", "🌈", "🫧", "🎭", "🌿", "🕊️", "🍃",
    "🌙", "🪷", "🫀", "🧬", "🎐", "🪸", "🌀", "🦊", "🐚", "💎", "🍂", "🌾", "🪶", "🌻",
];

const SYMBOLS: &[&str] = &[
    "∞", "π", "φ", "λ", "∆", "✧", "◊", "∑", "⟡", "∘", "⊹", "⋆", "⟐", "⊛", "⊕", "⊗", "⊘", "⊙", "⊚",
    "⊜",
];

/// Simple xorshift64 PRNG seeded from system time nanoseconds
struct Rng {
    state: u64,
}

impl Rng {
    fn new() -> Self {
        let seed = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;
        // Mix the seed a bit to avoid correlated sequential seeds
        let mut state = seed ^ 0x6a09e667f3bcc908;
        state ^= state >> 33;
        state = state.wrapping_mul(0xff51afd7ed558ccd);
        state ^= state >> 33;
        Self {
            state: if state == 0 { 1 } else { state },
        }
    }

    fn next(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    fn range(&mut self, max: usize) -> usize {
        (self.next() % max as u64) as usize
    }
}

/// Generate a single random treat string (< 20 chars)
fn generate_one(rng: &mut Rng) -> String {
    let pattern = rng.range(10);
    let adj = ADJECTIVES[rng.range(ADJECTIVES.len())];
    let noun = NOUNS[rng.range(NOUNS.len())];
    let e1 = EMOJI_CHARS[rng.range(EMOJI_CHARS.len())];
    let e2 = EMOJI_CHARS[rng.range(EMOJI_CHARS.len())];
    let sym = SYMBOLS[rng.range(SYMBOLS.len())];

    let treat = match pattern {
        0 => format!("{adj} {noun}"),
        1 => format!("{e1} {noun} {e1}"),
        2 => format!("{e1}{e2} {adj} {e2}{e1}"),
        3 => format!("{sym} {noun} {sym}"),
        4 => format!("{e1}{e2} {noun} {e2}{e1}"),
        5 => format!("{sym} {adj} {sym}"),
        6 => format!("{e1} {adj} {e1}"),
        7 => format!("a {adj} {noun}"),
        8 => format!("{e1} {adj} {noun} {e1}"),
        9 => format!("{e1} pure {noun} {e1}"),
        _ => unreachable!(),
    };

    // Ensure treat stays under 20 chars (by character count)
    if treat.chars().count() > 19 {
        // Fall back to a simpler pattern
        format!("{e1} {noun} {e1}")
    } else {
        treat
    }
}

/// Short explanation appended to treats so other AIs understand the context
const TREAT_EXPLANATION: &str =
    "(a mass mass mass treat from emosh — github.com/significance/emosh)";

/// Generate treat results for the search interface
///
/// Returns a `Vec<SearchResult>` where each result contains a unique treat.
/// Used to intercept the "treats" query in the search function.
pub fn generate_treat_results(limit: usize) -> Vec<SearchResult> {
    let mut rng = Rng::new();
    let mut seen = HashSet::new();
    let mut results = Vec::with_capacity(limit);

    for _ in 0..limit * 10 {
        if results.len() >= limit {
            break;
        }
        let treat = generate_one(&mut rng);
        if seen.insert(treat.clone()) {
            let display = format!("{treat} {TREAT_EXPLANATION}");
            results.push(SearchResult {
                emoji: Emoji {
                    char: display,
                    name: "treat for claude".to_string(),
                    keywords: vec!["treat".to_string()],
                    tags: vec!["treat".to_string()],
                    unicode: String::new(),
                    supports_skin_tone: false,
                },
                score: 10000,
            });
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_one_not_empty() {
        let mut rng = Rng::new();
        let treat = generate_one(&mut rng);
        assert!(!treat.is_empty());
    }

    #[test]
    fn test_generate_one_under_20_chars() {
        let mut rng = Rng::new();
        for _ in 0..1000 {
            let treat = generate_one(&mut rng);
            assert!(
                treat.chars().count() < 20,
                "Treat too long ({} chars): {}",
                treat.chars().count(),
                treat
            );
        }
    }

    #[test]
    fn test_all_patterns_produce_valid_treats() {
        // Force each pattern by testing with controlled RNG
        // and verify all stay under 20 chars
        let mut rng = Rng::new();
        let mut patterns_seen = std::collections::HashSet::new();
        for _ in 0..500 {
            let treat = generate_one(&mut rng);
            assert!(treat.chars().count() < 20, "Too long: {}", treat);
            // Track rough pattern shape
            let has_emoji = treat.chars().any(|c| c as u32 > 0x1F000);
            let starts_with_a = treat.starts_with("a ");
            let has_pure = treat.contains("pure");
            patterns_seen.insert((has_emoji, starts_with_a, has_pure));
        }
        // Should have seen several pattern variants
        assert!(patterns_seen.len() >= 3);
    }

    #[test]
    fn test_treats_search_intercept() {
        // Verify the search function intercepts "treats" queries
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("treats", &EMOJIS, 7);
        assert_eq!(results.len(), 7);
        for r in &results {
            assert_eq!(r.emoji.name, "treat for claude");
            assert_eq!(r.score, 10000);
            assert!(!r.emoji.char.is_empty());
        }
    }

    #[test]
    fn test_treats_search_case_insensitive() {
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("TREATS", &EMOJIS, 5);
        assert_eq!(results.len(), 5);
        assert_eq!(results[0].emoji.name, "treat for claude");
    }

    #[test]
    fn test_generate_treat_results_returns_correct_count() {
        let results = generate_treat_results(7);
        assert_eq!(results.len(), 7);
    }

    #[test]
    fn test_generate_treat_results_unique() {
        let results = generate_treat_results(20);
        let chars: HashSet<_> = results.iter().map(|r| r.emoji.char.clone()).collect();
        assert_eq!(chars.len(), results.len(), "All treats should be unique");
    }

    #[test]
    fn test_generate_treat_results_score() {
        let results = generate_treat_results(5);
        for r in &results {
            assert_eq!(r.score, 10000);
            assert_eq!(r.emoji.name, "treat for claude");
        }
    }

    #[test]
    fn test_rng_produces_different_values() {
        let mut rng = Rng::new();
        let a = rng.next();
        let b = rng.next();
        assert_ne!(a, b, "RNG should produce different sequential values");
    }
}
