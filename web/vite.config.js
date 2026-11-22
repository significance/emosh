import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // works on GH Pages project subpath AND inside Capacitor
  build: {
    // The wasm-bindgen (`--target web`) ES module imports directly under Vite,
    // but `await init()` in the entries is top-level await — needs a modern target.
    target: 'esnext',
    rollupOptions: {
      // One HTML page per site path: / , /emoji/ , /kaomoji/ , /authors-note/ , /support/
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        emoji: resolve(import.meta.dirname, 'emoji/index.html'),
        kaomoji: resolve(import.meta.dirname, 'kaomoji/index.html'),
        'authors-note': resolve(import.meta.dirname, 'authors-note/index.html'),
        support: resolve(import.meta.dirname, 'support/index.html'),
      },
    },
  },
  server: {
    // The author's note imports ../emosh.txt from the repo root.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // Entry points only await the WASM init and hand off to tested modules;
      // the Playwright suite exercises them in a real browser.
      exclude: ['src/wasm/**', 'src/**/*.test.js', 'src/main.js', 'src/*-entry.js'],
      reporter: ['text', 'json-summary'],
    },
  },
})
