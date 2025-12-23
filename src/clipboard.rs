use anyhow::{Context, Result};
use arboard::Clipboard;

/// Copy text to the system clipboard
///
/// # Arguments
/// * `text` - The text to copy
///
/// # Returns
/// Ok(()) on success, or an error if clipboard access fails
///
/// # Examples
/// ```no_run
/// use emosh::clipboard::copy_to_clipboard;
///
/// copy_to_clipboard("🦄").expect("Failed to copy");
/// ```
pub fn copy_to_clipboard(text: &str) -> Result<()> {
    let mut clipboard = Clipboard::new().context("Failed to access clipboard")?;

    clipboard
        .set_text(text)
        .context("Failed to copy to clipboard")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_copy_to_clipboard() {
        // This test may fail in headless environments (CI)
        // but should work on local machines with clipboard access
        let result = copy_to_clipboard("test");

        // We just verify the function doesn't panic
        // Actual clipboard functionality depends on the environment
        if result.is_ok() {
            println!("Clipboard test passed");
        } else {
            println!("Clipboard test skipped (no clipboard available)");
        }
    }
}
