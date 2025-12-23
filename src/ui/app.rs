use crate::config::Config;
use crate::emoji::search::SearchResult;
use std::time::Instant;

/// Application state for the TUI
#[derive(Debug)]
pub struct App {
    /// The current search query
    pub query: String,
    /// Search results
    pub results: Vec<SearchResult>,
    /// Index of the currently selected emoji
    pub selected_index: usize,
    /// Current skin tone setting (0-5)
    pub skin_tone: u8,
    /// Whether the application should quit
    pub should_quit: bool,
    /// Timestamp of last copy action (for feedback display)
    pub copy_feedback: Option<Instant>,
}

impl App {
    /// Create a new App with configuration
    pub fn new(config: &Config) -> Self {
        Self {
            query: String::new(),
            results: Vec::new(),
            selected_index: 0,
            skin_tone: config.skin_tone,
            should_quit: false,
            copy_feedback: None,
        }
    }

    /// Update the search query and refresh results
    #[allow(dead_code)]
    pub fn update_query(&mut self, query: String, search_fn: impl Fn(&str) -> Vec<SearchResult>) {
        self.query = query;
        self.results = search_fn(&self.query);
        self.selected_index = 0; // Reset selection
    }

    /// Get the currently selected emoji, if any
    pub fn selected_emoji(&self) -> Option<&SearchResult> {
        self.results.get(self.selected_index)
    }

    /// Move selection to the previous emoji
    pub fn select_previous(&mut self) {
        if !self.results.is_empty() && self.selected_index > 0 {
            self.selected_index -= 1;
        }
    }

    /// Move selection to the next emoji
    pub fn select_next(&mut self) {
        if self.selected_index < self.results.len().saturating_sub(1) {
            self.selected_index += 1;
        }
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
        if number > 0 && number <= self.results.len() {
            self.selected_index = number - 1;
        }
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
        assert_eq!(app.selected_index, 0);
    }

    #[test]
    fn test_update_query() {
        let config = Config::default();
        let mut app = App::new(&config);

        app.update_query("test".to_string(), |_| {
            vec![create_test_result("🦄", 100), create_test_result("🐴", 50)]
        });

        assert_eq!(app.query, "test");
        assert_eq!(app.results.len(), 2);
        assert_eq!(app.selected_index, 0);
    }

    #[test]
    fn test_navigation() {
        let config = Config::default();
        let mut app = App::new(&config);
        app.results = vec![
            create_test_result("🦄", 100),
            create_test_result("🐴", 50),
            create_test_result("🎠", 25),
        ];

        assert_eq!(app.selected_index, 0);

        app.select_next();
        assert_eq!(app.selected_index, 1);

        app.select_next();
        assert_eq!(app.selected_index, 2);

        app.select_next(); // Should not go beyond
        assert_eq!(app.selected_index, 2);

        app.select_previous();
        assert_eq!(app.selected_index, 1);

        app.select_previous();
        assert_eq!(app.selected_index, 0);

        app.select_previous(); // Should not go below 0
        assert_eq!(app.selected_index, 0);
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
        app.results = vec![
            create_test_result("🦄", 100),
            create_test_result("🐴", 50),
            create_test_result("🎠", 25),
        ];

        app.select_by_number(2);
        assert_eq!(app.selected_index, 1);

        app.select_by_number(10); // Out of range
        assert_eq!(app.selected_index, 1); // Should not change

        app.select_by_number(0); // Invalid
        assert_eq!(app.selected_index, 1); // Should not change
    }
}
