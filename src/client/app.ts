/** Shared behaviour on every page: team cursors · the header bar · footer clock and the clock · language switch roll · mobile menu. */
import { IST_OFFSET } from '../shared/booking';
import { headerBar } from './lib/bar';
import { getCrew } from './lib/crew';
import { playIntro } from './lib/intro';
import { reducedMotion } from './lib/motion';
import { startStats, track } from './lib/stats';

const LANG_COOKIE = 'lang';
const ROLL_MS = 560;

/** "14:05" in Istanbul (UTC+3 all year · src/shared/booking.ts): no date formatter to build on every page load. */
function istanbulTime(d: Date): string {
  const t = new Date(d.getTime() + IST_OFFSET * 60_000);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}

function startClock(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-clock]');
  if (!els.length) return;
  const tick = () => {
    const now = istanbulTime(new Date());
    els.forEach((el) => {
      if (el.textContent !== now) el.textContent = now;
    });
  };
  tick();
  window.setInterval(tick, 15_000);
}

function langSwitch(): void {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('.lang a[data-lang]');
    if (!a) return;
    const lang = a.dataset.lang ?? '';
    if (!a.classList.contains('on')) track('lang', lang);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    if (a.classList.contains('on') || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (reducedMotion()) return;
    // Roll every label to the other language and then navigate.
    e.preventDefault();
    document.documentElement.classList.add('rolling');
    window.setTimeout(() => {
      window.location.href = a.href;
    }, ROLL_MS);
  });
  // Coming back with the back button must not leave the labels rolled.
  window.addEventListener('pageshow', () => document.documentElement.classList.remove('rolling'));
}

function menu(): void {
  const menu = document.querySelector<HTMLDetailsElement>('details.menu');
  if (!menu) return;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
}

/**
 * A field with a value says so (data-filled): base.css hides the browser's small autofill preview
 * only in a field that is still empty (a previewed suggestion is not the field's value yet).
 */
function filled(): void {
  const mark = (el: EventTarget | null) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.toggleAttribute('data-filled', el.value !== '');
  };
  const all = () => document.querySelectorAll('input, textarea').forEach(mark);
  for (const type of ['input', 'change']) document.addEventListener(type, (e) => mark(e.target), true);
  // A reset empties a form without input events · a page from the back button may bring its values back.
  document.addEventListener('reset', () => setTimeout(all), true);
  addEventListener('pageshow', all);
  all();
}

/**
 * Images from the pipeline carry their dominant colour (data-c). It fills the box while the image
 * loads and is removed afterwards. Set through the CSSOM: the CSP allows no style attributes.
 */
function placeholders(): void {
  for (const img of document.querySelectorAll<HTMLImageElement>('img[data-c]')) {
    if (img.complete && img.naturalWidth) continue;
    img.style.backgroundColor = img.dataset.c ?? '';
    const done = () => img.removeAttribute('style');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }
}

/**
 * Endless CSS loops (live dots · drawn art · the board's frames) only play in sections on screen.
 * The drawings of a section far down the page (`data-far` from the server) are laid out a screen
 * before it comes up: the first paint does the first screen only.
 * A section out of view gets data-off: its animations pause where they are and pick up again
 * when it comes back (base.css). Nothing changes for the visitor · the page stops working
 * on things nobody sees.
 */
function offscreen(): void {
  const far = document.querySelectorAll<HTMLElement>('[data-far]');
  if (!('IntersectionObserver' in window)) {
    for (const el of far) el.removeAttribute('data-far');
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-off', !e.isIntersecting);
    },
    { rootMargin: '160px 0px' },
  );
  for (const el of document.querySelectorAll('[data-sec]')) io.observe(el);
  // A section the server marked far (its drawings are not laid out yet · home.css) gets them a
  // screen before it comes up at the latest · once. Once the visitor starts moving down the page the
  // sections three screens ahead get them in a quiet moment (laying out a product mock takes a
  // phone a tenth of a second: better between two gestures than in one). Nothing before that: a
  // page nobody scrolls (a first look · Lighthouse) never pays for them.
  const reveal = (el: Element) => {
    if (!el.hasAttribute('data-far')) return;
    el.removeAttribute('data-far');
    near.unobserve(el);
    soon.unobserve(el);
  };
  const near = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) reveal(e.target);
    },
    { rootMargin: '100% 0px' },
  );
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
  const soon = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) idle(() => reveal(e.target));
    },
    { rootMargin: '300% 0px' },
  );
  for (const el of far) near.observe(el);
  const moved = () => {
    for (const el of document.querySelectorAll('[data-far]')) soon.observe(el);
    for (const t of ['scroll', 'touchstart', 'keydown'] as const) removeEventListener(t, moved);
  };
  for (const t of ['scroll', 'touchstart', 'keydown'] as const) addEventListener(t, moved, { passive: true });
}

/**
 * Late stylesheets (page.lateStyles · a template in the head: the browser does not fetch them yet ·
 * a noscript link without scripts): linked after the first paint. The drawings they style are
 * further down the page.
 */
function lateStyles(): void {
  const late = document.querySelectorAll<HTMLTemplateElement>('template[data-late]');
  if (!late.length) return;
  requestAnimationFrame(() => setTimeout(() => late.forEach((t) => t.replaceWith(t.content))));
}

lateStyles();
offscreen();
headerBar();
filled();
startStats();
startClock();
langSwitch();
menu();
placeholders();

// Page modules run after this one and register their scenes before DOMContentLoaded: the team
// starts after that event. With the preloader they also wait until the page is free (born from
// the header avatars after the logo lands).
const intro = playIntro();
document.addEventListener('DOMContentLoaded', () => intro.then(() => getCrew()?.start()));
