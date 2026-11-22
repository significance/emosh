// The emoji / kaomoji picker: a search box over the real Rust search (via WASM),
// with results you can Tab through, arrow around, quick-pick with 1–9, and copy by
// Enter, click or tap. One module, parameterised by mode; the pages inject the WASM
// search and the clipboard so everything here is testable without either.

import { createCopyStatus } from './copy-status.js'

/** @typedef {{ text: string, name: string, keywords: string[], score: number, supports_skin_tone: boolean }} PickResult */

/**
 * @typedef {object} PickerOptions
 * @property {'emoji' | 'kaomoji'} mode
 * @property {(query: string, limit: number, skinTone: number) => PickResult[]} search
 * @property {(text: string) => Promise<boolean>} copy
 * @property {Pick<Storage, 'getItem' | 'setItem'>} [storage]
 * @property {() => number} [viewportWidth]
 * @property {() => number} [columns]  How many results fit on one row (grid navigation).
 * @property {number} [debounceMs]
 * @property {string} [initialQuery]
 * @property {() => void} [onRender]  Called after each results render (test instrumentation).
 */

/** Below this viewport width we show the phone-sized page of results. */
const PHONE_MAX_WIDTH = 600

/**
 * How many results to ask for at a given viewport width.
 *
 * @param {number} width  Viewport width in CSS pixels.
 * @returns {number}
 */
export function limitFor(width) {
  return width < PHONE_MAX_WIDTH ? 12 : 24
}

/** How many recent copies to remember per mode. */
const RECENT_MAX = 12
/** How long the "copied" pulse stays on a tile, in milliseconds. */
const PULSE_MS = 600

/** Where the skin tone lives; the same 0–5 scale as the CLI's `--skin-tone`. */
const TONE_KEY = 'emosh.skin_tone'
const TONES = ['✋ default', '✋🏻 light', '✋🏼 medium-light', '✋🏽 medium', '✋🏾 medium-dark', '✋🏿 dark']

/**
 * Read the saved skin tone, falling back to 0 for anything outside 0–5.
 *
 * @param {Pick<Storage, 'getItem'>} storage
 * @returns {number}
 */
function savedTone(storage) {
  let tone
  try {
    tone = Number(storage.getItem(TONE_KEY))
  } catch {
    return 0
  }
  return Number.isInteger(tone) && tone >= 0 && tone <= 5 ? tone : 0
}

const ARROWS = { ArrowLeft: true, ArrowRight: true, ArrowUp: true, ArrowDown: true }

/**
 * Count how many results share the first row, by layout position.
 *
 * @param {HTMLElement} list
 * @returns {number}
 */
export function measureColumns(list) {
  const options = [...list.children]
  if (options.length === 0) return 1
  const top = options[0].offsetTop
  const firstRow = options.filter((option) => option.offsetTop === top).length
  return Math.max(1, firstRow)
}

const LABELS = {
  emoji: { noun: 'emoji', hint: 'type a feeling… happy, skull, alpha' },
  kaomoji: { noun: 'kaomoji', hint: 'type a feeling… shrug, table flip, lenny' },
}

/**
 * Build the picker inside `root` and wire it up.
 *
 * @param {HTMLElement} root
 * @param {PickerOptions} options
 */
