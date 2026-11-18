import { html, raw, type Safe } from '../../html';
import type { Ctx } from '../../page';
import type { Pic } from './pictures';

/**
 * 05 · Process: the five sheets of one real project (Clay's website) from the bottom up · drawn
 * flat at 480 × 300 and laid in an isometric stack by CSS (`_layers.css` · `.ly`). All decorative:
 * the notes beside the stack say everything in words.
 *
 *   0 · plan       a planning board: goals · the sitemap · the ten weeks · the brief · a quote · a comment
 *   1 · sketch     a spiral sketchbook: the page in pencil · two variations (one picked) · the phone · a pencil
 *   2 · prototype  the prototype view of a design tool: three phone frames · noodles · the interaction panel
 *   3 · build      an editor: the hero's code types itself · the preview reloads · the terminal runs the tests
 *   4 · launch     the live site in a browser (photos and type cropped from Clay's brand board) · numbers rise
 *
 * The photos are crops of the brand board Batuhan sent (slot `id-board` · the identity frame shows it
 * too: one file · lazy). `CROPS` says where each crop sits on the board · the CSS keeps the same
 * numbers (`.ph-*` · a unit test compares them). Without the board the launch sheet keeps its drawing.
 * The products and the tools speak English (`lang="en"`) · our own notes speak the page's language.
 */

/** A small deterministic random (the sketch wobbles the same way on every render). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647 - 0.5;
  };
}

/** One pencil stroke: a slightly bent line that overshoots its ends a little. */
function stroke(r: () => number, x1: number, y1: number, x2: number, y2: number, wob = 1.6): string {
  const j = (v: number, k = 1) => (v + r() * wob * k).toFixed(1);
  return `M${j(x1)} ${j(y1)}Q${j((x1 + x2) / 2, 2)} ${j((y1 + y2) / 2, 2)} ${j(x2)} ${j(y2)}`;
}

/** A pencil box: four strokes · the corners cross a little like a quick hand. */
function box(r: () => number, x: number, y: number, w: number, h: number): string {
  const e = 3;
  return [stroke(r, x - e, y, x + w + e, y), stroke(r, x + w, y - e, x + w, y + h + e), stroke(r, x + w + e, y + h, x - e, y + h), stroke(r, x, y + h + e, x, y - e)].join('');
}

/** A picture placeholder: a box with a cross. */
function crossed(r: () => number, x: number, y: number, w: number, h: number): string {
  return box(r, x, y, w, h) + stroke(r, x + 4, y + 4, x + w - 4, y + h - 4, 1) + stroke(r, x + w - 4, y + 4, x + 4, y + h - 4, 1);
}

/** Lines of scribbled text. */
function scribble(r: () => number, x: number, y: number, widths: number[], gap: number): string {
  return widths.map((w, i) => stroke(r, x, y + i * gap, x + w, y + i * gap, 1.2)).join('');
}

/**
 * Crops of Clay's brand board (1254 × 1254): x · y · width · height on the board · the width shown
 * on the sheet. The shown height follows the crop's own proportion. `_layers.css` keeps the numbers.
 */
export const CROPS = {
  head: [45, 922, 455, 110, 176], // "Everyday objects. Lasting rituals." (the editorial serif)
  logo: [738, 926, 170, 70, 40], // the wordmark from the business card
  hero: [642, 200, 590, 318, 260], // the box · the cup · the card on stone
  t1: [900, 290, 350, 243, 104], // the cup
  t2: [680, 95, 400, 278, 104], // the box
  t3: [895, 662, 345, 240, 104], // the glaze swatches
  t4: [905, 915, 335, 233, 104], // the oxide card
  pv: [642, 200, 590, 318, 146], // the preview's hero (build)
  pvh: [45, 922, 455, 110, 84], // the preview's headline (build)
} as const;
export type CropName = keyof typeof CROPS;
export const BOARD = 1254;

const crop = (src: string, name: CropName) => `<span class="ly-ph ph-${name}"><img src="${src}" alt="" decoding="async" loading="lazy" draggable="false"></span>`;

