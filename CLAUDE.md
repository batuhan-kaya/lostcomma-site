# Lost Comma site

Studio site for Lost Comma (Istanbul creative software studio: web · apps · identity · motion). Owner: Batuhan.

## Working rules

- Reply to Batuhan in Turkish.
- Never change code without his explicit approval. Work phase by phase as in `docs/PLAN.md`. Finish a phase, show results (tests + screenshots in both languages), wait for approval.
- Every phase after 0 lives on its own branch (`phase-N-name`) and arrives as a pull request. Merging the PR is the approval. Never push to `main` directly.
- `npm run check` must be green before a phase is handed over.
- Other Docker-hosted sites run on the same server. Deploy changes must never bind 80/443 or touch other stacks.

## Brand rules (enforced by tests)

- No commas in visible copy, in either language. The comma appears only as a graphic easter egg (`.egg` or `aria-hidden`).
- Fonts are self-hosted woff2 (Anybody · Geist · Martian Mono from fontsource). Never load Google Fonts or any third-party font CDN.
- Team framing: the studio speaks as "we". Three team cursors: design (blue) · code (mint) · motion (pink) · plus "you" (lime).
- Blog is called "Notes" in both languages.
- Every page has its own signature interaction. Never reuse the homepage animation on an inner page.
- Cursor rule: all three team cursors appear only in the hero. Below the hero one calm host cursor per page.

## Design source

Board: https://claude.ai/artifact/JxLVX6BbRNJbHrZDXka4RS (Main = Work page · Case · Services · ServiceWeb · Process · Studio · Notes · Note · Lab · Start · Now · Uses · NotFound). The homepage is the approved "Live" design.

## i18n

- Source language is Turkish: `t('Türkçe metin')` on the server and in client modules.
- English lives in `i18n/en.json` keyed by the Turkish string.
- `npm run i18n` extracts every `t()` call with acorn and adds missing keys (empty). `npm run i18n -- --check` fails on missing or unused entries.
- Placeholders: `t('{n} sayfa', { n })`.
- Routes are localized in `src/server/routes.ts`. Use `href(lang, id, params)` and never hand-write paths.

## Commands

| Command | What |
|---|---|
| `npm run dev` | build in watch mode + restart server on :3000 |
| `npm run build` | bundle client JS and CSS with hashes · copy fonts · compile server to `dist/` |
| `npm start` | run `dist/server/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest unit + Fastify inject tests |
| `npm run test:e2e` | Playwright against the built server (console errors · axe · comma rule · overflow) |
| `npm run check` | everything above in order |

## Layout

```
src/server/      Fastify app · html templating · i18n · routes · layout · pages
src/client/      browser modules (one entry per page + shared)
src/styles/      tokens · base · layout · per-page CSS
i18n/en.json     English catalog
scripts/         build · dev · i18n
test/            vitest
e2e/             Playwright
```
