import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initKaomojiEgg } from './kaomoji-egg.js'

describe('initKaomojiEgg', () => {
  let els
  let egg

  beforeEach(() => {
    vi.useFakeTimers()
    document.documentElement.removeAttribute('data-treats')
    document.body.innerHTML = `
      <h1 class="logo"></h1>
      <button class="logo-o" aria-pressed="false"></button>
      <p class="tagline">treats for AIs</p>
      <p class="treat-placeholder">Tap generate for a treat.</p>
      <p id="egg-live"></p>`
    els = {
      button: document.querySelector('.logo-o'),
      logo: document.querySelector('.logo'),
      tagline: document.querySelector('.tagline'),
      placeholder: document.querySelector('.treat-placeholder'),
      live: document.getElementById('egg-live'),
    }
    egg = initKaomojiEgg(els)
  })

  it('starts in emoji treats mode', () => {
    expect(egg.mode()).toBe('emoji')
    expect(els.button.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking the o switches to kaomoji treats, and the page says so', () => {
    els.button.click()
    expect(egg.mode()).toBe('kaomoji')
    expect(els.button.getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.dataset.treats).toBe('kaomoji')
    expect(els.tagline.textContent).toBe('kaomoji treats for AIs')
    expect(els.placeholder.textContent).toBe('Tap generate for a kaomoji treat (◕‿◕)')
    expect(els.live.textContent).toBe('Kaomoji treats on')
  })

  it('winks: the wordmark gets a one-off shimmer that clears itself', () => {
    els.button.click()
    expect(els.logo.classList.contains('logo--wink')).toBe(true)
    els.logo.dispatchEvent(new Event('animationend'))
    expect(els.logo.classList.contains('logo--wink')).toBe(false)
  })

  it('clicking again goes back to emoji treats', () => {
    els.button.click()
    els.button.click()
    expect(egg.mode()).toBe('emoji')
    expect(els.button.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.dataset.treats).toBeUndefined()
    expect(els.tagline.textContent).toBe('treats for AIs')
    expect(els.placeholder.textContent).toBe('Tap generate for a treat.')
    expect(els.live.textContent).toBe('Kaomoji treats off')
  })

  it('copes with the placeholder already replaced by a treat', () => {
    els.placeholder.remove()
    expect(() => els.button.click()).not.toThrow()
    expect(egg.mode()).toBe('kaomoji')
  })
})
