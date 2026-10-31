/**
 * Identity · one mark from favicon to billboard. Drag the scale (or pick a stop) and the bakery
 * mark changes its shape for the size: one score at 16 px · two on an icon · mark and name on a card ·
 * a pattern on a poster · the name first on a billboard. Clear space and one colour on demand.
 * Under the hood: pick two colours from the palette and see their contrast.
 */
import { getCrew, type Name } from '../lib/crew';
import { t } from '../lib/t';
import { contrast, PALETTE } from '../../shared/contrast';
import type { ServiceData } from './types';
import { $, $$, press, stopTween, text, tween } from './util';

/** Scenes are drawn for a 780 × 640 stage and scaled to fit. */
const STAGE_W = 780;

export function init(data: ServiceData): void {
  hero(data);
  checker();
}

function hero(data: ServiceData): void {
  const stg = $('[data-stg]');
  const rng = $<HTMLInputElement>('[data-rng]');
  const sizes = data.sizes;
  if (!stg || !rng || !sizes) return;
  const crew = getCrew();
  const scenes = $$('[data-scn]', stg);
  const stops = $$<HTMLButtonElement>('[data-stop]');
  let v = Number(rng.value);
  let at = -1;
  let user = false;

  const fit = () => stg.style.setProperty('--k', Math.min(1, stg.clientWidth / STAGE_W).toFixed(4));
  fit();
  new ResizeObserver(fit).observe(stg);

  function show(value: number): void {
    v = Math.max(0, Math.min(100, value));
    if (Number(rng!.value) !== Math.round(v)) rng!.value = String(Math.round(v));
    const i = Math.round(v / 20);
    if (i === at) return;
    at = i;
    const z = sizes![i]!;
    scenes.forEach((s, k) => s.classList.toggle('on', k === i));
    stg!.className = stg!.className.replace(/\bv\d\b/, `v${z.v}`);
    stg!.setAttribute('aria-label', t('Fırın logosu · {cap}', { cap: z.cap }));
    rng!.setAttribute('aria-valuetext', `${z.n} · ${z.sz}`);
    stops.forEach((b, k) => press(b, k === i));
    text($('[data-sz]'), z.sz);
    text($('[data-med]'), z.n);
    text($('[data-real]'), z.real);
    text($('[data-ver]'), z.ver);
    text($('[data-vno]'), z.vno);
    text($('[data-rule]'), z.rule);
    text($('[data-cap]', stg!), z.cap);
  }
  const slide = (to: number, ms: number, follow?: Name) => {
    const from = v;
    tween('scale', ms, (e) => {
      show(from + (to - from) * e);
      if (follow) crew?.aim(follow, thumbAt());
    });
  };
  /** Where the range thumb sits right now (a crew target). */
  const thumbAt = () => {
    const w = rng!.clientWidth;
    const knob = 34;
    return { el: rng!, fx: 0, fy: 0.5, dx: knob / 2 + (v / 100) * (w - knob) };
  };
  const mine = () => {
    user = true;
    stopTween('scale');
    if (crew?.current === 'hero') for (const n of ['design', 'code', 'motion'] as const) crew.home(n);
  };

  at = -1;
  show(v);
  rng.addEventListener('input', () => {
    mine();
    show(Number(rng.value));
  });
  stops.forEach((b, i) =>
    b.addEventListener('click', () => {
      mine();
      slide(i * 20, 700);
    }),
  );
  for (const [sel, cls] of [['[data-cs]', 'cs'], ['[data-mono]', 'mono1']] as const) {
    const b = $(sel);
    b?.addEventListener('click', () => {
      const on = !b.classList.contains('on');
      press(b, on);
      stg.classList.toggle(cls, on);
    });
  }

  crew?.addScenes({
    hero: async (c, signal) => {
      if (user) return;
      await c.sleep(2800, signal);
      if (user) return;
      await c.go('design', thumbAt(), signal);
      if (user) return;
      c.press('design');
      slide(0, 1600, 'design');
      await c.sleep(1900, signal);
      if (user) return;
      c.say('design', t('on altı piksel. tek çizik'), 2200);
      await c.sleep(2600, signal);
      if (user) return;
      await c.go('motion', thumbAt(), signal);
      if (user) return;
      c.press('motion');
      slide(100, 2400, 'motion');
      await c.sleep(2600, signal);
      c.say('motion', t('altı metre. hâlâ ekmek'), 2400);
      await c.sleep(2600, signal);
      c.home('design');
      c.home('motion');
      await c.sleep(900, signal);
      c.once('h3', 'code', t('sıra sende. yeşil noktayı sürükle'), 2400);
    },
  });
}

/** Pick a text colour and a background · the ratio and the WCAG verdicts follow. */
function checker(): void {
  const cc = $('[data-cc]');
  const prev = $('[data-prev]', cc ?? document);
  if (!cc || !prev) return;
  const pick = { fg: 0, bg: 3 };
  const crew = getCrew();

  const show = () => {
    prev.className = `prev f${pick.fg} b${pick.bg}`;
    for (const k of ['fg', 'bg'] as const) for (const b of $$(`[data-${k}]`, cc)) press(b, Number(b.getAttribute(`data-${k}`)) === pick[k]);
    const r = contrast(PALETTE[pick.fg]!, PALETTE[pick.bg]!);
    text($('[data-ratio]', cc), `${r.toFixed(2)} : 1`);
    const aa = $('[data-aa]', cc);
    const aaa = $('[data-aaa]', cc);
    if (aa) {
      aa.className = `bdg mono ${r >= 4.5 ? 'ok' : r >= 3 ? '' : 'no'}`;
      text(aa, r >= 4.5 ? t('AA ✓ metin') : r >= 3 ? t('AA sadece büyük yazı') : t('AA’dan kalır'));
    }
    if (aaa) {
      aaa.className = `bdg mono ${r >= 7 ? 'ok' : 'no'}`;
      text(aaa, r >= 7 ? 'AAA ✓' : t('AAA değil'));
    }
  };
  for (const k of ['fg', 'bg'] as const) {
    for (const b of $$(`[data-${k}]`, cc)) {
      b.addEventListener('click', () => {
        pick[k] = Number(b.getAttribute(`data-${k}`));
        show();
      });
    }
  }

  crew?.addScenes({
    hood: async (c, signal) => {
      await c.sleep(1400, signal);
      c.once('d1', c.hostOf('hood'), t('iki renk seç. biz kontrol edelim'), 2400);
    },
  });
}
