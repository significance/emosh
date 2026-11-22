import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCopyStatus } from './copy-status.js'

describe('createCopyStatus', () => {
  let el
  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('p')
  })
  afterEach(() => vi.useRealTimers())

  it('shows a success message with the success class', () => {
    createCopyStatus(el)('Copied ✓', true)
    expect(el.textContent).toBe('Copied ✓')
    expect(el.classList.contains('is-success')).toBe(true)
  })

  it('shows a failure message without the success class', () => {
    createCopyStatus(el)('copy unavailable', false)
    expect(el.classList.contains('is-success')).toBe(false)
  })

  it('clears itself after the reset delay', () => {
    createCopyStatus(el, 1000)('Copied ✓', true)
    vi.advanceTimersByTime(999)
    expect(el.textContent).toBe('Copied ✓')
    vi.advanceTimersByTime(1)
    expect(el.textContent).toBe('')
    expect(el.classList.contains('is-success')).toBe(false)
  })

  it('restarts the timer when a new message arrives', () => {
    const set = createCopyStatus(el, 1000)
    set('one', true)
    vi.advanceTimersByTime(800)
    set('two', true)
    vi.advanceTimersByTime(800)
    expect(el.textContent).toBe('two')
  })
})
