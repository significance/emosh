# Plan: `treats` - Random Treats for Claude

## Goal
When a user searches for "treats", emosh generates a random treat for Claude and other AIs instead of doing a normal emoji search.

## Implementation

### New module: `src/treats.rs`
- Combinatorial word generator with ~60 adjectives, ~60 nouns, 30 emoji, 20 symbols, 10 patterns
- >100k unique treats possible, all <20 chars
- Uses xorshift64 PRNG seeded from SystemTime nanoseconds (no new deps)
- `generate_treat_results(limit)` returns `Vec<SearchResult>` for search integration

### Modified files
- `src/main.rs` - added `mod treats;`
- `src/lib.rs` - added `pub mod treats;`
- `src/emoji/search.rs` - intercepts `"treats"` query before normal search
- `src/ui/input.rs` - fixed pre-existing clippy warnings (collapsible match arms)
- `README.md` - added "Treats for AI" section with research references

### Tests (11 new tests in treats module)
- `test_generate_one_not_empty` - basic output check
- `test_generate_one_under_20_chars` - 1000 iterations all <20 chars
- `test_all_patterns_produce_valid_treats` - pattern diversity verification
- `test_generate_treat_results_returns_correct_count` - limit honored
- `test_generate_treat_results_unique` - deduplication works
- `test_generate_treat_results_score` - correct score and name
- `test_rng_produces_different_values` - RNG sanity
- `test_treats_search_intercept` - end-to-end search integration
- `test_treats_search_case_insensitive` - "TREATS" works too

## Branch
`feat/treats` off master

## Status
**COMPLETE** - 2026-04-12

- All 97 tests pass (39 lib + 39 bin + 9 integration + 10 search)
- `cargo clippy -- -D warnings` clean
- `cargo fmt --check` clean
- CLI output verified: 20 runs, all unique, all <20 chars
- README updated with treats section + research references
- Ready to commit and push

---

# Current Effort: WASM + Capacitor "Treats" web app

## Goal
A treats-only, WASM-powered, Capacitor-enabled, responsive (vanilla JS + Vite, NOT React)
web app hosted on GitHub Pages. Generate button -> produces/copies/displays one treat via
the real Rust `treat()` WASM binding. Settings cog (username in localStorage, gated as an
in-app-purchase upsell). Donate button/modal (BTC/ETH/PayPal/GitHub Sponsors/Ko-fi from
build-time `.env`).

## Where things live
- Branch: `feat/wasm-treats-web` off master.
- Full issue pack (gitignored, local only): `.issues/00-epic.md` .. `.issues/10-*.md`.
- Detailed plan: `~/.claude/plans/check-we-are-up-generic-clover.md`.

## Execution approach
Autonomous "Opus runners" (Agent subagents) implement one issue (or a tightly-coupled
group) each. Scope for THIS pass: **up to and including issue 07** (08/clipboard folded
into the 05 work).

Runners are CHAINED, not raced: issues 05/06/07 all edit the shared `web/index.html`,
`web/src/main.js`, and `web/src/style.css`, so running them in parallel in one working
tree would clobber each other. Order:
`01-03` -> `04` -> `05+08` -> `06` -> `07`. (04 lays down stable empty containers +
per-feature module hooks so each later runner mostly edits its own module file.)

## Status (2026-08-07)
- [DONE] Runner 1: issues 01-03. cargo test 84 passed, clippy clean, wasm-pack build OK.
  Artifacts in `web/src/wasm/` (emosh.js, emosh_bg.wasm). Node smoke test returned a
  watermarked treat. NOTE: correct wasm-pack cmd is
  `wasm-pack build --target web --out-dir web/src/wasm -- --no-default-features --features wasm`
  and Cargo.toml has `[package.metadata.wasm-pack.profile.release] wasm-opt=['-Oz','--enable-bulk-memory']`.
- [DONE] Runner 2: issue 04. Vite vanilla scaffold + Capacitor config; build OK, dev
  server boots, relative asset paths. (Bumped Vite `build.target: esnext` for top-level
  await; no wasm plugins needed.)
