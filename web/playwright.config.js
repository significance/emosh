// End-to-end tests against a production build (built in e2e mode so the page exposes
// its render counter), on a phone, a tablet and a desktop, each in light and dark.

import { defineConfig } from '@playwright/test'

const PORT = 4173

const sizes = {
  phone: {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/131.0.0.0 Mobile Safari/537.36',
  },
  tablet: { viewport: { width: 768, height: 1024 }, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 } },
}

const projects = Object.entries(sizes).flatMap(([size, device]) =>
  ['light', 'dark'].map((colorScheme) => ({
    name: `${size}-${colorScheme}`,
    testIgnore: /shots\.spec\.js/,
    use: { ...device, colorScheme },
  })),
)

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    browserName: 'chromium',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
  },
  projects: [
    ...projects,
    // Screenshots and the contact sheet: one project that walks every size and theme.
    { name: 'shots', testMatch: /shots\.spec\.js/, use: { viewport: sizes.desktop.viewport } },
  ],
  webServer: {
    command: `npm run build:e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

export { sizes }
