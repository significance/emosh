use crate::clipboard::copy_to_clipboard;
use crate::config::Config;
use crate::emoji::search::{search as emoji_search, SearchResult};
use crate::emoji::EMOJIS;
use crate::kaomoji;
use crate::ui::picker::Picker;
use anyhow::Result;
use std::fmt;
use std::time::Instant;

/// Where copied text goes. The system clipboard in production; tests inject a recorder
/// so they never touch `arboard` (which fails on headless systems).
pub struct ClipboardSink(Box<CopyFn>);

/// A function that copies text somewhere.
type CopyFn = dyn FnMut(&str) -> Result<()>;

impl ClipboardSink {
    /// Wrap any copy function as a sink.
    pub fn new(copier: impl FnMut(&str) -> Result<()> + 'static) -> Self {
        Self(Box::new(copier))
    }

    /// A sink that copies to the system clipboard.
    pub fn system() -> Self {
        Self::new(copy_to_clipboard)
    }

    /// Copy `text` to the destination.
    pub fn copy(&mut self, text: &str) -> Result<()> {
        (self.0)(text)
    }
}

impl fmt::Debug for ClipboardSink {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("ClipboardSink")
    }
}

/// What the picker searches.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Mode {
    /// Search emoji (the default)
    #[default]
    Emoji,
    /// Search kaomoji (Japanese text emoticons)
    Kaomoji,
}

impl Mode {
    /// The text shown before the query on the prompt line.
    pub fn prompt_prefix(self) -> &'static str {
        match self {
            Mode::Emoji => "> ",
            Mode::Kaomoji => "kaomoji › ",
        }
    }

    /// Placeholder shown while the query is empty.
    pub fn placeholder(self) -> &'static str {
        match self {
            Mode::Emoji => "Relevant emojis will appear when you start writing",
            Mode::Kaomoji => "Relevant kaomoji will appear when you start writing",
        }
    }

    /// Search this mode's database for `query`, returning at most `limit` results.
    pub fn search(self, query: &str, limit: usize) -> Vec<SearchResult> {
        match self {
            Mode::Emoji => emoji_search(query, &EMOJIS, limit),
            Mode::Kaomoji => kaomoji::search(query, limit),
        }
    }
}

/// Application state for the TUI
#[derive(Debug)]
pub struct App {
    /// Which database is being searched
    pub mode: Mode,
    /// The current search query
    pub query: String,
    /// Search results and the current selection
    pub picker: Picker<SearchResult>,
    /// Current skin tone setting (0-5)
    pub skin_tone: u8,
    /// Whether the application should quit
    pub should_quit: bool,
    /// Timestamp of last copy action (for feedback display)
    pub copy_feedback: Option<Instant>,
    /// Destination for copied text
    pub clipboard: ClipboardSink,
}

impl App {
    /// Create a new App with configuration
    pub fn new(config: &Config) -> Self {
        Self::with_clipboard(config, ClipboardSink::system())
    }

    /// Create a new App that copies into `clipboard` instead of the system clipboard
    pub fn with_clipboard(config: &Config, clipboard: ClipboardSink) -> Self {
        Self {
            mode: Mode::default(),
            query: String::new(),
            picker: Picker::new(),
            skin_tone: config.skin_tone,
            should_quit: false,
            copy_feedback: None,
            clipboard,
        }
    }

    /// Switch the app to search `mode` instead.
    pub fn with_mode(mut self, mode: Mode) -> Self {
        self.mode = mode;
        self
    }

    /// Update the search query and refresh results
    #[allow(dead_code)]
    pub fn update_query(&mut self, query: String, search_fn: impl Fn(&str) -> Vec<SearchResult>) {
        self.query = query;
        self.picker.reset_items(search_fn(&self.query));
    }

    /// Get the currently selected emoji, if any
    pub fn selected_emoji(&self) -> Option<&SearchResult> {
        self.picker.selected()
    }

    /// Move selection to the previous emoji
    pub fn select_previous(&mut self) {
        self.picker.select_previous();
    }

    /// Move selection to the next emoji
    pub fn select_next(&mut self) {
        self.picker.select_next();
    }

    /// Increment skin tone (up to 5)
    pub fn increase_skin_tone(&mut self) {
        if self.skin_tone < 5 {
            self.skin_tone += 1;
        }
    }

