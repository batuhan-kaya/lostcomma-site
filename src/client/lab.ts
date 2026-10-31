/**
 * Lab · six things that run. One frame loop draws only what is on screen: the comma field while
 * the hero shows · each specimen while its tile shows. Every drawing is timed against its budget
 * (src/shared/lab.ts) and steps its quality down when it keeps going over. Pause all stops the
 * loop · reduced motion starts paused (one still frame each).
 */
import { BUDGET, breathAxes, cleanWord, Meter, ms } from '../shared/lab';
import { carets, chain, dither, dots, field, fit, rain, timed, type Fit, type Pt, type Pull } from './lab/draw';
import { getCrew, type Name } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

type Draw = (f: Fit, t: number, p: Pt | null, v: number, moving: boolean, level: number) => void;

const crew = getCrew();
const reduce = reducedMotion();
let paused = reduce;
let frozenAt = performance.now();
/** The visitor has played with a specimen: the team keeps its hands off from then on. */
let touched = false;
let fieldDirty = true;
const TEAM_COLOUR: Record<Name, string> = { design: '#8F8BFF', code: '#3EE0A8', motion: '#FF9BD2' };

/* ---------------- the pointer (mouse and pen) ---------------- */

let pointer: { x: number; y: number } | null = null;
addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType === 'touch') return;
    pointer = { x: e.clientX, y: e.clientY };
    if (paused) fieldDirty = true;
  },
  { passive: true },
);
document.documentElement.addEventListener('pointerleave', () => (pointer = null));

/* ---------------- hero · comma field ---------------- */

const hero = $('[data-sec="hero"]');
const fieldCv = $<HTMLCanvasElement>('[data-field]');
const fieldMeter = new Meter(BUDGET.field);
let heroOn = true;

function pulls(): Pull[] {
  if (!fieldCv) return [];
  const r = fieldCv.getBoundingClientRect();
  const out: Pull[] = [];
  if (pointer) out.push({ x: pointer.x - r.left, y: pointer.y - r.top, colour: '#CDF23A', strength: 1 });
  for (const n of ['design', 'code', 'motion'] as const) {
    const tip = crew?.tip(n);
    if (tip) out.push({ x: tip.x - r.left, y: tip.y - r.top, colour: TEAM_COLOUR[n], strength: 0.5 });
  }
  return out;
}

/* ---------------- specimens ---------------- */

interface Tile {
  el: HTMLElement;
  key: string;
  stage: HTMLElement;
  cv: HTMLCanvasElement | null;
  draw: Draw | null;
  meter: Meter;
  on: boolean;
  value: number;
  /** Pointer in stage coordinates · when it was last seen there. */
  p: Pt | null;
  pAt: number;
  touch: boolean;
  drawn: boolean;
  dirty: boolean;
  st: HTMLElement | null;
  cost: HTMLElement | null;
}

const DRAWS: Record<string, () => Draw> = { rain, dots, carets, dither, chain };
const tiles: Tile[] = $$('[data-exp]').map((el) => {
  const key = el.dataset.exp ?? '';
  const input = $<HTMLInputElement>('[data-v]', el);
  return {
    el,
    key,
    stage: $('[data-stage]', el)!,
    cv: $<HTMLCanvasElement>('[data-cv]', el),
    draw: DRAWS[key]?.() ?? null,
    meter: new Meter(BUDGET.tile),
    on: false,
    value: input ? Number(input.value) : 0,
    p: null,
    pAt: 0,
    touch: false,
    drawn: false,
    dirty: true,
    st: $('[data-st]', el),
    cost: $('[data-cost]', el),
  };
});
document.documentElement.classList.add('lab-live');

/** A teammate playing with a specimen: its cursor stands in for the pointer. */
let ghost: { tile: Tile; name: Name } | null = null;

function pointOf(tile: Tile, now: number): Pt | null {
  if (ghost?.tile === tile) {
    const tip = crew?.tip(ghost.name);
    if (tip) {
      const r = tile.stage.getBoundingClientRect();
      return { x: tip.x - r.left, y: tip.y - r.top };
    }
  }
  if (tile.p && (!tile.touch || now - tile.pAt < 1600)) return tile.p;
  return null;
}

/* ---------------- the breathing word ---------------- */

