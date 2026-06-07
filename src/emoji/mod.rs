//! Emoji data structures and search functionality

pub mod data;
pub mod search;

pub use data::{apply_skin_tone, EMOJIS};
#[allow(unused_imports)]
pub use search::search;
pub use search::search_with_user;