    /// Decrement skin tone (down to 0)
    pub fn decrease_skin_tone(&mut self) {
        if self.skin_tone > 0 {
            self.skin_tone -= 1;
        }
    }

    /// Select emoji by number (1-9)
    pub fn select_by_number(&mut self, number: usize) {
        self.picker.select_number(number);
    }

    /// Mark that a copy action occurred (for visual feedback)
    pub fn mark_copied(&mut self) {
        self.copy_feedback = Some(Instant::now());
    }

    /// Check if copy feedback should be shown
    pub fn should_show_copy_feedback(&self) -> bool {
        self.copy_feedback
            .map(|instant| instant.elapsed().as_secs() < 2)
            .unwrap_or(false)
    }

    /// Request application exit
    pub fn quit(&mut self) {
        self.should_quit = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::emoji::data::Emoji;
    use crate::emoji::search::SearchResult;

    fn create_test_result(char: &str, score: i64) -> SearchResult {
        SearchResult {
            emoji: Emoji {
                char: char.to_string(),
                name: "test".to_string(),
                keywords: vec![],
                tags: vec![],
                unicode: "".to_string(),
                supports_skin_tone: false,
            },
            score,
        }
    }

    #[test]
    fn test_app_initialization() {
        let config = Config { skin_tone: 3 };
        let app = App::new(&config);

        assert_eq!(app.query, "");
        assert_eq!(app.skin_tone, 3);
        assert!(!app.should_quit);
        assert_eq!(app.picker.selected_index(), 0);
    }

    #[test]
    fn test_update_query() {
        let config = Config::default();
        let mut app = App::new(&config);

        app.update_query("test".to_string(), |_| {
            vec![create_test_result("🦄", 100), create_test_result("🐴", 50)]
        });

        assert_eq!(app.query, "test");
        assert_eq!(app.picker.len(), 2);
        assert_eq!(app.picker.selected_index(), 0);
    }

    #[test]
    fn test_navigation() {
        let config = Config::default();
        let mut app = App::new(&config);
        app.picker.reset_items(vec![
            create_test_result("🦄", 100),
            create_test_result("🐴", 50),
            create_test_result("🎠", 25),
        ]);

        assert_eq!(app.picker.selected_index(), 0);

        app.select_next();
        assert_eq!(app.picker.selected_index(), 1);

        app.select_next();
        assert_eq!(app.picker.selected_index(), 2);

        app.select_next(); // Should not go beyond
        assert_eq!(app.picker.selected_index(), 2);

        app.select_previous();
        assert_eq!(app.picker.selected_index(), 1);

        app.select_previous();
        assert_eq!(app.picker.selected_index(), 0);

        app.select_previous(); // Should not go below 0
        assert_eq!(app.picker.selected_index(), 0);
    }

    #[test]
    fn test_skin_tone_adjustment() {
        let config = Config::default();
        let mut app = App::new(&config);

        assert_eq!(app.skin_tone, 0);

        app.increase_skin_tone();
        assert_eq!(app.skin_tone, 1);

        app.increase_skin_tone();
        app.increase_skin_tone();
        app.increase_skin_tone();
        app.increase_skin_tone();
        assert_eq!(app.skin_tone, 5);

        app.increase_skin_tone(); // Should not go beyond 5
        assert_eq!(app.skin_tone, 5);

        app.decrease_skin_tone();
        assert_eq!(app.skin_tone, 4);

        app.skin_tone = 0;
        app.decrease_skin_tone(); // Should not go below 0
        assert_eq!(app.skin_tone, 0);
    }

    #[test]
    fn test_select_by_number() {
        let config = Config::default();
        let mut app = App::new(&config);
        app.picker.reset_items(vec![
            create_test_result("🦄", 100),
            create_test_result("🐴", 50),
            create_test_result("🎠", 25),
        ]);

        app.select_by_number(2);
        assert_eq!(app.picker.selected_index(), 1);

        app.select_by_number(10); // Out of range
        assert_eq!(app.picker.selected_index(), 1); // Should not change

        app.select_by_number(0); // Invalid
        assert_eq!(app.picker.selected_index(), 1); // Should not change
    }
}
