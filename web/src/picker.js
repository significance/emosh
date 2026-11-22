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
  let timer

  function runSearch() {
    const query = input.value.trim()
    items = query === '' ? [] : search(query, limitFor(viewportWidth()), 0)
    render(query)
  }

  function render(query) {
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

  input.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(runSearch, debounceMs)
  })

  if (initialQuery) {
    input.value = initialQuery
    runSearch()
  }
  input.focus()

  return { input, list }
}