const VASES = `<svg class="ly-vs" viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet"><path d="M52 252 Q30 200 50 160 Q60 140 58 110 L74 110 Q72 140 82 160 Q102 200 80 252 Z" fill="#C8643B"/><path d="M128 160 L152 160 L150 180 L130 180 Z" fill="#1E5B5A"/><path d="M112 252 Q96 252 96 222 Q96 180 140 178 Q184 180 184 222 Q184 252 168 252 Z" fill="#1E5B5A"/><path d="M190 252 Q182 230 194 214 L198 200 L210 200 L214 214 Q226 230 218 252 Z" fill="#E0A54A"/><rect x="20" y="252" width="210" height="5" fill="#B9A893"/></svg>`;

const CURSOR = '<svg viewBox="0 0 12 14"><path d="M1 1v11l3-3 2.2 4.4 1.8-.9L5.8 8H10z"/></svg>';

/* ---------------- 0 · plan ---------------- */

/** A planning board: goals · the sitemap · the ten weeks (the steps' own names) · the brief · a quote. */
function plan(ctx: Ctx, names: string[]): Safe {
  const { t } = ctx;
  const goals: [string, string, string][] = [
    ['s1', t('Online sipariş'), 'S'],
    ['s2', t('Atölye kayıtları'), 'D'],
    ['s3', t('Sıcak bir dil'), 'C'],
  ];
  const pages = [t('Mağaza'), t('Atölyeler'), t('Günlük'), t('Ziyaret')];
  return html`<div class="ly-f f0"><span class="pl-top"><b>${t('Clay · Planlama')}</b><span class="pl-av"><i class="c-design">D</i><i class="c-code">C</i><i class="c-you">S</i></span></span>
<span class="pl-sec pl-goal"><b>${t('Hedefler')}</b></span>${goals.map(([c, s, who]) => html`<span class="pl-st ${c}">${s}<i>${who}</i></span>`)}
<span class="pl-sec pl-map"><b>${t('Site haritası')}</b></span><svg class="pl-wire" viewBox="0 0 480 300"><path d="M326 66V76H218V86M326 76H286V86M326 76H356V86M326 76H426V86"/></svg><span class="pl-nd n0">${t('Ana sayfa')}</span>${pages.map((p, i) => html`<span class="pl-nd n${i + 1}">${p}</span>`)}
<span class="pl-sec pl-cal"><b>${t('Takvim')}</b><span class="pl-wk">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => html`<i>${n}</i>`)}</span></span>${names.map((n, i) => html`<span class="pl-row r${i}"><em>${n}</em><i></i></span>`)}<i class="pl-now"></i>
<span class="pl-doc"><b>brief.pdf</b><i></i><i></i><i></i><i></i><i></i><small>v2</small></span>
<span class="pl-q"><b>“${t('Sitemiz atölyemiz kadar sıcak olsun.')}”</b><small>${t('Selin · kurucu')}</small></span>
<span class="pl-pin"><i>D</i><span>${t('İlk sunum 2. haftada')}</span></span>
<span class="pl-cur">${raw(CURSOR)}<b lang="en">design</b></span>
</div>`;
}

/* ---------------- 1 · sketch ---------------- */

