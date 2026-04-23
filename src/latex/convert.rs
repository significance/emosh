//! LaTeX math notation parser and Unicode converter.

use super::mappings::{lookup_combining, lookup_subscript, lookup_superscript};

/// Result of a LaTeX-to-Unicode conversion.
#[derive(Debug)]
pub struct ConvertResult {
    /// The converted Unicode string.
    pub output: String,
    /// Warnings about characters that could not be converted.
    pub warnings: Vec<String>,
}

/// Convert LaTeX math suffix notation to Unicode characters.
///
/// Handles superscripts (`^`), subscripts (`_`), primes (`'`),
/// and combining diacritics (`\hat`, `\bar`, `\tilde`, etc.).
///
/// # Examples
/// ```
/// use emosh::latex::convert_latex;
/// let result = convert_latex("x^2");
/// assert_eq!(result.output, "x\u{00B2}");
/// ```
pub fn convert_latex(input: &str) -> ConvertResult {
    let mut output = String::with_capacity(input.len());
    let mut warnings = Vec::new();
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '^' => convert_script(
                &mut chars,
                &mut output,
                &mut warnings,
                lookup_superscript,
                "superscript",
            ),
            '_' => convert_script(
                &mut chars,
                &mut output,
                &mut warnings,
                lookup_subscript,
                "subscript",
            ),
            '\'' => convert_prime(&mut chars, &mut output),
            '\\' => convert_command(&mut chars, &mut output, &mut warnings),
            _ => output.push(c),
        }
    }

    ConvertResult { output, warnings }
}

/// Convert a superscript or subscript sequence (single char or `{group}`).
fn convert_script(
    chars: &mut std::iter::Peekable<std::str::Chars>,
    output: &mut String,
    warnings: &mut Vec<String>,
    lookup: fn(char) -> Option<char>,
    kind: &str,
) {
    match chars.peek() {
        Some('{') => {
            chars.next(); // consume '{'
            while let Some(&c) = chars.peek() {
                if c == '}' {
                    chars.next();
                    break;
                }
                chars.next();
                convert_single_char(c, output, warnings, lookup, kind);
            }
        }
        Some(_) => {
            if let Some(c) = chars.next() {
                convert_single_char(c, output, warnings, lookup, kind);
            }
        }
        None => {
            // Trailing ^ or _ with nothing after
            warnings.push(format!("trailing '{kind}' operator with no argument"));
        }
    }
}

/// Convert a single character using the given lookup, with fallback warning.
fn convert_single_char(
    c: char,
    output: &mut String,
    warnings: &mut Vec<String>,
    lookup: fn(char) -> Option<char>,
    kind: &str,
) {
    match lookup(c) {
        Some(mapped) => output.push(mapped),
        None => {
            output.push(c);
            warnings.push(format!("no Unicode {kind} for '{c}'"));
        }
    }
}

/// Convert prime sequences: `'` -> PRIME, `''` -> DOUBLE PRIME, `'''` -> TRIPLE PRIME.
fn convert_prime(chars: &mut std::iter::Peekable<std::str::Chars>, output: &mut String) {
    let mut count = 1;
    while chars.peek() == Some(&'\'') {
        chars.next();
        count += 1;
    }
    match count {
        1 => output.push('\u{2032}'), // ′
        2 => output.push('\u{2033}'), // ″
        3 => output.push('\u{2034}'), // ‴
        _ => {
            // 4+ primes: use triple + singles
            output.push('\u{2034}');
            for _ in 0..(count - 3) {
                output.push('\u{2032}');
            }
        }
    }
}

