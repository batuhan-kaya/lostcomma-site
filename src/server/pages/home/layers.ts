import { html, raw, type Safe } from '../../html';
import type { Ctx } from '../../page';
import type { Pic } from './pictures';

/**
 * 05 · Process: the five sheets of one real project from the bottom up: fonra's website (a sound and
 * motion studio · the homepage Batuhan sent is the launch sheet). Drawn flat at 480 × 300 and laid in
 * an isometric stack by CSS (`_layers.css` · `.ly`). All decorative: the notes beside the stack say
 * everything in words.
 *
 *   0 · plan       a planning board: goals · the sitemap · the ten weeks · a quote · a mood board · the brief
 *   1 · sketch     a spiral sketchbook: the page in pencil · two variations (one picked) · the phone · a pencil
 *   2 · prototype  a design tool's prototype view: three dark phone frames · dragging the ruler changes the
 *                  wave (a variant at 330 Hz · spring) · the studio page · the interaction panel
 *   3 · build      an editor: the hero's code types itself · the preview reloads · the terminal runs the tests
 *   4 · launch     the live homepage in a browser (photo slot `ly-launch`) · numbers rise from it
 *
 * The launch photo is one lazy file: the launch sheet · the build preview and the plan's mood board show
 * it. Without it the launch sheet keeps a drawn page. fonra's site speaks Turkish (its own words
 * · `lang="tr"`) · the tools speak English (`lang="en"`) · our own notes speak the page's language.
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

const photo = (src: string) => `<img src="${src}" alt="" decoding="async" loading="lazy" draggable="false">`;

/** The drawn wave (the launch sheet and the preview without the photo): rings turned a little each. */
const RINGS = `<svg class="ly-rings" viewBox="0 0 200 200">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<ellipse cx="100" cy="100" rx="${84 - i * 6}" ry="${52 - i * 2}" transform="rotate(${-28 + i * 9} 100 100)"/>`).join('')}</svg>`;

const CURSOR = '<svg viewBox="0 0 12 14"><path d="M1 1v11l3-3 2.2 4.4 1.8-.9L5.8 8H10z"/></svg>';

/* ---------------- 0 · plan ---------------- */

/** A planning board: goals · the sitemap · the ten weeks (the steps' own names) · a quote · a mood board · the brief. */
function plan(ctx: Ctx, names: string[], shot: string | undefined): Safe {
  const { t } = ctx;
  const goals: [string, string, string][] = [
    ['s1', t('Sesi görünür kıl'), 'S'],
    ['s2', t('Üç deneyle açılış'), 'D'],
    ['s3', t('Ses kapalı başlasın'), 'C'],
  ];
  const pages = [t('Deneyler'), t('Stüdyo'), t('Arşiv'), t('İletişim')];
  return html`<div class="ly-f f0"><span class="pl-top"><b>${t('fonra · Planlama')}</b><span class="pl-av"><i class="c-design">D</i><i class="c-code">C</i><i class="c-you">S</i></span></span>
