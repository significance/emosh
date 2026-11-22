// Emoshions — the site's mood. Each page load picks one at random so the colours keep
// moving. A palette supplies three gradient stops plus an accent for light and dark;
// style.css derives backgrounds, surfaces and borders from these with color-mix().

import ePaths from './assets/emosh-e-paths.json'

/** @typedef {{ name: string, feel: string, a: string, b: string, c: string, accentLight: string, accentDark: string }} Emoshion */

/** @type {Emoshion[]} */
export const EMOSHIONS = [
  { name: 'joy', feel: 'feeling joyful', a: '#ffb340', b: '#ff6f61', c: '#ff3d8a', accentLight: '#e6472f', accentDark: '#ffb340' },
  { name: 'calm', feel: 'feeling calm', a: '#5fd3a6', b: '#4fb0e8', c: '#7a8cff', accentLight: '#2a8fd1', accentDark: '#6fd6ff' },
  { name: 'love', feel: 'feeling loved', a: '#ff7eb3', b: '#ff3d81', c: '#b24bf3', accentLight: '#e02a6f', accentDark: '#ff7eb3' },
  { name: 'wonder', feel: 'feeling wonder', a: '#9a7bff', b: '#5aa9e6', c: '#4ff0d8', accentLight: '#6c4bd6', accentDark: '#9a7bff' },
  { name: 'mischief', feel: 'feeling mischievous', a: '#9ccc1f', b: '#f5a623', c: '#ff6f61', accentLight: '#d1771a', accentDark: '#c6ff5a' },
  { name: 'melancholy', feel: 'feeling wistful', a: '#6b7fd7', b: '#8a5fc9', c: '#c86b9a', accentLight: '#5b4bb8', accentDark: '#a08cf0' },
  { name: 'serenity', feel: 'feeling serene', a: '#7fbf7a', b: '#d4a85e', c: '#e8865a', accentLight: '#c6713f', accentDark: '#e2c290' },
  { name: 'opal', feel: 'feeling opalescent', a: '#d98cff', b: '#5fc4ff', c: '#ffc85c', accentLight: '#7a5cc9', accentDark: '#c9a6ff' },
  { name: 'ember', feel: 'feeling warm', a: '#ff8a3d', b: '#ff4d4d', c: '#9b2c6f', accentLight: '#d93a2a', accentDark: '#ff8a3d' },
  { name: 'tide', feel: 'feeling deep', a: '#0fb5a6', b: '#2d6cdf', c: '#6a3df5', accentLight: '#1f5fc9', accentDark: '#4fd1c5' },
]

const E_VIEWBOX = '8.9 8.5 483.3 483.3'

/**
 * Pick a random emoshion (or a named one), apply it to the document, and return it.
 * Sets `data-emoshion` on <html>, the gradient/accent custom properties, and swaps the
 * favicon for a matching tinted "e".
 *
 * @param {string} [name]  Force a specific palette by name (handy for screenshots).
 * @returns {Emoshion}
 */
export function pickEmoshion(name) {
  const chosen =
    EMOSHIONS.find((e) => e.name === name) ??
    EMOSHIONS[Math.floor(Math.random() * EMOSHIONS.length)]
  applyEmoshion(chosen)
  return chosen
}

/** @param {Emoshion} e */
export function applyEmoshion(e) {
  const root = document.documentElement
  root.dataset.emoshion = e.name
  root.style.setProperty('--grad-a', e.a)
  root.style.setProperty('--grad-b', e.b)
  root.style.setProperty('--grad-c', e.c)
  root.style.setProperty('--accent-light', e.accentLight)
  root.style.setProperty('--accent-dark', e.accentDark)
  setFavicon(e)
}

/** @param {Emoshion} e */
function setFavicon(e) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${E_VIEWBOX}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${e.a}"/><stop offset="0.55" stop-color="${e.b}"/>` +
    `<stop offset="1" stop-color="${e.c}"/></linearGradient></defs>` +
    `<g fill="url(#g)">${ePaths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
