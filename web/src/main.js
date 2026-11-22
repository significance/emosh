// Emosh Treats — app entry point.
//
// Boots the WASM treat generator and wires up the UI. Feature behavior is split
// into clearly-marked anchor sections so each issue's runner edits its own block:
//   issue 05 — generate/display/copy   (this file)
//   issue 06 — settings + username     (adds src/settings.js, edits its anchor)
//   issue 07 — donate modal            (adds src/donate.js, edits its anchor)

import init, { treat } from './wasm/emosh.js'
import { copyText } from './clipboard.js'

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
const COPY_RESET_MS = 2200

const generateBtn = document.getElementById('generate-btn')
const treatDisplay = document.getElementById('treat-display')
const copyStatus = document.getElementById('copy-status')

let copyStatusTimer

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

function setCopyStatus(message, ok) {
  copyStatus.textContent = message
  copyStatus.classList.toggle('is-success', ok === true)
  clearTimeout(copyStatusTimer)
  copyStatusTimer = setTimeout(() => {
    copyStatus.textContent = ''
    copyStatus.classList.remove('is-success')
  }, COPY_RESET_MS)
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

// === issue 06: settings + username ===

import { initSettings } from './settings.js'

initSettings()

// === issue 07: donate modal ===

import { initDonate } from './donate.js'

initDonate()
