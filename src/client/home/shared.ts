/** Small helpers shared by the homepage modules. */
import type { Name } from '../lib/crew';

export interface HomeData {
  words: string[];
  notes: string[];
  services: { lab: string; size: string; code: string; say: string }[];
  types: { p: string; n: string; who: Name; say: string }[];
  times: { p: string; n: string; who: Name; say: string }[];
  budgets: { n: string; say: string }[];
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

/** What each teammate is doing (header popovers). Scenes update it. */
export const doing: Record<string, string> = {};
