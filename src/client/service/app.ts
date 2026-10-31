/**
 * Apps · the thumb zone. A ferry timetable on a phone · a thumb you can drag over it (or move with
 * the arrow keys · Enter taps). Before: the actions sit at the top where the thumb has to stretch.
 * After: all five live under the thumb. Left or right hand · iOS or Android.
 * Under the hood: a release on the train · press Ship it and watch it go.
 */
import { getCrew } from '../lib/crew';
import { t } from '../lib/t';
import { actionAt, boxOf, easyCount, SCREEN, zoneAt, zoneOf, type Hand, type Layout } from '../../shared/thumb';
import type { ServiceData } from './types';
import { $, $$, press, stopTween, text, tween } from './util';

export function init(data: ServiceData): void {
  hero(data);
  train();
}

function hero(data: ServiceData): void {
  const phone = $('[data-phone]');
  const scr = $('[data-scr]');
  const thumb = $('[data-thumb]');
  const reach = data.reach;
  if (!phone || !scr || !thumb || !reach) return;
  const acts = $$('[data-act]', scr);
  const crew = getCrew();
  const st = { lay: 'b' as Layout, hand: 'r' as Hand, plat: 'ios', zone: true, x: 292, y: 640 };
  let user = false;
  let toastTimer = 0;

  function apply(): void {
    phone!.className = `phone ${st.plat} lay-${st.lay} hand-${st.hand}${st.zone ? ' zon' : ''}`;
    acts.forEach((a, i) => {
      const b = boxOf(i, st.lay, st.hand);
      Object.assign(a.style, { left: `${b.x.toFixed(1)}px`, top: `${b.y.toFixed(1)}px`, width: `${b.w.toFixed(1)}px`, height: `${b.h.toFixed(1)}px` });
      a.classList.remove('easy', 'ok', 'hard');
      a.classList.add(zoneOf(i, st.lay, st.hand));
    });
    $('[data-zonebg]')?.classList.toggle('on', st.zone);
    for (const k of ['lay', 'hand', 'plat'] as const) for (const b of $$(`[data-${k}]`)) press(b, b.getAttribute(`data-${k}`) === st[k]);
    const z = $('[data-zone]');
    if (z) press(z, st.zone);
    const nb = easyCount('b', st.hand);
    const na = easyCount('a', st.hand);
    text($('[data-easy]'), String(st.lay === 'a' ? na : nb));
    for (const c of $$('[data-cmp]')) {
      const a = c.dataset.cmp === 'a';
      text(c, a ? t('Sonra · {n}/5', { n: na }) : t('Önce · {n}/5', { n: nb }));
      c.classList.toggle('on', (st.lay === 'a') === a);
    }
    place();
  }

  /** The thumb and the reach card. */
  function place(): void {
    thumb!.style.left = `${st.x + 12}px`;
    thumb!.style.top = `${st.y + 12}px`;
    const z = zoneAt(st.x, st.y, st.hand);
    const r = $('[data-reach]');
    if (r && !r.classList.contains(z)) {
      r.className = `reach ${z}`;
      text($('b', r), reach![z][0]);
      text($('span', r), reach![z][1]);
    }
  }

  function tap(): void {
    const i = actionAt(st.x, st.y, st.lay, st.hand);
    if (i < 0) return;
    const a = acts[i]!;
    const name = i === 1 ? t('Yönü değiştir') : (a.textContent ?? '');
    const z = zoneAt(st.x, st.y, st.hand);
    const msg = t('{name} dokunuldu · {zone}', { name, zone: reach![z][0].toLocaleLowerCase(document.documentElement.lang) });
    a.classList.add('tap');
    window.setTimeout(() => a.classList.remove('tap'), 220);
    const toast = $('[data-toast]', scr!);
    text(toast, msg);
    toast?.classList.add('on');
    text($('[data-tapsr]'), msg);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast?.classList.remove('on'), 1800);
  }

  const mine = () => {
    user = true;
    stopTween('thumb');
    if (crew?.current === 'hero') for (const n of ['design', 'code', 'motion'] as const) crew.home(n);
  };
  const thumbTo = (x: number, y: number, ms: number) => {
    const fx = st.x;
    const fy = st.y;
    tween('thumb', ms, (e) => {
      st.x = Math.round(fx + (x - fx) * e);
      st.y = Math.round(fy + (y - fy) * e);
      place();
    });
  };

  for (const k of ['lay', 'hand', 'plat'] as const) {
    for (const b of $$(`[data-${k}]`)) {
      b.addEventListener('click', () => {
        user = true;
        const v = b.getAttribute(`data-${k}`) ?? '';
        // Switching hands mirrors the thumb too.
        if (k === 'hand' && v !== st.hand) st.x = SCREEN.w - st.x;
        Object.assign(st, { [k]: v });
        apply();
      });
    }
  }
  $('[data-zone]')?.addEventListener('click', () => {
    st.zone = !st.zone;
    apply();
  });

  let drag: { left: number; top: number; k: number } | null = null;
  thumb.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    mine();
    thumb.setPointerCapture(e.pointerId);
    const b = scr.getBoundingClientRect();
    drag = { left: b.left, top: b.top, k: b.width / SCREEN.w };
    thumb.classList.add('drag');
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!drag) return;
    st.x = Math.round(Math.max(0, Math.min(SCREEN.w, (e.clientX - drag.left) / drag.k)));
    st.y = Math.round(Math.max(0, Math.min(SCREEN.h, (e.clientY - drag.top) / drag.k)));
    place();
  });
  const up = () => {
    if (!drag) return;
    drag = null;
    thumb.classList.remove('drag');
    tap();
  };
  thumb.addEventListener('pointerup', up);
  thumb.addEventListener('pointercancel', () => {
    drag = null;
    thumb.classList.remove('drag');
  });
  thumb.addEventListener('keydown', (e) => {
    const s = e.shiftKey ? 40 : 12;
    const dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0;
    const dy = e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0;
    if (dx || dy) {
      e.preventDefault();
      mine();
      st.x = Math.max(0, Math.min(SCREEN.w, st.x + dx));
      st.y = Math.max(0, Math.min(SCREEN.h, st.y + dy));
      place();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap();
    }
  });

  apply();

  crew?.addScenes({
    hero: async (c, signal) => {
      if (user) return;
      await c.sleep(2600, signal);
      if (user) return;
      const at = { el: thumb, fx: 0.5, fy: 0.5 };
      await c.go('code', at, signal);
      if (user) return;
      c.press('code');
      c.aim('code', at);
      const buy = boxOf(0, 'b', st.hand);
      thumbTo(buy.x + buy.w / 2, buy.y + buy.h / 2, 1800);
      await c.sleep(2000, signal);
      if (user) return;
      tap();
      c.say('code', t('bilet al yukarıda. uzanmak lazım'), 2200);
      await c.sleep(2600, signal);
      if (user) return;
      await c.go('design', { sel: '[data-lay="a"]', fx: 0.5, fy: 0.62 }, signal);
      if (user) return;
      c.press('design');
      st.lay = 'a';
      apply();
      const nb = boxOf(0, 'a', st.hand);
      thumbTo(nb.x + nb.w * 0.7, nb.y + nb.h / 2, 1400);
      await c.sleep(1500, signal);
      c.say('design', t('sonra. beşi de başparmağın altında'), 2400);
      await c.sleep(2600, signal);
      c.home('code');
      c.home('design');
      await c.sleep(900, signal);
      c.once('h3', 'motion', t('sıra sende. başparmağı tut'), 2400);
    },
  });
}

