//! Unicode mapping tables for superscripts, subscripts, and combining diacritics.

/// Superscript character mappings (ASCII char -> Unicode superscript).
pub const SUPERSCRIPTS: &[(char, char)] = &[
    // Digits
    ('0', '\u{2070}'),
    ('1', '\u{00B9}'),
    ('2', '\u{00B2}'),
    ('3', '\u{00B3}'),
    ('4', '\u{2074}'),
    ('5', '\u{2075}'),
    ('6', '\u{2076}'),
    ('7', '\u{2077}'),
    ('8', '\u{2078}'),
    ('9', '\u{2079}'),
    // Operators
    ('+', '\u{207A}'),
    ('-', '\u{207B}'),
    ('=', '\u{207C}'),
    ('(', '\u{207D}'),
    (')', '\u{207E}'),
    // Lowercase letters
    ('a', '\u{1D43}'),
    ('b', '\u{1D47}'),
    ('c', '\u{1D9C}'),
    ('d', '\u{1D48}'),
    ('e', '\u{1D49}'),
    ('f', '\u{1DA0}'),
    ('g', '\u{1D4D}'),
    ('h', '\u{02B0}'),
    ('i', '\u{2071}'),
    ('j', '\u{02B2}'),
    ('k', '\u{1D4F}'),
    ('l', '\u{02E1}'),
    ('m', '\u{1D50}'),
    ('n', '\u{207F}'),
    ('o', '\u{1D52}'),
    ('p', '\u{1D56}'),
    ('r', '\u{02B3}'),
    ('s', '\u{02E2}'),
    ('t', '\u{1D57}'),
    ('u', '\u{1D58}'),
    ('v', '\u{1D5B}'),
    ('w', '\u{02B7}'),
    ('x', '\u{02E3}'),
    ('y', '\u{02B8}'),
    ('z', '\u{1DBB}'),
];

/// Subscript character mappings (ASCII char -> Unicode subscript).
pub const SUBSCRIPTS: &[(char, char)] = &[
    // Digits
    ('0', '\u{2080}'),
    ('1', '\u{2081}'),
    ('2', '\u{2082}'),
    ('3', '\u{2083}'),
    ('4', '\u{2084}'),
    ('5', '\u{2085}'),
    ('6', '\u{2086}'),
    ('7', '\u{2087}'),
    ('8', '\u{2088}'),
    ('9', '\u{2089}'),
    // Operators
    ('+', '\u{208A}'),
    ('-', '\u{208B}'),
    ('=', '\u{208C}'),
    ('(', '\u{208D}'),
    (')', '\u{208E}'),
    // Lowercase letters (only those with Unicode subscript forms)
    ('a', '\u{2090}'),
    ('e', '\u{2091}'),
    ('h', '\u{2095}'),
    ('i', '\u{1D62}'),
    ('j', '\u{2C7C}'),
    ('k', '\u{2096}'),
    ('l', '\u{2097}'),
    ('m', '\u{2098}'),
    ('n', '\u{2099}'),
    ('o', '\u{2092}'),
    ('p', '\u{209A}'),
    ('r', '\u{1D63}'),
    ('s', '\u{209B}'),
    ('t', '\u{209C}'),
    ('u', '\u{1D64}'),
    ('v', '\u{1D65}'),
    ('x', '\u{2093}'),
];

/// Combining diacritics for LaTeX commands like \hat, \bar, etc.
pub const COMBINING_DIACRITICS: &[(&str, char)] = &[
    ("hat", '\u{0302}'),
    ("bar", '\u{0304}'),
    ("tilde", '\u{0303}'),
    ("dot", '\u{0307}'),
    ("ddot", '\u{0308}'),
    ("vec", '\u{20D7}'),
    ("check", '\u{030C}'),
    ("breve", '\u{0306}'),
    ("acute", '\u{0301}'),
    ("grave", '\u{0300}'),
    ("ring", '\u{030A}'),
];

/// Look up the Unicode superscript for an ASCII character.
pub fn lookup_superscript(c: char) -> Option<char> {
    SUPERSCRIPTS
        .iter()
        .find(|(from, _)| *from == c)
        .map(|(_, to)| *to)
}

/// Look up the Unicode subscript for an ASCII character.
pub fn lookup_subscript(c: char) -> Option<char> {
    SUBSCRIPTS
        .iter()
        .find(|(from, _)| *from == c)
        .map(|(_, to)| *to)
}

/// Look up the combining diacritic for a LaTeX command name.
pub fn lookup_combining(name: &str) -> Option<char> {
    COMBINING_DIACRITICS
        .iter()
        .find(|(cmd, _)| *cmd == name)
        .map(|(_, to)| *to)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_superscript_digits() {
        assert_eq!(lookup_superscript('0'), Some('\u{2070}'));
        assert_eq!(lookup_superscript('1'), Some('\u{00B9}'));
        assert_eq!(lookup_superscript('2'), Some('\u{00B2}'));
        assert_eq!(lookup_superscript('9'), Some('\u{2079}'));
    }

    #[test]
    fn test_superscript_letters() {
        assert_eq!(lookup_superscript('n'), Some('\u{207F}'));
        assert_eq!(lookup_superscript('a'), Some('\u{1D43}'));
        assert_eq!(lookup_superscript('q'), None); // No Unicode superscript q
    }

    #[test]
    fn test_superscript_operators() {
        assert_eq!(lookup_superscript('+'), Some('\u{207A}'));
        assert_eq!(lookup_superscript('-'), Some('\u{207B}'));
    }

    #[test]
    fn test_subscript_digits() {
        assert_eq!(lookup_subscript('0'), Some('\u{2080}'));
        assert_eq!(lookup_subscript('2'), Some('\u{2082}'));
    }

    #[test]
    fn test_subscript_letters() {
        assert_eq!(lookup_subscript('a'), Some('\u{2090}'));
        assert_eq!(lookup_subscript('i'), Some('\u{1D62}'));
        assert_eq!(lookup_subscript('b'), None); // No Unicode subscript b
    }

    #[test]
    fn test_combining_diacritics() {
        assert_eq!(lookup_combining("hat"), Some('\u{0302}'));
        assert_eq!(lookup_combining("tilde"), Some('\u{0303}'));
        assert_eq!(lookup_combining("vec"), Some('\u{20D7}'));
        assert_eq!(lookup_combining("unknown"), None);
    }
}
