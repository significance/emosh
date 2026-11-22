// Library interface for emosh
// This allows integration tests to access the internal modules

#[cfg(feature = "cli")]
pub mod cli;
#[cfg(feature = "cli")]
pub mod clipboard;
#[cfg(feature = "cli")]
pub mod config;
pub mod emoji;
pub mod kaomoji;
pub mod latex;
pub mod pick;
pub mod treats;
#[cfg(feature = "cli")]
pub mod ui;
#[cfg(feature = "wasm")]
pub mod wasm;
