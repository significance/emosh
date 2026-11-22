//! Plain-text CLI output for kaomoji queries.

use super::{random_face, search};
use crate::emoji::search::SearchResult;
use crate::treats::{generate_kaomoji_treat_results, Rng};
use anyhow::Result;
use std::io::Write;
use unicode_width::UnicodeWidthStr;

/// Formats results one per line: the face padded to the widest face, then its name.
///
/// Widths are measured in terminal columns, not bytes or chars.
pub fn format_results(results: &[SearchResult]) -> Vec<String> {
    let widest = results
        .iter()
        .map(|r| UnicodeWidthStr::width(r.emoji.char.as_str()))
        .max()
        .unwrap_or(0);

    results
        .iter()
        .map(|r| {
            let padding = widest - UnicodeWidthStr::width(r.emoji.char.as_str());
            format!("{}{}  {}", r.emoji.char, " ".repeat(padding), r.emoji.name)
        })
        .collect()
}

/// Copies `text`, downgrading a clipboard failure to a warning on stderr.
fn copy_or_warn(copier: &mut dyn FnMut(&str) -> Result<()>, text: &str) {
    if let Err(err) = copier(text) {
        eprintln!("warning: could not copy to clipboard: {err:#}");
    }
}

/// Options for a kaomoji CLI run.
#[derive(Debug, Clone)]
pub struct QueryOptions<'a> {
    /// Maximum number of results to print
    pub limit: usize,
    /// Whether to copy the first result to the clipboard
    pub copy: bool,
    /// Omit the explanation suffix on treats
    pub clean: bool,
    /// Name used in treat explanations
    pub user: &'a str,
}

impl Default for QueryOptions<'_> {
    fn default() -> Self {
        Self {
            limit: 7,
            copy: true,
            clean: false,
            user: "the user",
        }
    }
}

/// Runs a kaomoji query, writing the result lines to `out` and copying the first
/// face with `copier` unless `copy` is false.
///
/// A clipboard failure is reported on stderr but never aborts the run, so the
/// faces are still printed on headless systems.
pub fn run_query(
    query: &str,
    options: &QueryOptions,
    copier: &mut dyn FnMut(&str) -> Result<()>,
    out: &mut dyn Write,
) -> Result<()> {
    if query.trim().eq_ignore_ascii_case("random") {
        return run_random(Rng::new().next(), options.copy, copier, out);
    }

    if query.trim().eq_ignore_ascii_case("treats") {
        let treat = generate_kaomoji_treat_results(1, options.clean, options.user)
            .remove(0)
            .emoji
            .char;
        if options.copy {
            copy_or_warn(copier, &treat);
        }
        writeln!(out, "{treat}")?;
        return Ok(());
    }

    let results = search(query, options.limit);

    if results.is_empty() {
        writeln!(out, "No kaomoji found for '{query}'")?;
        return Ok(());
    }

    if options.copy {
        copy_or_warn(copier, &results[0].emoji.char);
    }

    for line in format_results(&results) {
        writeln!(out, "{line}")?;
    }

    Ok(())
}

