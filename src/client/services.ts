/**
 * Services · the drawing board. Four tools: drag out a website frame · click to place a phone ·
 * draw a mark with the pen · draw a path and watch three dots ride it. The inspector follows the
 * tool in hand. The team draws one of each first. With reduced motion the board starts drawn.
 * Keyboard: picking a tool with the keyboard stamps one of its things on the board.
 * Below: one answer open at a time in the questions.
 */
import { getCrew, type Crew, type Name } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';

type Tool = 'web' | 'app' | 'identity' | 'motion';
interface Pt {
  x: number;
  y: number;
}
interface Item {
  id: number;
  k: Tool;
  x: number;
  y: number;
  w: number;
  h: number;
  pts: Pt[];
  done: boolean;
  t0: number;
  el: HTMLElement;
  lab: HTMLElement;
  path?: SVGPathElement;
}
interface Drawing {
  it: Item;
  by: 'me' | Name;
  sx: number;
  sy: number;
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const SHORT: Record<Tool, string> = { web: 'web', app: 'app', identity: 'id', motion: 'mo' };
const SVGNS = 'http://www.w3.org/2000/svg';
const MAX_ITEMS = 9;
const LOOP_MS = 2600;

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as { tools?: Record<Tool, { tag: string; hint: string }> };
const crew = getCrew();
const reduce = reducedMotion();

const board = $('[data-board]');
const stage = $('[data-stage]');
const insp = $('.insp');
const items: Item[] = [];
let tool: Tool = 'web';
let nid = 0;
let drawing: Drawing | null = null;
/** The visitor drew something: the demo steps aside. */
let userDrew = false;
let raf = 0;
/** The riders only ride while the board is on screen. */
let onScreen = true;

/* ---------------- tools and inspector ---------------- */

function setTool(k: Tool): void {
  tool = k;
  for (const b of $$<HTMLButtonElement>('[data-tool]')) {
    const on = b.dataset.tool === k;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  for (const ib of $$('[data-ib]')) ib.hidden = ib.dataset.ib !== k;
  if (stage) stage.className = stage.className.replace(/\bt-\w+/, `t-${SHORT[k]}`);
  const info = data.tools?.[k];
  const tag = $('[data-itag]');
  const hint = $('[data-hint]');
  if (info && tag) tag.textContent = info.tag;
  if (info && hint) hint.textContent = info.hint;
}

/* ---------------- geometry ---------------- */

/** The part of the stage you can draw on (the inspector covers the right side on wide screens). */
function area(): { w: number; h: number } {
  if (!stage) return { w: 0, h: 0 };
  const over = insp && getComputedStyle(insp).position === 'absolute';
  return { w: stage.clientWidth - (over && insp ? insp.offsetWidth + 40 : 0), h: stage.clientHeight };
}

function local(clientX: number, clientY: number): Pt {
  const b = stage!.getBoundingClientRect();
  return { x: clientX - b.left, y: clientY - b.top };
}

/** Smooth path through the points (quadratic curves between midpoints). */
function pathOf(pts: Pt[]): string {
  const f = (n: number) => n.toFixed(1);
  if (!pts.length) return '';
  let d = `M${f(pts[0]!.x)} ${f(pts[0]!.y)}`;
  if (pts.length < 3) return d + pts.slice(1).map((p) => `L${f(p.x)} ${f(p.y)}`).join('');
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    d += `Q${f(a.x)} ${f(a.y)} ${f((a.x + b.x) / 2)} ${f((a.y + b.y) / 2)}`;
  }
  const last = pts[pts.length - 1]!;
  return d + `L${f(last.x)} ${f(last.y)}`;
}

/* ---------------- items ---------------- */

const HANDLES = '<i class="h hc1"></i><i class="h hc2"></i><i class="h hc3"></i><i class="h hc4"></i>';

function make(k: Tool, p: Pt): Item {
  const el = document.createElement('div');
  const line = k === 'identity' || k === 'motion';
  el.className = `it k-${SHORT[k]}${line ? ' k-line' : ''}`;
  if (k === 'web') el.innerHTML = '<span class="wb"><span class="bar"><i></i><i></i><i></i></span><span class="nv"><i></i><em></em></span><span class="hh"></span><span class="bt"></span><span class="im"></span></span>';
  if (k === 'app') {
    el.innerHTML = '<span class="ps"><span class="nt"></span><b></b><span class="cd c1"></span><span class="cd c2"></span><span class="cd c3"></span><span class="tbar"></span></span>';
    el.querySelector('b')!.textContent = t('Merhaba');
  }
  let path: SVGPathElement | undefined;
  if (line) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    path = document.createElementNS(SVGNS, 'path');
    svg.append(path);
    el.append(svg);
  }
  const lab = document.createElement('span');
  lab.className = 'lab mono';
  el.append(lab);
  if (!line) el.insertAdjacentHTML('beforeend', HANDLES);
  const it: Item = { id: ++nid, k, x: p.x, y: p.y, w: 0, h: 0, pts: [p], done: false, t0: 0, el, lab, path };
  if (k === 'app') {
    const s = phoneScale();
    Object.assign(it, { w: 150 * s, h: 300 * s, x: p.x - 75 * s, y: p.y - 150 * s });
  }
  return it;
}

