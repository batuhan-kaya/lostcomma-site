/**
 * Work · the Layers panel. Groups hide with their eye · the layer under the pointer pulls its frame
 * along on a spring · canvas view and A–Z sort · locked layers shake when knocked on.
 * Everything works from the markup: without JS the list is a plain list of links.
 */
import { getCrew, type Crew } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';

interface Layer {
  no: string;
  name: string;
  size: string;
  g: string;
}
interface WorkData {
  layers: Layer[];
  next: string;
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as WorkData;
const root = $('[data-root]')!;
const crew = getCrew();
const lang = document.documentElement.lang;

/* ---------------- groups · view · sort ---------------- */

const hidden = new Set<string>();
let view: 'layers' | 'canvas' = 'layers';
let touched = false;

const rowsEl = $('[data-rows]');
const gridEl = $('[data-grid]');
const colsEl = $('.cols');
const emptyEl = $('[data-empty]');
const countEl = $('[data-count]');
const visEl = $('[data-vis]');

function visible(): number {
  return data.layers.filter((l) => !hidden.has(l.g)).length;
}

function apply(): void {
  const n = visible();
  for (const row of $$('.row[data-g]')) {
    const off = hidden.has(row.dataset.g!);
    row.classList.toggle('off', off);
    row.inert = off;
  }
  for (const cell of $$('.cell[data-g]')) cell.classList.toggle('off', hidden.has(cell.dataset.g!));
  for (const b of $$('[data-gr]')) {
    const off = hidden.has(b.dataset.gr!);
    b.classList.toggle('off', off);
    b.setAttribute('aria-pressed', String(!off));
  }
  if (countEl && countEl.textContent !== String(n)) {
    countEl.textContent = String(n);
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
  }
  if (visEl) visEl.textContent = t('{n} görünür', { n });
  if (rowsEl) rowsEl.hidden = view !== 'layers' || n === 0;
  if (colsEl) colsEl.hidden = view !== 'layers' || n === 0;
  if (gridEl) gridEl.hidden = view !== 'canvas' || n === 0;
  if (emptyEl) emptyEl.hidden = n !== 0;
  if (view !== 'layers' || n === 0) hover(-1);
}

for (const b of $$('[data-gr]')) {
  b.addEventListener('click', () => {
    const g = b.dataset.gr!;
    if (hidden.has(g)) hidden.delete(g);
    else hidden.add(g);
    apply();
  });
}
$('[data-showall]')?.addEventListener('click', () => {
  hidden.clear();
  apply();
});

/** One pressed button in a segmented control. */
function press(attr: string, value: string): void {
  for (const b of $$(`[${attr}]`)) {
    const on = b.getAttribute(attr) === value;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

for (const b of $$('[data-view]')) {
  b.addEventListener('click', () => {
    view = b.dataset.view === 'canvas' ? 'canvas' : 'layers';
    press('data-view', view);
    apply();
  });
}

for (const b of $$('[data-sort]')) {
  b.addEventListener('click', () => {
    const az = b.dataset.sort === 'az';
    press('data-sort', az ? 'az' : 'new');
    const key = (el: HTMLElement) => Number(el.dataset.i);
    const name = (el: HTMLElement) => data.layers[key(el)]?.name ?? '';
    const order = (a: HTMLElement, b2: HTMLElement) => (az ? name(a).localeCompare(name(b2), lang) : key(a) - key(b2));
    for (const box of [rowsEl, gridEl]) {
      if (!box) continue;
      const items = $$<HTMLElement>(':scope > [data-i]', box).sort(order);
      box.append(...items);
    }
  });
}

/* ---------------- the frame that follows you ---------------- */

const pv = $('[data-pv]');
const pvNo = $('[data-pvno]');
const pvName = $('[data-pvname]');
const pvSize = $('[data-pvsize]');
const arts = $$('[data-pa]');
const reduce = reducedMotion();
let hov = -1;
let leaveTimer = 0;
/** Where the frame wants to be: the pointer · or a fixed point when a teammate or the keyboard picks a layer. */
const me = { x: 0, y: 0 };
let fixed: { x: number; y: number } | null = null;
let spring: { x: number; y: number; vx: number; vy: number } | null = null;
let raf = 0;

function local(clientX: number, clientY: number) {
  const r = root.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

function hover(i: number, at: { x: number; y: number } | null = null): void {
  window.clearTimeout(leaveTimer);
  fixed = at;
  if (i === hov && i >= 0) return;
  const was = hov;
  hov = i;
  for (const row of $$('.row[data-i]')) row.classList.toggle('hv', Number(row.dataset.i) === i);
  if (!pv) return;
  if (i < 0) {
    pv.classList.remove('on');
    spring = null;
    return;
  }
  const l = data.layers[i];
  if (pvNo) pvNo.textContent = l?.no ?? '';
  if (pvName) pvName.textContent = l?.name ?? '';
  if (pvSize) pvSize.textContent = l?.size ?? '';
  for (const a of arts) a.classList.toggle('on', Number(a.dataset.pa) === i);
  pv.classList.add('on');
  if (was < 0) spring = null;
  tick();
}

function tick(): void {
  cancelAnimationFrame(raf);
  if (!pv || hov < 0) return;
  const src = fixed ?? me;
  const tx = Math.min(src.x + 48, root.offsetWidth - 480);
  const ty = src.y - 170;
  if (!spring || reduce) spring = { x: tx, y: reduce ? ty : ty + 30, vx: 0, vy: 0 };
  const s = spring;
  s.vx = s.vx * 0.72 + (tx - s.x) * 0.1;
  s.vy = s.vy * 0.72 + (ty - s.y) * 0.1;
  s.x += s.vx;
  s.y += s.vy;
  const rot = reduce ? 0 : Math.max(-5, Math.min(5, s.vx * 0.3));
  pv.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
  if (Math.abs(s.vx) + Math.abs(s.vy) > 0.05 || Math.abs(tx - s.x) + Math.abs(ty - s.y) > 0.5) raf = requestAnimationFrame(tick);
}

root.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  Object.assign(me, local(e.clientX, e.clientY));
  if (hov >= 0 && !fixed) tick();
});

for (const row of $$('.row[data-i]')) {
  const i = Number(row.dataset.i);
  const a = $('.rw', row)!;
  a.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    touched = true;
    Object.assign(me, local(e.clientX, e.clientY));
    hover(i);
  });
  a.addEventListener('pointerleave', () => {
    leaveTimer = window.setTimeout(() => hov === i && hover(-1), 70);
  });
  // Keyboard: the frame sits beside the focused layer.
  a.addEventListener('focus', () => {
    if (!a.matches(':focus-visible')) return;
    const r = a.getBoundingClientRect();
    hover(i, local(r.right - 560, r.top + r.height / 2 + 40));
  });
  a.addEventListener('blur', () => hov === i && hover(-1));
}
window.addEventListener('scroll', () => fixed && hov >= 0 && hover(-1), { passive: true });

