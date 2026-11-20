/** Small helpers shared by the homepage modules. */
import type { Name } from '../lib/crew';

export interface HomeData {
  words: string[];
  notes: string[];
  services: { lab: string; size: string; code: string; say: string }[];
  /** 06 · the contact sentence: topics the blank suggests in turn · the thanks after sending. */
  sentence: { ideas: string[]; thanks: string; will: [string, string]; plain: string };
  doing: Record<Name, string>;
}

export function readData(): HomeData {
  const el = document.getElementById('page-data');
  return JSON.parse(el?.textContent ?? '{}') as HomeData;
}

export const $ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document): E | null => root.querySelector<E>(sel);
export const $$ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document): E[] => [...root.querySelectorAll<E>(sel)];

export const lang = (): 'tr' | 'en' => (document.documentElement.lang === 'tr' ? 'tr' : 'en');

export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** Restart a CSS animation class. */
export function replay(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

/**
 * Run `fn` once `el` comes within a screen of the viewport. Sections further down are not laid out
 * until then (content-visibility · data-far in home.css): measuring them at load would lay them out
 * for nothing and hold the page's first second (Lighthouse: blocking time).
 */
export function whenNear(el: Element | null, fn: () => void): void {
  if (!el) return;
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    },
    { rootMargin: '100% 0px' },
  );
  io.observe(el);
}

/** What each teammate is doing (header popovers). Scenes update it. */
export const doing: Record<string, string> = {};
