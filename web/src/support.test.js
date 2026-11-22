import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configuredMethods, isConfigured, mountSupport } from './support.js'

describe('isConfigured', () => {
  it('accepts real values', () => {
    expect(isConfigured('bc1qrealaddress')).toBe(true)
    expect(isConfigured('  https://ko-fi.com/sig  ')).toBe(true)
  })

  it('rejects unset, blank and placeholder values', () => {
    expect(isConfigured(undefined)).toBe(false)
    expect(isConfigured('')).toBe(false)
    expect(isConfigured('   ')).toBe(false)
    expect(isConfigured('YOUR_BTC_ADDRESS')).toBe(false)
    expect(isConfigured('https://paypal.me/YOUR_HANDLE')).toBe(false)
  })
})

describe('configuredMethods', () => {
  const env = {
    VITE_DONATE_BTC: 'bc1qexample',
    VITE_DONATE_ETH: 'YOUR_ETH_ADDRESS',
    VITE_DONATE_PAYPAL: '',
    VITE_DONATE_GITHUB: 'https://github.com/sponsors/example',
    VITE_DONATE_KOFI: ' https://ko-fi.com/example ',
  }

  it('keeps only the configured crypto and link methods, values trimmed', () => {
    const { crypto, links } = configuredMethods(env)
    expect(crypto).toEqual([{ key: 'btc', label: 'Bitcoin', symbol: '₿', value: 'bc1qexample' }])
    expect(links.map((l) => [l.key, l.value])).toEqual([
      ['github', 'https://github.com/sponsors/example'],
      ['kofi', 'https://ko-fi.com/example'],
    ])
    expect(links[0]).toMatchObject({ label: 'GitHub Sponsors', icon: '💖' })
  })

  it('returns nothing when nothing is set up', () => {
    expect(configuredMethods({})).toEqual({ crypto: [], links: [] })
  })
})

const METHODS = {
  crypto: [
    { key: 'btc', label: 'Bitcoin', symbol: '₿', value: 'bc1qexample' },
    { key: 'eth', label: 'Ethereum', symbol: 'Ξ', value: '0xexample' },
  ],
  links: [
    { key: 'github', label: 'GitHub Sponsors', icon: '💖', value: 'https://github.com/sponsors/example' },
    { key: 'kofi', label: 'Ko-fi', icon: '☕', value: 'https://ko-fi.com/example' },
  ],
}

