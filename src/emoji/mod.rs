//! Emoji data structures and search functionality

pub mod data;
pub mod search;

pub use data::{apply_skin_tone, EMOJIS};
pub use search::search;