/** Phones shrink a little on small boards. */
function phoneScale(): number {
  const a = area();
  return Math.max(0.6, Math.min(1, a.w / 700, a.h / 500));
}

function label(it: Item): string {
  if (it.k === 'web') return t('Web sitesi · {w} × {h}', { w: Math.round(it.w * 2), h: Math.round(it.h * 2) });
  if (it.k === 'app') return t('Uygulama · 390 × 844');
  if (it.k === 'identity') return it.done ? t('İşaret · 5 çapa') : t('İşaret · çiziliyor');
  return t('Yol · 2.6 sn · yavaş başla yavaş bitir');
}

function render(it: Item): void {
  const s = it.el.style;
  if (it.path) {
    it.path.setAttribute('d', pathOf(it.pts));
    const p0 = it.pts[0]!;
    it.lab.style.left = `${(p0.x - 6).toFixed(1)}px`;
    it.lab.style.top = `${(p0.y - 34).toFixed(1)}px`;
  } else {
    s.left = `${it.x.toFixed(1)}px`;
    s.top = `${it.y.toFixed(1)}px`;
    s.width = `${it.w.toFixed(1)}px`;
    s.height = `${it.h.toFixed(1)}px`;
  }
  it.el.classList.toggle('done', it.done);
  it.lab.textContent = label(it);
}

function select(it: Item | null): void {
  for (const x of items) x.el.classList.toggle('sel', x === it);
}

function sync(): void {
  $('[data-empty]')?.classList.toggle('off', items.length > 0);
  select(items[items.length - 1] ?? null);
  if (items.some((x) => x.k === 'motion' && x.done)) loop();
}

function add(it: Item): void {
  items.push(it);
  stage?.append(it.el);
  while (items.length > MAX_ITEMS) items.shift()?.el.remove();
  render(it);
  sync();
}

function begin(k: Tool, p: Pt, by: Drawing['by']): void {
  if (drawing) end();
  const it = make(k, p);
  drawing = { it, by, sx: p.x, sy: p.y };
  add(it);
}

function extend(p: Pt): void {
  const d = drawing;
  if (!d) return;
  const it = d.it;
  if (it.k === 'web') Object.assign(it, { x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
  else if (it.k === 'app') Object.assign(it, { x: p.x - it.w / 2, y: p.y - it.h / 2 });
  else {
    const last = it.pts[it.pts.length - 1]!;
    if (Math.hypot(p.x - last.x, p.y - last.y) > 5) it.pts.push(p);
  }
  render(it);
}

function end(): void {
  const d = drawing;
  if (!d) return;
  drawing = null;
  const it = d.it;
  const a = area();
  if (it.k === 'web' && (it.w < 70 || it.h < 46)) {
    const w = Math.min(320, a.w * 0.6);
    const h = Math.min(200, a.h * 0.4);
    Object.assign(it, { w, h, x: d.sx - w / 2, y: d.sy - h / 2 });
  }
  if (it.k === 'web' || it.k === 'app') {
    it.x = Math.max(12, Math.min(a.w - it.w - 12, it.x));
    it.y = Math.max(34, Math.min(a.h - it.h - 12, it.y));
  }
  if ((it.k === 'identity' || it.k === 'motion') && it.pts.length < 4) {
    const o = it.pts[0]!;
    const step = Math.min(30, (a.w - o.x - 20) / 6);
    it.pts = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: o.x + i * Math.max(12, step), y: o.y + Math.sin(i * 1.1) * 40 }));
  }
  it.done = true;
  if (it.path) finishLine(it);
  render(it);
  sync();
}

