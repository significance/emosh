//! Terminal user interface components

pub mod app;
pub mod input;
pub mod render;

pub use app::App;
pub use input::handle_key_event;
pub use render::render;
