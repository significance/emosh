use crate::emoji::apply_skin_tone;
use crate::ui::app::App;
use ratatui::{
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};

/// Render the TUI
pub fn render(frame: &mut Frame, app: &App) {
    // Create layout: query input, results list, status bar
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Query input box
            Constraint::Min(0),    // Results list
            Constraint::Length(1), // Status bar
        ])
        .split(frame.area());

    // Render query input
    render_query_input(frame, app, chunks[0]);

    // Render results
    render_results(frame, app, chunks[1]);

    // Render status bar
    render_status_bar(frame, app, chunks[2]);
}

/// Render the query input box
fn render_query_input(frame: &mut Frame, app: &App, area: ratatui::layout::Rect) {
    let input = Paragraph::new(app.query.as_str())
        .style(Style::default().fg(Color::Cyan))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Search ")
                .title_style(Style::default().add_modifier(Modifier::BOLD)),
        );

    frame.render_widget(input, area);
}

/// Render the results list
fn render_results(frame: &mut Frame, app: &App, area: ratatui::layout::Rect) {
    let items: Vec<ListItem> = app
        .results
        .iter()
        .enumerate()
        .map(|(i, result)| {
            let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);

            let content = format!(
                "{}  {}  {}",
                i + 1,
                emoji_with_tone,
                result.emoji.name
            );

            let style = if i == app.selected_index {
                Style::default()
                    .bg(Color::Gray)
                    .fg(Color::Black)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(content).style(style)
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .title(" Results ")
            .title_style(Style::default().add_modifier(Modifier::BOLD)),
    );

    frame.render_widget(list, area);
}

/// Render the status bar
fn render_status_bar(frame: &mut Frame, app: &App, area: ratatui::layout::Rect) {
    let mut spans = vec![];

    // Copy feedback
    if app.should_show_copy_feedback() {
        spans.push(Span::styled(
            "✓ Copied! ",
            Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        ));
    }

    // Skin tone indicator
    let skin_tone_text = format!("Skin tone: {} ", app.skin_tone);
    spans.push(Span::styled(
        skin_tone_text,
        Style::default().fg(Color::Yellow),
    ));

    // Help text
    spans.push(Span::styled(
        "↑↓:tone ←→:navigate 1-9/Enter:select Tab:copy Esc:quit",
        Style::default().fg(Color::DarkGray),
    ));

    let status_bar = Paragraph::new(Line::from(spans));
    frame.render_widget(status_bar, area);
}
