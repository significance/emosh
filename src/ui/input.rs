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
        // Escape or Ctrl+C: Exit without copying
        KeyCode::Esc => {
            app.quit();
        }
        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.quit();
        }

        // Tab: Copy selected emoji and continue (only if we have results)
        KeyCode::Tab => {
            if !app.results.is_empty() {
                if let Some(result) = app.selected_emoji() {
                    let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                    copy_to_clipboard(&emoji_with_tone)?;
                    app.mark_copied();
                }
            }
        }

        // Enter: Copy selected emoji and exit (only if we have results)
        KeyCode::Enter => {
            if !app.results.is_empty() {
                if let Some(result) = app.selected_emoji() {
                    let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                    copy_to_clipboard(&emoji_with_tone)?;
                    app.quit();
                }
            }
        }

        // Number keys: Quick select (1-9) - only if we have results
        KeyCode::Char(c @ '1'..='9') if key.modifiers.is_empty() && !app.results.is_empty() => {
            let number = c.to_digit(10).unwrap() as usize;
            if number <= app.results.len() {
                app.select_by_number(number);

                // Copy and exit
                if let Some(result) = app.selected_emoji() {
                    let emoji_with_tone = apply_skin_tone(&result.emoji, app.skin_tone);
                    copy_to_clipboard(&emoji_with_tone)?;
                    app.quit();
                }
            }
        }

        // Arrow keys: Only work when query length > 1
        KeyCode::Up if app.query.len() > 1 => {
            app.increase_skin_tone();
        }
        KeyCode::Down if app.query.len() > 1 => {
            app.decrease_skin_tone();
        }
        KeyCode::Left if app.query.len() > 1 => {
            app.select_previous();
        }
        KeyCode::Right if app.query.len() > 1 => {
            app.select_next();
        }

        // Backspace
        KeyCode::Backspace => {
            if app.query.pop().is_some() {
                update_search_results(app);
            }
        }

        // Text input (all other characters)
        KeyCode::Char(c) if key.modifiers.is_empty() || key.modifiers == KeyModifiers::SHIFT => {
            app.query.push(c);
            update_search_results(app);
        }

        _ => {}
    }

    Ok(())
}

/// Update search results based on current query
fn update_search_results(app: &mut App) {
    app.results = search(&app.query, &EMOJIS, 7);

    // Clamp selected_index to valid range instead of resetting to 0
    // This provides better UX - the selection stays on the same emoji if possible
    if app.selected_index >= app.results.len() {
        app.selected_index = app.results.len().saturating_sub(1);
    }
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

        // Set up query with length > 1 to enable navigation keys
        app.query = "te".to_string();

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
