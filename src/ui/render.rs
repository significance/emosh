use crate::emoji::apply_skin_tone;
use crate::ui::app::App;
use ratatui::{
    layout::{Constraint, Direction, Layout},
    style::{Color, Style},
    text::{Line, Span},
    widgets::Paragraph,
    Frame,
};

/// Render the TUI
pub fn render(frame: &mut Frame, app: &App) {
    // Create layout: prompt line, blank line, emoji row
    let chunks = Layout::default()
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

    // Render emojis horizontally
    render_emojis(frame, app, chunks[2]);
}

/// Render the prompt and query input
fn render_prompt(frame: &mut Frame, app: &App, area: ratatui::layout::Rect) {
    let text = if app.query.is_empty() {
        // Show placeholder text in gray
        Line::from(vec![
            Span::raw("> "),
            Span::styled(
                "Relevant emojis will appear when you start writing",
                Style::default().fg(Color::DarkGray),
            ),
        ])
    } else {
        // Show actual query
        Line::from(vec![Span::raw("> "), Span::raw(&app.query)])
    };

    let paragraph = Paragraph::new(text);
    frame.render_widget(paragraph, area);
}

/// Render emojis in a horizontal row
fn render_emojis(frame: &mut Frame, app: &App, area: ratatui::layout::Rect) {
    let mut spans = vec![];

    for (i, result) in app.results.iter().enumerate() {
        let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);

        // Apply gray background to selected emoji (including padding for tighter highlight)
        if i == app.selected_index {
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