/** A spiral sketchbook: the page in pencil · two variations (the second one picked) · the phone · a pencil. */
function sketch(ctx: Ctx): Safe {
  const { t } = ctx;
  const r = seeded(7);
  const pencil = [
    // the page
    box(r, 34, 20, 284, 180),
    'M44 34c4-10 9-10 9 0s7 9 10 0 7-9 10 0',
    [214, 238, 262, 286].map((x) => stroke(r, x, 34, x + 18, 34, 1)).join(''),
    stroke(r, 34, 46, 318, 46),
    scribble(r, 46, 96, [104, 82], 8),
    box(r, 46, 118, 54, 16),
    crossed(r, 178, 58, 128, 82),
    crossed(r, 46, 154, 80, 36),
    crossed(r, 134, 154, 80, 36),
    crossed(r, 222, 154, 84, 36),
    // variation A (a centred page · turned down)
    box(r, 336, 22, 128, 70),
    scribble(r, 370, 34, [60], 0),
    crossed(r, 352, 44, 96, 40),
    // variation B (text left · picture right · the one we keep)
    box(r, 336, 112, 128, 70),
    scribble(r, 346, 126, [40, 30], 7),
    box(r, 346, 146, 22, 8),
    crossed(r, 400, 120, 56, 52),
    // the phone
    'M352 206h44a6 6 0 0 1 6 6v66a6 6 0 0 1-6 6h-44a6 6 0 0 1-6-6v-66a6 6 0 0 1 6-6z',
    crossed(r, 354, 220, 40, 26),
    scribble(r, 354, 254, [34, 24], 6),
    box(r, 354, 268, 22, 8),
  ];
  const heavy = scribble(r, 46, 66, [112, 84], 14);
  const blue = [
    // the button circled · an arrow from its note
    'M42 126c0-22 64-23 64-2s-62 20-62 2',
    'M138 128c-8-2-16-2-24 0',
    'M120 123l-6 5 6 4',
    // A turned down
    'M340 26l120 62M460 26l-120 62',
    // B circled
    'M332 146c0-40 140-42 140-2s-138 38-138 2',
  ];
  return html`<div class="ly-f f1"><i class="sk-ring"></i><svg viewBox="0 0 480 300"><path class="ly-pen" d="${pencil.join('')}"/><path class="ly-pen hv" d="${heavy}"/>${blue.map((d) => html`<path class="ly-bp" pathLength="1" d="${d}"/>`)}<text class="ly-hand" x="142" y="131">${t('tek buton')}</text><text class="ly-hand" x="180" y="54">${t('büyük foto')}</text><text class="ly-hand sm" x="336" y="16">A</text><text class="ly-hand sm" x="336" y="106">B</text><text class="ly-hand" x="420" y="196">${t('bu')}</text><text class="ly-hand sm" x="410" y="226">${t('mobil')}</text><g class="sk-pencil"><path class="p1" d="M60 270L196 226l4 12L64 282z"/><path class="p2" d="M60 270l4 12-14-2z"/><path class="p3" d="M50 280l3-5 3 4z"/><path class="p4" d="M196 226l10-3 4 12-10 3z"/><path class="p5" d="M206 223l8-2a4 4 0 0 1 4 12l-8 2z"/></g></svg></div>`;
}

/* ---------------- 2 · prototype ---------------- */