/** The release train: build · tests · beta · review · rollout. */
function train(): void {
  const rt = $('[data-rt]');
  const ship = $<HTMLButtonElement>('[data-ship]', rt ?? document);
  if (!rt || !ship) return;
  const stages = $$('[data-st]', rt);
  const crew = getCrew();
  const last = stages.length;
  let rs = 0;
  let timer = 0;

  const show = (n: number) => {
    rs = n;
    stages.forEach((s, i) => {
      s.classList.toggle('done', n > i + 1 || (n === last && i === last - 1));
      s.classList.toggle('now', n === i + 1 && n < last);
    });
    text($('[data-rtwhen]', rt), n === 0 ? t('Yola çıkmaya hazır') : n < last ? t('Trende') : t('Yayında'));
    text(ship, n === 0 ? t('Yola çıkar') : n < last ? t('Yola çıkıyor') : t('Yayında ✓ · tekrar'));
    ship.classList.toggle('done', n === last);
  };
  const roll = (pct: number) => {
    const bar = $('[data-roll]', rt);
    if (bar) bar.style.width = `${pct}%`;
    text($('[data-rollv]', rt), pct ? `${pct}%` : '');
  };
  const say = (line: string) => {
    if (crew?.current !== 'hood') return;
    crew.cast('code');
    crew.say('code', line, 2000);
  };

  ship.addEventListener('click', () => {
    if (rs === last) {
      show(0);
      roll(0);
      return;
    }
    if (rs) return;
    const step = (n: number) => {
      show(n);
      if (n === 3) say(t('incelemede. parmaklar çapraz'));
      if (n === 4) {
        roll(10);
        timer = window.setTimeout(() => roll(100), 1400);
      }
      if (n < last) timer = window.setTimeout(() => step(n + 1), n === 4 ? 2800 : 900);
      else say(t('yayında. şimdilik sıfır çökme'));
    };
    window.clearTimeout(timer);
    step(1);
  });

  crew?.addScenes({
    hood: async (c, signal) => {
      await c.sleep(1400, signal);
      if (rs) return;
      c.cast('code');
      await c.go('code', { el: ship, fx: 0.5, fy: 0.6 }, signal);
      c.once('d1', 'code', t('bas. iki cumada bir yola çıkıyoruz'), 2600);
    },
  });
}
