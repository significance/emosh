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
})
