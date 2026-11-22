// The page shell every emosh page shares: this visit's emoshion (palette, favicon and
// footer label) and the settings cog. The heart is a plain link to /support/.

import { pickEmoshion } from './emoshions.js'
import { initSettings } from './settings.js'

/**
 * Boot the shared shell. Call before the first paint so the palette lands early.
 *
 * @param {string} [search]  The query string; `?emoshion=<name>` forces a palette.
 * @returns {import('./emoshions.js').Emoshion} The emoshion in effect.
 */
export function initShell(search = location.search) {
  const emoshion = pickEmoshion(new URLSearchParams(search).get('emoshion') ?? undefined)
  const tag = document.getElementById('emoshion-tag')
  if (tag) tag.textContent = `emosh is ${emoshion.feel} today`
  initSettings()
  return emoshion
}
