/** Shared behaviour on every page: team cursors · footer clock · language switch roll · mobile menu. */
import { getCrew } from './lib/crew';
import { reducedMotion } from './lib/motion';

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

startClock();
langSwitch();
menu();

// Page modules run before DOMContentLoaded and register their scenes first.
document.addEventListener('DOMContentLoaded', () => getCrew()?.start());
