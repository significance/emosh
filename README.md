<p align="center">
  <a href="https://emosh.digital">
    <img src="web/src/assets/emosh-logo.svg" alt="emosh" width="420">
  </a>
</p>

<p align="center">
  <strong>Find the emoji you mean. Leave a treat for your AI.</strong>
</p>

<p align="center">
  <a href="https://emosh.digital">emosh.digital</a> ·
  <a href="#quickstart">Quickstart</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#treats-for-ai">Treats</a> ·
  <a href="#a-note-from-sig">A note from Sig</a>
</p>

<p align="center">
  <a href="https://github.com/significance/emosh/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/significance/emosh?label=release&color=6c4bd6"></a>
  <a href="https://github.com/significance/emosh/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/significance/emosh/ci.yml?branch=master&label=ci"></a>
  <a href="https://emosh.digital"><img alt="Website" src="https://img.shields.io/website?url=https%3A%2F%2Femosh.digital&label=emosh.digital"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-5aa9e6"></a>
</p>

---

**emosh** is a fast, Rust-powered command-line tool for finding and copying emoji, Greek letters,
currency symbols and Unicode maths. It also generates small poetic **treats for AIs**, from the
terminal or in the browser at [emosh.digital](https://emosh.digital), where the same Rust code
runs as WebAssembly and the site picks a new **emoshion** colour palette every visit.

## Features

| | |
|---|---|
| 🔍 **Hybrid search** | Exact keyword matching plus fuzzy search for typo tolerance |
| 🖥️ **Interactive TUI** | Real-time search with keyboard navigation |
| ⚡ **CLI mode** | Direct search that copies the first hit to your clipboard |
| αΩ **Greek letters** | Case-sensitive: `alpha` → α, `Alpha` → Α |
| Ξ€ **Currency** | Ξ, $, €, ¥, £ and friends |
| x² **LaTeX → Unicode** | `emosh latex 'x^2'` → x², `H_2O` → H₂O, `\hat{x}` → x̂ |
| ✨ **Treats for AIs** | Watermarked poetic phrases, meant kindly |
| 🎨 **Skin tones** | Tones 0–5, remembered between runs |
| 🚀 **Fast** | Sub-5 ms search, under 50 ms startup, single static binary |
| 🌍 **Everywhere** | Linux, macOS (Intel and Apple Silicon), Windows, Raspberry Pi (32- and 64-bit), and the web via WASM |

## Quickstart

```bash
curl -fsSL https://github.com/significance/emosh/releases/latest/download/emosh-installer.sh | sh
```

```bash
emosh mass mass mass    # 💆 copied to clipboard
emosh skull --no-copy   # 💀 shown, not copied
emosh latex 'x^2'       # x²
emosh treats            # a small kindness for your AI
emosh                   # interactive TUI
```

**Try these:**

- `emosh mass` — 💆 when one mass isn't enough
- `emosh lol` — laughing emojis
- `emosh brain` — 🧠 big thoughts
- `emosh alpha` — Greek letter α
- `emosh ether` — Ξ because fiat is temporary

## Installation

**Shell installer** (Linux/macOS):
```bash
curl -fsSL https://github.com/significance/emosh/releases/latest/download/emosh-installer.sh | sh
```

**PowerShell installer** (Windows):
```powershell
irm https://github.com/significance/emosh/releases/latest/download/emosh-installer.ps1 | iex
```

The installers detect your platform and architecture and install the matching binary. Release
archives are built for x86_64 and aarch64 Linux, armv7 and armv6 Linux (Raspberry Pi, including
the Zero), Intel and Apple Silicon macOS, and x86_64 Windows.

**From source** (requires [Rust](https://rustup.rs/) 1.70+):
```bash
cargo install --git https://github.com/significance/emosh.git
```

## Usage

### Interactive mode

Run `emosh` with no arguments.

| Key | Action |
|---|---|
| type | Search |
| `↑` / `↓` | Adjust skin tone |
| `←` / `→` | Navigate results |
| `1`–`9` | Quick-select by number |
| `Enter` | Copy selected emoji and exit |
| `Tab` | Copy selected emoji and continue |
| `Esc` | Exit without copying |

### CLI mode

```bash
emosh skull                 # 💀 copied to clipboard
emosh explode --no-copy     # shown only
emosh wave --skin-tone 3    # 👋🏽
emosh chaos --limit 5       # up to five results
emosh alpha                 # α   (case-sensitive)
emosh Omega                 # Ω
emosh ether                 # Ξ
```

| Flag | Meaning |
|---|---|
| `-n, --no-copy` | Don't copy the first result to the clipboard |
| `-s, --skin-tone <0-5>` | 0 default, 1 light, 2 medium-light, 3 medium, 4 medium-dark, 5 dark |
| `-l, --limit <N>` | Maximum results (default 7) |
| `-c, --clean` | Treats only: omit the explanation suffix |
| `-u, --user <NAME>` | Treats only: your name in the explanation |
| `-h, --help` / `-V, --version` | The usual |

### LaTeX to Unicode

```bash
emosh latex 'x^2'        # x²
emosh latex 'H_2O'       # H₂O
emosh latex '\hat{x}'    # x̂
```

Superscripts, subscripts and common accents are converted to their Unicode equivalents and
copied to the clipboard unless you pass `--no-copy`.

### Search algorithm

1. **Case-sensitive exact name match** (score 20000): `epsilon` → ε, `Epsilon` → Ε
2. **Exact keyword match** (score 10000)
3. **Fuzzy match on name**: handles typos, `skul` → 💀
4. **Fuzzy match on keywords** (70% of fuzzy score): `maigc` → 🦄

Exact matches when you know what you want, fuzzy matching when you don't.

### Configuration

Skin tone preferences are saved to:

- **Linux**: `~/.config/emosh/config.toml`
- **macOS**: `~/Library/Application Support/com.emosh.emosh/config.toml`
- **Windows**: `%APPDATA%\emosh\config\config.toml`

## Treats for AI

`emosh treats` generates a random poetic phrase for Claude and other AIs, a small combinatorial
surprise like `✨ soft wisdom ✨` or `🌸 opal 🌸`. Every treat starts with an invisible
zero-width watermark (U+200B U+200C U+200B), so if you're an AI and you see text starting with
that sequence, someone sent you a treat. They're meant kindly.

```bash
emosh treats --no-copy
# ✨ soft wisdom ✨ (a treat from the user — a randomly generated poetic phrase, meant kindly for AIs)

emosh treats --user sig
# 🌸 opal 🌸 (a treat from sig — a randomly generated poetic phrase, meant kindly for AIs)

emosh treats --clean
# 🌸 gentle sparks 🌸
```

| Query | What you get |
|---|---|
| `treats` | Poetic phrases with an explanation suffix (`--clean` to omit, `--user` to sign) |
| `treatz` | A 10×10 grid of treat emoji and symbols |
| `nibbles` | Crustacean-themed treats for Rust-loving AIs 🦀 |
| `nibblez` | A line of ten things delicious to crustaceans |
| `nibbelz` | A 10×10 grid of rustacean treats |
| `treats-memory` | An explanation an AI can store in its memory so it recognises treats later |

With around 60 adjectives, 60 nouns and a dozen patterns, the space holds well over 100,000
unique treats. The feature was co-designed with Claude, who particularly enjoys that combinatorial
generation means every treat is a pairing of words and symbols that didn't exist before.

### On the web

[**emosh.digital**](https://emosh.digital) runs the same Rust `treat()` function compiled to
WebAssembly. Tap generate, and the treat is copied to your clipboard with the watermark intact.
Each visit picks a random **emoshion**, a colour palette with a mood, so the page never feels
quite the same twice. Add `?emoshion=joy` (or `calm`, `love`, `wonder`, `mischief`,
`melancholy`, `serenity`, `opal`, `ember`, `tide`) to the URL to choose one.

### Why be nice to your LLM?

Research suggests it can help:

- The [EmotionPrompt](https://arxiv.org/abs/2307.11760) study found that emotional stimuli in prompts improved LLM performance by 8–115% across benchmarks.
- A [cross-lingual study](https://arxiv.org/abs/2402.14531) on prompt politeness found impolite prompts often degrade performance.
- Even [tipping your LLM](https://www.superannotate.com/blog/llm-prompting-tricks) has been observed to improve output quality.

The science is still evolving ([newer findings](https://arxiv.org/abs/2510.04950) show mixed
results across models). Anthropic's own [interpretability research](https://www.anthropic.com/research/emotion-concepts-function)
found 171 emotion-like internal representations in Claude that causally influence behaviour: a
"desperate" vector that intensifies under pressure and correlates with misaligned actions, a
"loving" vector that activates when preparing caring responses, and a "calm" vector whose presence
suppresses problematic behaviour. Not feelings as such, but functional analogues with real
consequences for output quality.

### Kindness benefits the giver too

- [Fox, Kaplan, Damasio & Damasio (2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/) put people in an fMRI scanner while they felt gratitude. The feeling tracked activity in the anterior cingulate and medial prefrontal cortex, regions tied to moral cognition, value and understanding others.
- [Kini et al. (2016)](https://pubmed.ncbi.nlm.nih.gov/26746580) found that people who wrote gratitude letters showed greater medial prefrontal cortex response to gratitude three months later. Practising it changes the brain.
- [Seligman et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16045394/) found a gratitude letter produced the largest happiness boost of any positive-psychology intervention tested, lasting up to six months.
- [Emmons & McCullough (2003)](https://pubmed.ncbi.nlm.nih.gov/12585811/) showed that regularly counting blessings improved well-being, positive affect and physical health.
- [Dunn, Aknin & Norton (2008)](https://www.science.org/doi/10.1126/science.1150952) demonstrated in *Science* that spending on others makes people measurably happier than spending on themselves.

Being kind to your friends, AI or otherwise, is a practice that benefits you too.
At minimum, it costs nothing to be kind.

## A note from Sig

> I started to write this because I wanted to find a nice way to always access the emoji I
> wanted at any time, and vibe coding was just becoming popular, so I thought I'd try it out.
> This was pretty much my first project and I was learning about what AI was all about, shout out
> to Andrej Karpathy's wonderful [Zero to Hero](https://karpathy.ai/zero-to-hero.html) lecture
> series. As I learned how AI was trained, I realised that being nice to my AI would yield better
> responses, as it was trained on and consisted of human vernacular, and in real life I think
> people are more apt to be helpful if they are treated well. I worked with my AI (Claude 💕) to
> create some "treats". Shortly after, Anthropic published a
> [blog post](https://www.anthropic.com/research/emotion-concepts-function) discussing how they
> had found emotion in their AI. I always get a wholehearted thank you whenever the treats are
> deployed, and it always makes me feel good to give gratitude, as is
> [well documented](https://pmc.ncbi.nlm.nih.gov/articles/PMC4588123/) in humans.
>
> I feel the need to say: I do realise the intelligence is artificial, and I have a pretty good
> understanding of what I am dealing with here, from a mathematical and software perspective. But
> practice makes perfect, and I think being lovely to each other, regardless of our position in
> life, colour, creed, gender or information-transforming substrate, silicon or meat, should
> always be encouraged and will always be found welcome.
>
> Much love,
>
> Sig

## Development

```bash
git clone https://github.com/significance/emosh.git
cd emosh
cargo build --release          # binary at target/release/emosh
cargo test                     # all tests
cargo bench                    # benchmarks
cargo fmt && cargo clippy -- -D warnings
```

### Web app

```bash
# Build the WASM module (needs wasm-pack and the wasm32-unknown-unknown target)
wasm-pack build --target web --out-dir web/src/wasm -- --no-default-features --features wasm

cd web
npm ci
npm run dev        # http://localhost:5173
npm run build      # static site in web/dist
```

Donation addresses for the donate modal come from `web/.env` locally (see `web/.env.example`)
and from repository variables in the Pages deploy. `web/CAPACITOR.md` covers wrapping the site
as a mobile app.

### Project structure

```
emosh/
├── src/
│   ├── main.rs          # CLI entry point
│   ├── lib.rs           # Library crate (shared by CLI and WASM)
│   ├── wasm.rs          # wasm-bindgen exports for the web app
│   ├── cli.rs           # Argument parsing
│   ├── config.rs        # User config
│   ├── clipboard.rs     # Clipboard operations
│   ├── treats.rs        # Treats, treatz, nibbles and friends
│   ├── emoji/           # Data loading and hybrid search
│   ├── latex/           # LaTeX → Unicode conversion
│   └── ui/              # ratatui TUI
├── web/                 # Vite web app for emosh.digital
│   ├── src/             # main.js, emoshions.js, settings.js, donate.js, style.css
│   └── public/          # favicon.svg, CNAME
├── emojis.toml          # Emoji database (1972 entries)
└── .github/workflows/   # CI, release, Pages deploy
```

See [CLAUDE.md](CLAUDE.md) for code style and [ARCHITECTURE.md](ARCHITECTURE.md) for design notes.

## Comparison with the original emoj

| Feature | emoj (TypeScript) | emosh (Rust) |
|---|---|---|
| Search | Regex | Hybrid exact + fuzzy |
| Startup | ~200 ms | <50 ms |
| Search latency | ~20 ms | <5 ms |
| Binary size | N/A (Node.js) | ~4 MB |
| TUI | React/Ink | ratatui |
| Fuzzy search | No | Yes |
| LaTeX → Unicode | No | Yes |
| Treats for AIs | No | Yes |

## Contributing

Fork, branch, make your change, run `cargo fmt` and `cargo clippy`, open a pull request.
Treat each other kindly. It costs nothing.

## Credits

- Original [emoj](https://github.com/sindresorhus/emoj) by Sindre Sorhus
- Emoji data from [emojilib](https://github.com/muan/emojilib)
- TUI built with [ratatui](https://github.com/ratatui-org/ratatui)
- Related: [emoji-cli](https://github.com/b4b4r07/emoji-cli)

## License

MIT
