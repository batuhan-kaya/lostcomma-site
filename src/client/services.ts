/**
 * Services. The list is the page: each row's drawing plays on hover and on focus (CSS) · and the
 * team shows its own work: in the hero a cursor comes to a row that is on screen · the drawing
 * plays (.play) · it goes back. Fair questions open one at a time.
 */
import { getCrew, type Name } from './lib/crew';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const rows = $$<HTMLAnchorElement>('[data-row]');
/** A row a cursor can show right now: its drawing is in the window and the visitor is not on a row. */
const showable = (row: HTMLElement): boolean => {
  const b = $('.sv-art', row)?.getBoundingClientRect();
  return !!b && b.top > 90 && b.bottom < innerHeight - 20 && !rows.some((r) => r.matches(':hover, :focus-visible'));
};

getCrew()?.addScenes({
  hero: async (c, signal) => {
    await c.sleep(2400, signal);
    for (let i = 0; ; i = (i + 1) % rows.length) {
      const row = rows[i]!;
      const who = (row.dataset.by ?? 'design') as Name;
      if (!showable(row)) {
        await c.sleep(900, signal);
        continue;
      }
      await c.go(who, { el: $('.sv-art', row), fx: 0.84, fy: 0.8 }, signal);
      if (showable(row)) {
        c.press(who);
        row.classList.add('play');
        try {
          await c.sleep(2400, signal);
        } finally {
          row.classList.remove('play');
        }
      }
      c.home(who);
      await c.sleep(2600, signal);
    }
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
