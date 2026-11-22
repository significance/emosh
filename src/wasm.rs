//! WebAssembly bindings for the browser: treats and the emoji/kaomoji pickers.
//!
//! Only compiled with `--features wasm`. The search logic lives in [`crate::pick`] so
//! it is tested natively; these functions only serialise its results for JS.

use crate::pick;
use wasm_bindgen::prelude::*;

/// Generate one treat.
///
/// * `seed` — any JS number; its raw bits seed the PRNG (pass `Math.random()`).
/// * `clean` — when true, omit the "(a treat from …)" explanation.
/// * `user` — name used in the explanation when `clean` is false.
#[wasm_bindgen]
pub fn treat(seed: f64, clean: bool, user: &str) -> String {
    crate::treats::generate_one_treat(seed.to_bits(), clean, user)
}

/// Search emoji. Returns an array of
/// `{ text, name, keywords, score, supports_skin_tone }`, best first, with
/// `skin_tone` (0–5) already applied to `text` where supported.
#[wasm_bindgen]
pub fn search_emoji(query: &str, limit: usize, skin_tone: u8) -> Result<JsValue, JsError> {
    to_js(&pick::emoji_results(query, limit, skin_tone))
}

/// Search kaomoji. Returns the same result shape as [`search_emoji`].
#[wasm_bindgen]
pub fn search_kaomoji(query: &str, limit: usize) -> Result<JsValue, JsError> {
    to_js(&pick::kaomoji_results(query, limit))
}

/// Parse both embedded databases now, so the first keystroke doesn't pay for it.
#[wasm_bindgen]
pub fn warmup() {
    pick::warmup();
}

fn to_js(results: &[pick::PickResult]) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(results).map_err(|err| JsError::new(&err.to_string()))
}