export function mountPicker(root, options) {
  const {
    mode,
    search,
    copy,
    storage = globalThis.localStorage,
    viewportWidth = () => globalThis.innerWidth,
    debounceMs = 60,
    initialQuery = '',
    columns = () => measureColumns(list),
    onRender = () => {},
  } = options
  const labels = LABELS[mode]

  root.classList.add('picker', `picker--${mode}`)
  root.innerHTML = `
    <label class="visually-hidden" for="picker-input-${mode}">Search ${labels.noun}</label>
    <input id="picker-input-${mode}" class="picker-input" type="search" role="combobox"
      aria-autocomplete="list" aria-expanded="false" aria-controls="picker-results-${mode}"
      autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
      placeholder="${labels.hint}" />
    ${
      mode === 'emoji'
        ? `<label class="picker-tone"><span class="visually-hidden">Skin tone</span>
        <select data-picker-tone>${TONES.map((t, i) => `<option value="${i}">${t}</option>`).join('')}</select></label>`
        : ''
    }
    <p class="picker-hint" data-picker-hint>${labels.hint}</p>
    <p class="picker-empty" data-picker-empty hidden>No matches. Try another word.</p>
    <p class="picker-recent" data-picker-recent hidden>recent</p>
    <div id="picker-results-${mode}" class="picker-results" role="listbox"
      aria-label="${labels.noun} results"></div>
    <p class="copy-status picker-status" data-picker-status aria-hidden="true"></p>
    <div class="picker-fallback" data-picker-fallback hidden>
      <label class="visually-hidden" for="picker-fallback-${mode}">Text to copy</label>
      <input id="picker-fallback-${mode}" class="picker-fallback-field" readonly />
      <button type="button" class="picker-fallback-btn">copy</button>
    </div>
    <p class="visually-hidden" data-picker-live aria-live="polite"></p>
  `

  const input = root.querySelector('.picker-input')
  const hint = root.querySelector('[data-picker-hint]')
  const empty = root.querySelector('[data-picker-empty]')
  const list = root.querySelector('.picker-results')
  const live = root.querySelector('[data-picker-live]')
  const recentLabel = root.querySelector('[data-picker-recent]')
  const fallback = root.querySelector('[data-picker-fallback]')
  const fallbackField = fallback.querySelector('input')
  const setStatus = createCopyStatus(root.querySelector('[data-picker-status]'))
  const recentKey = `emosh.recent.${mode}`
  const toneSelect = root.querySelector('[data-picker-tone]')
  let tone = 0

  /** @type {PickResult[]} */
  let items = []
  /** Index of the highlighted result, or -1 for none. */
  let highlight = -1
  let timer

  function runSearch() {
    const query = input.value.trim()
    items = query === '' ? loadRecents() : search(query, limitFor(viewportWidth()), tone)
    render(query)
  }

  function render(query) {
    highlight = -1
    input.removeAttribute('aria-activedescendant')
    list.replaceChildren(...items.map(renderOption))
    hint.hidden = query !== ''
    recentLabel.hidden = query !== '' || items.length === 0
    empty.hidden = query === '' || items.length > 0
    input.setAttribute('aria-expanded', String(items.length > 0))
    if (query !== '') {
      live.textContent =
        items.length === 0 ? 'No matches' : `${items.length} result${items.length === 1 ? '' : 's'}`
    }
    onRender()
  }

  function renderOption(item, index) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'pick'
    option.id = `pick-${mode}-${index}`
    option.setAttribute('role', 'option')
    option.setAttribute('aria-selected', 'false')
    option.tabIndex = -1
    option.dataset.index = String(index)
    if (mode === 'kaomoji') {
      // Wide faces get a row: the face (ellipsised by CSS, never wrapped) and its name
      option.title = `${item.text}  ${item.name}`
      const face = document.createElement('span')
      face.className = 'pick-face'
      face.textContent = item.text
      const name = document.createElement('span')
      name.className = 'pick-name'
      name.textContent = item.name
      option.append(face, ' ', name)
    } else {
      option.setAttribute('aria-label', `${item.text} ${item.name}`)
      option.title = item.name
      option.textContent = item.text
    }
    return option
  }

  /** @returns {PickResult[]} */
  function loadRecents() {
    try {
      const stored = JSON.parse(storage.getItem(recentKey) ?? '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  }

  function remember(item) {
    const recent = [
      { text: item.text, name: item.name },
      ...loadRecents().filter((r) => r.text !== item.text),
    ].slice(0, RECENT_MAX)
    try {
      storage.setItem(recentKey, JSON.stringify(recent))
    } catch {
      // Private mode or blocked storage: recents are a convenience, carry on without.
    }
  }

  /** Copy result `index`, with feedback; on failure offer the text to copy by hand. */
  async function copyAt(index) {
    const item = items[index]
    if (!item) return
    highlightAt(index)
    const option = list.children[index]
    if (await copy(item.text)) {
      copied(item, option)
    } else {
      showFallback(item.text)
    }
  }

  function copied(item, option) {
    fallback.hidden = true
    setStatus(`Copied ✓ ${item.text}`, true)
    live.textContent = `Copied ${item.text}`
    remember(item)
    if (option) {
      option.classList.add('pick--copied')
      setTimeout(() => option.classList.remove('pick--copied'), PULSE_MS)
    }
  }

  function showFallback(text) {
    setStatus("Couldn't copy automatically, so select it below", false)
    fallbackField.value = text
    fallback.hidden = false
    fallbackField.focus()
    fallbackField.select()
  }

  fallback.querySelector('button').addEventListener('click', async () => {
    const text = fallbackField.value
    if (await copy(text)) copied({ text, name: '' }, null)
  })

  function scheduleSearch() {
    clearTimeout(timer)
    timer = setTimeout(runSearch, debounceMs)
  }

  /** Highlight result `index` (clamped) and move focus to it. */
  function highlightAt(index) {
    const options = list.children
    highlight = Math.max(0, Math.min(index, options.length - 1))
    for (const [i, option] of [...options].entries()) {
      const on = i === highlight
      option.setAttribute('aria-selected', String(on))
      option.tabIndex = on ? 0 : -1
    }
    const current = options[highlight]
    input.setAttribute('aria-activedescendant', current.id)
    current.focus()
  }

  /** Drop the highlight and put focus back in the search box. */
  function backToInput() {
    for (const option of list.children) {
      option.setAttribute('aria-selected', 'false')
      option.tabIndex = -1
    }
    highlight = -1
    input.removeAttribute('aria-activedescendant')
    input.focus()
  }

  function clearQuery() {
    clearTimeout(timer)
    input.value = ''
    runSearch()
    backToInput()
  }

  /** Arrow key → index delta: rows are `columns()` wide on the emoji grid. */
  function arrowDelta(key) {
    const row = mode === 'emoji' ? columns() : 1
    return { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -row, ArrowDown: row }[key]
  }

  list.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]')
    if (option) copyAt(Number(option.dataset.index))
  })

  if (toneSelect) {
    tone = savedTone(storage)
    toneSelect.value = String(tone)
    toneSelect.addEventListener('change', () => {
      tone = Number(toneSelect.value)
      try {
        storage.setItem(TONE_KEY, String(tone))
      } catch {
        // Unsaved is fine; the tone still applies for this visit.
      }
      runSearch()
    })
  }

  // A long-press on touch fires `contextmenu`: show the whole face rather than the menu
  list.addEventListener('contextmenu', (event) => {
    const option = event.target.closest('[role="option"]')
    if (!option) return
    event.preventDefault()
    setStatus(items[Number(option.dataset.index)].text, false)
  })

  input.addEventListener('input', scheduleSearch)

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      clearQuery()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      copyAt(Math.max(highlight, 0))
    } else if ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown') {
      if (items.length === 0) return
      event.preventDefault()
      highlightAt(0)
    }
  })

  list.addEventListener('keydown', (event) => {
    const { key } = event
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (key === 'Tab') {
      if (!event.shiftKey && highlight === items.length - 1) return
      event.preventDefault()
      if (event.shiftKey && highlight === 0) backToInput()
      else highlightAt(highlight + (event.shiftKey ? -1 : 1))
    } else if (key in ARROWS) {
      event.preventDefault()
      const target = highlight + arrowDelta(key)
      if (key === 'ArrowUp' && target < 0) backToInput()
      else highlightAt(target)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      copyAt(highlight)
    } else if (/^[1-9]$/.test(key)) {
      event.preventDefault()
      const number = Number(key)
      if (number <= items.length) copyAt(number - 1)
    } else if (key === 'Escape') {
      event.preventDefault()
      clearQuery()
    } else if (key === 'Backspace') {
      event.preventDefault()
      input.value = input.value.slice(0, -1)
      backToInput()
      scheduleSearch()
    } else if (key.length === 1) {
      event.preventDefault()
      input.value += key
      backToInput()
      scheduleSearch()
    }
  })

  input.value = initialQuery
  runSearch()
  input.focus()

  return { input, list }
}
