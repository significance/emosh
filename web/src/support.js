// Ways to support emosh: which donation methods are set up, read from the build-time
// `VITE_DONATE_*` values (web/.env locally, repository variables in the Pages deploy).

/** @typedef {{ key: string, label: string, symbol: string, value: string }} CryptoMethod */
/** @typedef {{ key: string, label: string, icon: string, value: string }} LinkMethod */

const CRYPTO = [
  { key: 'btc', label: 'Bitcoin', symbol: '₿', env: 'VITE_DONATE_BTC' },
  { key: 'eth', label: 'Ethereum', symbol: 'Ξ', env: 'VITE_DONATE_ETH' },
]

const LINKS = [
  { key: 'paypal', label: 'PayPal', icon: '💳', env: 'VITE_DONATE_PAYPAL' },
  { key: 'github', label: 'GitHub Sponsors', icon: '💖', env: 'VITE_DONATE_GITHUB' },
  { key: 'kofi', label: 'Ko-fi', icon: '☕', env: 'VITE_DONATE_KOFI' },
]

/**
 * Whether an env value is real: set, not blank, and not a `YOUR_…` placeholder left
 * over from `.env.example`.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isConfigured(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('YOUR_')
}

/**
 * The donation methods that are set up, in display order, with trimmed values.
 *
 * @param {Record<string, string | undefined>} [env]  Defaults to Vite's build-time env.
 * @returns {{ crypto: CryptoMethod[], links: LinkMethod[] }}
 */
export function configuredMethods(env = import.meta.env) {
  const pick = (methods) =>
    methods
      .filter((m) => isConfigured(env[m.env]))
      .map(({ env: name, ...m }) => ({ ...m, value: env[name].trim() }))
  return { crypto: pick(CRYPTO), links: pick(LINKS) }
}
