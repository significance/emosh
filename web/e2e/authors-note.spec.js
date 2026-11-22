import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { expectAccessible, expectNoHorizontalOverflow, open } from './helpers.js'

const note = readFileSync(new URL('../../emosh.txt', import.meta.url), 'utf8')
const words = (text) => text.split(/\s+/).filter(Boolean)

test.describe("author's note", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'authors-note/')
  })

  test('renders the note word for word (markup aside)', async ({ page }) => {
    const text = await page.locator('#note').evaluate((article) => {
      const copy = article.cloneNode(true)
      copy.querySelector('h2').remove()
      return copy.textContent
    })
    expect(words(text)).toEqual(words(note))
    await expect(page.locator('#note pre')).toHaveCount(0)
  })

  test('links the sources, the sign-off and the byline safely', async ({ page }) => {
    const expected = {
      'Neural Networks: Zero to Hero': 'https://karpathy.ai/zero-to-hero.html',
      'a blog post': 'https://www.anthropic.com/research/emotion-concepts-function',
      'well documented': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/',
      Sig: 'https://1up.digital',
    }
    for (const [text, href] of Object.entries(expected)) {
      const link = page.locator('#note a', { hasText: text }).first()
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('rel', 'noopener')
    }
    const kini = page.locator('#note a[href="https://pubmed.ncbi.nlm.nih.gov/26746580"]')
    await expect(kini).toHaveAttribute('rel', 'noopener')
    const byline = page.locator('.byline a')
    await expect(byline).toHaveAttribute('href', 'https://1up.digital')
    await expect(page.locator('.byline')).toHaveText('sig · 1up.digital')
  })

  test('footnote markers jump to their references', async ({ page }) => {
    await page.locator('.note-marker a', { hasText: '[1]' }).click()
    await expect(page).toHaveURL(/#ref-1$/)
    await expect(page.locator('#ref-1')).toBeInViewport()
  })

  test('reads like an article: measure and type size', async ({ page }) => {
    const { width, fontSize, rem } = await page.locator('#note').evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
    }))
    expect(width).toBeLessThanOrEqual(40 * rem)
    expect(fontSize).toBeGreaterThanOrEqual(16)
  })

  test('accessible and never scrolls sideways', async ({ page }) => {
    await expectNoHorizontalOverflow(page)
    await expectAccessible(page)
  })
})
