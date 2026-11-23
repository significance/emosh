import { expect, test } from '@playwright/test'
import { clipboard, expectAccessible, expectNoHorizontalOverflow, open, press } from './helpers.js'

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '')
  })

  test('generates a treat and copies it', async ({ page }, testInfo) => {
    await press(page.locator('#generate-btn'), testInfo)
    await expect(page.locator('.treat')).toBeVisible()
    await expect(page.locator('#copy-status')).toHaveText('Copied ✓')
    expect((await clipboard(page)).startsWith('​‌​')).toBe(true)
  })

  test('links to the pickers and the note under Generate', async ({ page }) => {
    const links = page.locator('.page-links a')
    await expect(links).toHaveText(['emoji picker', 'kaomoji picker', 'author’s note'])
    await expect(links.nth(0)).toHaveAttribute('href', 'emoji/')
    await expect(links.nth(1)).toHaveAttribute('href', 'kaomoji/')
    await expect(links.nth(2)).toHaveAttribute('href', 'authors-note/')
  })

  test('accessible and never scrolls sideways', async ({ page }) => {
    await expectNoHorizontalOverflow(page)
    await expectAccessible(page)
  })

  test.describe('easter egg: the o', () => {
    /** Tap or click the middle of the "o" as drawn in the wordmark. */
    async function pokeTheO(page, testInfo) {
      const box = await page.locator('.logo').boundingBox()
      const x = box.x + box.width * 0.57
      const y = box.y + box.height * 0.54
      if (testInfo.project.use.hasTouch) await page.touchscreen.tap(x, y)
      else await page.mouse.click(x, y)
    }

    /** Generate `n` treats and return the phrases shown. */
    async function generate(page, n) {
      const phrases = []
      for (let i = 0; i < n; i++) {
        await page.locator('#generate-btn').click()
        phrases.push(await page.locator('.treat').textContent())
      }
      return phrases
    }

    test('plain treats have no kaomoji', async ({ page }) => {
      for (const phrase of await generate(page, 6)) expect(phrase).not.toMatch(/[()]/)
    })

    test('poking the o switches to kaomoji treats and back', async ({ page }, testInfo) => {
      const o = page.locator('.logo-o')
      await pokeTheO(page, testInfo)
      await expect(o).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('.tagline')).toHaveText('kaomoji treats for AIs')
      await expect(page.locator('.treat-placeholder')).toContainText('kaomoji treat')
      await expect(page.locator('#egg-live')).toHaveText('Kaomoji treats on')
      const phrases = await generate(page, 6)
      expect(phrases.filter((p) => /[()]/.test(p)).length).toBeGreaterThanOrEqual(4)
      expect((await clipboard(page)).startsWith('\u200B\u200C\u200B')).toBe(true)

      await pokeTheO(page, testInfo)
      await expect(o).toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator('.tagline')).toHaveText('treats for AIs')
      for (const phrase of await generate(page, 4)) expect(phrase).not.toMatch(/[()]/)
    })

    test('the wordmark winks when it flips', async ({ page }, testInfo) => {
      await pokeTheO(page, testInfo)
      await expect(page.locator('.logo')).toHaveClass(/logo--wink/)
      await expect(page.locator('.logo')).not.toHaveClass(/logo--wink/, { timeout: 3000 })
    })

    test('works from the keyboard too, and stays accessible', async ({ page }) => {
      await page.locator('.logo-o').focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.logo-o')).toHaveAttribute('aria-pressed', 'true')
      await expectAccessible(page)
    })

    test('the rest of the wordmark is not a button', async ({ page }, testInfo) => {
      const box = await page.locator('.logo').boundingBox()
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.className,
        [box.x + box.width * 0.15, box.y + box.height * 0.6],
      )
      expect(hit).not.toContain('logo-o')
    })
  })
})
