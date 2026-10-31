# Lost Comma site

Studio site for Lost Comma (Istanbul creative software studio: web · apps · identity · motion). Owner: Batuhan.

## Working rules

- Reply to Batuhan in Turkish.
- Never change code without his explicit approval. Work phase by phase as in `docs/PLAN.md`. Finish a phase, show results (tests + screenshots in both languages), wait for approval.
- Every phase after 0 lives on its own branch (`phase-N-name`) and arrives as a pull request. Merging the PR is the approval. Never push to `main` directly.
- `npm run check` must be green before a phase is handed over.
- Every place that needs a real image (photo · screenshot · video) goes into `docs/GORSELLER.md` in the phase that creates it. Batuhan gets the full list at the end. The site must not ship imageless.
- Other Docker-hosted sites run on the same server. Deploy changes must never bind 80/443 or touch other stacks.

## Brand rules (enforced by tests)

- No commas in visible copy, in either language. The comma appears only as a graphic easter egg (`.egg` or `aria-hidden`).
- Fonts are self-hosted woff2 (Anybody · Geist · Martian Mono from fontsource). Never load Google Fonts or any third-party font CDN.
- Team framing: the studio speaks as "we". Three team cursors: design (blue) · code (mint) · motion (pink) · plus "you" (lime).
- Blog is called "Notes" in both languages.
- Every page has its own signature interaction. Never reuse the homepage animation on an inner page.
- Cursor rule: all three team cursors appear only in the hero. Below the hero one calm host cursor per page.
- Calm pages (Batuhan · phase 6): never tiring. Neutral grounds (paper · milk · night) · one accent per page · team colours only as small marks (a dot · a 3 px edge · a cursor) never as big filled blocks · one focal interaction per section · rich through craft and detail rather than quantity. A colour pass over every page comes later.

## Design source

Board: https://claude.ai/artifact/JxLVX6BbRNJbHrZDXka4RS (Main = Work page · Case · Services · ServiceWeb · Process · Studio · Notes · Note · Lab · Start · Now · Uses · NotFound). The homepage is the approved "Live" design.

## Team cursors (src/client/lib/crew.ts)