describe('mountSupport', () => {
  let root
  let ctx
  const flush = () => vi.advanceTimersByTimeAsync(0)

  function mount(overrides = {}) {
    document.body.innerHTML = '<div id="support"></div>'
    root = document.getElementById('support')
    ctx = {
      methods: METHODS,
      copy: vi.fn(async () => true),
      qr: vi.fn(async (text) => `<svg data-for="${text}"></svg>`),
      share: null,
      siteUrl: 'https://emosh.digital/',
      ...overrides,
    }
    mountSupport(root, ctx)
    return ctx
  }

  const live = () => root.querySelector('[data-support-live]')
  const copyButton = (key) => root.querySelector(`[data-copy="${key}"]`)

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('opens with a short thank-you and section headings', () => {
    mount()
    expect(root.querySelector('.support-intro').textContent).toMatch(/sig/)
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).toEqual([
      'Say thanks',
      'Other ways to help',
    ])
  })

  it('shows each crypto address with a labelled copy button and a QR code', async () => {
    mount()
    await flush()
    const btc = root.querySelector('[data-method="btc"]')
    expect(btc.querySelector('h3').textContent).toContain('Bitcoin')
    expect(btc.querySelector('code').textContent).toBe('bc1qexample')
    expect(copyButton('btc').getAttribute('aria-label')).toBe('Copy Bitcoin address')
    expect(btc.querySelector('.support-qr svg').dataset.for).toBe('bc1qexample')
    expect(ctx.qr).toHaveBeenCalledTimes(2)
  })

  it('says so when a QR code cannot be drawn', async () => {
    mount({ qr: vi.fn(async () => Promise.reject(new Error('nope'))) })
    await flush()
    expect(root.querySelector('[data-method="btc"] .support-qr').textContent).toBe('QR unavailable')
  })

  it('copies an address with feedback that resets', async () => {
    mount()
    copyButton('eth').click()
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('0xexample')
    expect(copyButton('eth').textContent).toBe('Copied ✓')
    expect(copyButton('eth').classList.contains('is-success')).toBe(true)
    expect(live().textContent).toBe('Ethereum address copied')
    vi.advanceTimersByTime(2200)
    expect(copyButton('eth').textContent).toBe('Copy')
    expect(copyButton('eth').classList.contains('is-success')).toBe(false)
  })

  it('selects the address for a manual copy when the clipboard fails', async () => {
    mount({ copy: vi.fn(async () => false) })
    copyButton('btc').click()
    await flush()
    expect(copyButton('btc').textContent).toBe('Copy failed')
    expect(window.getSelection().toString()).toBe('bc1qexample')
    expect(live().textContent).toBe('Couldn’t copy. The Bitcoin address is selected, so copy it by hand')
  })

  it('links out to the other methods safely', () => {
    mount()
    const links = [...root.querySelectorAll('[data-link]')]
    expect(links.map((a) => a.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      '💖 GitHub Sponsors ↗',
      '☕ Ko-fi ↗',
    ])
    expect(links[0].href).toBe('https://github.com/sponsors/example')
    for (const a of links) {
      expect(a.target).toBe('_blank')
      expect(a.rel).toBe('noopener noreferrer')
    }
  })

  it('shows a gentle note when nothing is set up yet, and still the other ways', () => {
    mount({ methods: { crypto: [], links: [] } })
    expect(root.querySelector('.support-empty').textContent).toMatch(/not set up yet/)
    expect(root.querySelector('[data-method]')).toBeNull()
    expect(root.querySelector('.support-other')).not.toBeNull()
  })

  it('leaves out an empty group', () => {
    mount({ methods: { crypto: [], links: METHODS.links } })
    expect(root.querySelector('.support-crypto')).toBeNull()
    expect(root.querySelectorAll('[data-link]')).toHaveLength(2)
  })

  it('offers a star on GitHub and a treat back home', () => {
    mount()
    const star = root.querySelector('[data-other="star"]')
    expect(star.href).toBe('https://github.com/significance/emosh')
    expect(star.rel).toBe('noopener noreferrer')
    expect(root.querySelector('[data-other="treat"]').getAttribute('href')).toBe('../')
  })

  it('shares with the system share sheet when there is one', async () => {
    const share = vi.fn(async () => {})
    mount({ share })
    root.querySelector('[data-other="share"]').click()
    await flush()
    expect(share).toHaveBeenCalledWith({
      title: 'emosh',
      text: 'Treats for AIs, and an emoji finder',
      url: 'https://emosh.digital/',
    })
    expect(ctx.copy).not.toHaveBeenCalled()
  })

  it('stays quiet when the share sheet is dismissed', async () => {
    const share = vi.fn(async () => Promise.reject(new DOMException('cancel', 'AbortError')))
    mount({ share })
    root.querySelector('[data-other="share"]').click()
    await flush()
    expect(live().textContent).toBe('')
  })

  it('copies the link instead when there is no share sheet', async () => {
    mount()
    const button = root.querySelector('[data-other="share"]')
    button.click()
    await flush()
    expect(ctx.copy).toHaveBeenCalledWith('https://emosh.digital/')
    expect(live().textContent).toBe('Link copied ✓')
  })

  it('says so when the link cannot be copied either', async () => {
    mount({ copy: vi.fn(async () => false) })
    root.querySelector('[data-other="share"]').click()
    await flush()
    expect(live().textContent).toBe('Share emosh.digital with a friend')
  })

  it('escapes configured values before they reach the page', () => {
    mount({
      methods: {
        crypto: [{ key: 'btc', label: 'Bitcoin', symbol: '₿', value: '<img src=x onerror=alert(1)>' }],
        links: [{ key: 'kofi', label: 'Ko-fi', icon: '☕', value: 'https://ko-fi.com/"x' }],
      },
    })
    expect(root.querySelector('[data-method="btc"] code').textContent).toBe('<img src=x onerror=alert(1)>')
    expect(root.querySelector('[data-method="btc"] img')).toBeNull()
    expect(root.querySelector('[data-link="kofi"]').getAttribute('href')).toBe('https://ko-fi.com/"x')
  })
})
