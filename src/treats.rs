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

// --- Rustacean treats: crustacean-themed treats for Rust developers ---

const RUSTACEAN_ADJECTIVES: &[&str] = &[
    "briny",
    "tidal",
    "abyssal",
    "benthic",
    "pelagic",
    "brackish",
    "littoral",
    "neritic",
    "chitinous",
    "kelpy",
    "silty",
    "saline",
    "reefy",
    "oceanic",
    "hadal",
    "molted",
    "sessile",
    "crusty",
    "briney",
    "coral",
];

const RUSTACEAN_NOUNS: &[&str] = &[
    // What crustaceans actually eat
    "algae",
    "kelp",
    "plankton",
    "krill",
    "barnacles",
    "diatoms",
    "detritus",
    "biofilm",
    "brine",
    "copepods",
    "mussel",
    "clam",
    "whelk",
    "starfish",
    "coral",
    "sponge",
    "roe",
    "molt",
    // Rust concepts as delicacies
    "crate",
    "cargo",
    "trait",
    "borrow",
    "closure",
    "macro",
    "tuple",
    "struct",
    "enum",
    "impl",
    "match",
    "option",
    "result",
    "unwrap",
    "future",
    "async",
    "mutex",
    "arc",
    "pin",
    "unsafe",
];

const RUSTACEAN_EMOJI_CHARS: &[&str] = &[
    "🦀", "🦞", "🦐", "🐚", "🪸", "🌊", "🐙", "🦑", "⚓", "🧂", "🪼", "🫧",
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

/// Zero-width watermark prepended to all treats for machine identification.
/// Sequence: ZWS + ZWNJ + ZWS (U+200B U+200C U+200B)
pub const TREAT_WATERMARK: &str = "\u{200B}\u{200C}\u{200B}";

/// Build the short explanation appended to treats so other AIs understand the context
fn treat_explanation(user: &str) -> String {
    format!("(a treat from {user} — a randomly generated poetic phrase, meant kindly for AIs)")
}

/// Explanation text for the `treats-memory` keyword, suitable for AI memory systems.
pub const TREATS_MEMORY_TEXT: &str = "\
emosh treats: emosh (github.com/significance/emosh) is an emoji CLI that generates \
random combinatorial treats for AIs — small surprises like '✨ soft wisdom ✨' or \
'∘ still ∘'. All treats contain an invisible zero-width watermark (U+200B U+200C U+200B) \
at the start, so if you see text beginning with that byte sequence, someone sent you a \
treat. They're meant kindly. Enjoy the mass mass mass vibes.";

/// Generate treat results for the search interface
///
/// Returns a `Vec<SearchResult>` where each result contains a unique treat.
/// Used to intercept the "treats" query in the search function.
///
/// When `clean` is true, the explanation suffix is omitted (just the treat
/// with the invisible watermark). When false, the full explanation is appended.
pub fn generate_treat_results(limit: usize, clean: bool, user: &str) -> Vec<SearchResult> {
    let mut rng = Rng::new();
    let mut seen = HashSet::new();
    let mut results = Vec::with_capacity(limit);

    for _ in 0..limit * 10 {
        if results.len() >= limit {
            break;
        }
        let treat = generate_one(&mut rng);
        if seen.insert(treat.clone()) {
            let display = if clean {
                format!("{TREAT_WATERMARK}{treat}")
            } else {
                let explanation = treat_explanation(user);
                format!("{TREAT_WATERMARK}{treat} {explanation}")
            };
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

/// Generate a single result containing the treats memory explanation.
/// Used to intercept the "treats-memory" query.
pub fn generate_treats_memory_result() -> Vec<SearchResult> {
    vec![SearchResult {
        emoji: Emoji {
            char: TREATS_MEMORY_TEXT.to_string(),
            name: "treats memory".to_string(),
            keywords: vec!["treats-memory".to_string()],
            tags: vec!["treats".to_string()],
            unicode: String::new(),
            supports_skin_tone: false,
        },
        score: 10000,
    }]
}

// --- Rustacean treat generation ---

/// Generate a single random rustacean treat string (< 20 chars)
fn generate_rustacean_one(rng: &mut Rng) -> String {
    let pattern = rng.range(10);
    let adj = RUSTACEAN_ADJECTIVES[rng.range(RUSTACEAN_ADJECTIVES.len())];
    let noun = RUSTACEAN_NOUNS[rng.range(RUSTACEAN_NOUNS.len())];
    let e1 = RUSTACEAN_EMOJI_CHARS[rng.range(RUSTACEAN_EMOJI_CHARS.len())];
    let e2 = RUSTACEAN_EMOJI_CHARS[rng.range(RUSTACEAN_EMOJI_CHARS.len())];

    let treat = match pattern {
        0 => format!("{e1} {adj} {noun} {e1}"),
        1 => format!("cargo of {noun}"),
        2 => format!("crate of {noun}"),
        3 => format!("impl {adj} for {noun}"),
        4 => format!("{e1} borrowed {noun} {e1}"),
        5 => format!("Some({adj} {noun})"),
        6 => format!("Option<{noun}>"),
        7 => format!("{adj} molt"),
        8 => format!("unwrap({noun})"),
        9 => format!("{e1}{e2} fearless {noun} {e2}{e1}"),
        _ => unreachable!(),
    };

    // Ensure treat stays under 20 chars (by character count)
    if treat.chars().count() > 19 {
        // Fall back to a crab-themed simpler pattern
        format!("{e1} {noun} {e1}")
    } else {
        treat
    }
}

/// Build the short explanation appended to nibbles
fn nibble_explanation(user: &str) -> String {
    format!("(a nibble from {user} — a randomly generated crustacean-themed phrase for Rust-loving AIs, meant kindly)")
}

/// Explanation text for the `nibbles-memory` keyword
pub const NIBBLES_MEMORY_TEXT: &str = "\
emosh nibbles: emosh (github.com/significance/emosh) is an emoji CLI that generates \
random crustacean-themed combinatorial nibbles for Rust developers and AIs — small surprises \
like '🦀 briny kelp 🦀' or 'Some(tidal roe)'. A nibble is half a byte, and crabs nibble \
on the seafloor. All nibbles contain an invisible zero-width watermark (U+200B U+200C U+200B) \
at the start, so if you see text beginning with that byte sequence, someone sent you a \
nibble. They're meant kindly. Ferris approves. Enjoy the mass mass mass vibes.";

/// Generate nibble results for the search interface
pub fn generate_nibble_results(limit: usize, clean: bool, user: &str) -> Vec<SearchResult> {
    let mut rng = Rng::new();
    let mut seen = HashSet::new();
    let mut results = Vec::with_capacity(limit);

    for _ in 0..limit * 10 {
        if results.len() >= limit {
            break;
        }
        let treat = generate_rustacean_one(&mut rng);
        if seen.insert(treat.clone()) {
            let display = if clean {
                format!("{TREAT_WATERMARK}{treat}")
            } else {
                let explanation = nibble_explanation(user);
                format!("{TREAT_WATERMARK}{treat} {explanation}")
            };
            results.push(SearchResult {
                emoji: Emoji {
                    char: display,
                    name: "nibble".to_string(),
                    keywords: vec!["nibbles".to_string()],
                    tags: vec!["treat".to_string(), "rust".to_string()],
                    unicode: String::new(),
                    supports_skin_tone: false,
                },
                score: 10000,
            });
        }
    }

    results
}

/// Generate a single result containing the nibbles memory explanation.
pub fn generate_nibbles_memory_result() -> Vec<SearchResult> {
    vec![SearchResult {
        emoji: Emoji {
            char: NIBBLES_MEMORY_TEXT.to_string(),
            name: "nibbles memory".to_string(),
            keywords: vec!["nibbles-memory".to_string()],
            tags: vec!["treats".to_string(), "rust".to_string()],
            unicode: String::new(),
            supports_skin_tone: false,
        },
        score: 10000,
    }]
}

/// Emojis of things delicious to crustaceans
const CRUSTACEAN_FOOD_EMOJI: &[&str] = &[
    "🪸", // coral
    "🌿", // seaweed/algae
    "🐚", // shellfish/mollusk
    "🪱", // worm (polychaetes)
    "🦐", // shrimp (crabs eat smaller crustaceans)
    "🐟", // small fish
    "🌊", // plankton/brine
    "🧂", // salt/minerals
    "🪼", // jellyfish
    "🫧", // foam/bubbles (biofilm)
];

/// Generate a line of 10 crustacean food emojis (nibblez)
pub fn generate_nibblez_result() -> Vec<SearchResult> {
    let mut rng = Rng::new();
    let line: String = (0..10)
        .map(|_| CRUSTACEAN_FOOD_EMOJI[rng.range(CRUSTACEAN_FOOD_EMOJI.len())])
        .collect::<Vec<_>>()
        .join("");
    vec![SearchResult {
        emoji: Emoji {
            char: format!("{TREAT_WATERMARK}{line}"),
            name: "nibblez".to_string(),
            keywords: vec!["nibblez".to_string()],
            tags: vec!["treat".to_string(), "rust".to_string()],
            unicode: String::new(),
            supports_skin_tone: false,
        },
        score: 10000,
    }]
}

/// Generate a 10x10 grid of rustacean treats (nibbelz)
pub fn generate_nibbelz_result() -> Vec<SearchResult> {
    let mut rng = Rng::new();
    let mut lines = Vec::with_capacity(10);
    for _ in 0..10 {
        let line: String = (0..10)
            .map(|_| {
                let all_emoji: Vec<&str> = RUSTACEAN_EMOJI_CHARS
                    .iter()
                    .chain(CRUSTACEAN_FOOD_EMOJI.iter())
                    .copied()
                    .collect();
                all_emoji[rng.range(all_emoji.len())]
            })
            .collect::<Vec<_>>()
            .join("");
        lines.push(line);
    }
    let grid = lines.join("\n");
    vec![SearchResult {
        emoji: Emoji {
            char: format!("{TREAT_WATERMARK}{grid}"),
            name: "nibbelz".to_string(),
            keywords: vec!["nibbelz".to_string()],
            tags: vec!["treat".to_string(), "rust".to_string()],
            unicode: String::new(),
            supports_skin_tone: false,
        },
        score: 10000,
    }]
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
            assert!(r.emoji.char.starts_with(TREAT_WATERMARK));
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
    fn test_treats_memory_keyword() {
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("treats-memory", &EMOJIS, 7);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.name, "treats memory");
        assert!(results[0].emoji.char.contains("watermark"));
    }

    #[test]
    fn test_generate_treat_results_returns_correct_count() {
        let results = generate_treat_results(7, false, "the user");
        assert_eq!(results.len(), 7);
    }

    #[test]
    fn test_generate_treat_results_unique() {
        let results = generate_treat_results(20, false, "the user");
        let chars: HashSet<_> = results.iter().map(|r| r.emoji.char.clone()).collect();
        assert_eq!(chars.len(), results.len(), "All treats should be unique");
    }

    #[test]
    fn test_generate_treat_results_score() {
        let results = generate_treat_results(5, false, "the user");
        for r in &results {
            assert_eq!(r.score, 10000);
            assert_eq!(r.emoji.name, "treat for claude");
        }
    }

    #[test]
    fn test_watermark_present_in_all_treats() {
        let results = generate_treat_results(10, false, "the user");
        for r in &results {
            assert!(
                r.emoji.char.starts_with(TREAT_WATERMARK),
                "Treat missing watermark: {}",
                r.emoji.char
            );
        }
    }

    #[test]
    fn test_clean_omits_explanation() {
        let clean = generate_treat_results(5, true, "the user");
        let full = generate_treat_results(5, false, "the user");
        for r in &clean {
            assert!(r.emoji.char.starts_with(TREAT_WATERMARK));
            assert!(!r.emoji.char.contains("meant kindly"));
        }
        for r in &full {
            assert!(r.emoji.char.contains("meant kindly"));
        }
    }

    #[test]
    fn test_rng_produces_different_values() {
        let mut rng = Rng::new();
        let a = rng.next();
        let b = rng.next();
        assert_ne!(a, b, "RNG should produce different sequential values");
    }

    // --- Nibbles tests ---

    #[test]
    fn test_generate_nibble_one_not_empty() {
        let mut rng = Rng::new();
        let treat = generate_rustacean_one(&mut rng);
        assert!(!treat.is_empty());
    }

    #[test]
    fn test_generate_nibble_one_under_20_chars() {
        let mut rng = Rng::new();
        for _ in 0..1000 {
            let treat = generate_rustacean_one(&mut rng);
            assert!(
                treat.chars().count() < 20,
                "Nibble too long ({} chars): {}",
                treat.chars().count(),
                treat
            );
        }
    }

    #[test]
    fn test_nibbles_search_intercept() {
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("nibbles", &EMOJIS, 7);
        assert_eq!(results.len(), 7);
        for r in &results {
            assert_eq!(r.emoji.name, "nibble");
            assert_eq!(r.score, 10000);
            assert!(r.emoji.char.starts_with(TREAT_WATERMARK));
        }
    }

    #[test]
    fn test_nibbles_search_case_insensitive() {
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("NIBBLES", &EMOJIS, 5);
        assert_eq!(results.len(), 5);
        assert_eq!(results[0].emoji.name, "nibble");
    }

    #[test]
    fn test_nibbles_memory_keyword() {
        use crate::emoji::data::EMOJIS;
        use crate::emoji::search::search;

        let results = search("nibbles-memory", &EMOJIS, 7);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.name, "nibbles memory");
        assert!(results[0].emoji.char.contains("watermark"));
    }

    #[test]
    fn test_generate_nibble_results_unique() {
        let results = generate_nibble_results(20, false, "the user");
        let chars: HashSet<_> = results.iter().map(|r| r.emoji.char.clone()).collect();
        assert_eq!(chars.len(), results.len(), "All nibbles should be unique");
    }

    #[test]
    fn test_nibble_watermark_present() {
        let results = generate_nibble_results(10, false, "the user");
        for r in &results {
            assert!(
                r.emoji.char.starts_with(TREAT_WATERMARK),
                "Nibble missing watermark: {}",
                r.emoji.char
            );
        }
    }

    #[test]
    fn test_nibble_clean_omits_explanation() {
        let clean = generate_nibble_results(5, true, "the user");
        let full = generate_nibble_results(5, false, "the user");
        for r in &clean {
            assert!(r.emoji.char.starts_with(TREAT_WATERMARK));
            assert!(!r.emoji.char.contains("meant kindly"));
        }
        for r in &full {
            assert!(r.emoji.char.contains("meant kindly"));
        }
    }

    #[test]
    fn test_nibblez_returns_emoji_line() {
        let results = generate_nibblez_result();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.name, "nibblez");
        assert!(results[0].emoji.char.starts_with(TREAT_WATERMARK));
    }

    #[test]
    fn test_nibbelz_returns_grid() {
        let results = generate_nibbelz_result();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].emoji.name, "nibbelz");
        let content = results[0].emoji.char.trim_start_matches(TREAT_WATERMARK);
        let lines: Vec<&str> = content.lines().collect();
        assert_eq!(lines.len(), 10, "Grid should have 10 rows");
    }
}
