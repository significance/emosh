// Emosh Treats — settings panel (issue 06).
//
// A cog in the top bar opens an accessible drawer/sheet where the user sets a
// username. The username is persisted to localStorage under `emosh.username` and
// is read by the issue-05 generate flow on every Generate click.
//
// Product direction: setting a username is a *premium / in-app purchase*. The
// field is locked behind an upsell until `emosh.username_unlocked` is truthy.
// The "Unlock" CTA currently flips that flag directly (stub purchase); a real
// Capacitor IAP call slots in at the marked TODO below.

const USERNAME_KEY = 'emosh.username'
const UNLOCK_KEY = 'emosh.username_unlocked'

/** Focusable-element selector used for the focus trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const isUnlocked = () => localStorage.getItem(UNLOCK_KEY) === 'true'

/**
 * Persist (or clear) the username. An empty/blank value removes the key so that
 * subsequent treats generate in "clean" mode (issue 05).
 */
function saveUsername(value) {
  const trimmed = value.trim()
  if (trimmed === '') {
    localStorage.removeItem(USERNAME_KEY)
  } else {
    localStorage.setItem(USERNAME_KEY, trimmed)
  }
}

/**
 * Wire up the settings cog + panel. Populates the empty `#settings-panel`
 * container, handles open/close, focus management, the IAP unlock gate, and
 * username persistence.
 */
export function initSettings() {
  const cog = document.getElementById('settings-btn')
  const panel = document.getElementById('settings-panel')
  if (!cog || !panel) return

  const TITLE_ID = 'settings-title'
  const DESC_ID = 'settings-desc'

  panel.innerHTML = `
    <div class="overlay__backdrop" data-close></div>
    <div
      class="settings-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${TITLE_ID}"
      aria-describedby="${DESC_ID}"
    >
      <header class="settings-drawer__head">
        <h2 id="${TITLE_ID}" class="settings-drawer__title">Settings</h2>
        <button
          type="button"
          class="icon-btn settings-drawer__close"
          data-close
          aria-label="Close settings"
        >
          <span class="icon" aria-hidden="true">&times;</span>
        </button>
      </header>

      <div class="settings-field">
        <label class="settings-label" for="settings-username">Username</label>
        <p id="${DESC_ID}" class="settings-hint">
          Adds “a treat from you” to the copied treat. Leave blank to keep treats anonymous.
        </p>

        <div class="settings-input-row">
          <input
            id="settings-username"
            class="settings-input"
            type="text"
            name="username"
            autocomplete="off"
            spellcheck="false"
            maxlength="40"
            placeholder="Your name"
            disabled
          />
          <span class="settings-lock-badge" data-lock-badge aria-hidden="true">🔒</span>
        </div>

        <div class="settings-upsell" data-upsell hidden>
          <p class="settings-upsell__copy">Make it yours — unlock custom usernames.</p>
          <button type="button" class="settings-upsell__cta" data-unlock>
            Unlock custom username · in-app purchase
          </button>
        </div>

        <p class="settings-saved" data-saved aria-live="polite"></p>
      </div>
    </div>
  `

  const drawer = panel.querySelector('.settings-drawer')
  const input = panel.querySelector('#settings-username')
  const lockBadge = panel.querySelector('[data-lock-badge]')
  const upsell = panel.querySelector('[data-upsell]')
  const unlockBtn = panel.querySelector('[data-unlock]')
  const savedMsg = panel.querySelector('[data-saved]')
  const closeEls = panel.querySelectorAll('[data-close]')

  let savedTimer
  let lastFocused = null

  function flashSaved(message) {
    savedMsg.textContent = message
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => {
      savedMsg.textContent = ''
    }, 2000)
  }

  /** Reflect the current unlock state into the UI (field, badge, upsell). */
  function renderLockState() {
    const unlocked = isUnlocked()
    input.disabled = !unlocked
    lockBadge.hidden = unlocked
    upsell.hidden = unlocked
    drawer.classList.toggle('is-locked', !unlocked)
  }

  function unlock() {
    // Stub purchase: flip and persist the unlock flag immediately.
    // TODO: integrate @capacitor-community/in-app-purchases — replace this
    // direct flag flip with a real purchase flow (StoreKit / Play Billing),
    // and only set UNLOCK_KEY once the purchase resolves successfully.
    localStorage.setItem(UNLOCK_KEY, 'true')
    renderLockState()
    input.focus()
    flashSaved('Unlocked ✓')
  }

  function isOpen() {
    return !panel.hasAttribute('hidden')
  }

  function focusables() {
    return Array.from(drawer.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
  }

  function open() {
    if (isOpen()) return
    lastFocused = document.activeElement
    input.value = localStorage.getItem(USERNAME_KEY) || ''
    renderLockState()
    savedMsg.textContent = ''
    panel.removeAttribute('hidden')
    cog.setAttribute('aria-expanded', 'true')
    document.addEventListener('keydown', onKeydown, true)
    // Focus the first sensible control inside the panel.
    const target = !input.disabled ? input : unlockBtn
    ;(target || drawer).focus()
  }

  function close() {
    if (!isOpen()) return
    panel.setAttribute('hidden', '')
    cog.setAttribute('aria-expanded', 'false')
    document.removeEventListener('keydown', onKeydown, true)
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus()
    } else {
      cog.focus()
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Tab') {
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !drawer.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  // --- Wiring ---
  cog.setAttribute('aria-expanded', 'false')

  cog.addEventListener('click', () => {
    if (isOpen()) close()
    else open()
  })

  closeEls.forEach((el) => el.addEventListener('click', close))

  unlockBtn.addEventListener('click', unlock)

  // Persist as the user types (only meaningful when unlocked; the field is
  // disabled otherwise so no username is written while locked).
  input.addEventListener('input', () => {
    if (input.disabled) return
    saveUsername(input.value)
  })

  input.addEventListener('change', () => {
    if (input.disabled) return
    saveUsername(input.value)
    flashSaved(input.value.trim() === '' ? 'Cleared' : 'Saved ✓')
  })
}