const word = $<HTMLInputElement>('[data-word]');
const br = $('[data-br]');
const axes = { wdth: 100, wght: 500 };

function breathe(tile: Tile, now: number, p: Pt | null): void {
  if (!br) return;
  let target: { wdth: number; wght: number };
  if (p) {
    const r = tile.stage.getBoundingClientRect();
    target = breathAxes(p.x / r.width, p.y / r.height);
  } else {
    const q = (Math.sin(now * 0.0016) + 1) / 2;
    target = { wdth: 60 + q * 70, wght: 200 + q * 650 };
  }
  if (paused) Object.assign(axes, { wdth: 100, wght: 600 });
  else {
    axes.wdth += (target.wdth - axes.wdth) * 0.12;
    axes.wght += (target.wght - axes.wght) * 0.12;
  }
  br.style.fontVariationSettings = `'wdth' ${axes.wdth.toFixed(1)}, 'wght' ${axes.wght.toFixed(0)}`;
}

word?.addEventListener('input', () => {
  const clean = cleanWord(word.value);
  if (clean !== word.value) word.value = clean;
  if (br) br.textContent = clean || ' ';
});

/* ---------------- one loop ---------------- */

const runT = $('[data-runt]');
const run = $('[data-run]');
let lastReadout = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (!paused) frozenAt = now;
  const tt = paused ? frozenAt : now;
  let total = 0;
  let running = 0;

  if (heroOn && fieldCv && (!paused || fieldDirty)) {
    fieldDirty = false;
    const f = fit(fieldCv, fieldMeter.level);
    if (f) {
      const p = pulls();
      timed(fieldMeter, () => field(f, tt, p, fieldMeter.level));
    }
  }
  if (heroOn && !paused) total += fieldMeter.ema;

  for (const tile of tiles) {
    // Off screen: one still frame (so the tile is never empty) · then nothing until it shows.
    if (tile.el.hidden || (!tile.on && tile.drawn)) continue;
    if (paused && tile.drawn && !tile.dirty) continue;
    const p = pointOf(tile, now);
    if (tile.key === 'breathe') timed(tile.meter, () => breathe(tile, tt, p));
    else if (tile.cv && tile.draw) {
      const f = fit(tile.cv, tile.meter.level);
      if (!f) continue;
      timed(tile.meter, () => tile.draw!(f, tt, p, tile.value, !paused, tile.meter.level));
    }
    tile.drawn = true;
    tile.dirty = false;
    if (!paused && tile.on) {
      total += tile.meter.ema;
      running++;
    }
  }

  if (now - lastReadout > 500) {
    lastReadout = now;
    for (const tile of tiles) {
      const state = !tile.on ? 'off' : paused ? 'paused' : 'on';
      if (tile.el.dataset.run !== state) {
        tile.el.dataset.run = state;
        if (tile.st) tile.st.textContent = state === 'off' ? t('ekran dışında') : state === 'paused' ? t('durdu') : t('çalışıyor');
      }
      if (tile.cost) tile.cost.textContent = state === 'on' ? ` · ${ms(tile.meter.ema)} ms${tile.meter.level ? ' · ' + t('hafif') : ''}` : '';
    }
    if (runT) {
      runT.textContent = paused
        ? t('Hepsi durdu')
        : running === 0 && !heroOn
          ? t('Ekranda deney yok')
          : t('Kare başına {ms} ms', { ms: ms(total) });
    }
    run?.classList.toggle('off', paused);
    run?.classList.toggle('over', !paused && total > BUDGET.page);
  }
}

/* ---------------- what is on screen ---------------- */

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.target === hero) {
        heroOn = e.isIntersecting;
        continue;
      }
      const tile = tiles.find((x) => x.el === e.target);
      if (!tile) continue;
      tile.on = e.isIntersecting;
      if (tile.on) tile.dirty = true;
    }
    lastReadout = 0;
  },
  { rootMargin: '40px 0px' },
);
if (hero) io.observe(hero);
for (const tile of tiles) io.observe(tile.el);

const ro = new ResizeObserver(() => {
  fieldDirty = true;
  for (const tile of tiles) tile.dirty = true;
});
if (fieldCv) ro.observe(fieldCv);
for (const tile of tiles) ro.observe(tile.stage);

/* ---------------- controls ---------------- */