<span class="pl-sec pl-goal"><b>${t('Hedefler')}</b></span>${goals.map(([c, s, who]) => html`<span class="pl-st ${c}">${s}<i>${who}</i></span>`)}
<span class="pl-sec pl-map"><b>${t('Site haritası')}</b></span><svg class="pl-wire" viewBox="0 0 480 300"><path d="M326 66V76H218V86M326 76H286V86M326 76H356V86M326 76H426V86"/></svg><span class="pl-nd n0">${t('Ana sayfa')}</span>${pages.map((p, i) => html`<span class="pl-nd n${i + 1}">${p}</span>`)}
<span class="pl-sec pl-cal"><b>${t('Takvim')}</b><span class="pl-wk">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => html`<i>${n}</i>`)}</span></span>${names.map((n, i) => html`<span class="pl-row r${i}"><em>${n}</em><i></i></span>`)}<i class="pl-now"></i>
<span class="pl-q"><b>“${t('Ziyaretçi sesi duymadan önce görsün.')}”</b><small>${t('Arda · kurucu')}</small></span>
<span class="pl-mood"><span class="pl-pic">${raw(shot ? photo(shot) : RINGS)}</span><span class="pl-sw"><i></i><i></i><i></i></span><small>${t('Ruh hali')}</small></span>
<span class="pl-doc"><b>brief.pdf</b><small>${t('6 sayfa')}</small></span>
<span class="pl-pin"><i>D</i><span>${t('İlk sunum 2. haftada')}</span></span>
<span class="pl-cur">${raw(CURSOR)}<b lang="en">design</b></span>
</div>`;
}

/* ---------------- 1 · sketch ---------------- */

/** fonra's homepage in pencil: the giant word · the wave · the second word · the ruler · two variations · the phone. */
function sketch(ctx: Ctx): Safe {
  const { t } = ctx;
  const r = seeded(11);
  // A block of giant type: its outline and a few hatches.
  const giant = (x: number, y: number, w: number, h: number) => box(r, x, y, w, h) + [0.2, 0.4, 0.6, 0.8].map((f) => stroke(r, x + w * f - 8, y + h - 3, x + w * f + 8, y + 3, 1)).join('');
  // The wave: a few turned loops (a ring drawn fast).
  const loops = (cx: number, cy: number, rx: number, ry: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (-30 + i * 14) * (Math.PI / 180);
      const k = 1 - i * 0.07;
      const dx = Math.cos(a) * rx * k;
      const dy = Math.sin(a) * rx * k;
      const ex = -Math.sin(a) * ry * k;
      const ey = Math.cos(a) * ry * k;
      const p = (u: number, v: number) => `${(cx + dx * u + ex * v + r() * 1.4).toFixed(1)} ${(cy + dy * u + ey * v + r() * 1.4).toFixed(1)}`;
      return `M${p(1, 0)}C${p(1, 0.55)} ${p(0.55, 1)} ${p(0, 1)}C${p(-0.55, 1)} ${p(-1, 0.55)} ${p(-1, 0)}C${p(-1, -0.55)} ${p(-0.55, -1)} ${p(0, -1)}C${p(0.55, -1)} ${p(1, -0.55)} ${p(1, 0)}`;
    }).join('');
  const ticks = Array.from({ length: 25 }, (_, i) => stroke(r, 78 + i * 7, i % 4 ? 182 : 179, 78 + i * 7, 186, 0.4)).join('');
  const pencil = [
    // the page
    box(r, 34, 20, 284, 180),
    'M44 34c3-9 7-9 7 0s6 8 8 0',
    'M136 30h56a4 4 0 0 1 0 8h-56a4 4 0 0 1 0-8z',
    [262, 282].map((x) => stroke(r, x, 34, x + 14, 34, 0.8)).join(''),
    stroke(r, 34, 46, 318, 46),
    stroke(r, 44, 54, 76, 54, 0.8),
    giant(44, 60, 120, 24),
    scribble(r, 44, 100, [58, 64, 50], 7),
    'M44 116h30a5 5 0 0 1 0 10h-30a5 5 0 0 1 0-10z',
    loops(198, 104, 52, 34, 6),
    giant(214, 136, 86, 26),
    stroke(r, 34, 172, 318, 172),
    stroke(r, 44, 182, 62, 182, 0.8),
    ticks,
    'M262 178a5 5 0 1 0 0.1 0zM282 178a5 5 0 1 0 0.1 0z',
    // variation A (centred · turned down)
    box(r, 336, 22, 128, 70),
    stroke(r, 360, 32, 440, 32, 1),
    loops(400, 64, 22, 14, 3),
    // variation B (the giant word left · the wave right · the one we keep)
    box(r, 336, 112, 128, 70),
    giant(344, 122, 50, 12),
    loops(424, 148, 24, 16, 4),
    giant(410, 164, 46, 10),
    // the phone
    'M352 206h44a6 6 0 0 1 6 6v66a6 6 0 0 1-6 6h-44a6 6 0 0 1-6-6v-66a6 6 0 0 1 6-6z',
    giant(354, 216, 40, 10),
    loops(374, 244, 16, 10, 3),
    stroke(r, 354, 272, 394, 272, 0.6),
  ];
  const blue = [
    // the button circled · the giant word and the wave pointed at
    'M38 121c0-14 46-14 46-1s-44 13-44 1',
    'M150 52c10-8 22-10 32-8',
    'M176 40l6 4-5 5',
    'M262 66c10 4 14 12 12 22',
    'M268 84l6 6 5-7',
    // A turned down · B circled
    'M340 26l120 62M460 26l-120 62',
    'M332 146c0-40 140-42 140-2s-138 38-138 2',
  ];
  return html`<div class="ly-f f1"><i class="sk-ring"></i><svg viewBox="0 0 480 300"><path class="ly-pen" d="${pencil.join('')}"/>${blue.map((d) => html`<path class="ly-bp" pathLength="1" d="${d}"/>`)}<text class="ly-hand" x="186" y="44">${t('dev başlık')}</text><text class="ly-hand" x="250" y="62">${t('sesle değişir')}</text><text class="ly-hand" x="92" y="212">${t('frekans cetveli')}</text><text class="ly-hand sm" x="336" y="16">A</text><text class="ly-hand sm" x="336" y="106">B</text><text class="ly-hand" x="420" y="196">${t('bu')}</text><text class="ly-hand sm" x="410" y="226">${t('mobil')}</text><g class="sk-pencil"><path class="p1" d="M140 280L276 236l4 12L144 292z"/><path class="p2" d="M140 280l4 12-14-2z"/><path class="p3" d="M130 290l3-5 3 4z"/><path class="p4" d="M276 236l10-3 4 12-10 3z"/><path class="p5" d="M286 233l8-2a4 4 0 0 1 4 12l-8 2z"/></g></svg></div>`;
}

/* ---------------- 2 · prototype ---------------- */

/** A dark phone screen of fonra in grey blocks: the giant word · the wave · the second word · the ruler with its knob at x. */
const phone = (x0: number, knob: number, turn: number) => {
  const ring = [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${x0 + 50}" cy="146" rx="${30 - i * 3}" ry="${18 - i}" transform="rotate(${turn + i * 12} ${x0 + 50} 146)"/>`).join('');
  return `<rect class="ph" x="${x0}" y="48" width="96" height="190" rx="11"/><g class="w1"><rect x="${x0 + 8}" y="62" width="18" height="5" rx="2"/><rect x="${x0 + 8}" y="84" width="74" height="16" rx="2"/><rect x="${x0 + 30}" y="178" width="58" height="13" rx="2"/></g><g class="w2"><rect x="${x0 + 60}" y="62" width="28" height="6" rx="3"/><rect x="${x0 + 8}" y="76" width="24" height="3" rx="1.5"/><rect x="${x0 + 8}" y="198" width="50" height="3" rx="1.5"/></g><g class="wr">${ring}</g><rect class="wl" x="${x0 + 8}" y="104" width="30" height="8" rx="4"/><path class="wt" d="M${x0 + 8} 220H${x0 + 88}"/><g class="wt">${Array.from({ length: 11 }, (_, i) => `<path d="M${x0 + 8 + i * 8} ${i % 5 ? 217 : 215}V220"/>`).join('')}</g><circle class="wk2" cx="${x0 + knob}" cy="220" r="3.5"/>`;
};

