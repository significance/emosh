import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // works on GH Pages project subpath AND inside Capacitor
  build: {
    // The wasm-bindgen (`--target web`) ES module imports directly under Vite,
    // but `await init()` in main.js is top-level await — needs a modern target.
    target: 'esnext',
  },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/wasm/**', 'src/**/*.test.js'],
      reporter: ['text', 'json-summary'],
    },
  },
})
