/**
 * Websites · the frame you can resize. Drag the green handle (or use the arrow keys on it) and the
 * little client site inside reflows with container queries. The site is drawn at its real width and
 * scaled to fit the room (k = room / 1360) so a phone sees the same layouts a desktop does.
 * Under the hood: an editor with an EN and a TR tab and a publish button.
 */
import { getCrew } from '../lib/crew';
import { t } from '../lib/t';
import type { ServiceData } from './types';
import { $, $$, press, stopTween, text, tween } from './util';

const MIN = 340;
const MAX = 1360;

export function init(data: ServiceData): void {
  hero();
  editor(data);
}

function hero(): void {
  const rz = $('[data-rz]');
  const frame = $('[data-frame]');
  const handle = $('[data-handle]');
  if (!rz || !frame || !handle) return;
  const fill = $('[data-fill]', rz);
  const presets = $$<HTMLButtonElement>('[data-w]', rz);
  const bps = $$('[data-bp]', rz);
  const crew = getCrew();
  let w = 1280;
  let k = 1;
  let user = false;

  rz.classList.add('js-rz');
  const clamp = (v: number) => Math.round(Math.max(MIN, Math.min(MAX, v)));
  /** Phone · tablet · laptop · desktop: which band the width is in. */
  const band = (v: number) => (v < 560 ? 0 : v < 780 ? 1 : v < 1100 ? 2 : 3);

  function apply(): void {
    const px = `${(w * k).toFixed(1)}px`;
    frame!.style.width = px;
    if (fill) fill.style.width = px;
    text($('[data-wv]', rz!), String(w));
    text($('[data-dims]', rz!), `${w} px`);
    handle!.setAttribute('aria-valuenow', String(w));
    handle!.setAttribute('aria-valuetext', `${w} px`);
    const b = band(w);
    presets.forEach((p, i) => press(p, i === b));
    bps.forEach((p, i) => p.classList.toggle('on', i === b));
  }

  function measure(): void {
    k = Math.min(1, rz!.clientWidth / MAX);
    rz!.style.setProperty('--k', k.toFixed(4));
    for (const p of bps) p.style.left = `${(Math.min(Number(p.dataset.bp), MAX - 30) * k).toFixed(1)}px`;
    apply();
  }

  const set = (v: number) => {
    w = clamp(v);
    apply();
  };
  const to = (v: number, ms: number) => {
    const from = w;
    const goal = clamp(v);
    tween('rz', ms, (e) => set(from + (goal - from) * e));
  };
  const mine = () => {
    user = true;
    stopTween('rz');
  };

  measure();
  new ResizeObserver(measure).observe(rz);

  for (const p of presets) {
    p.addEventListener('click', () => {
      mine();
      to(Number(p.dataset.w), 700);
    });
  }

  let drag: { left: number } | null = null;
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    mine();
    handle.setPointerCapture(e.pointerId);
    drag = { left: frame.getBoundingClientRect().left };
    handle.classList.add('drag');
    if (crew?.current === 'hero') for (const n of ['design', 'code', 'motion'] as const) crew.home(n);
  });
  handle.addEventListener('pointermove', (e) => {
    if (drag) set((e.clientX - drag.left) / k + 4);
  });
  const up = () => {
    drag = null;
    handle.classList.remove('drag');
  };
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
  handle.addEventListener('keydown', (e) => {
    const big = e.shiftKey ? 100 : 20;
    const by: Record<string, number> = { ArrowLeft: -big, ArrowDown: -big, ArrowRight: big, ArrowUp: big, PageDown: -100, PageUp: 100 };
    let v: number | null = e.key in by ? w + by[e.key]! : null;
    if (e.key === 'Home') v = MIN;
    if (e.key === 'End') v = MAX;
    if (v === null) return;
    e.preventDefault();
    mine();
    set(v);
  });

  crew?.addScenes({
    hero: async (c, signal) => {
      if (user) return;
      await c.sleep(2600, signal);
      if (user) return;
      const at = { el: handle, fx: 0.45, fy: 0.5 };
      await c.go('code', at, signal);
      if (user) return;
      c.press('code');
      c.aim('code', at);
      to(390, 2400);
      await c.sleep(2600, signal);
      if (user) return;
      c.say('code', t('telefon. hâlâ iyi'), 1800);
      await c.sleep(2000, signal);
      if (user) return;
      to(820, 1500);
      await c.sleep(1700, signal);
      c.say('code', t('tablet'), 1300);
      await c.sleep(1500, signal);
      if (user) return;
      to(MAX, 1600);
      await c.sleep(1800, signal);
      c.home('code');
      await c.sleep(800, signal);
      c.once('h2', 'design', t('sıra sende. yeşil tutamacı tut'), 2600);
    },
  });
}

function editor(data: ServiceData): void {
  const ed = $('[data-ed]');
  const sample = data.editor;
  if (!ed || !sample) return;
  const h = $<HTMLInputElement>('[data-edh]', ed);
  const p = $<HTMLTextAreaElement>('[data-edp]', ed);
  const pub = $<HTMLButtonElement>('[data-pub]', ed);
  const saved = $('[data-saved]', ed);
  const tabs = $$<HTMLButtonElement>('[data-edl]', ed);
  const crew = getCrew();
  const copy = { tr: { ...sample.tr }, en: { ...sample.en } };
  let lang: 'tr' | 'en' = (document.documentElement.lang as 'tr' | 'en') === 'en' ? 'en' : 'tr';
  let timer = 0;

  const status = (label: string, dirty: boolean) => {
    if (!saved) return;
    saved.lastChild!.textContent = label;
    saved.classList.toggle('dirty', dirty);
  };
  const show = () => {
    if (h) {
      h.value = copy[lang].h;
      h.lang = lang;
    }
    if (p) {
      p.value = copy[lang].p;
      p.lang = lang;
    }
    text($('[data-edlang]', ed), lang === 'tr' ? 'Türkçe' : 'English');
    tabs.forEach((b) => press(b, b.dataset.edl === lang));
  };
  const edited = () => {
    window.clearTimeout(timer);
    pub?.classList.remove('done');
    text(pub, t('Yayınla'));
    status(t('Kaydedilmedi'), true);
  };
  show();
  for (const b of tabs) {
    b.addEventListener('click', () => {
      lang = b.dataset.edl === 'en' ? 'en' : 'tr';
      show();
    });
  }
  h?.addEventListener('input', () => {
    copy[lang].h = h.value;
    edited();
  });
  p?.addEventListener('input', () => {
    copy[lang].p = p.value;
    edited();
  });
  pub?.addEventListener('click', () => {
    window.clearTimeout(timer);
    text(pub, t('Yayınlanıyor'));
    timer = window.setTimeout(() => {
      pub.classList.add('done');
      text(pub, t('Yayında ✓'));
      status(t('Kaydedildi'), false);
      if (crew?.current === 'hood') crew.say(crew.hostOf('hood'), t('yayında. 0.8 saniye'), 1800);
    }, 900);
  });
}
