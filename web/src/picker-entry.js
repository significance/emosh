// Entry point for /emoji and /kaomoji: the page's <body data-picker> names the mode.

import init, * as wasm from './wasm/emosh.js'
import { copyText } from './clipboard.js'
import { startPickerPage } from './picker-page.js'
import { initShell } from './shell.js'

initShell()
await init()
startPickerPage({ mode: document.body.dataset.picker, wasm, copy: copyText })