/// Prints one random face (no name, no explanation), copying it unless `copy` is false.
pub fn run_random(
    seed: u64,
    copy: bool,
    copier: &mut dyn FnMut(&str) -> Result<()>,
    out: &mut dyn Write,
) -> Result<()> {
    let face = random_face(seed);
    if copy {
        copy_or_warn(copier, &face.char);
    }
    writeln!(out, "{}", face.char)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use unicode_width::UnicodeWidthStr;

    fn run(query: &str, copy: bool) -> (String, Vec<String>) {
        let mut copied = Vec::new();
        let mut out = Vec::new();
        run_query(
            query,
            &QueryOptions {
                copy,
                ..QueryOptions::default()
            },
            &mut |text| {
                copied.push(text.to_string());
                Ok(())
            },
            &mut out,
        )
        .unwrap();
        (String::from_utf8(out).unwrap(), copied)
    }

    #[test]
    fn test_format_results_pads_faces_to_equal_display_width() {
        let results = crate::kaomoji::search("happy", 7);
        let lines = format_results(&results);
        assert_eq!(lines.len(), 7);
        let name_columns: Vec<usize> = lines
            .iter()
            .zip(&results)
            .map(|(line, r)| {
                let face_end = line.find(&r.emoji.name).unwrap();
                UnicodeWidthStr::width(&line[..face_end])
            })
            .collect();
        assert!(name_columns.windows(2).all(|w| w[0] == w[1]), "{lines:?}");
    }

    #[test]
    fn test_run_query_prints_lines_and_copies_first() {
        let (out, copied) = run("shrug", true);
        assert!(out.lines().next().unwrap().starts_with("¯\\_(ツ)_/¯"));
        assert!(out.lines().next().unwrap().ends_with("shrug"));
        assert_eq!(copied, vec!["¯\\_(ツ)_/¯"]);
    }

    #[test]
    fn test_run_query_no_copy_skips_clipboard() {
        let (out, copied) = run("shrug", false);
        assert!(!out.is_empty());
        assert!(copied.is_empty());
    }

    #[test]
    fn test_run_query_without_matches_reports_it() {
        let (out, copied) = run("zzzzqqqq", true);
        assert_eq!(out, "No kaomoji found for 'zzzzqqqq'\n");
        assert!(copied.is_empty());
    }

    #[test]
    fn test_run_query_clipboard_failure_still_prints() {
        let mut out = Vec::new();
        let result = run_query(
            "shrug",
            &QueryOptions::default(),
            &mut |_| anyhow::bail!("no clipboard"),
            &mut out,
        );
        assert!(result.is_ok(), "clipboard failure must not abort");
        assert!(!out.is_empty());
    }

    #[test]
    fn test_run_random_prints_only_the_face_and_copies_it() {
        let mut copied = Vec::new();
        let mut out = Vec::new();
        run_random(
            7,
            true,
            &mut |t| {
                copied.push(t.to_string());
                Ok(())
            },
            &mut out,
        )
        .unwrap();
        let face = crate::kaomoji::random_face(7);
        assert_eq!(String::from_utf8(out).unwrap(), format!("{}\n", face.char));
        assert_eq!(copied, vec![face.char.clone()]);
    }

    #[test]
    fn test_run_random_no_copy_skips_clipboard() {
        let mut out = Vec::new();
        run_random(7, false, &mut |_| panic!("must not copy"), &mut out).unwrap();
        assert!(!out.is_empty());
    }

    #[test]
    fn test_run_query_random_keyword_prints_a_single_bare_face() {
        let (out, copied) = run("Random", true);
        assert_eq!(out.lines().count(), 1);
        assert_eq!(copied.len(), 1);
        assert_eq!(out, format!("{}\n", copied[0]));
    }

    fn run_with(query: &str, options: &QueryOptions) -> (String, Vec<String>) {
        let mut copied = Vec::new();
        let mut out = Vec::new();
        run_query(
            query,
            options,
            &mut |text| {
                copied.push(text.to_string());
                Ok(())
            },
            &mut out,
        )
        .unwrap();
        (String::from_utf8(out).unwrap(), copied)
    }

    #[test]
    fn test_run_query_treats_prints_and_copies_one_signed_treat() {
        let options = QueryOptions {
            user: "sig",
            ..QueryOptions::default()
        };
        let (out, copied) = run_with("treats", &options);
        assert_eq!(out.lines().count(), 1);
        assert_eq!(out, format!("{}\n", copied[0]));
        assert!(out.starts_with(crate::treats::TREAT_WATERMARK));
        assert!(out.contains("a treat from sig"));
    }

    #[test]
    fn test_run_query_treats_clean_has_no_explanation() {
        let options = QueryOptions {
            clean: true,
            copy: false,
            ..QueryOptions::default()
        };
        let (out, copied) = run_with(" Treats ", &options);
        assert!(out.starts_with(crate::treats::TREAT_WATERMARK));
        assert!(!out.contains("a treat from"));
        assert!(copied.is_empty());
    }
}
