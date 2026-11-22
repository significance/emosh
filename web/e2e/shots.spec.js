// Screenshots for review: every page × size × theme, the key phone states, and one
// contact sheet tiling them all. Run with `npm run e2e:shots`; output goes to
// web/test-results/shots/ (gitignored).

import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { sizes } from '../playwright.config.js'

const SHOTS = fileURLToPath(new URL('../test-results/shots/', import.meta.url))
const PAGES = [
  ['home', ''],
  ['emoji', 'emoji/?q=happy'],
  ['kaomoji', 'kaomoji/?q=happy'],
  ['authors-note', 'authors-note/'],
  ['support', 'support/'],
]
const THEMES = ['light', 'dark']

test.describe.configure({ mode: 'serial' })

test('every page at every size and theme @shots', async ({ browser, baseURL }) => {
  test.setTimeout(180_000)
  mkdirSync(SHOTS, { recursive: true })
  const tiles = []
  for (const [size, device] of Object.entries(sizes)) {
    for (const colorScheme of THEMES) {
      const context = await browser.newContext({ ...device, colorScheme, baseURL, reducedMotion: 'reduce' })
      const page = await context.newPage()
      for (const [name, path] of PAGES) {
        const sep = path.includes('?') ? '&' : '?'
        await page.goto(`${path}${sep}emoshion=wonder`)
        if (name === 'emoji' || name === 'kaomoji') {
          await expect(page.locator('.picker-results [role="option"]').first()).toBeVisible()
        }
        const file = `${name}-${size}-${colorScheme}.png`
        await page.screenshot({ path: `${SHOTS}${file}`, fullPage: true })
        tiles.push({ file, label: `${name} · ${size} · ${colorScheme}` })
      }
      await context.close()
    }
  }

  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 24px; background: #222; font: 13px system-ui; color: #ddd }
    .grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 16px; align-items: start }
    figure { margin: 0 } img { width: 100%; border-radius: 8px; display: block; background: #fff }
    figcaption { padding: 6px 2px }
  </style><div class="grid">${tiles
    .map((t) => `<figure><img src="${t.file}"><figcaption>${t.label}</figcaption></figure>`)
    .join('')}</div>`
  writeFileSync(`${SHOTS}contact-sheet.html`, html)
  const sheet = await browser.newPage({ viewport: { width: 2400, height: 1200 } })
  await sheet.goto(`file://${SHOTS}contact-sheet.html`)
  await sheet.waitForFunction(() => [...document.images].every((img) => img.complete))
  await sheet.screenshot({ path: `${SHOTS}contact-sheet.png`, fullPage: true })
  await sheet.close()
})

test('key moments on the phone @shots', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  mkdirSync(SHOTS, { recursive: true })
  const context = await browser.newContext({
    ...sizes.phone,
    colorScheme: 'light',
    baseURL,
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()
  const shot = (name) => page.screenshot({ path: `${SHOTS}phone-${name}.png` })

  await page.goto('emoji/?emoshion=wonder')
  await page.locator('.picker-input').fill('happy')
  await expect(page.locator('.picker-results [role="option"]').first()).toBeVisible()
  await shot('1-focused-with-results')

  await page.keyboard.press('Tab')
  await page.keyboard.press('ArrowRight')
  await shot('2-highlighted-tile')

  await page.locator('.picker-results [role="option"]').nth(1).tap()
  await expect(page.locator('[data-picker-status]')).toHaveText(/^Copied ✓/)
  await shot('3-copied')

  await page.goto('kaomoji/?q=happy&emoshion=wonder')
  await expect(page.locator('.picker-results [role="option"]').first()).toBeVisible()
  await shot('4-kaomoji-list')

  await page.goto('authors-note/?emoshion=wonder')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35))
  await shot('5-authors-note-mid-scroll')
  await context.close()
})
