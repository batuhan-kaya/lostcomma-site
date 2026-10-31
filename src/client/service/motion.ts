/**
 * Motion · bend the curve. Two handles on a cubic bezier (drag them or use the arrow keys) · four
 * presets we actually use · three lanes that move with your curve next to a linear one · a duration ·
 * a reduced motion switch · the same curve as CSS you can copy.
 * Under the hood: our logo sting on a timeline with a play head. Then the reel: loops that play
 * muted · pause off screen · pause on a tap.
 */
import { getCrew } from '../lib/crew';
import { t } from '../lib/t';
import { cssCurve, ease, PRESETS, plotPath, X, Y, type Curve } from '../../shared/curve';
import type { ServiceData } from './types';
import { $, $$, press, reduce, stopTween, text, tween } from './util';
import { Loop, prefersStill } from '../lib/loops';

const HOLD = 380;

export function init(data: ServiceData): void {
  hero(data);
  timeline();
  reel();
}

function hero(data: ServiceData): void {
  const plot = $('[data-plot]');
  const curves = data.curves;
  if (!plot || !curves) return;
  const crew = getCrew();
  const hdl = $$<HTMLButtonElement>('[data-h]', plot);
  const presets = $$<HTMLButtonElement>('[data-pre]');
  const ball = $('[data-ball]');
  const lin = $('[data-lin]');
  const pop = $('[data-pop]');
  const dot = $('[data-dot]', plot);
  const dur = $<HTMLInputElement>('[data-dur]');
  let c: Curve = [...PRESETS[0]!.c];
  let pre = 0;
  let ms = Number(dur?.value ?? 480);
  let calm = false;
  let user = false;
  let t0 = performance.now();
  let raf = 0;
  let onScreen = true;

  /** Plot units (-20…320 × -10…670) to % of the plot box. */
  const pctX = (x: number) => `${(((x + 20) / 340) * 100).toFixed(2)}%`;
  const pctY = (y: number) => `${(((y + 10) / 680) * 100).toFixed(2)}%`;

  function draw(): void {
    hdl[0]!.style.left = pctX(X(c[0]));
    hdl[0]!.style.top = pctY(Y(c[1]));
    hdl[1]!.style.left = pctX(X(c[2]));
    hdl[1]!.style.top = pctY(Y(c[3]));
    const arms = $$('[data-arm]', plot!);
    arms[0]?.setAttribute('x2', String(X(c[0])));
    arms[0]?.setAttribute('y2', String(Y(c[1])));
    arms[1]?.setAttribute('x2', String(X(c[2])));
    arms[1]?.setAttribute('y2', String(Y(c[3])));
    $('[data-cv]', plot!)?.setAttribute('d', plotPath(c));
    text($('[data-cname]'), pre >= 0 ? curves![pre]!.n : t('Seninki'));
    presets.forEach((b, i) => press(b, i === pre));
    const is = $$('[data-css] i');
    text(is[0] ?? null, `${ms}ms`);
    text(is[1] ?? null, cssCurve(c));
  }

  const round = (v: number) => Math.round(v * 100) / 100;
  const bend = (to: Curve, dur: number) => {
    const from = [...c] as Curve;
    tween('bend', dur, (e) => {
      c = from.map((v, i) => round(v + (to[i]! - v) * e)) as Curve;
      draw();
    });
  };
  const mine = () => {
    user = true;
    stopTween('bend');
    if (crew?.current === 'hero') for (const n of ['design', 'code', 'motion'] as const) crew.home(n);
  };

  /* handles */
  let drag: { i: number; left: number; top: number; k: number } | null = null;
  hdl.forEach((h, i) => {
    h.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      mine();
      h.setPointerCapture(e.pointerId);
      const b = plot.getBoundingClientRect();
      drag = { i, left: b.left, top: b.top, k: b.width / 340 };
      h.classList.add('drag');
      pre = -1;
    });
    h.addEventListener('pointermove', (e) => {
      if (!drag || drag.i !== i) return;
      const x = Math.max(0, Math.min(1, ((e.clientX - drag.left) / drag.k - 20) / 300));
      const y = Math.max(-0.5, Math.min(1.7, (510 - ((e.clientY - drag.top) / drag.k - 10)) / 300));
      c[i * 2] = round(x);
      c[i * 2 + 1] = round(y);
      draw();
    });
    const up = () => {
      drag = null;
      h.classList.remove('drag');
    };
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
    h.addEventListener('keydown', (e) => {
      const s = e.shiftKey ? 0.05 : 0.01;
      const dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0;
      const dy = e.key === 'ArrowDown' ? -s : e.key === 'ArrowUp' ? s : 0;
      if (!dx && !dy) return;
      e.preventDefault();
      mine();
      pre = -1;
      c[i * 2] = round(Math.max(0, Math.min(1, c[i * 2]! + dx)));
      c[i * 2 + 1] = round(Math.max(-0.5, Math.min(1.7, c[i * 2 + 1]! + dy)));
      draw();
    });
  });

  presets.forEach((b, i) =>
    b.addEventListener('click', () => {
      mine();
      pre = i;
      bend(PRESETS[i]!.c, 600);
    }),
  );
  dur?.addEventListener('input', () => {
    ms = Number(dur.value);
    text($('[data-durv]'), `${ms} ms`);
    t0 = performance.now();
    draw();
  });
  const rm = $('[data-rm]');
  rm?.addEventListener('click', () => {
    calm = !calm;
    press(rm, calm);
    $('[data-calm]')?.classList.toggle('on', calm);
  });
  const cp = $<HTMLButtonElement>('[data-copy]');
  let cpTimer = 0;
  cp?.addEventListener('click', () => {
    navigator.clipboard?.writeText(`transition: transform ${ms}ms ${cssCurve(c)};`).catch(() => undefined);
    cp.classList.add('done');
    text(cp, t('Kopyalandı ✓'));
    window.clearTimeout(cpTimer);
    cpTimer = window.setTimeout(() => {
      cp.classList.remove('done');
      text(cp, t('Kopyala'));
    }, 1400);
    if (crew?.current === 'hero') crew.say('code', t('panonda'), 1600);
  });

  /* the lanes: there and back with a hold at each end */
  function frame(now: number): void {
    raf = 0;
    if (!ball || !lin) return;
    const cyc = 2 * (ms + HOLD);
    let q = 1;
    let fwd = true;
    if (!calm && !reduce) {
      const tt = (now - t0) % cyc;
      if (tt < ms) q = tt / ms;
      else if (tt < ms + HOLD) q = 1;
      else if (tt < 2 * ms + HOLD) {
        q = (tt - ms - HOLD) / ms;
        fwd = false;
      } else fwd = false;
    }
    const e = fwd ? ease(c, q) : 1 - ease(c, q);
    const l = fwd ? q : 1 - q;
    const span = (ball.parentElement?.clientWidth ?? 400) - ball.offsetWidth;
    ball.style.transform = `translateX(${(e * span).toFixed(1)}px)`;
    lin.style.transform = `translateX(${(l * span).toFixed(1)}px)`;
    if (pop) pop.style.transform = `scale(${Math.max(0.05, 0.35 + 0.65 * e).toFixed(3)})`;
    if (dot) {
      dot.setAttribute('cx', String((fwd ? q : 1 - q) * 300));
      dot.setAttribute('cy', String(Y(e)));
    }
    if (onScreen && !reduce) raf = requestAnimationFrame(frame);
  }
  const run = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([en]) => {
    onScreen = !!en?.isIntersecting;
    if (onScreen) run();
  }).observe($('.pvw') ?? plot);

  draw();
  run();

  crew?.addScenes({
    hero: async (cr, signal) => {
      if (user) return;
      await cr.sleep(2800, signal);
      if (user) return;
      const h0 = { el: hdl[0]!, fx: 0.5, fy: 0.5 };
      await cr.go('motion', h0, signal);
      if (user) return;
      cr.press('motion');
      cr.aim('motion', h0);
      pre = 1;
      bend(PRESETS[1]!.c, 1600);
      await cr.sleep(1900, signal);
      if (user) return;
      cr.say('motion', t('biraz taşma. şimdi canlı hissettiriyor'), 2400);
      await cr.sleep(2800, signal);
      if (user) return;
      await cr.go('code', { sel: '[data-code]', fx: 0.72, fy: 0.5 }, signal);
      cr.say('code', t('aynı eğri css olarak. kopyala'), 2200);
      await cr.sleep(2600, signal);
      cr.home('motion');
      cr.home('code');
      await cr.sleep(900, signal);
      cr.once('h3', 'design', t('sıra sende. bük onu'), 2200);
    },
  });
}

