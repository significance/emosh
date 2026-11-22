// Shared helpers for the end-to-end specs.

import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Every page on the site, by path. */
export const PAGES = ['', 'emoji/', 'kaomoji/', 'authors-note/', 'support/']

/** Open a page with a fixed emoshion so runs are deterministic, and wait until it is ready. */
export async function open(page, path, query = '') {
  const sep = query ? '&' : ''
  await page.goto(`${path}?emoshion=wonder${sep}${query}`)
  if (path === 'emoji/' || path === 'kaomoji/') {
    await expect(page.locator('.picker-input')).toBeFocused()
  }
}

/** The page never scrolls sideways. */
export async function expectNoHorizontalOverflow(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

/** Fail on serious or critical accessibility violations. */
export async function expectAccessible(page) {
  // Let entrance animations finish: mid-fade text would read as low contrast.
  // Endless ambient ones (the logo shimmer) never finish, so they don't count.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect.getTiming().iterations === Infinity),
  )
  const { violations } = await new AxeBuilder({ page }).analyze()
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
}

/** Type into the picker and wait for the debounced results. */
export async function search(page, text) {
  const before = await renders(page)
  await page.locator('.picker-input').fill(text)
  await page.waitForFunction((n) => window.__emosh.renders > n, before)
}

/** How many times the picker has rendered results (e2e builds only). */
export const renders = (page) => page.evaluate(() => window.__emosh.renders)

/** The picker's options. */
export const options = (page) => page.locator('.picker-results [role="option"]')

/** What the system clipboard holds now. */
export const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())

/** Click on pointer devices, tap on touch devices. */
export async function press(locator, testInfo) {
  if (testInfo.project.use.hasTouch) await locator.tap()
  else await locator.click()
}

/** The index of the focused option, or -1 if focus is elsewhere. */
export const focusedIndex = (page) =>
  page.evaluate(() => Number(document.activeElement?.dataset?.index ?? -1))
