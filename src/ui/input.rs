use crate::emoji::apply_skin_tone;
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
        KeyCode::Tab if !app.picker.is_empty() => {
            if copy_selected(app)? {
                app.mark_copied();
            }
        }

        // Enter: Copy selected emoji and exit (only if we have results)
        KeyCode::Enter if !app.picker.is_empty() => {
            if copy_selected(app)? {
                app.quit();
            }
        }

        // Number keys: Quick select (1-9) - only if we have results
        KeyCode::Char(c @ '1'..='9') if key.modifiers.is_empty() && !app.picker.is_empty() => {
            let number = c.to_digit(10).unwrap() as usize;
            if number <= app.picker.len() {
                app.select_by_number(number);

                // Copy and exit
                if copy_selected(app)? {
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
        KeyCode::Backspace if app.query.pop().is_some() => {
            update_search_results(app);
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

/// Copy the selected result (with the current skin tone) to the clipboard.
/// Returns whether anything was copied.
fn copy_selected(app: &mut App) -> Result<bool> {
    let Some(result) = app.selected_emoji() else {
        return Ok(false);
    };
    let text = apply_skin_tone(&result.emoji, app.skin_tone);
    app.clipboard.copy(&text)?;
    Ok(true)
}

/// Update search results based on current query
fn update_search_results(app: &mut App) {
    // The selection stays on the same position if possible (clamped by the picker)
    app.picker.set_items(app.mode.search(&app.query, 7));
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
