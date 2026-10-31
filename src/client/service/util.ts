/** Small helpers shared by the service heroes. */
import { reducedMotion } from '../lib/motion';

export const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
export const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

export const reduce = reducedMotion();

/** easeInOutCubic: the house curve for things the page moves by itself. */
export const inOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/**
 * Runs fn(progress) every frame for ms milliseconds (once at 1 with reduced motion).
 * Returns a stop function. Starting a new tween on the same key stops the old one.
 */
const running = new Map<string, number>();
export function tween(key: string, ms: number, fn: (e: number) => void): () => void {
  cancelAnimationFrame(running.get(key) ?? 0);
  if (reduce || ms <= 0) {
    fn(1);
    return () => undefined;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    fn(inOut(k));
    if (k < 1) running.set(key, requestAnimationFrame(step));
    else running.delete(key);
  };
  running.set(key, requestAnimationFrame(step));
  return () => cancelAnimationFrame(running.get(key) ?? 0);
}

export function stopTween(key: string): void {
  cancelAnimationFrame(running.get(key) ?? 0);
  running.delete(key);
}

/** Toggle .on and aria-pressed together. */
export function press(b: Element, on: boolean): void {
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', String(on));
}

export function text(el: Element | null, value: string): void {
  if (el && el.textContent !== value) el.textContent = value;
}
