import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./settings.js', () => ({ initSettings: vi.fn() }))
vi.mock('./donate.js', () => ({ initDonate: vi.fn() }))

const { initShell } = await import('./shell.js')
const { initSettings } = await import('./settings.js')
const { initDonate } = await import('./donate.js')

describe('initShell', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="emoshion-tag"></p>'
    vi.clearAllMocks()
  })

  it('applies the emoshion named in ?emoshion= and labels the footer', () => {
    const emoshion = initShell('?emoshion=tide')
    expect(emoshion.name).toBe('tide')
    expect(document.documentElement.dataset.emoshion).toBe('tide')
    expect(document.getElementById('emoshion-tag').textContent).toBe('emosh is feeling deep today')
  })

  it('picks a random emoshion without a parameter', () => {
    expect(initShell('').name).toBeTruthy()
  })

  it('wires the settings cog and the donate heart', () => {
    initShell('')
    expect(initSettings).toHaveBeenCalledOnce()
    expect(initDonate).toHaveBeenCalledOnce()
  })

  it('tolerates a page without the footer tag', () => {
    document.body.innerHTML = ''
    expect(() => initShell('?emoshion=joy')).not.toThrow()
  })
})