/* ---------------- locked layers ---------------- */

for (const b of $$('[data-knock]')) {
  let timer = 0;
  b.addEventListener('click', () => {
    b.classList.remove('kn');
    void b.offsetWidth;
    b.classList.add('kn');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => b.classList.remove('kn'), 2600);
    if (crew?.current === 'lock') crew.say(crew.hostOf('lock'), t('iyi deneme'), 1600);
  });
}

/* ---------------- the team ---------------- */

const apps = data.layers.filter((l) => l.g === 'app').length;

// Crew swallows the abort when the visitor scrolls to another section mid-scene.
crew?.addScenes({
  hero: async (c: Crew, signal) => {
    await c.sleep(3200, signal);
    c.once('h1', 'motion', t('{n} ve sayıyoruz', { n: data.layers.length }), 2400);
    await c.sleep(3600, signal);
    const g = c.q('[data-gr="app"]');
    if (!g) return;
    await c.go('design', { el: g, sel: '[data-gr="app"]', fx: 0.58, fy: 0.62 }, signal);
    c.once('h2', 'design', t('sadece {n} uygulama mı? bunu düzeltelim', { n: apps }), 2800);
    await c.sleep(3000, signal);
    c.home('design');
    await c.sleep(2600, signal);
    const v = c.q('[data-view="canvas"]');
    if (!v || view !== 'layers') return;
    await c.go('code', { el: v, fx: 0.5, fy: 0.78 }, signal);
    c.once('h3', 'code', t('tuval görünümü de güzel'), 2400);
    await c.sleep(2600, signal);
    c.home('code');
  },
  // Design points at a layer and its frame follows design's cursor instead of yours.
  list: async (c, signal) => {
    await c.sleep(900, signal);
    if (touched || view !== 'layers') return;
    const row = $$('.row:not(.off)')[2];
    const name = row && $('.rn > span', row);
    if (!row || !name) return;
    await c.go('design', { el: name, end: true, dx: 26, dy: -4 }, signal);
    if (touched) return c.home('design');
    const r = name.getBoundingClientRect();
    hover(Number(row.dataset.i), local(r.right + 26, r.bottom - 4));
    try {
      c.once('l1', 'design', t('bu çok eğlenceliydi'), 2200);
      await c.sleep(2600, signal);
    } finally {
      if (fixed) hover(-1);
    }
    c.home('design');
  },
  lock: async (c, signal) => {
    await c.sleep(1200, signal);
    c.once('k1', c.hostOf('lock'), t('bunları göstermek için sabırsızlanıyoruz'), 2400);
  },
  ask: async (c, signal) => {
    await c.sleep(1000, signal);
    c.once('a1', c.hostOf('ask'), t('{n} kulağa hoş geliyor', { n: data.next }), 2400);
  },
});