/** The logo sting: comma drops · lost and comma slide in · the cursor arrives. */
function timeline(): void {
  const tl = $('[data-tlm]');
  const range = $<HTMLInputElement>('[data-tlr]', tl ?? document);
  const play = $<HTMLButtonElement>('[data-tlplay]', tl ?? document);
  if (!tl || !range || !play) return;
  const roll: Curve = [0.7, 0, 0.2, 1];
  const pop: Curve = [0.2, 1.6, 0.3, 1];
  const w1 = $('.w1', tl);
  const w2 = $('.w2', tl);
  const cm = $('.cm', tl);
  const cur = $<SVGElement>('.cur2', tl);
  const ph = $('[data-ph]', tl);
  let v = Number(range.value);
  let playing = false;
  let last = 0;
  let raf = 0;

  const seg = (x: number, a: number, b: number) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  function show(): void {
    const p = v / 1000;
    const c = ease(pop, seg(p, 0, 0.38));
    const a = ease(roll, seg(p, 0.18, 0.48));
    const b = ease(roll, seg(p, 0.36, 0.68));
    const r = ease(roll, seg(p, 0.66, 1));
    if (cm) Object.assign(cm.style, { opacity: Math.min(1, c * 3).toFixed(2), transform: `translateY(${((1 - c) * -170).toFixed(1)}px)` });
    if (w1) Object.assign(w1.style, { opacity: a.toFixed(2), transform: `translate(${((1 - a) * -260).toFixed(1)}px,-50%)` });
    if (w2) Object.assign(w2.style, { opacity: b.toFixed(2), transform: `translate(${((1 - b) * 260).toFixed(1)}px,-50%)` });
    if (cur) Object.assign(cur.style, { opacity: Math.min(1, r * 4).toFixed(2), transform: `translate(${((1 - r) * 230).toFixed(1)}px,${((1 - r) * 90).toFixed(1)}px)` });
    ph?.style.setProperty('--t', p.toFixed(3));
    text($('[data-tlt]', tl!), `${(p * 2).toFixed(2)} s`);
    if (Number(range!.value) !== Math.round(v)) range!.value = String(Math.round(v));
  }
  const stop = () => {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    press(play, false);
    text(play, t('Oynat'));
  };
  function frame(now: number): void {
    const dt = last ? now - last : 16;
    last = now;
    v = Math.min(1000, v + dt / 2);
    show();
    if (v < 1000 && playing) raf = requestAnimationFrame(frame);
    else stop();
  }
  play.addEventListener('click', () => {
    if (playing) return stop();
    if (v >= 1000) v = 0;
    if (reduce) {
      v = 1000;
      return show();
    }
    playing = true;
    last = 0;
    press(play, true);
    text(play, t('Durdur'));
    raf = requestAnimationFrame(frame);
  });
  range.addEventListener('input', () => {
    stop();
    v = Number(range.value);
    show();
  });
  show();

  getCrew()?.addScenes({
    hood: async (c, signal) => {
      await c.sleep(1400, signal);
      c.once('d1', c.hostOf('hood'), t('oynatma kafasını sürükle'), 2200);
    },
  });
}

/** Loops play muted · pause when they leave the screen · a tap pauses one. */
function reel(): void {
  const loops = $$<HTMLButtonElement>('[data-loop]');
  if (!loops.length) return;
  const io = new IntersectionObserver((list) => {
    for (const en of list) en.target.classList.toggle('away', !en.isIntersecting);
  });
  for (const b of loops) {
    io.observe(b);
    // A real loop (a project with a video) plays and pauses with its button.
    const v = $<HTMLVideoElement>('video[data-loopv]', b);
    const loop = v ? new Loop(v) : null;
    if (loop && prefersStill) {
      b.classList.add('off');
      text($('[data-lps]', b), t('Duraklatıldı'));
    }
    b.addEventListener('click', () => {
      const off = !b.classList.contains('off');
      b.classList.toggle('off', off);
      text($('[data-lps]', b), off ? t('Duraklatıldı') : t('Oynuyor · sessiz'));
      loop?.set(!off, true);
    });
  }
  getCrew()?.addScenes({
    reel: async (c, signal) => {
      await c.sleep(1200, signal);
      c.once('r1', c.hostOf('reel'), t('durdurmak için birine dokun'), 2200);
    },
  });
}
