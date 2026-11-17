import { html, raw, type Safe } from '../../html';
import type { Ctx } from '../../page';

/**
 * 05 · Process: the five sheets of one real project (Clay's website) from the bottom up · drawn
 * flat at 480 × 300 and laid in an isometric stack by CSS (home.css · `.ly`). All decorative: the
 * annotations beside the stack say everything in words.
 *
 *   0 · listen     a research wall · notes · a quote · a photo · the brief
 *   1 · sketch     pencil on paper · two notes in blue pencil
 *   2 · prototype  a grey wireframe · a hotspot · a noodle to the product · the pointer
 *   3 · build      the design in colour with the developer's overlay (grid · redlines · a selection · code)
 *   4 · launch     the same page live in a browser · three numbers rise from it
 *
 * Clay's site speaks English like the other mocks (`lang="en"`) · our own notes speak the page's language.
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

const VASES = `<svg class="ly-vs" viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet"><path d="M52 252 Q30 200 50 160 Q60 140 58 110 L74 110 Q72 140 82 160 Q102 200 80 252 Z" fill="#C8643B"/><path d="M128 160 L152 160 L150 180 L130 180 Z" fill="#1E5B5A"/><path d="M112 252 Q96 252 96 222 Q96 180 140 178 Q184 180 184 222 Q184 252 168 252 Z" fill="#1E5B5A"/><path d="M190 252 Q182 230 194 214 L198 200 L210 200 L214 214 Q226 230 218 252 Z" fill="#E0A54A"/><rect x="20" y="252" width="210" height="5" fill="#B9A893"/></svg>`;

/** 0 · listen: what we heard pinned to a wall. */
function listen(ctx: Ctx): Safe {
  const { t } = ctx;
  const notes: [string, string][] = [
    ['n1', t('Kim için?')],
    ['n2', t('Atölyeye gelen herkes')],
    ['n3', t('El yapımı hissettirmeli')],
    ['n4', t('Siparişler DM’den geliyor')],
  ];
  return html`<div class="ly-f f0"><span class="ly-lab mono">${t('Araştırma · Clay')}</span>
${notes.map(([c, s]) => html`<span class="ly-note ${c}"><i></i>${s}</span>`)}
<span class="ly-quote"><b>“${t('Sitemiz atölyemiz kadar sıcak olsun.')}”</b><small>${t('Selin · kurucu')}</small></span>
<span class="ly-pol">${raw(VASES)}<small class="mono">${t('atölye.jpg')}</small></span>
<span class="ly-doc"><b class="mono">brief.pdf</b><i></i><i></i><i></i><i></i></span>
<svg class="ly-ink" viewBox="0 0 480 300"><ellipse pathLength="1" cx="84" cy="190" rx="70" ry="50" transform="rotate(-4 84 190)"/><path pathLength="1" d="M282 112C236 118 196 132 156 152"/><path pathLength="1" d="M166 144L156 152L168 156"/></svg>
</div>`;
}

/** 1 · sketch: pencil on paper. */
function sketch(ctx: Ctx): Safe {
  const { t } = ctx;
  const r = seeded(7);
  const pencil = [
    box(r, 18, 16, 444, 268),
    // nav: a logo loop · four links side by side · the bag (a circle below)
    'M34 38c4-12 10-12 10 0s8 10 12 0 8-10 12 0',
    [262, 290, 318, 346].map((x) => stroke(r, x, 38, x + 20, 38, 1)).join(''),
    stroke(r, 18, 56, 462, 56),
    // hero copy (the headline is drawn heavy below)
    scribble(r, 34, 128, [150, 112], 10),
    box(r, 34, 156, 84, 24),
    // the picture
    crossed(r, 236, 74, 210, 126),
    // the shelf of products
    crossed(r, 34, 216, 124, 46),
    crossed(r, 176, 216, 124, 46),
    crossed(r, 318, 216, 128, 46),
  ];
  // Blue pencil: the button circled · an arrow from the note to it.
  const blue = ['M30 168c0-26 98-28 98-2s-96 24-96 2', 'M150 168c-6-2-12-2-18 0', 'M138 163l-6 5 6 4'];
  const heavy = scribble(r, 34, 86, [168, 128], 20);
  return html`<div class="ly-f f1"><svg viewBox="0 0 480 300"><path class="ly-pen" d="${pencil.join('')}"/><path class="ly-pen hv" d="${heavy}"/><circle class="ly-pen" cx="436" cy="38" r="6"/>${blue.map((d) => html`<path class="ly-bp" pathLength="1" d="${d}"/>`)}<text class="ly-hand" x="154" y="172">${t('tek buton')}</text><text class="ly-hand" x="238" y="69">${t('büyük foto')}</text></svg></div>`;
}