/** The prototype view of a design tool: three phone frames · noodles · the interaction panel. */
const PROTO = raw(`<div class="ly-f f2" lang="en"><span class="pr-bar"><i class="pr-logo"></i><i class="pr-tool on"></i><i class="pr-tool"></i><i class="pr-tool"></i><i class="pr-tool"></i><b>Clay / Site</b><span class="pr-av"><i class="c-design">D</i><i class="c-motion">M</i></span><span class="pr-play">▶</span><span class="pr-share">Share</span></span>
<span class="pr-fn f-a">Home</span><span class="pr-flow">▶ Flow 1</span><span class="pr-fn f-b">Product</span><span class="pr-fn f-c">Bag</span>
<svg class="pr-cv" viewBox="0 0 480 300"><g class="ph"><rect x="18" y="48" width="96" height="190" rx="11"/><rect x="134" y="48" width="96" height="190" rx="11"/><rect x="250" y="48" width="96" height="190" rx="11"/></g>
<g class="w1"><rect x="26" y="62" width="22" height="5" rx="2"/><rect x="142" y="62" width="10" height="5" rx="2"/><rect x="258" y="64" width="34" height="6" rx="2"/></g>
<g class="w4"><circle cx="103" cy="64.5" r="3.5"/><circle cx="219" cy="64.5" r="3.5"/><rect x="26" y="76" width="80" height="56" rx="4"/><rect x="142" y="74" width="80" height="72" rx="4"/><rect x="258" y="80" width="22" height="22" rx="3"/><rect x="258" y="108" width="22" height="22" rx="3"/><rect x="26" y="198" width="38" height="30" rx="3"/><rect x="68" y="198" width="38" height="30" rx="3"/></g>
<g class="w5"><path d="M38 124l14-16 10 10 7-7 13 13zM154 136l18-22 12 13 8-8 18 17z"/><circle cx="92" cy="90" r="5"/><circle cx="206" cy="88" r="6"/></g>
<g class="w1"><rect x="26" y="140" width="62" height="6" rx="2"/><rect x="142" y="154" width="54" height="6" rx="2"/><rect x="286" y="82" width="40" height="4" rx="2"/><rect x="286" y="110" width="34" height="4" rx="2"/><rect x="258" y="150" width="30" height="5" rx="2"/><rect x="306" y="150" width="32" height="5" rx="2"/></g>
<g class="w2"><rect x="26" y="150" width="44" height="6" rx="2"/><rect x="26" y="162" width="76" height="3" rx="1.5"/><rect x="26" y="168" width="64" height="3" rx="1.5"/><rect x="142" y="164" width="24" height="5" rx="2"/><rect x="142" y="208" width="76" height="3" rx="1.5"/><rect x="142" y="214" width="66" height="3" rx="1.5"/><rect x="142" y="220" width="70" height="3" rx="1.5"/><rect x="286" y="90" width="28" height="3" rx="1.5"/><rect x="286" y="118" width="24" height="3" rx="1.5"/><path d="M258 140h80"/></g>
<g class="w6"><circle cx="146" cy="178" r="3"/><circle cx="156" cy="178" r="3"/><circle cx="166" cy="178" r="3"/></g>
<rect class="whs" x="22" y="176" width="48" height="20" rx="10"/><rect class="wb" x="26" y="180" width="40" height="12" rx="6"/><rect class="wd" x="142" y="188" width="80" height="14" rx="7"/><rect class="wd" x="258" y="216" width="80" height="14" rx="7"/>
<path class="wn" pathLength="1" d="M66 186C100 186 104 142 132 142"/><path class="wn n2" pathLength="1" d="M222 195C240 195 234 142 248 142"/><path class="wa" d="M127 138l5 4-5 4M243 138l5 4-5 4"/><circle class="wk" cx="66" cy="186" r="3"/><circle class="wk" cx="222" cy="195" r="3"/>
<rect class="wsel" x="18" y="48" width="96" height="190" rx="11"/>
<path class="wp" d="M50 186v-9a2.5 2.5 0 0 1 5 0v6l1-3a2.2 2.2 0 0 1 4 1l1-1.6a2.2 2.2 0 0 1 4 1.4l.6-.8a2 2 0 0 1 3.6 1.4v6c0 5-3 9-8 9h-3c-3 0-5-2-7-4l-4-5a2 2 0 0 1 3-2.6z"/></svg>
<span class="pr-pan"><span class="pr-tabs"><span>Design</span><b>Prototype</b></span><b class="pr-h">Interaction</b><span class="pr-f">On tap</span><span class="pr-f">Navigate to</span><span class="pr-f pr-to"><i></i>Product</span><b class="pr-h">Animation</b><span class="pr-f">Smart animate</span><span class="pr-f2"><span class="pr-f">Ease out</span><span class="pr-f">300 ms</span></span><svg class="pr-ease" viewBox="0 0 80 40"><path class="g" d="M4 36H76M4 4V36"/><path class="c" d="M4 36C16 6 40 4 76 4"/><circle cx="4" cy="36" r="2"/><circle cx="76" cy="4" r="2"/></svg><b class="pr-h">Flow starting point</b><span class="pr-f"><i class="pl"></i>Flow 1</span></span>
</div>`);

/* ---------------- 3 · build ---------------- */

/**
 * The hero's code · one line per entry · each token a class and its text (no commas: the brand rule
 * holds in the mocks too). `_layers.css` types each line in its own number of steps (`.k1`–`.k13` ·
 * --n is the line's length · a unit test keeps them equal).
 */
