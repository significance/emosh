import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, open, PAGES } from './helpers.js'

const INNER = ['emoji/', 'kaomoji/', 'authors-note/', 'support/']

test.describe('navigation', () => {
  for (const path of INNER) {
    test(`/${path} links to every page and home`, async ({ page }) => {
      await open(page, path)
      const hrefs = await page.locator('.site-nav a').evaluateAll((els) => els.map((a) => a.href))
      const base = new URL(page.url())
      for (const target of PAGES) {
        expect(hrefs).toContain(new URL(`/${target}`, base).href)
      }
      await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveAttribute(
        'href',
        `../${path}`,
      )
      await expect(page.locator('.logo-link')).toHaveAttribute('href', '../')
    })
  }

  for (const path of PAGES) {
    test(`/${path} heart leads to the support page`, async ({ page }) => {
      await open(page, path)
      const heart = page.locator('#donate-btn')
      await expect(heart).toHaveAttribute('aria-label', 'Support emosh')
      await expect(page.locator('#donate-modal')).toHaveCount(0)
      await heart.click()
      await expect(page).toHaveURL(/\/support\/$/)
      await expect(page.locator('#donate-btn')).toHaveAttribute('aria-current', 'page')
    })
  }

  test('the links actually go places', async ({ page }) => {
    await open(page, '')
    await page.locator('.page-links a', { hasText: 'kaomoji picker' }).click()
    await expect(page).toHaveURL(/\/kaomoji\/$/)
    await expect(page.locator('.picker--kaomoji')).toBeVisible()
    await page.locator('.site-nav a', { hasText: 'author’s note' }).click()
    await expect(page.locator('#note .note-para').first()).toBeVisible()
    await page.locator('.site-nav a', { hasText: 'emoji picker' }).click()
    await expect(page.locator('.picker--emoji')).toBeVisible()
    await page.locator('.logo-link').click()
    await expect(page.locator('#generate-btn')).toBeVisible()
  })

  for (const path of PAGES) {
    test(`/${path} takes its colours from the emoshion and never scrolls sideways`, async ({
      page,
    }) => {
      const background = async (emoshion) => {
        await page.goto(`${path}?emoshion=${emoshion}`)
        await expectNoHorizontalOverflow(page)
        return page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      }
      expect(await background('joy')).not.toBe(await background('tide'))
    })
  }
})
