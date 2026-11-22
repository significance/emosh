//! Headless TUI test harness: renders into a `TestBackend` buffer and drives the real
//! key handler with synthetic events. No terminal, clipboard or network involved.

use crate::config::Config;
use crate::ui::app::ClipboardSink;
use crate::ui::{handle_key_event, render, App};
use anyhow::Result;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use ratatui::{backend::TestBackend, buffer::Buffer, Terminal};
use std::cell::RefCell;
use std::rc::Rc;
use unicode_width::UnicodeWidthStr;

/// Everything copied so far, shared with the app's clipboard sink.
pub type Copies = Rc<RefCell<Vec<String>>>;

/// Build an app whose clipboard records into the returned [`Copies`].
pub fn recording_app() -> (App, Copies) {
    let copies: Copies = Rc::default();
    let sink = Rc::clone(&copies);
    let app = App::with_clipboard(
        &Config::default(),
        ClipboardSink::new(move |text| {
            sink.borrow_mut().push(text.to_string());
            Ok(())
        }),
    );
    (app, copies)
}

/// Build an app whose clipboard always fails.
pub fn failing_app() -> App {
    App::with_clipboard(
        &Config::default(),
        ClipboardSink::new(|_| anyhow::bail!("no clipboard")),
    )
}

/// Render the app into a `width` x `height` buffer.
pub fn render_app(app: &App, width: u16, height: u16) -> Buffer {
    let mut terminal = Terminal::new(TestBackend::new(width, height)).unwrap();
    terminal.draw(|frame| render(frame, app)).unwrap();
    terminal.backend().buffer().clone()
}

/// Send one key press with no modifiers.
pub fn press(app: &mut App, code: KeyCode) -> Result<()> {
    handle_key_event(app, KeyEvent::new(code, KeyModifiers::empty()))
}

/// Type each character of `text` as a key press.
pub fn type_text(app: &mut App, text: &str) {
    for c in text.chars() {
        press(app, KeyCode::Char(c)).unwrap();
    }
}

/// The text of row `y`, with the trailing blank cells of wide characters skipped
/// and trailing spaces trimmed.
pub fn row_text(buffer: &Buffer, y: u16) -> String {
    let mut text = String::new();
    let mut x = 0;
    while x < buffer.area.width {
        let symbol = buffer[(x, y)].symbol();
        text.push_str(symbol);
        x += UnicodeWidthStr::width(symbol).max(1) as u16;
    }
    text.trim_end().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_app_shows_placeholder_prompt() {
        let (app, _) = recording_app();
        let buf = render_app(&app, 80, 5);
        assert_eq!(
            row_text(&buf, 0),
            "> Relevant emojis will appear when you start writing"
        );
        assert_eq!(row_text(&buf, 2), "");
    }

    #[test]
    fn test_typing_shows_query_and_emoji_row_with_selection_highlight() {
        let (mut app, _) = recording_app();
        type_text(&mut app, "unicorn");
        let buf = render_app(&app, 80, 5);
        assert_eq!(row_text(&buf, 0), "> unicorn");
        assert!(row_text(&buf, 2).contains("🦄"));
        // The first emoji is padded with one space each side and highlighted.
        assert_eq!(buf[(0, 2)].bg, ratatui::style::Color::Gray);
        assert_eq!(buf[(0, 2)].symbol(), " ");
        assert_eq!(buf[(1, 2)].symbol(), "🦄");
    }

    #[test]
    fn test_emoji_row_has_one_padded_cell_group_per_result() {
        let (mut app, _) = recording_app();
        type_text(&mut app, "grin");
        let buf = render_app(&app, 80, 5);
        let n = app.picker.len();
        assert!(n > 1);
        // each emoji is 2 columns wide + 2 padding spaces
        let row = row_text(&buf, 2);
        assert_eq!(UnicodeWidthStr::width(row.as_str()), n * 4 - 1);
    }

    #[test]
    fn test_enter_copies_selected_and_quits() {
        let (mut app, copies) = recording_app();
        type_text(&mut app, "grin");
        press(&mut app, KeyCode::Enter).unwrap();
        assert_eq!(copies.borrow().as_slice(), ["😁"]);
        assert!(app.should_quit);
    }

    #[test]
    fn test_tab_copies_and_keeps_running_with_feedback() {
        let (mut app, copies) = recording_app();
        type_text(&mut app, "grin");
        press(&mut app, KeyCode::Tab).unwrap();
        assert_eq!(copies.borrow().len(), 1);
        assert!(!app.should_quit);
        let buf = render_app(&app, 80, 5);
        assert!(row_text(&buf, 2).ends_with("✓"));
    }

    #[test]
    fn test_number_key_selects_copies_and_quits() {
        let (mut app, copies) = recording_app();
        type_text(&mut app, "grin");
        let second = app.picker.items()[1].emoji.char.clone();
        press(&mut app, KeyCode::Char('2')).unwrap();
        assert_eq!(copies.borrow().as_slice(), [second]);
        assert!(app.should_quit);
    }

    #[test]
    fn test_number_beyond_results_is_ignored() {
        let (mut app, copies) = recording_app();
        type_text(&mut app, "unicorn");
        press(&mut app, KeyCode::Char('9')).unwrap();
        assert!(copies.borrow().is_empty());
        assert!(!app.should_quit);
    }

    #[test]
    fn test_escape_quits_without_copying() {
        let (mut app, copies) = recording_app();
        type_text(&mut app, "grin");
        press(&mut app, KeyCode::Esc).unwrap();
        assert!(app.should_quit);
        assert!(copies.borrow().is_empty());
    }

    #[test]
    fn test_ctrl_c_quits() {
        let (mut app, _) = recording_app();
        handle_key_event(
            &mut app,
            KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL),
        )
        .unwrap();
        assert!(app.should_quit);
    }

    #[test]
    fn test_left_right_move_selection_and_up_down_change_skin_tone() {
        let (mut app, _) = recording_app();
        type_text(&mut app, "wave");
        press(&mut app, KeyCode::Right).unwrap();
        assert_eq!(app.picker.selected_index(), 1);
        press(&mut app, KeyCode::Left).unwrap();
        assert_eq!(app.picker.selected_index(), 0);
        press(&mut app, KeyCode::Up).unwrap();
        assert_eq!(app.skin_tone, 1);
        press(&mut app, KeyCode::Down).unwrap();
        assert_eq!(app.skin_tone, 0);
    }

    #[test]
    fn test_arrows_are_ignored_for_single_character_query() {
        let (mut app, _) = recording_app();
        type_text(&mut app, "w");
        press(&mut app, KeyCode::Up).unwrap();
        assert_eq!(app.skin_tone, 0);
    }

    #[test]
    fn test_backspace_edits_query_and_refreshes_results() {
        let (mut app, _) = recording_app();
        type_text(&mut app, "grinx");
        press(&mut app, KeyCode::Backspace).unwrap();
        assert_eq!(app.query, "grin");
        assert!(!app.picker.is_empty());
    }

    #[test]
    fn test_enter_without_results_does_nothing() {
        let (mut app, copies) = recording_app();
        press(&mut app, KeyCode::Enter).unwrap();
        assert!(copies.borrow().is_empty());
        assert!(!app.should_quit);
    }

    #[test]
    fn test_clipboard_failure_currently_propagates_as_error() {
        let mut app = failing_app();
        type_text(&mut app, "grin");
        assert!(press(&mut app, KeyCode::Enter).is_err());
    }
}
