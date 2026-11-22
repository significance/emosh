// The author's note: turn `emosh.txt` (sig's note, the single source of truth) into
// article markup. The words stay exactly as written; this only adds structure:
// paragraphs, links on the cited phrases, footnote markers, a References list and a
// linked sign-off.

/** sig's site, linked from the sign-off and the byline. */
export const SIG_URL = 'https://1up.digital'

/** The phrase in the note that each reference number is about. */
const CITED_PHRASES = {
  0: 'Neural Networks: Zero to Hero',
  1: 'a blog post',
  2: 'well documented',
}

const REF_START = /^\[(\d+)\]\s+(.*)$/
const SIGN_OFF = 'Much love,'

/** @typedef {{ citation: string, url: string }} Source */
/** @typedef {{ number: number, sources: Source[] }} Reference */

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** @param {string} url @param {string} label (already escaped) */
function externalLink(url, label) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`
}

/**
 * Split the note into its body lines and its reference lines.
 *
 * @param {string} note
 */
function splitNote(note) {
  const lines = note.split('\n')
  const start = lines.findIndex((line) => REF_START.test(line))
  return start === -1
    ? { body: lines, refs: [] }
    : { body: lines.slice(0, start), refs: lines.slice(start) }
}

/**
 * Read the numbered references at the end of the note. Each `[n]` line starts a
 * reference; indented lines below it are either its URL or a further citation.
 *
 * @param {string} note
 * @returns {Reference[]}
 */
export function parseReferences(note) {
  /** @type {Reference[]} */
  const refs = []
  for (const raw of splitNote(note).refs) {
    const line = raw.trim()
    const start = line.match(REF_START)
    if (start) {
      refs.push({ number: Number(start[1]), sources: [{ citation: start[2], url: '' }] })
    } else if (line.startsWith('http')) {
      refs.at(-1).sources.at(-1).url = line
    } else if (line !== '') {
      refs.at(-1).sources.push({ citation: line, url: '' })
    }
  }
  return refs
}

/**
 * Add the inline links to one escaped paragraph.
 *
 * @param {string} html
 * @param {Map<number, Reference>} refs
 */
function linkParagraph(html, refs) {
  let out = html
  for (const [number, phrase] of Object.entries(CITED_PHRASES)) {
    const ref = refs.get(Number(number))
    const escaped = escapeHtml(phrase)
    if (ref && out.includes(escaped)) {
      out = out.replace(escaped, externalLink(ref.sources[0].url, escaped))
    }
  }
  return out.replace(/\[(\d+)\]/g, (marker, number) =>
    refs.has(Number(number))
      ? `<sup class="note-marker"><a href="#ref-${number}">${marker}</a></sup>`
      : marker,
  )
}

/** @param {Reference[]} refs */
function renderReferences(refs) {
  const items = refs.map(({ number, sources }) => {
    const cited = sources
      .map((s) => `<span class="note-cite">${escapeHtml(s.citation)}</span>\n${externalLink(s.url, escapeHtml(s.url))}`)
      .join('\n')
    return `<li id="ref-${number}"><span class="note-ref-n">[${number}]</span>\n${cited}</li>`
  })
  return `<section class="note-refs">\n<h2>References</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</section>`
}

/**
 * Render the note as article HTML.
 *
 * @param {string} note  The raw text of `emosh.txt`.
 * @returns {string}
 */
export function renderNote(note) {
  const refs = parseReferences(note)
  const byNumber = new Map(refs.map((ref) => [ref.number, ref]))
  const paragraphs = splitNote(note)
    .body.join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const signOffAt = paragraphs.indexOf(SIGN_OFF)
  const prose = signOffAt === -1 ? paragraphs : paragraphs.slice(0, signOffAt)
  const parts = prose.map(
    (p) => `<p class="note-para">${linkParagraph(escapeHtml(p), byNumber)}</p>`,
  )

  if (signOffAt !== -1) {
    const name = paragraphs[signOffAt + 1]
    const signature = name ? `\n<br />${externalLink(SIG_URL, escapeHtml(name))}` : ''
    parts.push(`<p class="note-signoff">${SIGN_OFF}${signature}</p>`)
  }
  if (refs.length > 0) parts.push(renderReferences(refs))
  return parts.join('\n')
}