/** 2 · prototype: a grey wireframe you can click. */
const PROTO = raw(`<div class="ly-f f2"><svg viewBox="0 0 480 300"><rect class="w0" x="34" y="30" width="46" height="12" rx="3"/><rect class="w2" x="258" y="34" width="24" height="5" rx="2.5"/><rect class="w2" x="290" y="34" width="30" height="5" rx="2.5"/><rect class="w2" x="328" y="34" width="26" height="5" rx="2.5"/><rect class="w2" x="362" y="34" width="22" height="5" rx="2.5"/><rect class="w1" x="410" y="28" width="38" height="16" rx="8"/><path class="w3" d="M18 56H462"/><rect class="w1" x="34" y="74" width="172" height="15" rx="3"/><rect class="w1" x="34" y="95" width="128" height="15" rx="3"/><rect class="w2" x="34" y="122" width="160" height="6" rx="3"/><rect class="w2" x="34" y="133" width="118" height="6" rx="3"/><rect class="whs" x="30" y="152" width="100" height="34" rx="17"/><rect class="wb" x="36" y="157" width="88" height="24" rx="12"/><rect class="w2" x="140" y="166" width="48" height="6" rx="3"/><rect class="w4" x="236" y="70" width="210" height="130" rx="8"/><path class="w5" d="M262 182l38-46 26 30 18-20 34 36z"/><circle class="w5" cx="408" cy="104" r="12"/><g><rect class="w4" x="34" y="214" width="124" height="34" rx="6"/><rect class="w2" x="34" y="254" width="70" height="5" rx="2.5"/><rect class="w2" x="34" y="264" width="40" height="5" rx="2.5"/></g><g><rect class="wt" x="176" y="214" width="124" height="34" rx="6"/><rect class="w2" x="176" y="254" width="80" height="5" rx="2.5"/><rect class="w2" x="176" y="264" width="36" height="5" rx="2.5"/></g><g><rect class="w4" x="318" y="214" width="128" height="34" rx="6"/><rect class="w2" x="318" y="254" width="64" height="5" rx="2.5"/><rect class="w2" x="318" y="264" width="44" height="5" rx="2.5"/></g><path class="wn" pathLength="1" d="M130 169C196 169 232 176 238 208"/><path class="wa" d="M232 202l6 8 6-7"/><circle class="wk" cx="130" cy="169" r="3.5"/><path class="wp" d="M104 164v20l5-5 4 9 4-2-4-8h7z"/></svg></div>`);

/** Clay's homepage (the build sheet and the live one share it). */
const CLAY_SITE = raw(`<div class="ly-site" lang="en"><div class="cs-nav"><b class="cs-logo">Clay</b><span class="cs-links"><span>Shop</span><span>Workshops</span><span>Journal</span><span>Visit</span></span><span class="cs-bag">Bag · 2</span></div><div class="cs-hero"><div class="cs-copy"><span class="cs-k">Kadıköy · Istanbul</span><b class="cs-h">Made by hand.<br>Fired slow.</b><span class="cs-p">Bowls and cups and plates thrown in our studio by the sea.</span><span class="cs-cta"><b>Shop the kiln</b><span>Book a class</span></span></div><div class="cs-art">${VASES}<span class="cs-new">New · Ochre glaze</span></div></div><div class="cs-row"><span class="cs-i i1"><i></i><b>Sea bowl</b><small>₺480</small></span><span class="cs-i i2"><i></i><b>Morning cup</b><small>₺320</small></span><span class="cs-i i3"><i></i><b>Kiln plate</b><small>₺390</small></span><span class="cs-i i4"><i></i><b>Tall vase</b><small>₺650</small></span></div></div>`);

/** 3 · build: the design in colour · the developer's overlay on top. */
const BUILD = raw(`<div class="ly-f f3">${CLAY_SITE}<i class="ly-grid"></i><span class="ly-red r1"><b>32</b></span><span class="ly-red r2"><b>24</b></span><span class="ly-red r3"><b>48</b></span><span class="ly-sel"><i></i><i></i><i></i><i></i><b>Button · 96 × 28</b></span><span class="ly-code" lang="en"><span><em>&lt;Hero</em> <u>tone</u>=<s>"kiln"</s><em>&gt;</em></span><span>&nbsp;&nbsp;<em>&lt;Button</em> <u>to</u>=<s>"/shop"</s><em>/&gt;</em></span><span><em>&lt;/Hero&gt;</em></span></span></div>`);

/** 4 · launch: live in a browser · numbers rise from it like pins. */
function launch(ctx: Ctx): Safe {
  const { t } = ctx;
  const pins: [string, string][] = [
    ['p1', 'Lighthouse 100'],
    ['p2', t('800 ms yükleme')],
    ['p3', t('Sipariş +%38')],
  ];
  return html`<div class="ly-f f4"><span class="ly-chr"><i></i><i></i><i></i><span class="ly-url mono">clay.studio</span><span class="ly-live mono">${t('Yayında')}</span></span>${CLAY_SITE}</div>${pins.map(([c, s]) => html`<span class="ly-pin ${c}"><span><b${c === 'p1' ? html` lang="en"` : ''}>${s}</b></span></span>`)}`;
}

/** The five sheets' faces (and the pins of the last one) in order from the bottom. */
export function layerArt(ctx: Ctx): Safe[] {
  return [listen(ctx), sketch(ctx), PROTO, BUILD, launch(ctx)];
}
