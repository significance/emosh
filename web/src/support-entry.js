// Entry point for /support: donation methods come from the build-time env.

import QRCode from 'qrcode'
import { copyText } from './clipboard.js'
import { initShell } from './shell.js'
import { configuredMethods, mountSupport } from './support.js'

initShell()
mountSupport(document.getElementById('support'), {
  methods: configuredMethods(),
  copy: copyText,
  qr: (text) => QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }),
  share: navigator.share ? (data) => navigator.share(data) : null,
  siteUrl: 'https://emosh.digital/',
})
