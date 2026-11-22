import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startPickerPage } from './picker-page.js'

function fakeWasm() {
  const hit = (text) => [{ text, name: 'n', keywords: [], score: 1, supports_skin_tone: false }]
  return {
    warmup: vi.fn(),
    search_emoji: vi.fn(() => hit('💀')),
    search_kaomoji: vi.fn(() => hit('¯\\_(ツ)_/¯')),
  }
}

describe('startPickerPage', () => {
  let root
  beforeEach(() => {
    document.body.innerHTML = '<div id="picker"></div>'
    root = document.getElementById('picker')
  })

  it('warms the databases up before the first search', () => {
    const wasm = fakeWasm()
    startPickerPage({ mode: 'emoji', wasm, copy: vi.fn(), root, search: '' })
    expect(wasm.warmup).toHaveBeenCalledOnce()
  })

  it('wires the emoji page to search_emoji with the skin tone and reads ?q=', () => {
    const wasm = fakeWasm()
    startPickerPage({ mode: 'emoji', wasm, copy: vi.fn(), root, search: '?q=skull' })
    expect(wasm.search_emoji).toHaveBeenCalledWith('skull', expect.any(Number), 0)
    expect(root.querySelector('[role="option"]').textContent).toBe('💀')
  })

  it('wires the kaomoji page to search_kaomoji', () => {
    const wasm = fakeWasm()
    startPickerPage({ mode: 'kaomoji', wasm, copy: vi.fn(), root, search: '?q=shrug' })
    expect(wasm.search_kaomoji).toHaveBeenCalledWith('shrug', expect.any(Number))
    expect(wasm.search_emoji).not.toHaveBeenCalled()
  })

  it('counts renders on window.__emosh only when instrumented (e2e builds)', () => {
    const target = {}
    startPickerPage({ mode: 'emoji', wasm: fakeWasm(), copy: vi.fn(), root, search: '?q=a', target, instrument: true })
    expect(target.__emosh.renders).toBe(1)

    const plain = {}
    startPickerPage({ mode: 'emoji', wasm: fakeWasm(), copy: vi.fn(), root, search: '', target: plain, instrument: false })
    expect(plain.__emosh).toBeUndefined()
  })

  it('defaults to the #picker element, the page URL and no instrumentation', () => {
    const wasm = fakeWasm()
    startPickerPage({ mode: 'emoji', wasm, copy: vi.fn() })
    expect(root.querySelector('input[type="search"]')).not.toBeNull()
    expect(window.__emosh).toBeUndefined()
  })
})
