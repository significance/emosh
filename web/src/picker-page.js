// Boot a picker page (/emoji or /kaomoji) once the WASM module is initialised:
// warm the databases up, pick the right search, honour `?q=`, and in e2e builds count
// renders on `window.__emosh` so the browser tests can see the debounce work.

import { mountPicker } from './picker.js'

/**
 * @param {object} options
 * @param {'emoji' | 'kaomoji'} options.mode
 * @param {{ warmup: () => void, search_emoji: Function, search_kaomoji: Function }} options.wasm
 * @param {(text: string) => Promise<boolean>} options.copy
 * @param {HTMLElement} [options.root]
 * @param {string} [options.search]  The page's query string.
 * @param {boolean} [options.instrument]  Expose the render counter (e2e builds only).
 * @param {object} [options.target]  Where the counter lives (the window).
 */
export function startPickerPage({
  mode,
  wasm,
  copy,
  root = document.getElementById('picker'),
  search = location.search,
  instrument = import.meta.env.MODE === 'e2e',
  target = globalThis,
}) {
  wasm.warmup()
  const find =
    mode === 'emoji'
      ? (query, limit, tone) => wasm.search_emoji(query, limit, tone)
      : (query, limit) => wasm.search_kaomoji(query, limit)

  let onRender
  if (instrument) {
    target.__emosh = { renders: 0 }
    onRender = () => target.__emosh.renders++
  }

  return mountPicker(root, {
    mode,
    search: find,
    copy,
    initialQuery: new URLSearchParams(search).get('q') ?? '',
    onRender,
  })
}