const PROTO = raw(`<div class="ly-f f2" lang="en"><span class="pr-bar"><i class="pr-logo"></i><i class="pr-tool on"></i><i class="pr-tool"></i><i class="pr-tool"></i><i class="pr-tool"></i><b>fonra / Site</b><span class="pr-av"><i class="c-design">D</i><i class="c-motion">M</i></span><span class="pr-play">▶</span><span class="pr-share">Share</span></span>
<span class="pr-fn f-a">Home · 220 Hz</span><span class="pr-flow">▶ Flow 1</span><span class="pr-fn f-b">Home · 330 Hz</span><span class="pr-fn f-c">Studio</span>
<svg class="pr-cv" viewBox="0 0 480 300">${phone(18, 40, -24)}${phone(134, 68, 6)}
<rect class="ph" x="250" y="48" width="96" height="190" rx="11"/><g class="w1"><rect x="258" y="62" width="18" height="5" rx="2"/><rect x="258" y="80" width="56" height="12" rx="2"/></g><g class="w2"><rect x="258" y="98" width="76" height="3" rx="1.5"/><rect x="258" y="104" width="64" height="3" rx="1.5"/><rect x="258" y="110" width="70" height="3" rx="1.5"/></g><rect class="w3" x="258" y="122" width="80" height="52" rx="3"/><g class="w4"><circle cx="266" cy="190" r="7"/><circle cx="284" cy="190" r="7"/><circle cx="302" cy="190" r="7"/><rect x="258" y="206" width="48" height="3" rx="1.5"/><rect x="258" y="212" width="36" height="3" rx="1.5"/></g>
<rect class="whs" x="50" y="211" width="16" height="18" rx="5"/>
<path class="wn" pathLength="1" d="M66 220C100 220 104 150 132 150"/><path class="wn n2" pathLength="1" d="M222 65C240 65 234 120 248 120"/><path class="wa" d="M127 146l5 4-5 4M243 116l5 4-5 4"/><circle class="wk" cx="66" cy="220" r="3"/><circle class="wk" cx="222" cy="65" r="3"/>
<rect class="wsel" x="18" y="48" width="96" height="190" rx="11"/>
<path class="wp" d="M54 221v-9a2.5 2.5 0 0 1 5 0v6l1-3a2.2 2.2 0 0 1 4 1l1-1.6a2.2 2.2 0 0 1 4 1.4l.6-.8a2 2 0 0 1 3.6 1.4v6c0 5-3 9-8 9h-3c-3 0-5-2-7-4l-4-5a2 2 0 0 1 3-2.6z"/></svg>
<span class="pr-pan"><span class="pr-tabs"><span>Design</span><b>Prototype</b></span><b class="pr-h">Interaction</b><span class="pr-f">While dragging</span><span class="pr-f">Change to</span><span class="pr-f pr-to"><i></i>330 Hz</span><b class="pr-h">Animation</b><span class="pr-f">Smart animate</span><span class="pr-f2"><span class="pr-f">Spring</span><span class="pr-f">600 ms</span></span><svg class="pr-ease" viewBox="0 0 80 40"><path class="g" d="M4 36H76M4 4V36"/><path class="c" d="M4 36C14 2 22 -2 32 8S48 14 56 9 70 6 76 7"/><circle cx="4" cy="36" r="2"/><circle cx="76" cy="7" r="2"/></svg><b class="pr-h">Flow starting point</b><span class="pr-f"><i class="pl"></i>Flow 1</span></span>
</div>`);

