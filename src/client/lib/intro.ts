/**
 * The preloader (layout/intro.ts · intro.css): the lost comma is found and the mark flies to the
 * logo in the header. The server draws it only for visitors who arrive from outside.
 *
 *   run     .go · CSS plays the search and the drop (about 1.2 s) · the count follows the time
 *   exit    once the run is over and the fonts are in (never later than 2.4 s): the mark flies onto
 *           the header logo · the ground fades · the overlay is removed
 *   skip    a click · a key · the wheel or a touch: everything settles and the exit comes at once
 *
 * Reduced motion · coming back with the back button: removed at once. Resolves when the page is
 * free · the team cursors start after it (app.ts).
 */
import { reducedMotion } from './motion';

const RUN_MS = 1250;
const LATEST_MS = 2400;
const EASE = 'cubic-bezier(.7,0,.2,1)';

export function playIntro(): Promise<void> {
  const box = document.querySelector<HTMLElement>('[data-intro]');
  if (!box) return Promise.resolve();
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (reducedMotion() || nav?.type === 'back_forward' || typeof box.animate !== 'function') {
    box.remove();
    return Promise.resolve();
  }

  const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';
  const count = box.querySelector<HTMLElement>('[data-intro-p]');
  const pct = (n: number) => (lang === 'tr' ? `%${n}` : `${n}%`);
  const t0 = performance.now();
  let leaving = false;
  let timer = 0;

  box.classList.add('go');
  timer = window.setInterval(() => {
    const n = Math.min(99, Math.round(((performance.now() - t0) / RUN_MS) * 100));
    if (count) count.textContent = pct(n);
  }, 50);

  return new Promise<void>((done) => {
    const block = (e: Event) => e.preventDefault();
    const skip = () => leave(true);
    const finish = () => {
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('keydown', skip);
      box.remove();
      done();
    };

    const leave = (fast: boolean) => {
      if (leaving) return;
      leaving = true;
      window.clearInterval(timer);
      if (count) count.textContent = pct(100);
      if (fast) box.classList.add('done');
      const mark = box.querySelector<HTMLElement>('.lci-mk');
      const logo = document.querySelector<SVGElement>('.hd .lc-mark');
      const ms = fast ? 380 : 620;
      // The ground goes in step with the flight: half way the mark is half its size and the page half there.
      const fade = (el: Element | null, duration: number, easing: string) =>
        el ? [el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration, easing, fill: 'forwards' })] : [];
      const fades = [
        ...fade(box.querySelector('.lci-bg'), ms, EASE),
        ...fade(box.querySelector('.lci-st'), ms * 0.4, 'ease-out'),
        ...[...box.querySelectorAll('.lci-cur')].flatMap((el) => fade(el, ms * 0.4, 'ease-out')),
      ];
      const moves: Animation[] = [];
      const r = mark?.getBoundingClientRect();
      const to = logo?.getBoundingClientRect();
      if (mark && r && to && to.width > 0 && to.bottom > 0) {
        // Onto the logo: the same corner · the same comma · a different size.
        const s = to.height / r.height;
        const from = 'translate(0px, 0px) translate(-50%, -56%) scale(1)';
        const end = `translate(${(to.left - r.left).toFixed(1)}px, ${(to.top - r.top).toFixed(1)}px) translate(-50%, -56%) scale(${s.toFixed(4)})`;
        moves.push(mark.animate([{ transform: from }, { transform: end }], { duration: ms, easing: EASE, fill: 'forwards' }));
        moves.push(mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: ms - 60, fill: 'forwards' }));
      } else if (mark) {
        // No header logo on screen: the mark simply goes.
        moves.push(mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.6, fill: 'forwards' }));
      }
      Promise.all([...fades, ...moves].map((a) => a.finished)).then(finish, finish);
    };

    // A click · a key · the wheel or a touch: no waiting. The page under it does not scroll meanwhile.
    box.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('wheel', skip, { passive: true });

    // The run · then the fonts (the logo must be in its own letters when the mark lands on it).
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const latest = new Promise((r) => window.setTimeout(r, LATEST_MS));
    const run = new Promise((r) => window.setTimeout(r, RUN_MS));
    Promise.all([run, Promise.race([fonts, latest])]).then(() => leave(false));
  });
}
