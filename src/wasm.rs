//! WebAssembly bindings for the browser treats demo.
//!
//! Only compiled with `--features wasm`. Exposes a single-treat generator so the
//! browser can drive the real Rust treat logic. The seed is provided by JS
//! (`Math.random()`) to avoid `SystemTime`, which is unavailable on wasm32.

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