- Every page section is a `[data-sec]` element. The first one must be `data-sec="hero"`.
- Hero: all three cursors · born from the header avatars. Below: only the host (`data-host` on the section · else the page's `host`).
- Touch screens: hero only. Reduced motion: snap · no drift · no scenes.
- Resting spots are anchors in markup: `data-rest="design"` (or `host`) + `data-rest-at="end 12 -4"` (end of text + offset) or `"0.3 0.55"` (fractions of the box).
- Scripted moments live in the page's client entry: `getCrew()?.addScenes({ hero: async (crew, signal) => { … } })`. Always pass `signal` to `crew.sleep` and `crew.go` so a section change cancels the scene.
- Bubble copy goes through `t()` like everything else and keeps the comma rule.
- Below the hero only one cursor is ever visible. A scene that needs a different teammate calls `crew.cast(name)` first (the others fade).

## Homepage (src/server/pages/home · src/client/home)

- Long structured copy (manifesto edits · services · steps · brief choices) lives per language in `src/server/content/home.ts`. Short UI copy stays in `t()`. Board projects come from the database (`projects.board_slot` 0–6 · frame 7 is the Lab). A project with a cover shows it · without one it shows its drawn `art` from `pages/home/art.ts`.
- Client data comes from the `<script type="application/json" id="page-data">` block (`page.data`). Never inline executable scripts or `style=""` (strict CSP).
- The brief is a real form posting to `/api/brief` (works without JS · redirects to `?brief=sent|error`). With JS it posts JSON. Briefs go to the `briefs` table. `BRIEF_LIMIT` = briefs per address per 10 minutes.
- Contact colour: `CONTACT_THEME` in `src/server/pages/home/index.ts` (ink · paper · lime · coral · blue).
- The shy comma egg sets `localStorage['lc-comma']`; `html.found` then shows the comma in the logo on every page.

## Data (src/server/db · src/server/data)

- PostgreSQL through Drizzle. `DATABASE_URL`: `postgres://…` in production (required) · `pglite://<dir>` for local development (the default · `data/pglite`) · `memory://` in unit tests. PGlite is a dev dependency only.
- Schema in `src/server/db/schema.ts` with `casing: 'snake_case'`. After a change: `npm run db:generate` and commit `drizzle/`. A test fails when schema and migrations drift. Never edit a migration that is already on main: add a new one.
- Migrations run on every boot. `SEED` fills an empty database: `sample` (default outside production · the design board content in `db/sample.ts`) · `demo` (sample plus a generated cover on board frame 0 · e2e) · `none` (production). Seeding never overwrites existing content on boot. `npm run db:seed` overwrites the sample rows on purpose.
- Language text lives in `*_text` tables (one row per language). Pages read through `src/server/data/content.ts`, which falls back to the other language and says so (`textLang`). Slugs are per language.
- Database content follows the comma rule too (a test checks the sample).
- Pages with data declare `load(ctx, params)`. Its result is the second argument of `body` · `footer` · `data` · `title` · `description` (and `theme` may be a function of it). `ctx.db` is the database.
- Pages on a route with params live in `PARAM_PAGES` (`src/server/pages/index.ts`). `load()` returns null for a 404 · `paths(data)` gives the address in each language (language switch · hreflang · canonical · sitemap).
- A case study is `projects.story` (jsonb · `src/server/db/story.ts`): one zod-validated document with `{ tr, en }` inline. Every section is optional · a broken story falls back to the short case page. Images inside it are media ids.

## Work and Case (src/server/pages/work · case · src/client/work.ts · case.ts)

- Work: groups · view · sort run on the client from markup (`data-g` · `data-i`). Without JS it is a plain list of links. The preview frame follows the pointer on a spring (`hover: hover` only).
- Drawn covers (`pages/work/art.ts` · `styles/pages/_art.css`) stand in until `projects.cover_id` is set. Case history frames: version image · else the drawn site (`story.history.mock`) · else the cover.
- Case colours come from `story.theme`. `--acc` is the accent · `--sunk` and `--raise` derive from the theme (exact values for navy).
- The history section is hosted by the teammate who made the current version (`data-host` follows the version).

## Services (src/server/pages/services · service · src/client/services.ts · service.ts)

- Copy for the overview and the four services lives per language in `src/server/content/services.ts` (checklists · hoods · tiers · hero sentences). Short UI copy stays in `t()`. Slugs: `SERVICE_SLUGS`. Prices are `[FİYAT]` / `[PRICE]` until Batuhan sends them.
- The overview hero is a drawing board (one tool per service). The team draws one of each · reduced motion starts it drawn · a keyboard press on a tool stamps one.
- Detail pages are one param page (`service`). Theme = hero colour (Websites blue · Apps lime · Identity pink · Motion ink). Websites wraps everything below the hero and the footer in `.below.th-paper`.
- Each hero renders its first state on the server and `src/client/service/<key>.ts` brings it to life. Logic both sides need lives in `src/shared/` (checklist verdict · thumb geometry · bezier curve · contrast). CSS keeps a few first-state numbers (act boxes · handle spots) and a unit test keeps them equal to `src/shared`.
- Work below a service comes from the database by discipline (`projectsOf`). Motion shows it as a reel of loops that pause off screen.
- Every service page has the same beats: hero · get (twelve things) · hood (a working mock) · price · rel or reel · next tool.

## Process and Studio (src/server/pages/process · studio · src/client/process.ts · studio.ts)

- Process: an edit suite on night (monitor · inspector · transport · four tracks) then calm paper below (`.below.th-paper`): the weekly rhythm (today is marked) · six house rules · after launch. Positions on the ten weeks live in `src/shared/timeline.ts` and the CSS keeps the same numbers (a unit test checks them). The ruler is a slider: arrows a day · page keys a week · Home and End.
- Studio: paper all the way down. The title is made of selections (one per teammate) · team cards from the `people` table (a portrait replaces the drawn cursor once `npm run media -- portrait <crew> <file>` sets one) · a settings window whose Display switches really change the page (`html.still` · `.st-big` · `.st-hc` · `crew.calm()`) · numbers · a drawn Istanbul where the ferry crosses on Istanbul time (`src/shared/istanbul.ts` · `map.ts`).
- Copy lives per language in `src/server/content/process.ts` and `studio.ts`.

## Images (src/server/media)

- One upload → AVIF and WebP at 320 · 640 · 960 · 1280 · 1920 · 2560 (never upscaled) in `DATA_DIR/media/<hash>/` served at `/media/` with a one-year immutable cache. The original goes to `DATA_DIR/originals/` and is never served. Variants are rotated upright and carry no camera or GPS data.
- Render with `picture(media, { lang, sizes })`. Always give a real `sizes`. `priority: true` only above the fold. Alt text comes from the media row per language · pass `alt: ''` when nearby text already names the thing.
- Until the panel exists: `npm run media -- cover <project no> <file> --alt-tr "…" --alt-en "…"` (or `node dist/server/cli.js media …` in the container).

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
| `npm run preview` | build + run with fresh sample content (GitHub Codespaces · `docs/ONIZLEME.md`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest unit + Fastify inject tests |
| `npm run test:e2e` | Playwright against the built server (console errors · axe · comma rule · overflow) |
| `npm run check` | everything above in order |
| `npm run db:generate` | write a migration after a schema change |
| `npm run db:migrate` · `npm run db:seed` | apply migrations · load the sample content |
| `npm run media -- add\|cover\|list` | run images through the pipeline |

## Layout

```
src/server/      Fastify app · html templating · i18n · routes · layout · pages · cli.ts
src/server/db    schema · connection · seed · sample content
src/server/data  queries shaped for pages
src/server/media image pipeline · picture()
drizzle/         generated SQL migrations (committed)
src/client/      browser modules (one entry per page + shared)
src/shared/      pure logic used by both server and client
src/styles/      tokens · base · layout · per-page CSS
i18n/en.json     English catalog
scripts/         build · dev · i18n
test/            vitest
e2e/             Playwright
```
