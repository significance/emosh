use crate::emoji::apply_skin_tone;
use crate::emoji::search::SearchResult;
use crate::ui::app::{App, Mode};
use ratatui::{
    layout::{Constraint, Direction, Layout as RatatuiLayout, Rect},
    style::{Color, Style},
    text::{Line, Span},
    widgets::Paragraph,
    Frame,
};
use unicode_width::{UnicodeWidthChar, UnicodeWidthStr};

/// How results are laid out on screen.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Layout {
    /// One horizontal row of single-cell glyphs (emoji)
    Row,
    /// A vertical numbered list of wide strings (kaomoji)
    List,
}

impl From<Mode> for Layout {
    fn from(mode: Mode) -> Self {
        match mode {
            Mode::Emoji => Layout::Row,
            Mode::Kaomoji => Layout::List,
        }
    }
}

/// Render the TUI
pub fn render(frame: &mut Frame, app: &App) {
    // Create layout: prompt line, blank line, emoji row
    let chunks = RatatuiLayout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // Prompt line with padding
            Constraint::Length(1), // Blank line
            Constraint::Length(1), // Emoji row
            Constraint::Min(0),    // Rest of space
        ])
        .split(frame.area());

    // Render prompt with query
    render_prompt(frame, app, chunks[0]);

    // Render results with the layout that suits the mode
    match Layout::from(app.mode) {
        Layout::Row => render_emojis(frame, app, chunks[2]),
        Layout::List => {
            let list_area = Rect {
                height: chunks[2].height + chunks[3].height,
                ..chunks[2]
            };
            render_list(frame, app, list_area);
        }
    }
}

/// Render the prompt and query input
fn render_prompt(frame: &mut Frame, app: &App, area: Rect) {
    let mut spans = vec![Span::raw(app.mode.prompt_prefix())];
    if app.query.is_empty() {
        // Show placeholder text in gray
        spans.push(Span::styled(
            app.mode.placeholder(),
            Style::default().fg(Color::DarkGray),
        ));
    } else {
        // Show actual query
        spans.push(Span::raw(&app.query));
    }

    // The list layout has no row of its own, so the copy indicator sits on the prompt
    if Layout::from(app.mode) == Layout::List && app.should_show_copy_feedback() {
        spans.push(Span::styled(" ✓", Style::default().fg(Color::Green)));
    }

    let paragraph = Paragraph::new(Line::from(spans));
    frame.render_widget(paragraph, area);
}

/// Render results as a vertical numbered list, clipped to the area
fn render_list(frame: &mut Frame, app: &App, area: Rect) {
    let lines = list_lines(app.picker.items(), area.width as usize);

    for (i, line) in lines.into_iter().take(area.height as usize).enumerate() {
        let style = if i == app.picker.selected_index() {
            Style::default().bg(Color::Gray)
        } else {
            Style::default()
        };
        let row = Rect {
            y: area.y + i as u16,
            height: 1,
            ..area
        };
        frame.render_widget(Paragraph::new(Span::styled(line, style)), row);
    }
}

/// Render emojis in a horizontal row
fn render_emojis(frame: &mut Frame, app: &App, area: Rect) {
    let mut spans = vec![];

    for (i, result) in app.picker.items().iter().enumerate() {
        let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);

        // Apply gray background to selected emoji (including padding for tighter highlight)
        if i == app.picker.selected_index() {
            // Include padding in the styled span for a tighter highlight box
            let emoji_with_padding = format!(" {emoji_with_tone} ");
            spans.push(Span::styled(
                emoji_with_padding,
                Style::default().bg(Color::Gray),
            ));
        } else {
            // Unselected emoji with padding - explicitly use Style::default() to clear background
            let emoji_with_padding = format!(" {emoji_with_tone} ");
            spans.push(Span::styled(emoji_with_padding, Style::default()));
        }
    }

    // Show copy indicator if needed
    if app.should_show_copy_feedback() {
        spans.push(Span::raw(" "));
        spans.push(Span::styled(" ✓", Style::default().fg(Color::Green)));
    }

    let paragraph = Paragraph::new(Line::from(spans));
    frame.render_widget(paragraph, area);
}

/// Truncate `text` to at most `width` terminal columns, ending with `…` when cut.
pub fn truncate_to_width(text: &str, width: usize) -> String {
    if UnicodeWidthStr::width(text) <= width {
        return text.to_string();
    }
    if width == 0 {
        return String::new();
    }

    // Leave one column for the ellipsis
    let budget = width - 1;
    let mut used = 0;
    let mut out = String::new();
    for c in text.chars() {
        let w = UnicodeWidthChar::width(c).unwrap_or(0);
        if used + w > budget {
            break;
        }
        used += w;
        out.push(c);
    }
    out.push('…');
    out
}

/// Lay results out as `number face name` lines, faces padded to a common width,
/// each truncated to `width` columns.
pub fn list_lines(results: &[SearchResult], width: usize) -> Vec<String> {
    let widest = results
        .iter()
        .map(|r| UnicodeWidthStr::width(r.emoji.char.as_str()))
        .max()
        .unwrap_or(0);

    results
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let padding = widest - UnicodeWidthStr::width(r.emoji.char.as_str());
            let line = format!(
                "{} {}{}  {}",
                i + 1,
                r.emoji.char,
                " ".repeat(padding),
                r.emoji.name
            );
            truncate_to_width(&line, width)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_leaves_fitting_text_alone() {
        assert_eq!(truncate_to_width("abc", 3), "abc");
        assert_eq!(truncate_to_width("abc", 10), "abc");
    }

    #[test]
    fn test_truncate_adds_ellipsis_within_width() {
        assert_eq!(truncate_to_width("abcdef", 4), "abc…");
        assert_eq!(truncate_to_width("abcdef", 1), "…");
    }

    #[test]
    fn test_truncate_never_splits_wide_characters() {
        // each ツ is two columns wide; 4 columns leaves room for one plus the ellipsis
        let out = truncate_to_width("ツツツツ", 4);
        assert_eq!(out, "ツ…");
        assert!(UnicodeWidthStr::width(out.as_str()) <= 4);
        let out = truncate_to_width("ツツツツ", 3);
        assert_eq!(out, "ツ…");
    }

    #[test]
    fn test_truncate_zero_width_is_empty() {
        assert_eq!(truncate_to_width("abc", 0), "");
    }

    #[test]
    fn test_list_lines_number_pad_and_name() {
        let results = crate::kaomoji::search("shrug", 3);
        let lines = list_lines(&results, 80);
        assert_eq!(lines.len(), 3);
        assert!(lines[0].starts_with("1 ¯\\_(ツ)_/¯"));
        assert!(lines[0].ends_with("shrug"));
        assert!(lines[2].starts_with("3 "));
    }

    #[test]
    fn test_list_lines_respect_width() {
        let results = crate::kaomoji::search("happy", 7);
        for width in 1..60 {
            for line in list_lines(&results, width) {
                assert!(
                    UnicodeWidthStr::width(line.as_str()) <= width,
                    "{width}: {line}"
                );
            }
        }
    }
}