/** A finished line gets its anchors (the pen) or keyframes and riders (the path). */
function finishLine(it: Item): void {
  it.t0 = performance.now();
  const n = it.pts.length;
  const pick = it.k === 'identity' ? 5 : 2;
  for (let i = 0; i < pick; i++) {
    const p = it.pts[Math.round((i * (n - 1)) / (pick - 1))]!;
    const a = document.createElement('i');
    a.className = it.k === 'motion' ? 'kf' : 'anc';
    a.style.left = `${p.x.toFixed(1)}px`;
    a.style.top = `${p.y.toFixed(1)}px`;
    a.style.transitionDelay = `${(i * 0.07).toFixed(2)}s`;
    it.el.append(a);
  }
  if (it.k === 'motion') {
    for (const g of [2, 1, 0]) {
      const dot = document.createElement('i');
      dot.className = `mdot${g ? ' g' : ''}`;
      dot.dataset.g = String(g);
      it.el.append(dot);
    }
  }
}

/* ---------------- every frame: follow a drawing teammate · move the riders ---------------- */

function frame(now: number): void {
  raf = 0;
  let again = false;
  const d = drawing;
  if (d && d.by !== 'me') {
    const tip = crew?.tip(d.by);
    if (tip) extend(local(tip.x, tip.y));
    again = true;
  }
  for (const it of items) {
    if (it.k !== 'motion' || !it.done || !it.path) continue;
    const len = it.path.getTotalLength();
    if (!len) continue;
    for (const dot of $$('.mdot', it.el)) {
      let q = 1;
      if (!reduce) {
        const lag = Number(dot.dataset.g) * 70;
        q = ((now - it.t0 - lag) % LOOP_MS) / LOOP_MS;
        if (q < 0) q += 1;
        q = Math.min(1, q / 0.78);
        q = q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2;
      }
      const p = it.path.getPointAtLength(q * len);
      dot.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
    }
    if (!reduce && onScreen) again = true;
  }
  if (again) raf = requestAnimationFrame(frame);
}

function loop(): void {
  if (!raf) raf = requestAnimationFrame(frame);
}

if (board) {
  new IntersectionObserver(([en]) => {
    onScreen = !!en?.isIntersecting;
    if (onScreen) loop();
  }).observe(board);
}

/* ---------------- the visitor draws ---------------- */

function stepAside(): void {
  if (userDrew) return;
  userDrew = true;
  if (drawing && drawing.by !== 'me') end();
  if (crew?.current === 'hero') for (const n of ['design', 'code', 'motion'] as Name[]) crew.home(n);
}

if (stage) {
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stepAside();
    stage.setPointerCapture(e.pointerId);
    begin(tool, local(e.clientX, e.clientY), 'me');
  });
  stage.addEventListener('pointermove', (e) => {
    if (drawing?.by === 'me') extend(local(e.clientX, e.clientY));
  });
  const up = () => {
    if (drawing?.by === 'me') end();
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
}

/** Keyboard users stamp one thing per press: a frame · a phone · a mark · a path. */
function stamp(k: Tool): void {
  stepAside();
  const a = area();
  const jitter = (items.length % 4) * 0.06;
  const x = a.w * (0.18 + jitter);
  const y = a.h * (0.3 + jitter);
  begin(k, { x, y }, 'me');
  if (k === 'web') extend({ x: x + a.w * 0.34, y: y + a.h * 0.4 });
  if (k === 'identity' || k === 'motion') for (let i = 1; i < 8; i++) extend({ x: x + i * a.w * 0.04, y: y + Math.sin(i * 0.9) * a.h * 0.12 });
  end();
}

for (const b of $$<HTMLButtonElement>('[data-tool]')) {
  b.addEventListener('click', (e) => {
    const k = b.dataset.tool as Tool;
    // The visitor took a tool: the demo steps aside.
    stepAside();
    setTool(k);
    // detail is 0 when the click came from the keyboard.
    if (e.detail === 0) stamp(k);
  });
}
$('[data-undo]')?.addEventListener('click', () => {
  items.pop()?.el.remove();
  sync();
});
$('[data-clear]')?.addEventListener('click', () => {
  for (const it of items.splice(0)) it.el.remove();
  sync();
});

