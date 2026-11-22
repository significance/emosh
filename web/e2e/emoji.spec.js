import { expect, test } from '@playwright/test'
import {
  clipboard,
  expectAccessible,
  expectNoHorizontalOverflow,
  focusedIndex,
  open,
  options,
  press,
  renders,
  search,
} from './helpers.js'

test.describe('emoji picker', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'emoji/')
  })

  test('focuses the search box on load and shows the hint', async ({ page }) => {
    await expect(page.locator('.picker-input')).toBeFocused()
    await expect(page.locator('[data-picker-hint]')).toBeVisible()
  })

  test('?q= pre-fills the box and searches', async ({ page }) => {
    await open(page, 'emoji/', 'q=happy')
    await expect(page.locator('.picker-input')).toHaveValue('happy')
    expect(await options(page).count()).toBeGreaterThanOrEqual(8)
  })

  test('searches with the real Rust engine', async ({ page }) => {
    await search(page, 'happy')
    expect(await options(page).count()).toBeGreaterThanOrEqual(8)
    await search(page, 'skull')
    await expect(options(page).first()).toHaveText('💀')
    await search(page, 'alpha')
    await expect(options(page).first()).toHaveText('α')
  })

  test('typing "treats" shows a treat (the intercepts work in WASM)', async ({ page }) => {
    await search(page, 'treats')
    const text = await options(page).first().textContent()
    expect(text.startsWith('​‌​')).toBe(true)
  })

  test('the debounce coalesces fast typing into one render', async ({ page }) => {
    const before = await renders(page)
    await page.keyboard.type('unicorn', { delay: 5 })
    await expect(options(page).first()).toHaveText('🦄')
    await page.waitForTimeout(200)
    expect((await renders(page)) - before).toBe(1)
  })

  test('Tab and Shift+Tab move through the results and back to the box', async ({ page }) => {
    await search(page, 'happy')
    await page.keyboard.press('Tab')
    expect(await focusedIndex(page)).toBe(0)
    await page.keyboard.press('Tab')
    expect(await focusedIndex(page)).toBe(1)
    await page.keyboard.press('Shift+Tab')
    expect(await focusedIndex(page)).toBe(0)
    await page.keyboard.press('Shift+Tab')
    await expect(page.locator('.picker-input')).toBeFocused()
  })

  test('arrow keys move around the grid by its real column count', async ({ page }) => {
    await search(page, 'face')
    const columns = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.picker-results [role="option"]')]
      return items.filter((el) => el.offsetTop === items[0].offsetTop).length
    })
    expect(columns).toBeGreaterThan(1)
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowRight')
    expect(await focusedIndex(page)).toBe(1)
    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex(page)).toBe(1 + columns)
    await page.keyboard.press('ArrowLeft')
    expect(await focusedIndex(page)).toBe(columns)
    await page.keyboard.press('ArrowUp')
    expect(await focusedIndex(page)).toBe(0)
    await page.keyboard.press('ArrowUp')
    await expect(page.locator('.picker-input')).toBeFocused()
  })

  test('a digit picks and copies that result', async ({ page }) => {
    await search(page, 'happy')
    const third = await options(page).nth(2).textContent()
    await page.keyboard.press('Tab')
    await page.keyboard.press('3')
    await expect(options(page).nth(2)).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => clipboard(page)).toBe(third)
  })

  test('Enter copies the highlighted result', async ({ page }) => {
    await search(page, 'happy')
    const second = await options(page).nth(1).textContent()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect.poll(() => clipboard(page)).toBe(second)
    await expect(page.locator('[data-picker-status]')).toHaveText(`Copied ✓ ${second}`)
  })

  test('Enter in the box copies the first result', async ({ page }) => {
    await search(page, 'skull')
    await page.keyboard.press('Enter')
    await expect.poll(() => clipboard(page)).toBe('💀')
  })

  test('Escape clears the query and refocuses the box', async ({ page }) => {
    await search(page, 'happy')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Escape')
    await expect(page.locator('.picker-input')).toBeFocused()
    await expect(page.locator('.picker-input')).toHaveValue('')
  })

  test('typing while a result is highlighted goes into the box', async ({ page }) => {
    await search(page, 'happ')
    await page.keyboard.press('Tab')
    await page.keyboard.press('y')
    await expect(page.locator('.picker-input')).toBeFocused()
    await expect(page.locator('.picker-input')).toHaveValue('happy')
  })

  test('clicking or tapping a result copies it with feedback', async ({ page }, testInfo) => {
    await search(page, 'skull')
    await press(options(page).first(), testInfo)
    await expect.poll(() => clipboard(page)).toBe('💀')
    await expect(page.locator('[data-picker-status]')).toHaveText('Copied ✓ 💀')
    await expect(page.locator('[data-picker-live]')).toHaveText('Copied 💀')
  })

  test('recent copies come back on reload and can be tapped', async ({ page }, testInfo) => {
    await search(page, 'skull')
    await press(options(page).first(), testInfo)
    await expect(page.locator('[data-picker-status]')).toHaveText('Copied ✓ 💀')
    await page.evaluate(() => navigator.clipboard.writeText(''))
    await open(page, 'emoji/')
    await expect(page.locator('[data-picker-recent]')).toBeVisible()
    await expect(options(page).first()).toHaveText('💀')
    await press(options(page).first(), testInfo)
    await expect.poll(() => clipboard(page)).toBe('💀')
  })

  test('skin tone applies and persists across reloads', async ({ page }) => {
    await page.locator('[data-picker-tone]').selectOption('3')
    await search(page, 'wave')
    await expect(options(page).first()).toHaveText('👋🏽')
    await open(page, 'emoji/', 'q=wave')
    await expect(page.locator('[data-picker-tone]')).toHaveValue('3')
    await expect(options(page).first()).toHaveText('👋🏽')
  })

  test('copy failure offers a selectable field with a working copy button', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate a browser that refuses clipboard access (e.g. permission denied),
      // until the test flips the switch
      window.__denyClipboard = true
      const real = navigator.clipboard
      const gate = (fn) => (...args) =>
        window.__denyClipboard
          ? Promise.reject(new DOMException('denied', 'NotAllowedError'))
          : fn.apply(real, args)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { write: gate(real.write), writeText: gate(real.writeText), readText: () => real.readText() },
      })
    })
    await open(page, 'emoji/')
    await search(page, 'skull')
    await page.keyboard.press('Enter')
    const fallback = page.locator('[data-picker-fallback]')
    await expect(fallback).toBeVisible()
    await expect(fallback.locator('input')).toHaveValue('💀')
    await expect(fallback.locator('input')).toBeFocused()
    await expect(page.locator('[data-picker-status]')).toContainText('select it below')
    // The button works once the clipboard does
    await page.evaluate(() => (window.__denyClipboard = false))
    await fallback.locator('button').click()
    await expect(fallback).toBeHidden()
    await expect(page.locator('[data-picker-status]')).toHaveText('Copied ✓ 💀')
  })

  test('touch targets are at least 44×44', async ({ page }) => {
    await search(page, 'happy')
    for (const box of await options(page).evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('results sit above the fold with the box focused', async ({ page }) => {
    await search(page, 'happy')
    const top = await options(page).first().evaluate((el) => el.getBoundingClientRect().top)
    const height = page.viewportSize().height
    // On phones the on-screen keyboard takes roughly the bottom 40%
    const fold = (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) ? height * 0.6 : height
    expect(top).toBeLessThan(fold)
  })

  test('accessibility: roles, active descendant and live announcements', async ({ page }) => {
    const input = page.locator('.picker-input')
    await expect(input).toHaveAttribute('role', 'combobox')
    await expect(page.locator('[role="listbox"]')).toHaveAttribute('aria-label', 'emoji results')
    await search(page, 'happy')
    await expect(page.locator('[data-picker-live]')).toHaveText(/^\d+ results$/)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(input).toHaveAttribute('aria-activedescendant', 'pick-emoji-1')
    await expectAccessible(page)
  })

  test('no horizontal scrolling with results', async ({ page }) => {
    await search(page, 'happy')
    await expectNoHorizontalOverflow(page)
  })
})
