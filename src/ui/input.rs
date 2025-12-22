use crate::clipboard::copy_to_clipboard;
use crate::emoji::apply_skin_tone;
use crate::emoji::search::search;
use crate::emoji::EMOJIS;
use crate::ui::app::App;
use anyhow::Result;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

/// Handle a keyboard event and update app state accordingly
pub fn handle_key_event(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        // Text input
        KeyCode::Char(c) if key.modifiers.is_empty() || key.modifiers == KeyModifiers::SHIFT => {
            app.query.push(c);
            update_search_results(app);
        }

        // Backspace
        KeyCode::Backspace => {
            if app.query.pop().is_some() {
                update_search_results(app);
            }
        }

        // Up/Down: Adjust skin tone
        KeyCode::Up => {
            app.increase_skin_tone();
        }
        KeyCode::Down => {
            app.decrease_skin_tone();
        }

        // Left/Right: Navigate results
        KeyCode::Left => {
            app.select_previous();
        }
        KeyCode::Right => {
            app.select_next();
        }

        // Number keys: Quick select (1-9)
        KeyCode::Char(c @ '1'..='9') if key.modifiers.is_empty() => {
            let number = c.to_digit(10).unwrap() as usize;
            app.select_by_number(number);

            // Copy and exit
            if let Some(result) = app.selected_emoji() {
                let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                copy_to_clipboard(&emoji_with_tone)?;
                app.quit();
            }
        }

        // Enter: Copy selected emoji and exit
        KeyCode::Enter => {
            if let Some(result) = app.selected_emoji() {
                let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                copy_to_clipboard(&emoji_with_tone)?;
                app.quit();
            }
        }

        // Tab: Copy selected emoji and continue
        KeyCode::Tab => {
            if let Some(result) = app.selected_emoji() {
                let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                copy_to_clipboard(&emoji_with_tone)?;
                app.mark_copied();
            }
        }

        // Escape or Ctrl+C: Exit without copying
        KeyCode::Esc => {
            app.quit();
        }
        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.quit();
        }

        _ => {}
    }

    Ok(())
}

/// Update search results based on current query
fn update_search_results(app: &mut App) {
    app.results = search(&app.query, &EMOJIS, 7);
    app.selected_index = 0; // Reset selection
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;

    #[test]
    fn test_text_input() {
        let config = Config::default();
        let mut app = App::new(&config);

        let key = KeyEvent::new(KeyCode::Char('a'), KeyModifiers::empty());
        handle_key_event(&mut app, key).unwrap();

        assert_eq!(app.query, "a");
    }

    #[test]
    fn test_backspace() {
        let config = Config::default();
        let mut app = App::new(&config);
        app.query = "test".to_string();

        let key = KeyEvent::new(KeyCode::Backspace, KeyModifiers::empty());
        handle_key_event(&mut app, key).unwrap();

        assert_eq!(app.query, "tes");
    }

    #[test]
    fn test_navigation_keys() {
        let config = Config::default();
        let mut app = App::new(&config);

        // Up increases skin tone
        let key = KeyEvent::new(KeyCode::Up, KeyModifiers::empty());
        handle_key_event(&mut app, key).unwrap();
        assert_eq!(app.skin_tone, 1);

        // Down decreases skin tone
        let key = KeyEvent::new(KeyCode::Down, KeyModifiers::empty());
        handle_key_event(&mut app, key).unwrap();
        assert_eq!(app.skin_tone, 0);
    }

    #[test]
    fn test_escape_quits() {
        let config = Config::default();
        let mut app = App::new(&config);

        let key = KeyEvent::new(KeyCode::Esc, KeyModifiers::empty());
        handle_key_event(&mut app, key).unwrap();

        assert!(app.should_quit);
    }
}