export const CODE: [string, string][][] = [
  [['kw', 'import'], ['', ' { '], ['tg', 'Button'], ['', ' } '], ['kw', 'from'], ['', ' '], ['st', "'./Button'"]],
  [['kw', 'import'], ['', ' cup '], ['kw', 'from'], ['', ' '], ['st', "'../img/cup.jpg'"]],
  [],
  [['kw', 'export function'], ['', ' '], ['fn', 'Hero'], ['', '() {']],
  [['', '  '], ['kw', 'return'], ['', ' (']],
  [['', '    <'], ['tg', 'section'], ['', ' '], ['at', 'className'], ['', '='], ['st', '"hero"'], ['', '>']],
  [['', '      <'], ['tg', 'h1'], ['', '>Everyday objects.</'], ['tg', 'h1'], ['', '>']],
  [['', '      <'], ['tg', 'p'], ['', '>Independent ceramics.</'], ['tg', 'p'], ['', '>']],
  [['', '      <'], ['tg', 'Button'], ['', ' '], ['at', 'href'], ['', '='], ['st', '"/shop"'], ['', '>Shop</'], ['tg', 'Button'], ['', '>']],
  [['', '      <'], ['tg', 'img'], ['', ' '], ['at', 'src'], ['', '={cup} '], ['at', 'alt'], ['', '='], ['st', '""'], ['', ' />']],
  [['', '    </'], ['tg', 'section'], ['', '>']],
  [['', '  )']],
  [['', '}']],
];

/** The terminal: a command typed after the code (`$` lines) · its answer fades in. */
export const TERM: [string, string][] = [
  ['$', 'npm test'],
  ['ok', '✓ 36 passed · 1.2 s'],
  ['$', 'npm run build'],
  ['ok', '✓ built in 1.8 s · 42 kB'],
  ['$', 'git push'],
  ['go', '→ preview ready · hero.clay.studio'],
];

const TREE: [string, string, number][] = [
  ['d', 'src', 0],
  ['d', 'components', 1],
  ['tsx on', 'Hero.tsx', 2],
  ['tsx', 'Button.tsx', 2],
  ['tsx', 'Nav.tsx', 2],
  ['d', 'pages', 1],
  ['tsx', 'index.tsx', 2],
  ['tsx', 'shop.tsx', 2],
  ['css', 'tokens.css', 1],
  ['json', 'package.json', 0],
  ['md', 'README.md', 0],
];

