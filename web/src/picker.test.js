import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPicker, limitFor, measureColumns } from './picker.js'

/** In-memory Storage stand-in. */
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  }
}

/** Fake WASM search: `n` results per query, none for "nothing". */
function fakeSearch(n = 10) {
  return vi.fn((query, limit, tone = 0) => {
    if (query.includes('nothing')) return []
    return Array.from({ length: Math.min(n, limit) }, (_, i) => ({
      text: tone ? `e${i}~${tone}` : `e${i}`,
      name: `${query}-${i}`,
      keywords: [query],
      score: 100 - i,
      supports_skin_tone: i === 0,
    }))
  })
}

let ctx
function setup(options = {}) {
  document.body.innerHTML = '<main><div id="root"></div></main><button id="after">after</button>'
  const root = document.getElementById('root')
  const search = options.search ?? fakeSearch(options.count)
  const copy = options.copy ?? vi.fn(async () => true)
  const storage = options.storage ?? memoryStorage()
  const onRender = vi.fn()
  const picker = mountPicker(root, {
    mode: 'emoji',
    search,
    copy,
    storage,
    viewportWidth: () => 1280,
    columns: () => 4,
    onRender,
    ...options,
  })
  const input = root.querySelector('input[type="search"]')
  const results = root.querySelector('[role="listbox"]')
  const live = root.querySelector('[data-picker-live]')
  const status = root.querySelector('[data-picker-status]')
  ctx = { root, search, copy, storage, onRender, picker, input, results, live, status }
  return ctx
}

function type(text) {
  ctx.input.value = text
  ctx.input.dispatchEvent(new Event('input', { bubbles: true }))
}

const options = () => [...ctx.results.querySelectorAll('[role="option"]')]

describe('limitFor', () => {
  it('shows 12 on phones and 24 on wider screens', () => {
    expect(limitFor(390)).toBe(12)
    expect(limitFor(599)).toBe(12)
    expect(limitFor(600)).toBe(24)
    expect(limitFor(1280)).toBe(24)
  })
})

describe('mountPicker — search and render', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders a labelled search box and listbox and focuses the input', () => {
    setup()
    expect(ctx.input).toBeTruthy()
    expect(document.activeElement).toBe(ctx.input)
    expect(ctx.input.getAttribute('aria-controls')).toBe(ctx.results.id)
    expect(ctx.input.getAttribute('role')).toBe('combobox')
    expect(ctx.results.getAttribute('aria-label')).toMatch(/emoji/)
  })

  it('shows the hint and does not search while the query is empty', () => {
    setup()
    expect(ctx.root.querySelector('[data-picker-hint]').hidden).toBe(false)
    expect(ctx.root.querySelector('[data-picker-hint]').textContent).toMatch(/type a feeling/)
    vi.advanceTimersByTime(200)
    expect(ctx.search).not.toHaveBeenCalled()
  })

  it('debounces typing and searches once with the desktop limit', () => {
    setup()
    ctx.onRender.mockClear() // the mount render (recents) is not part of the burst
    type('h')
    type('ha')
    type('hap')
    vi.advanceTimersByTime(59)
    expect(ctx.search).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(ctx.search).toHaveBeenCalledOnce()
    expect(ctx.search).toHaveBeenCalledWith('hap', 24, 0)
    expect(ctx.onRender).toHaveBeenCalledOnce()
    expect(options()).toHaveLength(10)
    expect(ctx.root.querySelector('[data-picker-hint]').hidden).toBe(true)
  })

  it('uses the phone limit on narrow viewports', () => {
    setup({ viewportWidth: () => 390, count: 30 })
    type('happy')
    vi.advanceTimersByTime(60)
    expect(ctx.search).toHaveBeenCalledWith('happy', 12, 0)
    expect(options()).toHaveLength(12)
  })

  it('renders each result as an option carrying its text and name', () => {
    setup()
    type('happy')
    vi.advanceTimersByTime(60)
    const first = options()[0]
    expect(first.textContent).toContain('e0')
    expect(first.title).toBe('happy-0')
    expect(first.getAttribute('aria-label')).toBe('e0 happy-0')
    expect(first.id).toMatch(/^pick-emoji-0$/)
    expect(first.getAttribute('aria-selected')).toBe('false')
  })

  it('announces the number of results and a no-match message', () => {
    setup()
    type('happy')
    vi.advanceTimersByTime(60)
    expect(ctx.live.textContent).toBe('10 results')
    type('nothing')
    vi.advanceTimersByTime(60)
    expect(options()).toHaveLength(0)
    expect(ctx.live.textContent).toBe('No matches')
    expect(ctx.root.querySelector('[data-picker-empty]').hidden).toBe(false)
  })

  it('says "1 result" for a single hit', () => {
    setup({ count: 1 })
    type('one')
    vi.advanceTimersByTime(60)
    expect(ctx.live.textContent).toBe('1 result')
  })

  it('clears results when the query is emptied again', () => {
    setup()
    type('happy')
    vi.advanceTimersByTime(60)
    type('')
    vi.advanceTimersByTime(60)
    expect(options()).toHaveLength(0)
    expect(ctx.root.querySelector('[data-picker-hint]').hidden).toBe(false)
  })

  it('searches an initial query immediately without the debounce', () => {
    setup({ initialQuery: 'skull' })
    expect(ctx.input.value).toBe('skull')
    expect(ctx.search).toHaveBeenCalledWith('skull', 24, 0)
    expect(options()).toHaveLength(10)
  })
})

