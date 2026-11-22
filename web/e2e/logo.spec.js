import { expect, test } from '@playwright/test'
import { open, PAGES } from './helpers.js'

/**
 * Pause the logo's endless shimmer and read where the fill sits, in pixels from the
 * logo's left edge, at the given fractions of one cycle (after the start delay).
 * Returns null when there is no shimmer.
 */
const offsetsAt = (page, fractions) =>
  page.locator('.logo').evaluate((el, at) => {
    const flow = el
      .getAnimations()
      .find((a) => a.animationName === 'logo-flow' && a.effect.getTiming().iterations === Infinity)
    if (!flow) return null
    flow.pause()
    const { duration, delay } = flow.effect.getTiming()
    return at.map((f) => {
      flow.currentTime = delay + f * duration
      const style = getComputedStyle(el)
      const width = el.getBoundingClientRect().width
      const fill = (parseFloat(style.backgroundSize) / 100) * width
      // A percentage position places that point of the fill on the same point of the box
      return (parseFloat(style.backgroundPositionX) / 100) * (width - fill)
    })
  }, fractions)

test.describe('logo shimmer', () => {
  for (const path of PAGES) {
    test(`/${path} wordmark sweeps left to right now and then`, async ({ page }) => {
      await open(page, path)
      // A quick sweep at the start of each cycle…
      const [start, early, mid] = await offsetsAt(page, [0, 0.05, 0.1])
      expect(early).toBeGreaterThan(start)
      expect(mid).toBeGreaterThan(early)
      // …then it rests for most of the cycle: only sometimes ;)
      const rest = await offsetsAt(page, [0.4, 0.6, 0.8, 0.99])
      expect(new Set(rest).size).toBe(1)
    })
  }

  test('the fill is wider than the logo so there is something to slide', async ({ page }) => {
    await open(page, '')
    const size = await page.locator('.logo').evaluate((el) => getComputedStyle(el).backgroundSize)
    expect(parseFloat(size)).toBeGreaterThan(100)
  })

  test('stays still for people who prefer reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, '')
    expect(await offsetsAt(page, [0])).toBeNull()
  })
})