function build(board: string | undefined): Safe {
  // The caret waits after the last letter once the code is typed (it is typed with that line).
  const code = CODE.map((line, i) => `<span class="cl k${i + 1}">${line.map(([c, s]) => (c ? `<span class="${c}">${esc(s)}</span>` : esc(s))).join('')}${i === CODE.length - 1 ? '<i class="ide-caret"></i>' : ''}</span>`).join('');
  let cmd = 0;
  const term = TERM.map(([k, s]) => (k === '$' ? `<span class="tl tc c${++cmd}"><span class="pm">~/clay <span class="br">main</span> $</span> <span class="cl">${esc(s)}</span></span>` : `<span class="tl to o${cmd} ${k}">${esc(s)}</span>`)).join('');
  const preview = board
    ? `${crop(board, 'pv')}<span class="pv-copy">${crop(board, 'pvh')}<i></i><i></i><b>Shop</b></span>`
    : `<span class="pv-art">${VASES}</span><span class="pv-copy"><i></i><i></i><b>Shop</b></span>`;
  return raw(`<div class="ly-f f3" lang="en"><span class="ide-top"><i></i><i></i><i></i><b>clay — Hero.tsx</b></span><span class="ide-act"><i class="on"></i><i></i><i></i><i></i></span>
<span class="ide-tree"><b>Explorer</b>${TREE.map(([k, s, d]) => `<span class="tr ${k} d${d}"><i></i>${s}</span>`).join('')}</span>
<span class="ide-ed"><span class="ide-tabs"><b><i></i>Hero.tsx</b><span><i></i>tokens.css</span></span><span class="ide-crumb">src › components › Hero.tsx</span><span class="ide-ln">${CODE.map((_, i) => `<i>${i + 1}</i>`).join('')}</span><span class="ide-src">${code}</span></span>
<span class="ide-pv"><span class="pv-bar"><i></i>localhost:4321</span><span class="pv-sk"><i></i><i></i><i></i></span><span class="pv-live">${preview}</span><span class="pv-ok">Updated · 84 ms</span></span>
<span class="ide-term"><span class="it-tabs"><b>Terminal</b><span>Problems</span><span>Output</span></span>${term}</span>
<span class="ide-bar"><span>⎇ main</span><span>✓ 0 problems</span><span class="r">TypeScript</span><span>Ln 10 Col 24</span></span></div>`);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- 4 · launch ---------------- */

/** Clay's homepage drawn (the launch sheet's fallback while the board photo is missing). */
const DRAWN_SITE = `<div class="ly-site" lang="en"><div class="cs-nav"><b class="cs-logo">clay</b><span class="cs-links"><span>Shop</span><span>Objects</span><span>Studio</span><span>Journal</span></span><span class="cs-bag">Bag · 2</span></div><div class="cs-hero"><div class="cs-copy"><span class="cs-k">Objects for everyday rituals</span><b class="cs-h">Everyday objects.<br>Lasting rituals.</b><span class="cs-p">Independent ceramics thrown and glazed in Kadıköy.</span><span class="cs-cta"><b>Shop the studio</b><span>Visit us</span></span></div><div class="cs-art">${VASES}</div></div></div>`;

/** Clay's homepage with the board's photos and type. */
function site(board: string): string {
  const tiles: [CropName, string, string][] = [
    ['t1', 'Everyday cup', '₺640'],
    ['t2', 'Gift box', '₺980'],
    ['t3', 'Glaze samples', '₺220'],
    ['t4', 'Gift card', '₺500'],
  ];
  return `<div class="ws" lang="en"><span class="ws-ann">Free shipping in Türkiye over ₺1500 · Batch 015 is out</span><span class="ws-nav">${crop(board, 'logo')}<span class="ws-links"><b>Shop</b><span>Objects</span><span>Studio</span><span>Journal</span></span><span class="ws-ic"><span>Search</span><span>Account</span><b>Bag (2)</b></span></span><span class="ws-hero"><span class="ws-copy"><span class="ws-k">Objects for everyday rituals</span>${crop(board, 'head')}<span class="ws-p">Independent ceramics thrown and glazed in Kadıköy. Made to be used.</span><span class="ws-cta"><b>Shop the studio</b><span>Visit us →</span></span></span>${crop(board, 'hero')}</span><span class="ws-row">${tiles.map(([c, n, p]) => `<span class="ws-t">${crop(board, c)}<span><b>${n}</b><small>${p}</small></span></span>`).join('')}</span></div>`;
}

/** 4 · launch: live in a browser · numbers rise from it like pins. */
function launch(ctx: Ctx, board: string | undefined): Safe {
  const { t } = ctx;
  const pins: [string, string][] = [
    ['p1', 'Lighthouse 100'],
    ['p2', t('800 ms yükleme')],
    ['p3', t('Sipariş +%38')],
  ];
  return html`<div class="ly-f f4${board ? ' photo' : ''}"><span class="ly-chr"><i></i><i></i><i></i><span class="ly-nav">‹ ›</span><span class="ly-url">clay.studio</span><span class="ly-live mono">${t('Yayında')}</span></span>${raw(board ? site(board) : DRAWN_SITE)}</div>${pins.map(([c, s]) => html`<span class="ly-pin ${c}"><span><b${c === 'p1' ? html` lang="en"` : ''}>${s}</b></span></span>`)}`;
}

/**
 * The five sheets' faces (and the pins of the last one) in order from the bottom. `names` are the
 * steps' own names (the calendar on the plan) · `pic` finds the brand board (the photo slot).
 */
export function layerArt(ctx: Ctx, names: string[], pic: Pic = () => undefined): Safe[] {
  const board = pic('id-board');
  return [plan(ctx, names), sketch(ctx), PROTO, build(board), launch(ctx, board)];
}