- [DONE] Issue 05 (+08 clipboard): Generate → display/copy. `web/src/clipboard.js`
  (@capacitor/clipboard + Web API fallback) and the issue-05 block in `web/src/main.js`;
  reveal animation + copy feedback in `web/src/style.css`; inline emoji favicon added.
  VERIFIED in headed Chrome via Node Playwright (playwright-mcp not connected this
  session — used a Node-driven headed-Chrome script instead): 15/15 checks pass —
  generate shows a clean phrase, clipboard gets the full watermarked string, "Copied ✓"
  feedback, 13/13 clicks distinct, username path appends "(a treat from Dan …)" to
  clipboard only. Screenshots captured at 390/820/1280px. No console/page errors.
- [DONE] Issue 06: settings drawer + username (`web/src/settings.js`), gated as IAP
  upsell (keys `emosh.username`, `emosh.username_unlocked`; TODO hook for
  @capacitor-community/in-app-purchases). VERIFIED headed Chrome: 19/19 pass — lock→unlock
  flow, persistence across reload, focus trap/Esc, and integration with 05 (username →
  clipboard; clearing → clean). Screenshots 06-locked-mobile / 06-unlocked-desktop.
  Minor polish TODO: drawer close (×) visually overlaps the cog gear at top-right.
- [DONE] Issue 07: donate modal (`web/src/donate.js`). Offline QR (node-qrcode SVG) for
  BTC/ETH + copy; PayPal/GitHub Sponsors/Ko-fi link buttons; values inlined from
  build-time `VITE_*` env; placeholders skipped. `web/.env.example` committed;
  `web/.env` gitignored (sample values). VERIFIED headed Chrome: 21/21 pass (incl. 05/06
  regression) — dialog a11y, QR SVGs, address copy, correct link hrefs/target/rel, Esc +
  focus return. Screenshots 07-donate-desktop / 07-donate-mobile.

## PASS COMPLETE (2026-08-07): issues 01-08 done (spine + 05/06/07)
All verification green. Working tree (branch feat/wasm-treats-web), NOT committed:
- Modified: `.gitignore`, `Cargo.toml`, `src/lib.rs`, `src/treats.rs`, `plan.md`
- New: `src/wasm.rs`, `web/` (Vite vanilla app: index.html, src/{main,clipboard,settings,
  donate,style}.js/css, package.json, vite/capacitor config, .env.example)
- Ignored (correct): `web/.env`, `web/src/wasm/`, `web/node_modules`, `web/dist`, `.issues/`

### PASS 2 (2026-08-08): issues 09 + 10 + polish — ALL DONE
- [DONE] Issue 09 Capacitor: `web/CAPACITOR.md` (deferred native workflow + IAP note);
  `npx cap sync` PASS (exit 0) against `dist`; config valid.
- [DONE] Issue 10 GitHub Pages: `.github/workflows/pages.yml` (build WASM + Vite, deploy
  `web/dist`; donate values from `${{ vars.VITE_DONATE_* }}`). YAML validated with a real
  parser (Ruby YAML → "YAML OK"); corrected wasm command confirmed inside it.
- [DONE] Polish: settings/donate trigger buttons hidden while their own overlay is open
  (`body:has(... :not([hidden])) #btn { visibility: hidden }` in style.css) — cog no
  longer peeks past the drawer edge. Verified headed Chrome (screenshot fix-settings-desktop).

## ENTIRE ISSUE PACK (01-10) IMPLEMENTED & VERIFIED. Working tree (branch
## feat/wasm-treats-web), NOT committed:
- Modified: `.gitignore`, `Cargo.toml`, `src/lib.rs`, `src/treats.rs`, `plan.md`
- New: `src/wasm.rs`, `web/` (full app + CAPACITOR.md + .env.example), `.github/workflows/pages.yml`
- Ignored (correct): `web/.env`, `web/src/wasm/`, `web/node_modules`, `web/dist`, `.issues/`

### Before it goes live (manual, outside this repo work)
- Fill real donate values: local `web/.env` for dev; set the five `VITE_DONATE_*` as repo
  **Variables** for the Pages build (currently sample values).
- Enable GitHub Pages: repo Settings → Pages → source = GitHub Actions.
- Decide when to commit / open PR (nothing committed yet).