function key(name, extra = {}) {
  const target = document.activeElement
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra })
  target.dispatchEvent(event)
  return event
}

const highlighted = () => ctx.results.querySelector('[aria-selected="true"]')
const indexOf = (el) => Number(el?.dataset.index)

describe('mountPicker — keyboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setup()
    type('happy')
    vi.advanceTimersByTime(60)
  })
  afterEach(() => vi.useRealTimers())

  it('Tab from the input highlights and focuses the first result', () => {
    const event = key('Tab')
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(options()[0])
    expect(highlighted()).toBe(options()[0])
    expect(ctx.input.getAttribute('aria-activedescendant')).toBe('pick-emoji-0')
  })

  it('ArrowDown from the input also enters the results', () => {
    key('ArrowDown')
    expect(document.activeElement).toBe(options()[0])
  })

  it('Tab without results leaves the browser default alone', () => {
    type('nothing')
    vi.advanceTimersByTime(60)
    expect(key('Tab').defaultPrevented).toBe(false)
  })

  it('Tab and Shift+Tab move through results with a roving tabindex', () => {
    key('Tab')
    key('Tab')
    expect(indexOf(document.activeElement)).toBe(1)
    expect(options()[1].tabIndex).toBe(0)
    expect(options()[0].tabIndex).toBe(-1)
    expect(options()[0].getAttribute('aria-selected')).toBe('false')
    key('Tab', { shiftKey: true })
    expect(indexOf(document.activeElement)).toBe(0)
  })

  it('Shift+Tab from the first result returns to the input', () => {
    key('Tab')
    const event = key('Tab', { shiftKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(ctx.input)
    expect(highlighted()).toBeNull()
    expect(ctx.input.hasAttribute('aria-activedescendant')).toBe(false)
  })

  it('Tab on the last result lets focus leave the picker', () => {
    key('Tab')
    for (let i = 0; i < 9; i++) key('Tab')
    expect(indexOf(document.activeElement)).toBe(9)
    expect(key('Tab').defaultPrevented).toBe(false)
  })

  it('arrows move by one sideways and by a row vertically on the emoji grid', () => {
    key('Tab')
    key('ArrowRight')
    expect(indexOf(document.activeElement)).toBe(1)
    key('ArrowDown')
    expect(indexOf(document.activeElement)).toBe(5)
    key('ArrowLeft')
    expect(indexOf(document.activeElement)).toBe(4)
    key('ArrowUp')
    expect(indexOf(document.activeElement)).toBe(0)
  })

  it('arrows clamp at the ends of the grid', () => {
    key('Tab')
    key('ArrowLeft')
    expect(indexOf(document.activeElement)).toBe(0)
    for (let i = 0; i < 5; i++) key('ArrowDown')
    expect(indexOf(document.activeElement)).toBe(9)
    key('ArrowRight')
    expect(indexOf(document.activeElement)).toBe(9)
  })

  it('ArrowUp from the first row goes back to the input', () => {
    key('Tab')
    key('ArrowRight')
    key('ArrowUp')
    expect(document.activeElement).toBe(ctx.input)
  })

  it('digits 1–9 highlight that result when the results have focus', () => {
    key('Tab')
    key('3')
    expect(indexOf(highlighted())).toBe(2)
    key('9')
    expect(indexOf(highlighted())).toBe(8)
  })

  it('digits beyond the results are ignored', () => {
    setup({ count: 2 })
    type('two')
    vi.advanceTimersByTime(60)
    key('Tab')
    key('5')
    expect(indexOf(highlighted())).toBe(0)
  })

  it('digits typed in the input stay text (so "100" can be searched)', () => {
    const event = key('1')
    expect(event.defaultPrevented).toBe(false)
    expect(highlighted()).toBeNull()
  })

  it('Escape clears the query and refocuses the input, from either place', () => {
    key('Tab')
    key('Escape')
    expect(document.activeElement).toBe(ctx.input)
    expect(ctx.input.value).toBe('')
    expect(options()).toHaveLength(0)
    type('happy')
    vi.advanceTimersByTime(60)
    key('Escape')
    expect(ctx.input.value).toBe('')
    expect(ctx.root.querySelector('[data-picker-hint]').hidden).toBe(false)
  })

  it('typing while a result is highlighted goes to the input and keeps the character', () => {
    key('Tab')
    const event = key('s')
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(ctx.input)
    expect(ctx.input.value).toBe('happys')
    vi.advanceTimersByTime(60)
    expect(ctx.search).toHaveBeenLastCalledWith('happys', 24, 0)
  })

  it('Backspace on a result edits the query in the input', () => {
    key('Tab')
    key('Backspace')
    expect(document.activeElement).toBe(ctx.input)
    expect(ctx.input.value).toBe('happ')
  })

  it('modified keys on a result are left to the browser', () => {
    key('Tab')
    expect(key('c', { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(key('F5').defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(options()[0])
  })

  it('a new search drops the old highlight', () => {
    key('Tab')
    key('ArrowRight')
    type('happier')
    vi.advanceTimersByTime(60)
    expect(highlighted()).toBeNull()
  })
})

describe('measureColumns', () => {
  function listWithTops(tops) {
    const list = document.createElement('div')
    for (const top of tops) {
      const option = document.createElement('button')
      Object.defineProperty(option, 'offsetTop', { value: top })
      list.append(option)
    }
    return list
  }

  it('counts the results on the first row', () => {
    expect(measureColumns(listWithTops([0, 0, 0, 60, 60]))).toBe(3)
  })

  it('treats an empty or single-column list as one column', () => {
    expect(measureColumns(listWithTops([]))).toBe(1)
    expect(measureColumns(listWithTops([0, 40, 80]))).toBe(1)
  })

  it('is the default column measure for grid navigation', () => {
    vi.useFakeTimers()
    setup({ columns: undefined })
    type('happy')
    vi.advanceTimersByTime(60)
    // jsdom has no layout: every option sits at offsetTop 0, so the whole list is one row
    key('Tab')
    key('ArrowDown')
    expect(indexOf(document.activeElement)).toBe(9)
    vi.useRealTimers()
  })
})

/** Let pending promise callbacks (the async copy) run. */
const flush = () => vi.advanceTimersByTimeAsync(0)

describe('mountPicker — copying', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  function ready(opts) {
    setup(opts)
    type('happy')
    vi.advanceTimersByTime(60)
  }

  it('Enter in the input copies the first result when nothing is highlighted', async () => {
    ready()
    key('Enter')
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('e0')
  })

  it('Enter in the input with no results does nothing', async () => {
    ready()
    type('nothing')
    vi.advanceTimersByTime(60)
    key('Enter')
    await flush()
    expect(ctx.copy).not.toHaveBeenCalled()
  })

  it('Enter on a highlighted result copies that result', async () => {
    ready()
    key('Tab')
    key('Tab')
    const event = key('Enter')
    await flush()
    expect(event.defaultPrevented).toBe(true)
    expect(ctx.copy).toHaveBeenCalledOnce()
    expect(ctx.copy).toHaveBeenCalledWith('e1')
  })

  it('Space on a highlighted result copies it instead of typing a space', async () => {
    ready()
    key('Tab')
    key(' ')
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('e0')
    expect(ctx.input.value).toBe('happy')
  })

  it('a digit quick-picks and copies that result', async () => {
    ready()
    key('Tab')
    key('3')
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('e2')
  })

  it('clicking or tapping a result copies it and highlights it', async () => {
    ready()
    options()[4].click()
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('e4')
    expect(highlighted()).toBe(options()[4])
  })

  it('clicks on the list background are ignored', async () => {
    ready()
    ctx.results.click()
    await flush()
    expect(ctx.copy).not.toHaveBeenCalled()
  })

  it('shows "Copied ✓" feedback, announces it and pulses the tile', async () => {
    ready()
    options()[0].click()
    await flush()
    expect(ctx.status.textContent).toBe('Copied ✓ e0')
    expect(ctx.status.classList.contains('is-success')).toBe(true)
    expect(ctx.live.textContent).toBe('Copied e0')
    expect(options()[0].classList.contains('pick--copied')).toBe(true)
    vi.advanceTimersByTime(600)
    expect(options()[0].classList.contains('pick--copied')).toBe(false)
  })

  it('on copy failure shows the text in a selectable field instead of an error', async () => {
    const copy = vi.fn(async () => false)
    ready({ copy })
    options()[2].click()
    await flush()
    const fallback = ctx.root.querySelector('[data-picker-fallback]')
    expect(fallback.hidden).toBe(false)
    const field = fallback.querySelector('input')
    expect(field.value).toBe('e2')
    expect(field.readOnly).toBe(true)
    expect(document.activeElement).toBe(field)
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(2)
    expect(ctx.status.textContent).toMatch(/select it below/)
    expect(ctx.status.classList.contains('is-success')).toBe(false)
  })

  it('the fallback "copy" button retries and hides the field when it works', async () => {
    let allow = false
    const copy = vi.fn(async () => allow)
    ready({ copy })
    options()[2].click()
    await flush()
    allow = true
    ctx.root.querySelector('[data-picker-fallback] button').click()
    await flush()
    expect(copy).toHaveBeenLastCalledWith('e2')
    expect(ctx.root.querySelector('[data-picker-fallback]').hidden).toBe(true)
    expect(ctx.status.textContent).toBe('Copied ✓ e2')
  })

  it('the fallback button keeps the field up while copying still fails', async () => {
    const copy = vi.fn(async () => false)
    ready({ copy })
    options()[2].click()
    await flush()
    ctx.root.querySelector('[data-picker-fallback] button').click()
    await flush()
    expect(ctx.root.querySelector('[data-picker-fallback]').hidden).toBe(false)
  })

  it('a successful copy hides an earlier fallback', async () => {
    let allow = false
    const copy = vi.fn(async () => allow)
    ready({ copy })
    options()[0].click()
    await flush()
    allow = true
    options()[1].click()
    await flush()
    expect(ctx.root.querySelector('[data-picker-fallback]').hidden).toBe(true)
  })
})

describe('mountPicker — recents', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const recentOf = (storage, mode = 'emoji') =>
    JSON.parse(storage.getItem(`emosh.recent.${mode}`) ?? '[]')

  it('remembers copies newest first, without duplicates, per mode', async () => {
    setup()
    type('happy')
    vi.advanceTimersByTime(60)
    options()[0].click()
    await flush()
    options()[1].click()
    await flush()
    options()[0].click()
    await flush()
    expect(recentOf(ctx.storage).map((r) => r.text)).toEqual(['e0', 'e1'])
    expect(recentOf(ctx.storage)[0].name).toBe('happy-0')
  })

  it('keeps only the last 12', async () => {
    setup({ count: 20, storage: memoryStorage() })
    type('happy')
    vi.advanceTimersByTime(60)
    for (const option of options().slice(0, 15)) {
      option.click()
      await flush()
    }
    const recent = recentOf(ctx.storage)
    expect(recent).toHaveLength(12)
    expect(recent[0].text).toBe('e14')
  })

  it('does not remember failed copies', async () => {
    setup({ copy: vi.fn(async () => false) })
    type('happy')
    vi.advanceTimersByTime(60)
    options()[0].click()
    await flush()
    expect(recentOf(ctx.storage)).toEqual([])
  })

  it('shows recents as pickable results while the query is empty', async () => {
    const storage = memoryStorage({
      'emosh.recent.emoji': JSON.stringify([{ text: '💀', name: 'skull' }, { text: '🦄', name: 'unicorn' }]),
    })
    setup({ storage })
    expect(options().map((o) => o.textContent)).toEqual(['💀', '🦄'])
    expect(ctx.root.querySelector('[data-picker-recent]').hidden).toBe(false)
    expect(ctx.search).not.toHaveBeenCalled()
    options()[1].click()
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('🦄')
    type('happy')
    vi.advanceTimersByTime(60)
    expect(ctx.root.querySelector('[data-picker-recent]').hidden).toBe(true)
  })

  it('Escape brings the recents back', () => {
    const storage = memoryStorage({
      'emosh.recent.emoji': JSON.stringify([{ text: '💀', name: 'skull' }]),
    })
    setup({ storage })
    type('happy')
    vi.advanceTimersByTime(60)
    key('Escape')
    expect(options().map((o) => o.textContent)).toEqual(['💀'])
  })

  it('ignores corrupt or unavailable storage', async () => {
    setup({ storage: memoryStorage({ 'emosh.recent.emoji': '{not json' }) })
    expect(options()).toHaveLength(0)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    setup({ storage: broken })
    type('happy')
    vi.advanceTimersByTime(60)
    options()[0].click()
    await flush()
    expect(ctx.status.textContent).toBe('Copied ✓ e0')
  })

  it('ignores stored recents that are not a list', () => {
    setup({ storage: memoryStorage({ 'emosh.recent.emoji': '{"text":"x"}' }) })
    expect(options()).toHaveLength(0)
  })
})

describe('mountPicker — skin tone (emoji)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const tone = () => ctx.root.querySelector('[data-picker-tone]')

  it('offers tones 0–5 starting from the saved one, like the CLI', () => {
    setup({ storage: memoryStorage({ 'emosh.skin_tone': '3' }) })
    expect([...tone().options].map((o) => o.value)).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(tone().value).toBe('3')
    type('wave')
    vi.advanceTimersByTime(60)
    expect(ctx.search).toHaveBeenCalledWith('wave', 24, 3)
    expect(options()[0].textContent).toBe('e0~3')
  })

  it('changing the tone saves it and re-runs the query at once', () => {
    setup()
    type('wave')
    vi.advanceTimersByTime(60)
    tone().value = '4'
    tone().dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.storage.getItem('emosh.skin_tone')).toBe('4')
    expect(ctx.search).toHaveBeenLastCalledWith('wave', 24, 4)
  })

  it('falls back to the default tone for bad saved values', () => {
    setup({ storage: memoryStorage({ 'emosh.skin_tone': '9' }) })
    expect(tone().value).toBe('0')
    setup({ storage: memoryStorage({ 'emosh.skin_tone': 'purple' }) })
    expect(tone().value).toBe('0')
  })

  it('keeps working when the tone cannot be saved', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
    }
    setup({ storage })
    tone().value = '2'
    expect(() => tone().dispatchEvent(new Event('change', { bubbles: true }))).not.toThrow()
  })

  it('kaomoji mode has no tone selector', () => {
    setup({ mode: 'kaomoji' })
    expect(tone()).toBeNull()
  })
})
