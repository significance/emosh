import { expect, test } from '@playwright/test'
import {
  clipboard,
  expectAccessible,
  expectNoHorizontalOverflow,
  focusedIndex,
  open,
  options,
  press,
  search,
} from './helpers.js'

const face = (option) => option.locator('.pick-face')

test.describe('kaomoji picker', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'kaomoji/')
  })

  test('focuses the box and has no skin-tone selector', async ({ page }) => {
    await expect(page.locator('.picker-input')).toBeFocused()
    await expect(page.locator('[data-picker-tone]')).toHaveCount(0)
  })

  test('finds the famous faces first', async ({ page }) => {
    await search(page, 'shrug')
    await expect(face(options(page).first())).toHaveText('¯\\_(ツ)_/¯')
    await search(page, 'table flip')
    await expect(face(options(page).first())).toHaveText('(╯°□°)╯︵ ┻━┻')
    await search(page, 'lenny')
    await expect(face(options(page).first())).toHaveText('( ͡° ͜ʖ ͡°)')
  })

  test('happy fills a page of joy', async ({ page }) => {
    await search(page, 'happy')
    expect(await options(page).count()).toBeGreaterThanOrEqual(7)
    await expect(options(page).first().locator('.pick-name')).toHaveText(/^joy-/)
  })

  test('?q= pre-fills and searches', async ({ page }) => {
    await open(page, 'kaomoji/', 'q=shrug')
    await expect(face(options(page).first())).toHaveText('¯\\_(ツ)_/¯')
  })

  test('each face sits on one line and long ones are ellipsised', async ({ page }) => {
    await search(page, 'happy')
    const rows = await options(page).evaluateAll((els) =>
      els.map((el) => {
        const faceEl = el.querySelector('.pick-face')
        const style = getComputedStyle(faceEl)
        return {
          faceHeight: faceEl.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5,
          whiteSpace: style.whiteSpace,
          overflow: style.textOverflow,
        }
      }),
    )
    for (const row of rows) {
      expect(row.whiteSpace).toBe('nowrap')
      expect(row.overflow).toBe('ellipsis')
      expect(row.faceHeight).toBeLessThanOrEqual(row.lineHeight * 1.2)
    }
  })

  test('a truncated face still copies in full', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await search(page, 'sparkles')
    const target = options(page).first()
    const full = await face(target).textContent()
    const truncated = await face(target).evaluate((el) => el.scrollWidth > el.clientWidth)
    await press(target, testInfo)
    await expect.poll(() => clipboard(page)).toBe(full)
    // At 320px at least one sparkles face is too wide for its row
    const anyTruncated = await page
      .locator('.pick-face')
      .evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth))
    expect(truncated || anyTruncated).toBe(true)
  })

  test('arrows move one row at a time', async ({ page }) => {
    await search(page, 'happy')
    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex(page)).toBe(0)
    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex(page)).toBe(1)
    await page.keyboard.press('ArrowRight')
    expect(await focusedIndex(page)).toBe(2)
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.locator('.picker-input')).toBeFocused()
  })

  test('Enter copies the face, not its name', async ({ page }) => {
    await search(page, 'shrug')
    await page.keyboard.press('Enter')
    await expect.poll(() => clipboard(page)).toBe('¯\\_(ツ)_/¯')
    await expect(page.locator('[data-picker-status]')).toHaveText('Copied ✓ ¯\\_(ツ)_/¯')
  })

  test('rows are comfortable touch targets', async ({ page }) => {
    await search(page, 'happy')
    for (const box of await options(page).evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()),
    )) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('accessible and never scrolls sideways', async ({ page }) => {
    await search(page, 'happy')
    await expect(page.locator('[role="listbox"]')).toHaveAttribute('aria-label', 'kaomoji results')
    await expectNoHorizontalOverflow(page)
    await expectAccessible(page)
  })
})
