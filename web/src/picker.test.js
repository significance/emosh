import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPicker, limitFor } from './picker.js'

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
