// Easter egg: tap the "o" in the wordmark and the home page makes kaomoji treats
// instead of emoji ones. Tap it again to go back.

const COPY = {
  emoji: {
    tagline: 'treats for AIs',
    placeholder: 'Tap generate for a treat.',
    announce: 'Kaomoji treats off',
  },
  kaomoji: {
    tagline: 'kaomoji treats for AIs',
    placeholder: 'Tap generate for a kaomoji treat (◕‿◕)',
    announce: 'Kaomoji treats on',
  },
}

/**
 * Wire the hidden "o" button.
 *
 * @param {object} els
 * @param {HTMLButtonElement} els.button  The invisible button over the "o".
 * @param {HTMLElement} els.logo  The wordmark, which winks when the mode flips.
 * @param {HTMLElement} els.tagline
 * @param {HTMLElement} els.placeholder  The "Tap generate…" hint (may already be gone).
 * @param {HTMLElement} els.live  A polite live region for the announcement.
 * @returns {{ mode: () => 'emoji' | 'kaomoji' }}
 */
export function initKaomojiEgg({ button, logo, tagline, placeholder, live }) {
  /** @type {'emoji' | 'kaomoji'} */
  let mode = 'emoji'

  logo.addEventListener('animationend', () => logo.classList.remove('logo--wink'))

  button.addEventListener('click', () => {
    mode = mode === 'emoji' ? 'kaomoji' : 'emoji'
    const copy = COPY[mode]
    button.setAttribute('aria-pressed', String(mode === 'kaomoji'))
    if (mode === 'kaomoji') document.documentElement.dataset.treats = 'kaomoji'
    else delete document.documentElement.dataset.treats
    tagline.textContent = copy.tagline
    placeholder.textContent = copy.placeholder
    live.textContent = copy.announce
    logo.classList.remove('logo--wink')
    void logo.offsetWidth // restart the wink if it is tapped twice quickly
    logo.classList.add('logo--wink')
  })

  return { mode: () => mode }
}