const pauseBtn = $('[data-pause]');
const pauseT = $('[data-pauset]');
function setPaused(v: boolean): void {
  paused = v;
  document.documentElement.classList.toggle('lab-paused', v);
  pauseBtn?.setAttribute('aria-pressed', String(v));
  if (pauseT) pauseT.textContent = v ? t('Hepsini oynat') : t('Hepsini durdur');
  fieldDirty = true;
  for (const tile of tiles) tile.dirty = true;
  lastReadout = 0;
}
pauseBtn?.addEventListener('click', () => setPaused(!paused));
setPaused(paused);

for (const tile of tiles) {
  const input = $<HTMLInputElement>('[data-v]', tile.el);
  const out = $('[data-vt]', tile.el);
  input?.addEventListener('input', () => {
    tile.value = Number(input.value);
    if (out) out.textContent = Number(input.step) < 1 ? tile.value.toFixed(2) : String(tile.value);
    tile.dirty = true;
  });

  const local = (e: PointerEvent): Pt => {
    const r = tile.stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  tile.stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tile.p = local(e);
    tile.pAt = performance.now();
    tile.touch = false;
    touched = true;
    if (paused) tile.dirty = true;
  });
  tile.stage.addEventListener('pointerdown', (e) => {
    tile.p = local(e);
    tile.pAt = performance.now();
    tile.touch = e.pointerType === 'touch';
    touched = true;
  });
  tile.stage.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch') tile.p = null;
  });

  // Hovering one quiets the others (mouse only).
  tile.el.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    tile.el.parentElement?.classList.add('hov');
    tile.el.classList.add('hv');
  });
  tile.el.addEventListener('pointerleave', () => {
    tile.el.parentElement?.classList.remove('hov');
    tile.el.classList.remove('hv');
  });

  const open = $('[data-open]', tile.el);
  open?.addEventListener('click', () => {
    const big = !tile.el.classList.contains('big');
    for (const other of tiles) {
      if (other === tile || !other.el.classList.contains('big')) continue;
      other.el.classList.remove('big');
      $('[data-open]', other.el)?.setAttribute('aria-expanded', 'false');
      const ob = $('[data-open]', other.el);
      if (ob) ob.textContent = t('Büyüt');
      other.dirty = true;
    }
    tile.el.classList.toggle('big', big);
    open.setAttribute('aria-expanded', String(big));
    open.textContent = big ? t('Küçült') : t('Büyüt');
    tile.dirty = true;
    tile.el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  });
}

for (const b of $$('[data-filt]')) {
  b.addEventListener('click', () => {
    const f = b.dataset.filt ?? 'all';
    for (const x of $$('[data-filt]')) {
      const on = x === b;
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', String(on));
    }
    for (const tile of tiles) tile.el.hidden = !(f === 'all' || tile.el.dataset.g === f);
  });
}

requestAnimationFrame(frame);

/* ---------------- the team ---------------- */

crew?.addScenes({
  hero: async (c, signal) => {
    await c.sleep(3200, signal);
    c.once('h1', 'motion', t('virgüller bizi de takip ediyor'), 2400);
    await c.sleep(3600, signal);
    c.once('h2', 'code', t('buradaki her şey gerçek kod'), 2400);
  },
  // Motion plays with the spring chain: the chain follows motion's cursor for a moment.
  grid: async (c, signal) => {
    await c.sleep(1200, signal);
    const tile = tiles.find((x) => x.key === 'chain');
    if (!tile || touched || paused || tile.el.hidden || !tile.on) return;
    await c.go('motion', { el: tile.stage, fx: 0.3, fy: 0.4 }, signal);
    if (touched) return c.home('motion');
    ghost = { tile, name: 'motion' };
    try {
      c.once('g1', 'motion', t('yay zincirini dene'), 2200);
      await c.go('motion', { el: tile.stage, fx: 0.75, fy: 0.62 }, signal, 1800);
      await c.go('motion', { el: tile.stage, fx: 0.4, fy: 0.75 }, signal, 1800);
      await c.sleep(600, signal);
    } finally {
      ghost = null;
    }
    c.home('motion');
  },
  log: async (c, signal) => {
    await c.sleep(1400, signal);
    c.once('l1', c.hostOf('log'), t('ikisi mezun oldu'), 2200);
  },
});
