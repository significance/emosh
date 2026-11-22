// Copy feedback: a short status message ("Copied ✓") that clears itself.
// Shared by the home page and the pickers so the feedback looks and behaves the same.

/** How long a status message stays up, in milliseconds. */
export const COPY_RESET_MS = 2200

/**
 * Bind a status element and return a setter for it.
 *
 * @param {HTMLElement} el  Where the message is shown (usually an aria-live region).
 * @param {number} [resetMs]  How long before the message clears.
 * @returns {(message: string, ok: boolean) => void}
 */
export function createCopyStatus(el, resetMs = COPY_RESET_MS) {
  let timer
  return (message, ok) => {
    el.textContent = message
    el.classList.toggle('is-success', ok === true)
    clearTimeout(timer)
    timer = setTimeout(() => {
      el.textContent = ''
      el.classList.remove('is-success')
    }, resetMs)
  }
}
