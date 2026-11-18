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
- `data-rest-at-m` is the spot below 700 px. Rest spots are picked again after a resize (and when late fonts arrive).
- The team moves like hands (Batuhan: "as if a cursor really lives in there" · `src/shared/hand.ts`): a move is a reach on a soft arc · it sets off gently · is fastest a little before half way · lands softly (minimum jerk on a clock that runs ahead). Time grows with the root of the distance (`TEMPO` 40 ms per root pixel: 300 px in about .7 s · 700 px in about 1.06 s · ±10 % every time). A long reach lands a few pixels off and a short slow one fixes it after a beat. Everyone has a temper (`TEMPERS`: design careful · code straight and quick · motion sweeping). The plan is followed by a critically damped follower (`FOLLOW`) so a turn in mid air · a moving target · a nudge stay one smooth line.
- `go()` reaches · `aim()` stays on a moving point (a drag · a pen · typed text: `track`) · `stay()` leaves the mouse where it is (nobody moves a mouse while they type: the homepage hero uses it) · `home()` goes back to rest.
- A cursor at rest is still: no floating. Every few seconds one resting cursor fidgets (`fidget` in `crew.ts`: a nudge of a few pixels · a new spot · a look around and back · one cursor at a time · never off screen) and a resting cursor steps aside when the visitor's pointer comes within 46 px (`mind`) and comes back later. `.resting` marks a cursor that is still at its spot.
- The spring (`src/shared/spring.ts`) no longer moves the team. It still runs the note's playground · the 404 ways · the Work preview · the Lab chain. The sample note "How our cursors move" tells both halves (the spring's numbers and the hand).
- Births .618 s then every .382 s · a far jump fades for .618 s (and comes back near a target a scene set meanwhile) · a bubble stays 2.618 s.
- Everything steps at a fixed 60 Hz through `Clock` (`crew-math.ts`) and draws each frame between its last two steps (`between`): the same pace on 60 · 120 · 144 Hz screens and no frozen or doubled frames. Never call `step()` or `stepHand()` once per requestAnimationFrame (the Lab's canvas specimens are the exception).
- The loop runs in requestAnimationFrame only while a cursor moves. Scroll · resize · a 700 ms watch (a page that moved under a resting cursor · the next fidget · at least 2.6 s after the last move) wake it. `crew.state().running` tells.
- A resting spot is nudged off visible text (`clearSpot` in `crew-math.ts` · 10 px of room for the fidgets is counted in · when that room crosses the x where the tag changes sides (`shouldFlip`) both sides of the tag are kept clear: a nudge used to flip the Lab's design tag onto the title's period on phones): the arrow may point into a display headline (40 px and up) · the tag never covers words. A look around or a step aside only goes where no words are (`free`). Scene targets are never nudged. The watch looks again every two seconds and a resting cursor steps aside when a scene puts words under it.
- An anchor inside a hidden element is skipped (the next shown anchor or the section's fallback spot wins) · a target that disappears leaves the cursor where it is.
- Tags and bubbles flip to the side that fits (`shouldFlip` with the width) and a long bubble slides back onto the page (`fitShift`).
- Never name a class `.rest` or `.resting` on a page: the first is the homepage's anchor layer · the second the crew's.

## Motion budget (phase 12 · e2e/motion.spec.ts)

- No endless requestAnimationFrame. A loop stops when nothing moves and waits off screen (IntersectionObserver). A page at rest runs no JavaScript frames between two fidgets of the team (a second or less of frames every few seconds · the Lab field · the Motion curve demo · the homepage scene are the deliberate exceptions while on screen).
- Endless CSS loops animate transform and opacity only. A live dot's ring is `ping` on the dot's `::after` (base.css). Sections off screen get `data-off` from `app.ts` and their CSS animations pause.
- Layout that changes with scene content keeps its tallest size: the Process inspector's hidden `.room` copy · the homepage headline (`hold()` in `home/hero.ts`) · the Websites width readout (4.5ch: four digits).
- The server's first state equals the client's first state (the Websites frame: `src/shared/frame.ts` · a unit test checks the CSS). Animated reflow on purpose (the frame being dragged) is the only layout shift allowed.
- A scaled-down mock keeps its tools at reading size: `scale: calc(1 / var(--k))` on labels and buttons (home services `--k` · process flow `--pk` · board `--bk`).
- Tap targets are at least 24 px (an invisible `::before` pad where the drawing must stay small). Text on screen is at least 10.5 px (decorative miniatures with `role="img"` or `aria-hidden` excepted).

## Focus and layout (UI pass · e2e/focus.spec.ts · e2e/layout.spec.ts)

- The focus ring is `var(--ring)`: every theme in `themes.css` sets it (the theme's accent). A dark block on a light page (or a light card on a dark one) sets its own `--ring`. Never hard-code a ring colour. `e2e/focus.spec.ts` focuses every stop on every page and measures the ring against the ground under it (3:1 on at least three of its four sides).
- The ring of a band that changes colour on focus goes inside it (`.nx`: `outline-offset: -10px` in `--nfg`).
- Keyboard focus on the endless board glides the frame into view (`reveal` in `home/board.ts`) · the board is `overflow: clip` so focus never scrolls it.
- Long text in a fixed box wraps or scales and is never cut: layer names wrap · next band names shrink to 40 px · the hero is sized for its longest line with the longest word (EN 8.83 em · TR 9.84 em). `e2e/layout.spec.ts` covers 320 · 360 and the edges of each breakpoint.
- A sticky bar lives in a wrapper with only what it rides along (`.chkw` on service pages) so it never covers the heading above.

## Homepage (src/server/pages/home · src/client/home)

- Long structured copy (headline lines · words · manifesto edits · services · steps · the contact sentence) lives per language in `src/server/content/home.ts`. Pages read it through `ctx.texts.home(lang)` (the panel's Metinler may have rewritten it · never import `HOME` in a page). `{w}` in `headline` is the word box · `{b}` in a `sentence` line is its blank. Short UI copy stays in `t()`. Board projects come from the database (`projects.board_slot` 0–6 · frame 7 is the Lab). A project with a cover shows it · without one it shows its drawn `art` from `pages/home/art.ts`.
- 03 · services (phase 16a): five shapes · Websites (1440 × 1350) · Apps · Identity · Motion (1920 × 1650) · Automation (lab "Automation & integration" · 1280 × 1200 · `.frm.v4`). The website · identity · motion and automation frames end where the list on their left ends with their own row open (phase 16e: `align()` in `client/home/services.ts` measures each option's height into `--hl` · 700 to 860 frame pixels · side by side only · the stage keeps the tallest so nothing below moves). The phones keep their own size. The Apps frame's label is "iOS" and its second artboard says "Android" (platform names keep their own spelling: no upper case on them). Each frame plays a real looking product on a loop (`pages/home/frames.ts` · `styles/pages/_frames.css`): Lodos (a sailing club site that scrolls to its fleet and a visitor books Sunday 10:00) · Pocket (an iOS wallet: a salary lands · send ₺250 to Ece · the list updates) · Clay (phase 16e: the brand board Batuhan sent · photo slot `id-board` · a square as tall as the list · a designer's selection with its tag goes over it quarter by quarter · without the photo the drawn 520 × 520 brand book plays) · a motion editor playing our own logo sting (phase 16e: a full editor as tall as the list · tools · the project bin · the viewer with its safe area · transport and level meters · the graph and the effect controls · a markers row and fifteen layers with the sound's waveform · the render queue · playhead · graph and frame counter in step) · a workflow builder where a booking runs node by node and the run log follows (phase 16d: fifteen steps in five groups · on error · customer and CRM with a branch · payment with a branch and a reminder · three steps in parallel · a lane for later · an output panel · a sticky note · a minimap · the run log with a trace that draws each step's bar · its CSS is generated from one table of steps · wires and timings). The products speak English (`lang="en"` on each so upper-case labels keep their i). Only the frame on show plays (`.fc.on`) · every loop moves transform and opacity only (a unit test reads `_frames.css`) · reduced motion and `html.still` show the base styles: each frame is composed as a still. A live motion project's loop plays inside the editor's preview. Mock class names are scoped under `.fc-web` · `.fc-app` · `.fc-id` · `.fc-mo` · `.fc-auto` (the board's `.b0`–`.b7` and the header's `.av` are global: never use those names inside a frame · a person in a mock is `.fce`). Phase 16b made Lodos and Pocket production grade: Lodos is a full page in scroll stops (the view is as tall as the list: the last stop is `--s2` · never past the footer · the pointer's booking targets follow it) (hero with a live wind card and a search bar · numbers · the fleet with a hovered card · booking with a skipper and a calendar · footer) and the visitor's pointer lives in screen space so the page scrolls under it. Pocket has a seamless mesh card (`closest-side` gradients: a gradient clipped by its box draws a hard seam) · a chart with its average and today's tip · an icon per row · a send screen with an IBAN row and contacts · quick amounts · a receipt. Photos inside the mocks are optional slots (`pages/home/pictures.ts` · `npm run mock -- <name> <file>` writes `src/images/<name>.webp` · the build copies it with a content hash into `manifest.images` · `ctx.assets.image(name)`): a slot without its photo keeps its drawing (hero · boats) or initials. Phase 16c made both answer the visitor (`src/client/home/live.ts`): a pointer over the frame (or a tap) adds `.live` to the `.fc` and the story stops right where it was (the story's animations live under `.fc.on:not(.live)` · the scroll position · the picked day and the typed amount carry over). Lodos scrolls natively (only on `hover: hover` and only once the pointer has rested 700 ms: `.can-scroll` · a visitor scrolling the page whose pointer crosses the frame is never trapped · touch scrolls it with its own links) · its links · cards · chips · hearts · calendar · slots · Reserve · newsletter work. Pocket sends money end to end (Send · a person · keypad or the keyboard's digits · Send · receipt · Done puts the row on Recent and takes it off the balance). Left alone for ten seconds the frame fades and its story plays again from the start (the server's markup is put back). Hidden layers never catch the pointer (`.fc:not(.on)` · `.aflow` · `.aok` · `.atap` · `.wptr` have `pointer-events: none`). A hint under the frame (`.ftry`) says it is live and then that the visitor has it. No animation frames: transitions and native scrolling. Narrow screens (the stage scaled under .75 · `.stage.nw`): the mocks are too small to use in place, so a tap on Lodos or Pocket (or the "Tam ekran dene" button `.fxp` that takes the hint's place) opens a modal `<dialog class="fv">` (`src/client/home/viewer.ts`). The `.fc` element itself moves into it and back (state and listeners stay · `LiveMocks.hold` stops the idle reset while it is open). Pocket is fitted like a phone (`--vk`). Lodos becomes its own mobile site under 700 px (a container query on `.fv-box` in `_frames.css`: menu · stacked hero with one button · two by two numbers · chips that swipe · one card per row · the widget at full width · footer in two columns) and scrolls under a finger. The Apps frame has a second artboard beside the iPhone: the same Pocket on Android (`androidArt()` · `.fc-app.and` · 412 × 915 at .667 · a punch hole · Material status icons · arrows and titles on the left · tonal squares · pill buttons · a navigation bar whose active item sits on a pill). It is `.frm2` right after `.frm` in the scaler (unselected: a grey `.flab3` label with `lang="en"` · no handles) and shows only with `.frm.v1`. Its `.fc` is `[data-fca]` (never `[data-fc]`: pick() indexes those) · it gets `.on` with the Apps tab so both phones play the story in step · LiveMocks makes it answer on its own · on narrow screens a tap opens it full screen at its own size.
- Phase 17 (the last pass over the homepage): every section with a page of its own ends with the way there · one pill `.sec-go` in `home.css` (services · work · process) · every kicker sits 120 px under its section's top (88 on phones · the contact sentence came up by as much so the section kept its height) · the hero's caret takes no room (the period stays on the last letter of any word) · on touch screens the scroll hint does not promise a teammate below the hero (`.hf-crew` hidden under `hover: none`) · the Lab frame on the board breathes three times once it shows and keeps breathing only under the pointer (font-variation repaints · an endless loop may only move transform and opacity) · English words in upper case labels on Turkish pages carry `lang="en"` (the manifesto's comments · the hero's thread · a roll label's other language). Then (Batuhan approved all four): the homepage's footer starts with the sitemap (`footer(ctx, { ask: false })` · the contact sentence right above already asks · the call link `.sbook` lives under the contact's address) · the hero's lead lists the crafts with middle dots instead of a chain of "ve" · fonra keeps its own lower case in the Process caption (`.ly-nm`) · the header rides along on every page (below).
- Client data comes from the `<script type="application/json" id="page-data">` block (`page.data`). Never inline executable scripts or `style=""` (strict CSP).
- 05 · process (phase 16f · "Katman katman" · `pages/home/process.ts` · `layers.ts` · `styles/pages/_layers.css` · `client/home/process.ts`): one real project as five sheets in an isometric stack from the bottom up: fonra's website (a sound and motion studio · phase 16h · Batuhan sent its homepage) (phase 16g made the sheets look real · Batuhan: the first step is "Planla" · "Plan"): plan (a planning board: goals · the sitemap from fonra's own menu · a ten week calendar that names the steps themselves · a quote · a mood board · the brief · a comment · a cursor) · sketch (a spiral sketchbook: fonra's homepage in pencil · the giant word · the wave · the frequency ruler · two variations with one picked · the phone · a pencil on the page) · prototype (a design tool's prototype view: three dark phone frames · dragging the ruler changes the wave to a 330 Hz variant on a spring · the studio page · the interaction panel · in English) · build (an editor: the hero's code with Wave and Ruler types itself · the preview reloads with the live page and the wave's props · the terminal runs the tests) · launch (fonra's homepage live in a dark browser · three numbers rise like pins). The launch photo is one lazy file (photo slot `ly-launch` · `pictures.ts` · the comma in its subtitle was painted out: the brand rule holds in pictures too): the launch sheet · the build preview and the plan's mood board show it · without it the sheets keep their drawings (`lw-drawn` · `RINGS`). fonra's own words are Turkish (`lang="tr"` on the drawn page). The code types by transform only: a cover slides off each line in `steps(--n)` (`CODE` · `TERM` · the `.k*` and `.tc` schedule is generated from them and a unit test checks the lengths) · reduced motion and `html.still` show it typed. The host waits on the build step until the terminal is done. The steps' words are `steps` in `content/home.ts` (Metinler). A class `s0`–`s4` on `.ly` is the whole state: the sheets above the open one lift by `--G` and turn to tracing paper (`.fut`) · the ones below are `.done`. The geometry is CSS only (orthographic: rotateX(55deg) rotateZ(-45deg) · a 480 × 300 sheet's right corner is 275.77 px right and 36.5 px up from its centre · a sheet at height z rises .81915 z): each note hangs on its sheet's right corner with a leader line and rides with it (one `--z` formula for both · an e2e test measures the corner). The open note takes `--D` above its line (three lines of text · `room()` grows it when the panel's words need more) and `--G` follows from it. Each sheet plays its own one shot moment when it opens (transitions only · a sheet still ahead waits in its first state). The section arrives as the finished site and opens into its layers (`.in` · `.ready` after 1.8 s). Below 1100 px the stack sits on top and the steps are a list. The host (code) opens the steps one by one. Never reuse it on the Process page (that one is the edit suite).
- 06 · contact (phase 16): one sentence with three blanks · "Merhaba ben [adın]. [yeni bir web sitesi] hakkında konuşmak istiyorum. Bana [sen@sirket.com] adresinden yazın." Each language puts its blanks in its own place (`sentence.name` · `what` · `mail` with `{b}`). The topic is the brief's `message` · no types · time or budget any more (the API still takes them · older briefs keep their labels in the panel and mail · those labels are not in Metinler).
- The blank in use carries the hero's selection box and a size label (`.bw.on` · `:focus-within` without JS) · the host walks to the end of that line (never onto the words). The script sizes each blank to its words (a hidden `.bprobe` measures in the sentence's own letters · without JS `field-sizing` · else `size`): empty it keeps its placeholder's room · from the first letter it is as wide as the words · shrinking glides (`width` transition) and growing is at once (`.grow` drops the transition so no letter waits). The empty topic suggests ideas in turn every 2.618 s while on screen (never with reduced motion) · its width is the longest idea's so the line never moves.
- It is a real form posting to `/api/brief` (works without JS · redirects to `?brief=sent|error`). With JS it posts JSON and the sentence turns into the thanks with their name and address.
- The visitor's own words stand apart (phase 17b · Batuhan): what they type in the blanks and their name and address in the thanks (`.dv`) are in `--you` (the section's selection colour · blue on milk · a colour of its own where the selection is the ink). The address in the thanks may break after its @ and dots (`<wbr>` from the script) and a long one wraps anywhere: it never runs off a phone. Briefs go to the `briefs` table. `BRIEF_LIMIT` = briefs per address per 10 minutes.
- Contact colour: `CONTACT_THEME` in `src/server/pages/home/index.ts` (ink · night · paper · milk · lime · coral · blue). Milk since phase 16 (Batuhan: the blue was too loud) · a hairline marks where it starts after the paper Process.
- There is no comma easter egg any more (Batuhan cancelled the shy orange cursor: no `lc-comma` key · no `html.found` · no ghost avatar). Do not bring it back.

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
- The overview is an index in big type (the drawing board and the four colour tiles are gone: Batuhan found no logic in the board · then found a plain list too standard: "take some inspiration from awwwards"). Four names as tall as the screen allows · one row open (`.on` · the first on arrival). The open name is set wide and the others narrow and faint (Anybody's `wdth` axis · the type makes room like a frame being resized). It is a selected layer: `.sv-sel` (frame · four handles · a grip · a label that counts the real size while it stretches: ResizeObserver in `src/client/services.ts`). Under it one panel: a small drawing · the row's own words (`pitch` · the detail pages keep `desc`) · what you get · a comment from the teammate who does it (`note`) · a ruler of weeks (`weeksRule`) · the starting price. Hover or focus opens a row · and in the hero the team does it too: a cursor takes the grip of its own service (`data-by`) and pulls the name open (it waits six seconds after the visitor's last choice). One row is always open and every panel has the same height: nothing below moves. Touch · narrow screens · no JS: every row open (the closed state lives behind `hover: hover` · `scripting: enabled` · 821 px). A service's colour is a small mark only. Below: the combinations (outlined pills · results on one line) · fair questions. Never name a class `.sr` here: that is the visually hidden helper.
- Detail pages are one param page (`service`). Theme = hero colour (Websites blue · Apps lime · Identity pink · Motion ink). Websites wraps everything below the hero and the footer in `.below.th-paper`.
- Each hero renders its first state on the server and `src/client/service/<key>.ts` brings it to life. Logic both sides need lives in `src/shared/` (checklist verdict · thumb geometry · bezier curve · contrast). CSS keeps a few first-state numbers (act boxes · handle spots) and a unit test keeps them equal to `src/shared`.
- Work below a service comes from the database by discipline (`projectsOf`). Motion shows it as a reel of loops that pause off screen.
- Every service page has the same beats: hero · get (twelve things) · hood (a working mock) · price · rel or reel · next tool.

## Process and Studio (src/server/pages/process · studio · src/client/process.ts · studio.ts)

- Process: an edit suite on night (monitor · inspector · transport · four tracks) then calm paper below (`.below.th-paper`): the weekly rhythm (today is marked) · six house rules · after launch. Positions on the ten weeks live in `src/shared/timeline.ts` and the CSS keeps the same numbers (a unit test checks them). The ruler is a slider: arrows a day · page keys a week · Home and End.
- Studio: paper all the way down. The title is made of selections (one per teammate) · team cards from the `people` table (a portrait replaces the drawn cursor once `npm run media -- portrait <crew> <file>` sets one) · a settings window whose Display switches really change the page (`html.still` · `.st-big` · `.st-hc` · `crew.calm()`) · numbers · a drawn Istanbul where the ferry crosses on Istanbul time (`src/shared/istanbul.ts` · `map.ts`).
- Copy lives per language in `src/server/content/process.ts` and `studio.ts`.

## Notes and Note (src/server/pages/notes · note · src/client/notes.ts · note.ts)

- A note body is markdown (`note_text.body`) rendered by `src/server/notes/render.ts`. Raw HTML and images are off. Everything that is not prose is a fence: `~~~ts title=spring.ts hl=2 note="…"` (code · numbered · marked lines) · `~~~playground spring` (the spring playground) · `~~~figure host` (rows of `Label | text`). Footnotes `[^1]` become side notes beside their line. h2 make the table of contents. The first paragraph is the lead. Reading minutes come from the text (`readMinutes`).
- The playground runs `step()` from `src/shared/spring.ts` (`crew-math.ts` re-exports it). The team cursors moved on to the hand (`src/shared/hand.ts`) and the note says so in its own section.
- Notes list: find with marks (`src/shared/find.ts` forgives Turkish letters unless "Aa" is on) · language and topic filters · line numbers save a note in `localStorage['lc-saved-notes']` · `?q=` in the address · "/" focuses the find box. Tag labels live in `src/server/content/notes.ts`.
- A note written in one language only has no address in the other. Lists link it to its own language: `hreflang` on the link · `lang` only on its own words (never around upper-case labels: `i` would turn into `İ`). English words in `.mono` labels on Turkish pages get `lang="en"` for the same reason.
- RSS per language (`/tr/notes/rss.xml` · `/en/notes/rss.xml`) with the full text · the playground becomes a link back.

## Lab (src/server/pages/lab · src/client/lab.ts · lab/draw.ts)

- Hero: a canvas field of commas that turn toward every cursor on the page (the visitor in lime · the team in their colours · softly). Six specimens below (copy per language in `src/server/content/lab.ts` · drawings in `src/client/lab/draw.ts`) and where they went.
- One frame loop draws only what is on screen (IntersectionObserver): the field while the hero shows · each tile while it shows (off-screen tiles keep one still frame). Each tile says running · paused · off screen.
- Performance budget (`src/shared/lab.ts`): every drawing is timed · a `Meter` steps its quality down after it stays over budget (fewer pixels · fewer marks) and back up when there is room. The hero shows the cost of a frame. An e2e test keeps the page's JS under 64 kb.
- Pause all · reduced motion starts paused. A teammate's cursor can stand in for the pointer (motion plays with the spring chain).

## Start (src/server/pages/start · src/client/start.ts · src/shared/booking.ts)

- Office hours: twenty minute calls every half hour from 10:30 to 17:00 Istanbul time on the next ten working days (never today). Istanbul is UTC+3 all year. All slot math lives in `src/shared/booking.ts` (server and browser).
- Without JS it is a form: days are links (`?day=`) · every slot is a radio in Istanbul time · it posts to `/api/booking` and redirects to `?ticket=<token>#book` (or `?booking=taken|error|slow&day=`). With JS the visitor's time zone fills the clocks and the ruler · only slots inside both working days (09:00 to 18:00 theirs · 10:00 to 18:00 ours) show · labelled in their time · it posts JSON and the ticket replaces the panel.
- `bookings` table: one booked call per instant (partial unique index) · a cancelled call frees the slot. `BOOK_LIMIT` = bookings per address per hour. `/api/booking/<token>.ics` is the calendar file.
- Copy per language in `src/server/content/start.ts` (including both emails). The phone number is a placeholder.

## 404 (src/server/pages/notFound · src/client/notfound.ts · src/shared/lost.ts)

- "This place is not on the map": the site drawn as a star chart on ink (home in the middle · main pages on the first ring · services · the newest cases and notes on the second). The visitor is a lime comma standing next to the page their address came closest to.
- Closeness is counted in letters (edit distance with swaps · Turkish letters and accents forgiven · either language's address). Nothing close: the comma stands outside the edge and the way leads home. `placeYou` picks the free side so the comma never covers a label.
- Every star is a link. Hover or focus draws the way there on the cursor spring and the box says how many letters away it is. ⌘Z / Ctrl+Z: the team cannot undo it. Without JS the way to the closest page is already drawn.

## Panel (src/server/panel · src/client/panel.ts · panel/story.ts · docs/PANEL.md)

- One Fastify plugin under `/panel` (Turkish only · noindex · no-store · same CSP). One user: the password is scrypt in `panel_user` (set with `npm run panel -- password` or `PANEL_PASSWORD` on first boot). Optional TOTP (QR from `qrcode`). Sessions keep only the sha256 of the cookie token · 24 h idle · 14 days max · cookie `Path=/panel` HttpOnly SameSite=Strict. Every post needs the session's CSRF token (`_csrf` or `x-csrf`) and our Origin (`src/server/origin.ts` · `EXTRA_ORIGINS` only for a preview behind a proxy that rewrites Origin · Codespaces). `PANEL_SIGNIN_LIMIT` = sign-in attempts per address per 15 minutes.
- Sections in `src/server/panel/views/`: Pano (launch checklist in `checklist.ts`) · İstatistik · İşler (case study editor) · Notlar (live preview through the site's renderer) · Görseller (images and loops · multipart only here) · Ekip · Gelen kutusu · Görüşmeler (cancel with a calendar cancellation · closed days and hours) · E-postalar · Metinler · Site ayarları · Yönlendirmeler · Kayıt · Hesap.
- Every change goes to the `audit` table · content keeps before and after snapshots (`snapshot.ts`) and "Bu hale dön" restores them (a deleted project or note comes back with its id). Saves use the row's `updated_at` as an optimistic lock.
- The comma rule holds in the panel: visible copy with a comma is refused (code fences in notes are free).
- Metinler (`panel/views/texts.ts` · `src/server/data/texts.ts`): copy without opening the code. Two kinds: every line the server renders through `t()` (listed by where it is said: `i18n/where.json` · one override per language · `translator(lang, en, over)`) and the homepage's structured content (`homeLeaves`: headline · words · manifesto · services · steps · brief). Overrides live in four `settings` rows (`texts.t.tr|en` · `texts.home.tr|en`) · an override equal to the default is not kept · the comma rule and the `{placeholders}` are checked · every save is in the log and can be restored. Not covered: lines only the browser says (`src/client` · compiled into the bundles) · other pages' structured content · legal text · mails.
- Site settings (`src/server/data/settings.ts`): prices · the next free month · address · phone · the legal pages' controller · address · email · mail service. Pages read them through `ctx.settings` · an empty value keeps the placeholder. Closures (`data/closures.ts`) drop closed days from Start and block closed hours in the API. A changed slug of a live page adds a redirect (`data/redirects.ts`) · the 404 handler looks there first.
- Panel classes start with `p-` (app.css loads too). Previews render the site's own pages with draft data (`projectBySlug(…, preview)` · `noteBySlug(…, preview)`).

## Statistics (src/server/stats · src/client/lib/stats.ts · docs/ISTATISTIK.md)

- Cookieless and anonymous (Batuhan's choice). The browser sends one beacon per page view (`/api/stats` · after 1.5 s · every 30 s while visible · on hide) with the view · time on screen · scroll depth · clicks on links and buttons (label · target · position). Nothing is written on the device · form fields are never read.
- A visitor is `sha256(day salt · IP · user agent · host)` (16 hex). The salt lives in `stats_salts` for one Istanbul day and older salts are deleted. Thirty quiet minutes end a visit. The IP is never stored.
- Not counted: bots and automation (`stats/agent.ts` · HeadlessChrome too · e2e browses with an ordinary user agent) · DNT · GPC · `localStorage['lc-stats-off']` (privacy page · panel button) · frames · `/panel`.
- Country from the time zone (`stats/zones.ts` from zone.tab) · city only with `GEOIP_DB` (DB-IP Lite mmdb · CC BY 4.0).
- A brief or a booking is linked to its visit (`visit_id`) and logs an event · the panel shows "Nasıl geldi" on it.
- Panel: İstatistik (`panel/views/stats.ts` · queries in `data/stats.ts`): live · summary · chart (server SVG) · tables · funnels · visits · a visit's timeline · a page's click map (the page in an `inert` frame · `frame-ancestors 'self'`).
- Keeping: visits `STATS_DAYS` (395) except ones linked to a brief or call · briefs · bookings · outbox · audit `RECORD_DAYS` (730 · `data/retention.ts`). The prune runs at boot and every 12 hours.
- `/api/stats/me` and `/api/stats/forget` serve the privacy page's "your record".

## Legal pages (src/server/pages/legal · src/client/legal.ts · src/server/content/legal.ts)

- Gizlilik (`/tr/gizlilik` · `/en/privacy`) · KVKK aydınlatma metni (`/tr/kvkk` · `/en/kvkk`) · Çerezler (`/tr/cerezler` · `/en/cookies`). Linked from both footers and under the brief and booking forms.
- Copy per language in `content/legal.ts` (comma rule) · `{controller}` · `{address}` · `{email}` · `{mail}` come from Site ayarları · Yasal sayfalar (placeholders until filled · on the launch checklist). Change `LEGAL_UPDATED` when the text changes.
- What the text promises must stay true: no cookies but `lang` (and the panel's) · the two localStorage keys (`lc-saved-notes` · `lc-stats-off`) · thirteen months · two years · thirty days of server logs (deploy) · Hetzner in Germany.
- Each page's own interaction: privacy · your record (today's visits · delete · do not count me) · kvkk · use your right (ticked rights become an application email · nothing is sent to us) · cookies · in your browser now (our cookie and keys · delete one by one).
- Never name a page attribute `data-off` (sections off screen get it from app.ts).

## Mail (src/server/mail)

- Every message goes into the `outbox` table first. The `Postman` sends what is pending through `MAIL_URL` (any SMTP · `log://` prints) · retries failures every five minutes · gives up after five tries · skips anything older than two days. Without `MAIL_URL` nothing is sent and nothing is lost.
- A booking sends two: the studio's (Turkish · reply goes to the visitor) and the visitor's (their language · calendar invitation attached). A brief sends one to the studio. `MAIL_TO` is the studio inbox · `MAIL_FROM` the sender · `MEET_URL` an optional video link template with `{ticket}`.
- Mail copy keeps the comma rule. `npm run bookings` · `npm run mail -- test <address>` · `npm run mail -- outbox` · `npm run mail -- retry`.

## Logo and footer (src/shared/logo.ts · layout/logo.ts · layout/chrome.ts)

- The mark (a corner and the comma under it) lives once in `src/shared/logo.ts`: redrawn with smooth curves from Batuhan's traced file. Everything draws it from there.
- The logo is minimal: the mark and the two words · nothing between them (Batuhan had the blinking caret and the panel's bar removed · do not bring a divider back).
- Beside the name the mark is one size with it: the corner is as tall as the l (`L_HEIGHT` .785 em · a unit test measures it from Anybody) and ends on the baseline · the comma hangs under it. `.lc-lock` · `.lc-mark` in `chrome.css` (a negative bottom margin keeps the comma out of the line box). Header · panel · share images · footer.
- Icons: `npm run icons` draws `public/favicon.svg` (ink on light tabs · milk on dark) · `favicon.ico` · `apple-touch-icon.png` · `icon-192/512/maskable/144.png` · `site.webmanifest` from the mark. They are committed · a unit test fails when they drift.
- One footer on every page: a way to start (next free month from Site ayarları) · the sitemap · the sign-off · the small print with the language switch. The homepage's footer starts with the sitemap (`.ft.lite`: its contact section already asks). Always ink (`th-ink`) · lime is its accent. `data-sec="ft"`.
- The header rides along (phase 17 · `src/client/lib/bar.ts` · `.hd` in `chrome.css`). At the top it is the page's header and scrolls away with the page. Once out of sight it becomes the bar (`.stk` · `--bar` 64 px · 60 on phones) and waits above the screen: a scroll up brings it back (`.up` · `html.hd-up`) on the ground of the section under its edge (`--pbg` set by the script · `.hd-d` or `.hd-l` give it light or dark words when that ground is not the page's own) with a hairline · a scroll down sends it away (8 px before it turns) · at scroll 0 it is the header again. Keyboard focus and the open menu always show it. Only transform slides it · the scroll event toggles classes (no animation frames). Never put a transform · filter or backdrop-filter on a shown `.hd`: the mobile menu's sheet is fixed inside it. A sticky element near the top of a page steps down under the bar with `html.hd-up` (the note's contents).
- The sign-off (Batuhan did not like the big drawn logo and name · nor a line that ended on a comma: "do not force the comma"): three quiet cells in the site's own language (`.ft-base`): the logo at reading size with the studio line · the team's avatars with a place for the visitor · a round drawn arrow back to the top (he asked for the big clock to go). No animation · nothing waits for a script. The host rests after the team line.
- Social accounts · the phone · the address show only once filled (Site ayarları · Sosyal hesaplar: https on the network's own site).
- Footer classes start with `ft-` · logo classes with `lc-` (plain names like `.mt` · `.fb` · `.lock` already exist on pages).

## Preloader (layout/intro.ts · src/client/lib/intro.ts · src/styles/intro.css)

- "The lost comma is found": the corner of the mark waits in the middle with a dashed place for its comma · design and code glide in · motion brings the comma (coral · it turns the logo's colour once it sits) · the mark flies onto the header logo and the page is there. Everyone comes in from outside the screen (design left · code right · motion and the comma together over the bottom edge): nobody fades in on stage. While the overlay is there the header logo's own mark is hidden (`lci-wait` in `intro.css`): the flying mark lands in an empty place. A click · a key or the wheel skips it.
- Timed so each beat can be read (Batuhan: "too fast · chaotic" · then "neither slow nor fast · flawlessly fluid"): a .382 s pause · design at .382 s and code at .618 s (1 s glides) · the comma from .854 s (in over the bottom edge · up and across on one arc · dropped in at 2 s · .25 s settle) · found at 2.382 s · the exit at 2.618 s (.786 s). Each axis has its own easing (x on `translate` · y on `transform` · tilt on `rotate`) so every path is one curve with no corner and nothing stops in mid air.
- Only for visitors who arrive from outside (`arrivesFromOutside`: Sec-Fetch-Site none · cross-site · same-site on a document navigation). The server decides so nothing is stored on the device (the privacy page promises two localStorage keys). Our own links · old browsers without the headers · error pages · the panel: never. `Vary: Sec-Fetch-Site`.
- Server drawn first in the body so it is on the first paint. CSS shows it only with `scripting: enabled` and no reduced motion · a failsafe hides it after six seconds. On the page's own ground (`--pbg` · `--pfg` of the theme on `<html>`).
- The team cursors start once it is gone (`app.ts`: the crew waits for `playIntro()`). Its cursors are `.lci-cur` (never `.cur`: that is the crew's).
- `PRELOADER=off` turns it off (the shared e2e server · every page.goto arrives from outside). `e2e/intro.spec.ts` starts its own server with it on.

## Share images (src/server/og)

- Every page links `/og/<page address>.png?v=<hash>` (1200 × 630). The server draws it from our own fonts: woff2 unpacked once with wawoff2 · letters to outlines with fontkit · sharp turns the SVG into a PNG. Cached in `DATA_DIR/og/` by content. A page can set its label · title · cursor with `og()` (notes do). 404 pages have none.

## Images (src/server/media)

- One upload → AVIF and WebP at 320 · 640 · 960 · 1280 · 1920 · 2560 (never upscaled) in `DATA_DIR/media/<hash>/` served at `/media/` with a one-year immutable cache. The original goes to `DATA_DIR/originals/` and is never served. Variants are rotated upright and carry no camera or GPS data.
- Render with `picture(media, { lang, sizes })`. Always give a real `sizes`. `priority: true` only above the fold. Alt text comes from the media row per language · pass `alt: ''` when nearby text already names the thing.
- Until the panel exists: `npm run media -- cover <project no> <file> --alt-tr "…" --alt-en "…"` (or `node dist/server/cli.js media …` in the container).
- Loops (motion work · `src/server/media/video.ts`): delivered ready made (MP4 H.264 · optional WebM · a poster) · the server checks them (no ffmpeg in the container) and serves `/media/<key>/loop.mp4|webm` with range requests. `npm run media -- loop <project no> <file.mp4> --webm <file> --poster <image> --alt-tr "…" --alt-en "…"`. Export settings: `docs/GORSELLER.md`. `loopVideo()` renders a muted `<video>` that never autoplays from markup: `src/client/lib/loops.ts` plays it while it is on screen and wanted · reduced motion waits for a tap. The Motion reel and the homepage motion frame use them. `SEED=demo` gives one motion project the demo loop from `test/fixtures/loop`.

## i18n

- Source language is Turkish: `t('Türkçe metin')` on the server and in client modules.
- English lives in `i18n/en.json` keyed by the Turkish string.
- `npm run i18n` extracts every `t()` call with acorn and adds missing keys (empty) and writes `i18n/where.json` (which part of the site says each server line · the panel's Metinler lists by it). `npm run i18n -- --check` fails on missing or unused entries or a stale `where.json`. Commit both files.
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
| `npm run bookings` | the next calls booked on Start |
| `npm run mail -- test <address>\|outbox\|retry` | check the mail settings · see or resend the outbox |
| `npm run panel -- password\|totp off\|signout` | set the panel password · turn two-step off · sign every browser out |
| `npm run icons` | draw the favicon and icons from the mark into `public/` |
| `npm run mock -- list\|<name> <file>` | the photo slots of the service mocks · crop a photo into `src/images/` |

## Layout

```
src/server/      Fastify app · html templating · i18n · routes · layout · pages · cli.ts
src/server/db    schema · connection · seed · sample content
src/server/data  queries shaped for pages
src/server/media image pipeline · picture()
src/server/notes markdown for notes · code highlighting · RSS
src/server/og    share images
src/server/mail  outbox · postman · messages · calendar files
src/server/panel the panel: sign in · sections · audit · snapshots
drizzle/         generated SQL migrations (committed)
src/client/      browser modules (one entry per page + shared)
src/shared/      pure logic used by both server and client
src/styles/      tokens · base · layout · per-page CSS
i18n/en.json     English catalog
scripts/         build · dev · i18n
test/            vitest
e2e/             Playwright
```
