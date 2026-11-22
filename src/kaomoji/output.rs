//! Plain-text CLI output for kaomoji queries.

use super::search;
use crate::emoji::search::SearchResult;
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

/// Runs a kaomoji query, writing the result lines to `out` and copying the first
/// face with `copier` unless `copy` is false.
///
/// A clipboard failure is reported on stderr but never aborts the run, so the
/// faces are still printed on headless systems.
pub fn run_query(
    query: &str,
    limit: usize,
    copy: bool,
    copier: &mut dyn FnMut(&str) -> Result<()>,
    out: &mut dyn Write,
) -> Result<()> {
    let results = search(query, limit);

    if results.is_empty() {
        writeln!(out, "No kaomoji found for '{query}'")?;
        return Ok(());
    }

    if copy {
        if let Err(err) = copier(&results[0].emoji.char) {
            eprintln!("warning: could not copy to clipboard: {err:#}");
        }
    }

    for line in format_results(&results) {
        writeln!(out, "{line}")?;
    }

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
            7,
            copy,
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
            7,
            true,
            &mut |_| anyhow::bail!("no clipboard"),
            &mut out,
        );
        assert!(result.is_ok(), "clipboard failure must not abort");
        assert!(!out.is_empty());
    }
}
