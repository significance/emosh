import { expect, test } from '@playwright/test'
import { clipboard, expectAccessible, expectNoHorizontalOverflow, open, press } from './helpers.js'

// The e2e build reads web/.env.e2e: fake fixture values for every method.
const BTC = 'bc1qe2efixturenotarealaddress0000000000000'
const ETH = '0x0000000000000000000000000000000000e2e000'

test.describe('support page', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'support/')
  })

  test('offers every configured method', async ({ page }) => {
    await expect(page.locator('[data-method="btc"] code')).toHaveText(BTC)
    await expect(page.locator('[data-method="eth"] code')).toHaveText(ETH)
    const links = page.locator('[data-link]')
    await expect(links).toHaveCount(3)
    await expect(links.nth(0)).toHaveAttribute('href', 'https://paypal.me/emosh-e2e-fixture')
    await expect(links.nth(1)).toHaveAttribute('href', 'https://github.com/sponsors/emosh-e2e-fixture')
    await expect(links.nth(2)).toHaveAttribute('href', 'https://ko-fi.com/emosh-e2e-fixture')
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  test('draws scannable QR codes: dark modules on white in both themes', async ({ page }) => {
    for (const key of ['btc', 'eth']) {
      const qr = page.locator(`[data-method="${key}"] .support-qr`)
      await expect(qr.locator('svg')).toBeVisible()
      const background = await qr.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(background).toBe('rgb(255, 255, 255)')
      const box = await qr.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(120)
    }
  })

  test('copies an address with feedback', async ({ page }, testInfo) => {
    const button = page.locator('[data-copy="eth"]')
    await expect(button).toHaveAccessibleName('Copy Ethereum address')
    await press(button, testInfo)
    await expect.poll(() => clipboard(page)).toBe(ETH)
    await expect(button).toHaveText('Copied ✓ Ethereum address')
    await expect(page.locator('[data-support-live]')).toHaveText('Ethereum address copied')
    // Still readable in its copied state
    await expectAccessible(page)
    await expect(button).toHaveText('Copy Ethereum address', { timeout: 4000 })
  })

  test('selects the address to copy by hand when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      const deny = () => Promise.reject(new DOMException('denied', 'NotAllowedError'))
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { write: deny, writeText: deny, readText: () => Promise.resolve('') },
      })
    })
    await open(page, 'support/')
    await page.locator('[data-copy="btc"]').click()
    await expect(page.locator('[data-copy="btc"] [data-copy-label]')).toHaveText('Copy failed')
    expect(await page.evaluate(() => window.getSelection().toString())).toBe(BTC)
    await expect(page.locator('[data-support-live]')).toContainText('copy it by hand')
  })

  test('shares through the system share sheet when the browser has one', async ({ page }) => {
    await page.addInitScript(() => {
      window.__shared = []
      navigator.share = (data) => {
        window.__shared.push(data)
        return Promise.resolve()
      }
    })
    await open(page, 'support/')
    await page.locator('[data-other="share"]').click()
    await expect
      .poll(() => page.evaluate(() => window.__shared))
      .toEqual([
        { title: 'emosh', text: 'Treats for AIs, and an emoji finder', url: 'https://emosh.digital/' },
      ])
  })

  test('copies the site link when there is no share sheet', async ({ page }) => {
    await page.addInitScript(() => {
      delete Navigator.prototype.share
    })
    await open(page, 'support/')
    await page.locator('[data-other="share"]').click()
    await expect.poll(() => clipboard(page)).toBe('https://emosh.digital/')
    await expect(page.locator('[data-support-live]')).toHaveText('Link copied ✓')
  })

  test('the other ways to help go to the right places', async ({ page }) => {
    const star = page.locator('[data-other="star"]')
    await expect(star).toHaveAttribute('href', 'https://github.com/significance/emosh')
    await expect(star).toHaveAttribute('rel', 'noopener noreferrer')
    await page.locator('[data-other="treat"]').click()
    await expect(page.locator('#generate-btn')).toBeVisible()
  })

  test('every button and link is a comfortable touch target', async ({ page }) => {
    for (const box of await page
      .locator('.support-link, .support-copy')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('accessible and never scrolls sideways', async ({ page }) => {
    await expect(page.locator('#support h2')).toHaveText(['Say thanks', 'Other ways to help'])
    await expectNoHorizontalOverflow(page)
    await expectAccessible(page)
  })
})