/* ---------------- 3 · build ---------------- */

/**
 * The hero's code · one line per entry · each token a class and its text (no commas: the brand rule
 * holds in the mocks too). `_layers.css` types each line in its own number of steps (`.k1`–`.k14` ·
 * --n is the line's length · a unit test keeps them equal).
 */
export const CODE: [string, string][][] = [
  [['kw', 'import'], ['', ' { '], ['tg', 'Wave'], ['', ' } '], ['kw', 'from'], ['', ' '], ['st', "'./Wave'"]],
  [['kw', 'import'], ['', ' { '], ['tg', 'Ruler'], ['', ' } '], ['kw', 'from'], ['', ' '], ['st', "'./Ruler'"]],
  [['kw', 'import'], ['', ' { '], ['fn', 'useHz'], ['', ' } '], ['kw', 'from'], ['', ' '], ['st', "'../audio'"]],
  [],
  [['kw', 'export function'], ['', ' '], ['fn', 'Hero'], ['', '() {']],
  [['', '  '], ['kw', 'const'], ['', ' hz = '], ['fn', 'useHz'], ['', '(220)']],
  [['', '  '], ['kw', 'return'], ['', ' (']],
  [['', '    <'], ['tg', 'section'], ['', ' '], ['at', 'className'], ['', '='], ['st', '"hero"'], ['', '>']],
  [['', '      <'], ['tg', 'h1'], ['', '>Frekansı hisset.</'], ['tg', 'h1'], ['', '>']],
  [['', '      <'], ['tg', 'Wave'], ['', ' '], ['at', 'hz'], ['', '={hz} '], ['at', 'lines'], ['', '={480} />']],
  [['', '      <'], ['tg', 'Ruler'], ['', ' '], ['at', 'from'], ['', '={110} '], ['at', 'to'], ['', '={440} />']],
  [['', '    </'], ['tg', 'section'], ['', '>']],
  [['', '  )']],
  [['', '}']],
];

/** The terminal: a command typed after the code (`$` lines) · its answer fades in. */
export const TERM: [string, string][] = [
  ['$', 'npm test'],
  ['ok', '✓ 42 passed · 1.4 s'],
  ['$', 'npm run build'],
  ['ok', '✓ built in 2.1 s · 58 kB'],
  ['$', 'git push'],
  ['go', '→ preview ready · fonra.studio'],
];

