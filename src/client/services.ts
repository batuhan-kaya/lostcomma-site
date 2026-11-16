/**
 * Services. The index: one row open at a time (hover · focus · or the team). The open name is a
 * selected layer and its label counts the real size while the type stretches. In the hero a
 * teammate takes the grip of its own service and pulls the name open. Fair questions open one at
 * a time. Touch screens · narrow screens · reduced motion: every row is open and nobody performs.
 */
import { getCrew, type Name } from './lib/crew';
import { reducedMotion } from './lib/motion';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const rows = $$<HTMLAnchorElement>('[data-row]');
const live = matchMedia('(hover: hover) and (min-width: 821px)');
let touchedAt = 0;

function open(row: HTMLElement): void {
  if (row.classList.contains('on')) return;
  for (const r of rows) r.classList.toggle('on', r === row);
}

/** The selection label says the layer's real size: it counts while the name stretches. */
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const name = e.target as HTMLElement;
      const label = $('[data-size]', name);
      const b = name.getBoundingClientRect();
      if (label) label.textContent = `${$('[data-word]', name)?.textContent ?? ''} · ${Math.round(b.width)} × ${Math.round(b.height)}`;
    }
  });
  for (const r of rows) {
    const n = $('.sv-name', r);
    if (n) ro.observe(n);
  }
}

for (const r of rows) {
  const mine = () => {
    if (!live.matches) return;
    touchedAt = performance.now();
    open(r);
  };
  r.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && mine());
  r.addEventListener('focus', mine);
}

getCrew()?.addScenes({
  hero: async (c, signal) => {
    if (reducedMotion()) return;
    await c.sleep(2600, signal);
    for (let i = 1; ; i = (i + 1) % rows.length) {
      const row = rows[i]!;
      const who = (row.dataset.by ?? 'design') as Name;
      const grip = $('[data-grip]', row);
      const head = $('.sv-name', row)?.getBoundingClientRect();
      // Not while the visitor is choosing · not on a row that is off screen or already open.
      if (!live.matches || !grip || !head || performance.now() - touchedAt < 6000 || head.top < 90 || head.bottom > innerHeight - 40 || row.classList.contains('on')) {
        await c.sleep(1200, signal);
        continue;
      }
      // Take the grip at the end of the narrow name · pull: the name opens and the cursor stays on the grip.
      const at = { el: grip, fx: 0.5, fy: 0.5, dx: -2, dy: -1 };
      await c.go(who, at, signal);
      if (performance.now() - touchedAt < 6000) continue;
      c.press(who);
      await c.sleep(160, signal);
      c.aim(who, at);
      open(row);
      await c.sleep(1500, signal);
      c.home(who);
      await c.sleep(4200, signal);
    }
  },
});

/* ---------------- fair questions ---------------- */

const qs = $$('.q');
for (const q of qs) {
  const b = $<HTMLButtonElement>('.qb', q);
  b?.addEventListener('click', () => {
    const on = !q.classList.contains('open');
    for (const o of qs) {
      const yes = o === q && on;
      o.classList.toggle('open', yes);
      $('.qb', o)?.setAttribute('aria-expanded', String(yes));
    }
  });
}
