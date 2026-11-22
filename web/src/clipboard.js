// Unified clipboard helper (issue 08).
//
// Uses @capacitor/clipboard so a single call works on the web AND on native
// iOS/Android once the app is wrapped by Capacitor. Falls back to the raw Web
// Clipboard API, and degrades gracefully (returns false) if both are unavailable.

import { Clipboard } from '@capacitor/clipboard'

/**
 * Copy text to the clipboard.
 *
 * @param {string} text  The text to copy.
 * @returns {Promise<boolean>} true if the copy succeeded, false otherwise.
 */
export async function copyText(text) {
  try {
    await Clipboard.write({ string: text })
    return true
  } catch (_) {
    // Fallback for environments where the plugin/web API is unavailable.
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}
