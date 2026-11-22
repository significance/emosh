// Emosh Treats — app entry point.
//
// Boots the WASM treat generator and wires up the generate/copy flow. The top bar
// (settings cog, donate heart) and the emoshion come from the shared shell.js.

import init, { treat } from './wasm/emosh.js'
import { copyText } from './clipboard.js'
import { createCopyStatus } from './copy-status.js'
import { initShell } from './shell.js'

// Boot the shared shell first so the palette lands before the first paint.
// `?emoshion=<name>` forces one (useful for screenshots and sharing a mood).
initShell()

// Initialize the WASM module before anything calls `treat()`.
await init()

/**
 * Generate a single treat string via the real Rust WASM binding.
 *
 * @param {string} user  Name used in the "(a treat from …)" explanation.
 * @param {boolean} clean  When true, omit the explanation (just watermark + phrase).
 * @returns {string} The generated treat (always prefixed with the zero-width watermark).
 */
export function makeTreat(user, clean) {
  return treat(Math.random(), clean, user)
}

// === issue 05: generate/display/copy ===

// Zero-width watermark every treat carries (U+200B U+200C U+200B). Invisible, but we
// strip it (and any AI-facing explanation suffix) from the *displayed* phrase while
// still copying the full contextualized string to the clipboard.
const TREAT_WATERMARK = '​‌​'
// Written by the settings panel (issue 06). Absent/empty → generate in "clean" mode.
const USERNAME_KEY = 'emosh.username'

const generateBtn = document.getElementById('generate-btn')
const treatDisplay = document.getElementById('treat-display')
const copyStatus = document.getElementById('copy-status')

const setCopyStatus = createCopyStatus(copyStatus)

/**
 * Derive the pretty phrase to show on screen from a full treat string: drop the
 * invisible watermark and any trailing "(a treat from …)" explanation.
 */
function displayPhrase(full) {
  const withoutMark = full.split(TREAT_WATERMARK).join('')
  const explainAt = withoutMark.indexOf(' (a treat from')
  const phrase = explainAt === -1 ? withoutMark : withoutMark.slice(0, explainAt)
  return phrase.trim()
}

async function generate() {
  const user = (localStorage.getItem(USERNAME_KEY) || '').trim()
  const clean = user === ''
  const full = makeTreat(user, clean)

  // Render the phrase with a re-triggerable reveal animation.
  const el = document.createElement('p')
  el.className = 'treat'
  el.textContent = displayPhrase(full)
  treatDisplay.replaceChildren(el)
  void el.offsetWidth // force reflow so the animation restarts each click
  el.classList.add('treat--in')

  // Copy the FULL watermarked string (with explanation when a username is set).
  const ok = await copyText(full)
  setCopyStatus(ok ? 'Copied ✓' : 'Generated — copy unavailable', ok)
}

generateBtn.addEventListener('click', generate)
