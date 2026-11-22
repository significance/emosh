// The emoji / kaomoji picker: a search box over the real Rust search (via WASM),
// with results you can Tab through, arrow around, quick-pick with 1–9, and copy by
// Enter, click or tap. One module, parameterised by mode; the pages inject the WASM
// search and the clipboard so everything here is testable without either.

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
    <p class="picker-hint" data-picker-hint>${labels.hint}</p>
    <p class="picker-empty" data-picker-empty hidden>No matches. Try another word.</p>
    <div id="picker-results-${mode}" class="picker-results" role="listbox"
      aria-label="${labels.noun} results"></div>
    <p class="copy-status picker-status" data-picker-status aria-hidden="true"></p>
    <p class="visually-hidden" data-picker-live aria-live="polite"></p>
  `

  const input = root.querySelector('.picker-input')
  const hint = root.querySelector('[data-picker-hint]')
  const empty = root.querySelector('[data-picker-empty]')
  const list = root.querySelector('.picker-results')
  const live = root.querySelector('[data-picker-live]')

  /** @type {PickResult[]} */
  let items = []
  /** Index of the highlighted result, or -1 for none. */
  let highlight = -1
  let timer

  function runSearch() {
    const query = input.value.trim()
    items = query === '' ? [] : search(query, limitFor(viewportWidth()), 0)
    render(query)
  }

  function render(query) {
    highlight = -1
    input.removeAttribute('aria-activedescendant')
    list.replaceChildren(...items.map(renderOption))
    hint.hidden = query !== ''
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
    option.setAttribute('aria-label', `${item.text} ${item.name}`)
    option.title = item.name
    option.tabIndex = -1
    option.dataset.index = String(index)
    option.textContent = item.text
    return option
  }

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

  input.addEventListener('input', scheduleSearch)

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      clearQuery()
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
    } else if (/^[1-9]$/.test(key)) {
      event.preventDefault()
      const number = Number(key)
      if (number <= items.length) highlightAt(number - 1)
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

  if (initialQuery) {
    input.value = initialQuery
    runSearch()
  }
  input.focus()

  return { input, list }
}