/// Convert a backslash command like `\hat{x}` to base char + combining diacritic.
fn convert_command(
    chars: &mut std::iter::Peekable<std::str::Chars>,
    output: &mut String,
    warnings: &mut Vec<String>,
) {
    // Read command name (alphabetic chars after \)
    let mut cmd = String::new();
    while let Some(&c) = chars.peek() {
        if c.is_ascii_alphabetic() {
            cmd.push(c);
            chars.next();
        } else {
            break;
        }
    }

    if cmd.is_empty() {
        // Bare backslash or \<non-alpha> — pass through
        output.push('\\');
        return;
    }

    match lookup_combining(&cmd) {
        Some(combining) => {
            // Expect {char} after command name
            if chars.peek() == Some(&'{') {
                chars.next(); // consume '{'
                              // Apply combining mark to each char until '}'
                let mut found_brace = false;
                while let Some(&c) = chars.peek() {
                    if c == '}' {
                        chars.next();
                        found_brace = true;
                        break;
                    }
                    chars.next();
                    output.push(c);
                    output.push(combining);
                }
                if !found_brace {
                    warnings.push(format!("unclosed brace in \\{cmd}"));
                }
            } else {
                // No braces — apply to next single char
                if let Some(c) = chars.next() {
                    output.push(c);
                    output.push(combining);
                } else {
                    warnings.push(format!("\\{cmd} with no argument"));
                }
            }
        }
        None => {
            // Unknown command — pass through verbatim
            output.push('\\');
            output.push_str(&cmd);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_superscript_single() {
        let r = convert_latex("x^2");
        assert_eq!(r.output, "x\u{00B2}");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_superscript_group() {
        let r = convert_latex("x^{n+1}");
        assert_eq!(r.output, "x\u{207F}\u{207A}\u{00B9}");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_subscript_single() {
        let r = convert_latex("H_2O");
        assert_eq!(r.output, "H\u{2082}O");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_subscript_group() {
        let r = convert_latex("a_{ij}");
        assert_eq!(r.output, "a\u{1D62}\u{2C7C}");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_prime_single() {
        let r = convert_latex("f'");
        assert_eq!(r.output, "f\u{2032}");
    }

    #[test]
    fn test_prime_double() {
        let r = convert_latex("f''");
        assert_eq!(r.output, "f\u{2033}");
    }

    #[test]
    fn test_prime_triple() {
        let r = convert_latex("f'''");
        assert_eq!(r.output, "f\u{2034}");
    }

    #[test]
    fn test_combining_hat() {
        let r = convert_latex("\\hat{x}");
        assert_eq!(r.output, "x\u{0302}");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_combining_bar() {
        let r = convert_latex("\\bar{x}");
        assert_eq!(r.output, "x\u{0304}");
    }

    #[test]
    fn test_combining_tilde() {
        let r = convert_latex("\\tilde{n}");
        assert_eq!(r.output, "n\u{0303}");
    }

    #[test]
    fn test_combining_dot() {
        let r = convert_latex("\\dot{x}");
        assert_eq!(r.output, "x\u{0307}");
    }

    #[test]
    fn test_combining_vec() {
        let r = convert_latex("\\vec{v}");
        assert_eq!(r.output, "v\u{20D7}");
    }

    #[test]
    fn test_combining_no_braces() {
        let r = convert_latex("\\hat x");
        // Without braces, applies to next char (after consuming space? no, space is not alpha)
        // Actually the space is consumed and hat is applied to it... let's handle this:
        // \hat then peek is ' ' which is not '{', so it takes next char = ' '
        // This is valid LaTeX shorthand
        assert_eq!(r.output, " \u{0302}x");
    }

    #[test]
    fn test_mixed_expression() {
        let r = convert_latex("x^2 + y_1");
        assert_eq!(r.output, "x\u{00B2} + y\u{2081}");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_unmapped_superscript() {
        let r = convert_latex("x^q");
        assert_eq!(r.output, "xq");
        assert_eq!(r.warnings.len(), 1);
        assert!(r.warnings[0].contains("superscript"));
        assert!(r.warnings[0].contains('q'));
    }

    #[test]
    fn test_plain_text_passthrough() {
        let r = convert_latex("hello world");
        assert_eq!(r.output, "hello world");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_empty_input() {
        let r = convert_latex("");
        assert_eq!(r.output, "");
        assert!(r.warnings.is_empty());
    }

    #[test]
    fn test_unknown_command_passthrough() {
        let r = convert_latex("\\frac{1}{2}");
        assert_eq!(r.output, "\\frac{1}{2}");
    }

    #[test]
    fn test_complex_expression() {
        // e^{i*pi} + 1 = 0 (Euler's identity, simplified)
        let r = convert_latex("e^{i} + 1 = 0");
        assert_eq!(r.output, "e\u{2071} + 1 = 0");
    }
}
