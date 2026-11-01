/** Shared behaviour on every page: team cursors · footer clock and drawn sign-off · language switch roll · mobile menu. */
import { getCrew } from './lib/crew';
import { drawFooter } from './lib/footer';
import { playIntro } from './lib/intro';
import { reducedMotion } from './lib/motion';
import { startStats, track } from './lib/stats';

const LANG_COOKIE = 'lang';
const ROLL_MS = 560;

function istanbulTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(d);
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

/** The shy comma was found on the homepage once: the logo keeps its comma everywhere. */
function comma(): void {
  try {
    if (localStorage.getItem('lc-comma') === '1') document.documentElement.classList.add('found');
  } catch {
    /* storage blocked: no comma */
  }
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
 * A section out of view gets data-off: its animations pause where they are and pick up again
 * when it comes back (base.css). Nothing changes for the visitor · the page stops working
 * on things nobody sees.
 */
function offscreen(): void {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-off', !e.isIntersecting);
    },
    { rootMargin: '160px 0px' },
  );
  for (const el of document.querySelectorAll('[data-sec]')) io.observe(el);
}

comma();
offscreen();
startStats();
startClock();
langSwitch();
menu();
placeholders();
drawFooter();

// Page modules run after this one and register their scenes before DOMContentLoaded: the team
// starts after that event. With the preloader they also wait until the page is free (born from
// the header avatars after the logo lands).
const intro = playIntro();
document.addEventListener('DOMContentLoaded', () => intro.then(() => getCrew()?.start()));
