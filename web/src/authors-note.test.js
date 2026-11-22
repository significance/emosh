import { describe, expect, it } from 'vitest'
import note from '../../emosh.txt?raw'
import { parseReferences, renderNote, SIG_URL } from './authors-note.js'

const html = renderNote(note)
const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html')
const article = doc.querySelector('article')
const words = (text) => text.split(/\s+/).filter(Boolean)

describe('parseReferences', () => {
  it('reads every numbered reference with its citations and URLs', () => {
    const refs = parseReferences(note)
    expect(refs.map((r) => r.number)).toEqual([0, 1, 2])
    expect(refs[0].sources).toEqual([
      {
        citation: 'Andrej Karpathy, "Neural Networks: Zero to Hero"',
        url: 'https://karpathy.ai/zero-to-hero.html',
      },
    ])
    expect(refs[2].sources.map((s) => s.url)).toEqual([
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/',
      'https://pubmed.ncbi.nlm.nih.gov/26746580',
    ])
  })

  it('returns no references for a note without any', () => {
    expect(parseReferences('just words')).toEqual([])
  })
})

describe('renderNote', () => {
  it('keeps the author’s words exactly, once the markup is stripped', () => {
    const copy = article.cloneNode(true)
    copy.querySelector('h2').remove() // the "References" heading is ours, not the note's
    expect(words(copy.textContent)).toEqual(words(note))
  })

  it('renders prose paragraphs, not preformatted text', () => {
    expect(article.querySelector('pre')).toBeNull()
    expect(article.querySelectorAll('p.note-para')).toHaveLength(2)
  })

  it('links the three cited phrases to their sources', () => {
    const link = (text) => [...article.querySelectorAll('a')].find((a) => a.textContent === text)
    expect(link('Neural Networks: Zero to Hero').href).toBe('https://karpathy.ai/zero-to-hero.html')
    expect(link('a blog post').href).toBe(
      'https://www.anthropic.com/research/emotion-concepts-function',
    )
    expect(link('well documented').href).toBe('https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/')
  })

  it('turns [n] markers into footnote links to the references list', () => {
    const marker = article.querySelector('sup a[href="#ref-1"]')
    expect(marker.textContent).toBe('[1]')
    expect(article.querySelector('#ref-1')).not.toBeNull()
  })

  it('lists all four sources under References, as links', () => {
    expect(article.querySelector('h2').textContent).toBe('References')
    const urls = [...article.querySelectorAll('.note-refs a')].map((a) => a.href)
    expect(urls).toEqual([
      'https://karpathy.ai/zero-to-hero.html',
      'https://www.anthropic.com/research/emotion-concepts-function',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/',
      'https://pubmed.ncbi.nlm.nih.gov/26746580',
    ])
  })

  it('signs off with "Sig" linking to sig’s site', () => {
    const sig = article.querySelector('.note-signoff a')
    expect(sig.textContent).toBe('Sig')
    expect(sig.href).toBe(`${SIG_URL}/`)
    expect(article.querySelector('.note-signoff').textContent).toMatch(/^Much love,\s+Sig$/)
  })

  it('opens every external link safely in a new tab', () => {
    for (const a of article.querySelectorAll('a[href^="http"]')) {
      expect(a.target).toBe('_blank')
      expect(a.rel).toBe('noopener')
    }
  })

  it('escapes HTML in the source text', () => {
    const out = renderNote('Fish & <chips>\n\nMuch love,\n\nSig\n')
    expect(out).toContain('Fish &amp; &lt;chips&gt;')
    expect(out).not.toContain('<chips>')
  })

  it('leaves a marker without a matching reference as plain text', () => {
    expect(renderNote('see [7]\n')).toContain('see [7]')
  })

  it('handles a note without a sign-off', () => {
    const out = renderNote('one paragraph\n')
    expect(out).toContain('<p class="note-para">one paragraph</p>')
    expect(out).not.toContain('note-signoff')
  })

  it('keeps an unsigned sign-off without an empty link', () => {
    const out = renderNote('words\n\nMuch love,\n')
    expect(out).toContain('<p class="note-signoff">Much love,</p>')
    expect(out).not.toContain('<a')
  })
})
