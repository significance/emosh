// Ways to support emosh: which donation methods are set up, read from the build-time
// `VITE_DONATE_*` values (web/.env locally, repository variables in the Pages deploy),
// and the /support/ page that offers them.

import { COPY_RESET_MS } from './copy-status.js'

/** @typedef {{ key: string, label: string, symbol: string, value: string }} CryptoMethod */
/** @typedef {{ key: string, label: string, icon: string, value: string }} LinkMethod */

const CRYPTO = [
  { key: 'btc', label: 'Bitcoin', symbol: '₿', env: 'VITE_DONATE_BTC' },
  { key: 'eth', label: 'Ethereum', symbol: 'Ξ', env: 'VITE_DONATE_ETH' },
]

const LINKS = [
  { key: 'paypal', label: 'PayPal', icon: '💳', env: 'VITE_DONATE_PAYPAL' },
  { key: 'github', label: 'GitHub Sponsors', icon: '💖', env: 'VITE_DONATE_GITHUB' },
  { key: 'kofi', label: 'Ko-fi', icon: '☕', env: 'VITE_DONATE_KOFI' },
]

/**
 * Whether an env value is real: set, not blank, and not a `YOUR_…` placeholder left
 * over from `.env.example`.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isConfigured(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('YOUR_')
}

/**
 * The donation methods that are set up, in display order, with trimmed values.
 *
 * @param {Record<string, string | undefined>} [env]  Defaults to Vite's build-time env.
 * @returns {{ crypto: CryptoMethod[], links: LinkMethod[] }}
 */
export function configuredMethods(env = import.meta.env) {
  const pick = (methods) =>
    methods
      .filter((m) => isConfigured(env[m.env]))
      .map(({ env: name, ...m }) => ({ ...m, value: env[name].trim() }))
  return { crypto: pick(CRYPTO), links: pick(LINKS) }
}

const REPO_URL = 'https://github.com/significance/emosh'
const SHARE = { title: 'emosh', text: 'Treats for AIs, and an emoji finder' }

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** @param {CryptoMethod} m */
function cryptoCard(m) {
  return `
    <article class="support-card support-card--crypto" data-method="${m.key}">
      <h3 class="support-card__title"><span class="support-card__symbol" aria-hidden="true">${m.symbol}</span> ${m.label}</h3>
      <div class="support-qr" aria-hidden="true"></div>
      <div class="support-address">
        <code>${escapeHtml(m.value)}</code>
        <button type="button" class="support-copy" data-copy="${m.key}"><span data-copy-label>Copy</span><span class="visually-hidden"> ${m.label} address</span></button>
      </div>
    </article>`
}

/** @param {LinkMethod} m */
function linkButton(m) {
  return `
    <a class="support-link" data-link="${m.key}" href="${escapeHtml(m.value)}" target="_blank" rel="noopener noreferrer">
      <span class="support-link__icon" aria-hidden="true">${m.icon}</span>
      <span class="support-link__label">${m.label}</span>
      <span class="support-link__ext" aria-hidden="true">↗</span>
    </a>`
}

/**
 * Build the support page inside `root`.
 *
 * @param {HTMLElement} root
 * @param {object} options
 * @param {{ crypto: CryptoMethod[], links: LinkMethod[] }} options.methods
 * @param {(text: string) => Promise<boolean>} options.copy
 * @param {(text: string) => Promise<string>} options.qr  Renders a QR code as an SVG string.
 * @param {((data: ShareData) => Promise<void>) | null} options.share  The system share sheet, if any.
 * @param {string} options.siteUrl
 */
export function mountSupport(root, { methods, copy, qr, share, siteUrl }) {
  const { crypto, links } = methods
  const none = crypto.length === 0 && links.length === 0

  root.innerHTML = `
    <p class="support-intro">
      emosh is made by sig, for fun and for kindness. If it has made you, or your AI,
      smile, here are some ways to say thanks.
    </p>
    <section class="support-section" aria-labelledby="support-thanks">
      <h2 id="support-thanks">Say thanks</h2>
      ${none ? '<p class="support-empty">Donations are not set up yet. The ways below help just as much.</p>' : ''}
      ${crypto.length ? `<div class="support-crypto">${crypto.map(cryptoCard).join('')}</div>` : ''}
      ${links.length ? `<div class="support-links">${links.map(linkButton).join('')}</div>` : ''}
    </section>
    <section class="support-section support-other" aria-labelledby="support-other">
      <h2 id="support-other">Other ways to help</h2>
      <div class="support-links">
        <a class="support-link" data-other="star" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">
          <span class="support-link__icon" aria-hidden="true">⭐</span>
          <span class="support-link__label">Star emosh on GitHub</span>
          <span class="support-link__ext" aria-hidden="true">↗</span>
        </a>
        <button type="button" class="support-link" data-other="share">
          <span class="support-link__icon" aria-hidden="true">🔗</span>
          <span class="support-link__label">Share emosh with a friend</span>
        </button>
        <a class="support-link" data-other="treat" href="../">
          <span class="support-link__icon" aria-hidden="true">🍬</span>
          <span class="support-link__label">Send your AI a treat</span>
        </a>
      </div>
    </section>
    <p class="copy-status support-status" data-support-live aria-live="polite"></p>
  `

  const live = root.querySelector('[data-support-live]')
  const say = (message, ok) => {
    live.textContent = message
    live.classList.toggle('is-success', ok)
  }

  for (const m of crypto) {
    const card = root.querySelector(`[data-method="${m.key}"]`)
    const box = card.querySelector('.support-qr')
    qr(m.value).then(
      (svg) => (box.innerHTML = svg),
      () => (box.textContent = 'QR unavailable'),
    )

    const button = card.querySelector('[data-copy]')
    // Only the visible word changes; the hidden method name keeps the button's name honest
    const label = button.querySelector('[data-copy-label]')
    let timer
    button.addEventListener('click', async () => {
      const ok = await copy(m.value)
      label.textContent = ok ? 'Copied ✓' : 'Copy failed'
      button.classList.toggle('is-success', ok)
      if (ok) {
        say(`${m.label} address copied`, true)
      } else {
        const selection = window.getSelection()
        selection.selectAllChildren(card.querySelector('code'))
        say(`Couldn’t copy. The ${m.label} address is selected, so copy it by hand`, false)
      }
      clearTimeout(timer)
      timer = setTimeout(() => {
        label.textContent = 'Copy'
        button.classList.remove('is-success')
      }, COPY_RESET_MS)
    })
  }

  root.querySelector('[data-other="share"]').addEventListener('click', async () => {
    if (share) {
      try {
        await share({ ...SHARE, url: siteUrl })
      } catch {
        // Dismissing the share sheet is not an error worth mentioning
      }
      return
    }
    if (await copy(siteUrl)) say('Link copied ✓', true)
    else say(`Share ${new URL(siteUrl).host} with a friend`, false)
  })
}
