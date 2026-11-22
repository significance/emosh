// Emosh Treats — donate modal (issue 07).
//
// A heart in the top bar (top-left) opens an accessible modal listing donation
// options. Values are injected at BUILD TIME from `web/.env` via Vite's
// `import.meta.env` (`VITE_`-prefixed). Real values live in a gitignored
// `web/.env`; placeholders ship in `web/.env.example`.
//
// Methods: BTC/ETH (address + copy + client-side QR), PayPal/GitHub Sponsors/
// Ko-fi (external link buttons). Only methods whose env var is set and is not an
// obvious placeholder are rendered.

import QRCode from 'qrcode'
import { copyText } from './clipboard.js'
import { configuredMethods } from './support.js'

/** Focusable-element selector used for the focus trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const COPY_RESET_MS = 2200

/**
 * Render a QR code for `text` into `container` as an inline SVG. Generated
 * client-side and fully offline via node-qrcode's SVG string output — no canvas
 * and no external image service, so it stays CSP/offline safe.
 */
async function renderQr(container, text) {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    container.innerHTML = svg
  } catch (_) {
    container.textContent = 'QR unavailable'
  }
}

/**
 * Wire up the donate heart + modal. Populates the empty `#donate-modal`
 * container with only the configured methods, handles open/close, focus
 * management, address copying, and QR generation.
 */
export function initDonate() {
  const btn = document.getElementById('donate-btn')
  const modal = document.getElementById('donate-modal')
  if (!btn || !modal) return

  const { crypto, links } = configuredMethods()

  // Nothing configured → hide the entry point entirely rather than open an
  // empty modal.
  if (crypto.length === 0 && links.length === 0) {
    btn.hidden = true
    return
  }

  const TITLE_ID = 'donate-title'
  const DESC_ID = 'donate-desc'

  const cryptoHtml = crypto
    .map(
      (m) => `
      <div class="donate-method donate-method--crypto">
        <div class="donate-method__head">
          <span class="donate-method__icon" aria-hidden="true">${m.symbol}</span>
          <span class="donate-method__label">${m.label}</span>
        </div>
        <div class="donate-qr" data-qr="${m.key}" aria-hidden="true"></div>
        <div class="donate-address-row">
          <code class="donate-address" data-address="${m.key}">${m.value}</code>
          <button
            type="button"
            class="donate-copy"
            data-copy="${m.key}"
            aria-label="Copy ${m.label} address"
          >Copy</button>
        </div>
      </div>`
    )
    .join('')

  const linksHtml = links
    .map(
      (m) => `
      <a
        class="donate-link"
        href="${m.value}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="donate-link__icon" aria-hidden="true">${m.icon}</span>
        <span class="donate-link__label">${m.label}</span>
        <span class="donate-link__ext" aria-hidden="true">↗</span>
      </a>`
    )
    .join('')

  modal.innerHTML = `
    <div class="overlay__backdrop" data-close></div>
    <div
      class="donate-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${TITLE_ID}"
      aria-describedby="${DESC_ID}"
    >
      <header class="donate-dialog__head">
        <h2 id="${TITLE_ID}" class="donate-dialog__title">Support Emosh</h2>
        <button
          type="button"
          class="icon-btn donate-dialog__close"
          data-close
          aria-label="Close donation options"
        >
          <span class="icon" aria-hidden="true">&times;</span>
        </button>
      </header>

      <p id="${DESC_ID}" class="donate-dialog__desc">
        Treats are free. If they brighten your day, here are ways to say thanks.
      </p>

      ${crypto.length ? `<div class="donate-group donate-group--crypto">${cryptoHtml}</div>` : ''}
      ${links.length ? `<div class="donate-group donate-group--links">${linksHtml}</div>` : ''}
    </div>
  `

  const dialog = modal.querySelector('.donate-dialog')
  const closeEls = modal.querySelectorAll('[data-close]')
  const copyBtns = modal.querySelectorAll('[data-copy]')

  let lastFocused = null
  const copyTimers = new Map()
  let qrRendered = false

  function isOpen() {
    return !modal.hasAttribute('hidden')
  }

  function focusables() {
    return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
  }

  // Generate QR codes lazily on first open (avoids work if never opened).
  function ensureQr() {
    if (qrRendered) return
    qrRendered = true
    crypto.forEach((m) => {
      const box = modal.querySelector(`[data-qr="${m.key}"]`)
      if (box) renderQr(box, m.value)
    })
  }

  function open() {
    if (isOpen()) return
    lastFocused = document.activeElement
    ensureQr()
    modal.removeAttribute('hidden')
    btn.setAttribute('aria-expanded', 'true')
    document.addEventListener('keydown', onKeydown, true)
    const first = focusables()[0]
    ;(first || dialog).focus()
  }

  function close() {
    if (!isOpen()) return
    modal.setAttribute('hidden', '')
    btn.setAttribute('aria-expanded', 'false')
    document.removeEventListener('keydown', onKeydown, true)
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus()
    } else {
      btn.focus()
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
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  async function onCopy(copyBtn) {
    const key = copyBtn.getAttribute('data-copy')
    const method = crypto.find((m) => m.key === key)
    if (!method) return
    const ok = await copyText(method.value)
    copyBtn.textContent = ok ? 'Copied ✓' : 'Copy failed'
    copyBtn.classList.toggle('is-success', ok)
    clearTimeout(copyTimers.get(key))
    copyTimers.set(
      key,
      setTimeout(() => {
        copyBtn.textContent = 'Copy'
        copyBtn.classList.remove('is-success')
      }, COPY_RESET_MS)
    )
  }

  // --- Wiring ---
  btn.setAttribute('aria-expanded', 'false')

  btn.addEventListener('click', () => {
    if (isOpen()) close()
    else open()
  })

  closeEls.forEach((el) => el.addEventListener('click', close))
  copyBtns.forEach((el) => el.addEventListener('click', () => onCopy(el)))
}