const TREE: [string, string, number][] = [
  ['d', 'src', 0],
  ['d', 'components', 1],
  ['tsx on', 'Hero.tsx', 2],
  ['tsx', 'Wave.tsx', 2],
  ['tsx', 'Ruler.tsx', 2],
  ['d', 'audio', 1],
  ['ts', 'index.ts', 2],
  ['d', 'pages', 1],
  ['tsx', 'deneyler.tsx', 2],
  ['css', 'tokens.css', 1],
  ['json', 'package.json', 0],
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function build(shot: string | undefined): Safe {
  // The caret waits after the last letter once the code is typed (it is typed with that line).
  const code = CODE.map((line, i) => `<span class="cl k${i + 1}">${line.map(([c, s]) => (c ? `<span class="${c}">${esc(s)}</span>` : esc(s))).join('')}${i === CODE.length - 1 ? '<i class="ide-caret"></i>' : ''}</span>`).join('');
  let cmd = 0;
  const term = TERM.map(([k, s]) => (k === '$' ? `<span class="tl tc c${++cmd}"><span class="pm">~/fonra <span class="br">main</span> $</span> <span class="cl">${esc(s)}</span></span>` : `<span class="tl to o${cmd} ${k}">${esc(s)}</span>`)).join('');
  return raw(`<div class="ly-f f3" lang="en"><span class="ide-top"><i></i><i></i><i></i><b>fonra — Hero.tsx</b></span><span class="ide-act"><i class="on"></i><i></i><i></i><i></i></span>
<span class="ide-tree"><b>Explorer</b>${TREE.map(([k, s, d]) => `<span class="tr ${k} d${d}"><i></i>${s}</span>`).join('')}</span>
<span class="ide-ed"><span class="ide-tabs"><b><i></i>Hero.tsx</b><span><i></i>Wave.tsx</span></span><span class="ide-crumb">src › components › Hero.tsx</span><span class="ide-ln">${CODE.map((_, i) => `<i>${i + 1}</i>`).join('')}</span><span class="ide-src">${code}</span></span>
<span class="ide-pv"><span class="pv-bar"><i></i>localhost:4321</span><span class="pv-sk"><i></i><i></i><i></i></span><span class="pv-live"><span class="pv-shot">${shot ? photo(shot) : RINGS}</span><span class="pv-props"><b>Wave</b><span>hz<i class="pv-sl"><i></i></i><em>220</em></span><span>lines<em>480</em></span><span>fps<em class="ok">60</em></span></span></span><span class="pv-ok">Updated · 84 ms</span></span>
<span class="ide-term"><span class="it-tabs"><b>Terminal</b><span>Problems</span><span>Output</span></span>${term}</span>
<span class="ide-bar"><span>⎇ main</span><span>✓ 0 problems</span><span class="r">TypeScript</span><span>Ln 10 Col 32</span></span></div>`);
}

/* ---------------- 4 · launch ---------------- */

/** fonra's homepage drawn (the launch sheet's fallback while its photo slot is empty). */
const DRAWN_SITE = `<div class="lw-drawn" lang="tr"><span class="lw-nav"><b>fonra</b><i></i></span><b class="lw-h">FREKANSI</b><span class="lw-p">Bir ses dalgası nasıl görünür?</span><i class="lw-cta"></i>${RINGS}<b class="lw-h2">HİSSET.</b><i class="lw-rule"></i></div>`;

/** 4 · launch: live in a browser · numbers rise from it like pins. */
function launch(ctx: Ctx, shot: string | undefined): Safe {
  const { t } = ctx;
  const pins: [string, string][] = [
    ['p1', 'Lighthouse 100'],
    ['p2', t('800 ms yükleme')],
    ['p3', t('Sitede kalma +%64')],
  ];
  return html`<div class="ly-f f4"><span class="ly-chr"><i></i><i></i><i></i><span class="ly-nav">‹ ›</span><span class="ly-url">fonra.studio</span><span class="ly-live mono">${t('Yayında')}</span></span><span class="lw">${raw(shot ? photo(shot) : DRAWN_SITE)}</span></div>${pins.map(([c, s]) => html`<span class="ly-pin ${c}"><span><b${c === 'p1' ? html` lang="en"` : ''}>${s}</b></span></span>`)}`;
}

/**
 * The five sheets' faces (and the pins of the last one) in order from the bottom. `names` are the
 * steps' own names (the calendar on the plan) · `pic` finds the launch photo (its slot).
 */
export function layerArt(ctx: Ctx, names: string[], pic: Pic = () => undefined): Safe[] {
  const shot = pic('ly-launch');
  return [plan(ctx, names, shot), sketch(ctx), PROTO, build(shot), launch(ctx, shot)];
}