/* ---------------- reduced motion: the board starts drawn ---------------- */

const WEB: [Pt, Pt] = [{ x: 90, y: 70 }, { x: 500, y: 330 }];
const APP: Pt = { x: 640, y: 230 };
const PATH: Pt[] = [[770, 410], [800, 360], [845, 320], [850, 270], [822, 225], [835, 165], [885, 128], [945, 110]].map(([x, y]) => ({ x: x!, y: y! }));

/** The demo was drawn for a 980 × 536 board: scale it to this one. */
function fit(p: Pt): Pt {
  const a = area();
  return { x: (p.x / 980) * a.w, y: (p.y / 536) * a.h };
}

function seed(): void {
  begin('web', fit(WEB[0]), 'me');
  extend(fit(WEB[1]));
  end();
  begin('app', fit(APP), 'me');
  end();
  begin('motion', fit(PATH[0]!), 'me');
  for (const p of PATH.slice(1)) extend(fit(p));
  end();
  setTool('identity');
}

if (board && reduce) seed();

/* ---------------- the team draws one of each ---------------- */

async function useTool(c: Crew, n: Name, k: Tool, signal: AbortSignal): Promise<void> {
  await c.go(n, { sel: `[data-tool="${k}"]`, fx: 0.55, fy: 0.62 }, signal);
  if (userDrew) return;
  c.press(n);
  setTool(k);
  await c.sleep(420, signal);
}

/** A teammate draws: begin where it stands · aim through the points · the frame loop follows its tip. */
async function drawBy(c: Crew, n: Name, k: Tool, pts: Pt[], signal: AbortSignal): Promise<void> {
  if (userDrew) return;
  const at = (p: Pt) => ({ el: stage, fx: 0, fy: 0, dx: p.x - 3, dy: p.y - 2 });
  try {
    await c.go(n, at(pts[0]!), signal);
    if (userDrew) return;
    c.press(n);
    begin(k, pts[0]!, n);
    loop();
    if (k === 'app') {
      await c.sleep(260, signal);
      return;
    }
    for (const p of pts.slice(1)) {
      c.aim(n, at(p));
      await c.sleep(k === 'web' ? 60 : 210, signal);
    }
    await c.go(n, at(pts[pts.length - 1]!), signal, 2400);
    await c.sleep(160, signal);
  } finally {
    if (drawing?.by === n) end();
  }
}

crew?.addScenes({
  hero: async (c, signal) => {
    if (userDrew || reduce || items.length) return;
    await c.sleep(1800, signal);
    if (userDrew) return;
    await useTool(c, 'design', 'web', signal);
    await drawBy(c, 'design', 'web', WEB.map(fit), signal);
    if (userDrew) return;
    c.say('design', t('bir web sitesi'), 1700);
    c.home('design');
    await c.sleep(1000, signal);
    await useTool(c, 'code', 'app', signal);
    await drawBy(c, 'code', 'app', [fit(APP)], signal);
    if (userDrew) return;
    c.say('code', t('bir uygulama'), 1600);
    c.home('code');
    await c.sleep(1000, signal);
    await useTool(c, 'motion', 'motion', signal);
    await drawBy(c, 'motion', 'motion', PATH.map(fit), signal);
    if (userDrew) return;
    c.say('motion', t('ve hareket ediyor'), 1700);
    c.home('motion');
    await c.sleep(1500, signal);
    await useTool(c, 'design', 'identity', signal);
    c.say('design', t('sıra sende. kalemi dene'), 2800);
    await c.sleep(3000, signal);
    c.home('design');
  },
  tools: async (c, signal) => {
    await c.sleep(1400, signal);
    c.once('t1', c.hostOf('tools'), t('bir kartın üstüne gel'), 2200);
  },
});

/* ---------------- fair questions ---------------- */

const qs = $$('.q');
for (const q of qs) {
  const b = $<HTMLButtonElement>('.qb', q);
  b?.addEventListener('click', () => {
    const open = !q.classList.contains('open');
    for (const o of qs) {
      const on = o === q && open;
      o.classList.toggle('open', on);
      $('.qb', o)?.setAttribute('aria-expanded', String(on));
    }
  });
}
