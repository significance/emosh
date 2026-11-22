import { describe, expect, it } from 'vitest'
import { configuredMethods, isConfigured } from './support.js'

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
