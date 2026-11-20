/**
 * 05 · Process · "Layer by layer": one step open at a time. The stack and the notes follow one class
 * on `.ly` (s0–s4 · the geometry is all CSS · _layers.css): the sheets above the open one lift away
 * and turn to tracing paper · its note opens on its leader line. The sheets rise once the section
 * shows (`.in`). The host (code) opens the steps one by one unless the visitor is doing it · where
 * the team does not come below the hero (touch screens) they open by themselves while the stack shows.
 */
import type { Crew } from '../lib/crew';
import { reducedMotion } from '../lib/motion';
import { t } from '../lib/t';
import { $, $$, doing } from './shared';

export class Process {
  private readonly box = $('[data-ly]');
  private readonly sheets = $$<HTMLElement>('[data-lp]');
  private readonly rows = $$<HTMLElement>('[data-lr]');
  private readonly buttons = $$<HTMLButtonElement>('[data-lb]');
  private step = 0;
  private manualAt = 0;

  constructor(crew: Crew | null = null) {
    const box = this.box;
    if (!box) return;
    this.buttons.forEach((b, i) =>
      b.addEventListener('click', () => {
        this.manualAt = Date.now();
        this.set(i);
      }),
    );
    // A sheet is a shortcut to its step (the notes are the real controls).
    this.sheets.forEach((s, i) =>
      s.addEventListener('click', () => {
        this.manualAt = Date.now();
        this.set(i);
      }),
    );
    // The sheets rise one by one the first time the stack shows · after that steps move at once.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        box.classList.add('in');
        window.setTimeout(() => box.classList.add('ready'), 1800);
      },
      { threshold: 0.3 },
    );
    io.observe(box);
    if (!crew?.animates('prc') && !reducedMotion() && !document.documentElement.classList.contains('still')) this.alone();
    // The notes' words come from the panel (Metinler): give the open note more room if they need it.
    this.room();
    void document.fonts?.ready.then(() => this.room());
    addEventListener('resize', () => this.room(), { passive: true });
  }

  /**
   * No team below the hero (a touch screen): the steps open by themselves while the stack is on
   * screen (the build step waits for its terminal) · the visitor's first tap makes it theirs.
   */
  private alone(): void {
    const v = $('.ly-v', this.box ?? document);
    if (!v) return;
    let shown = false;
    let timer = 0;
    const tick = () => {
      timer = 0;
      if (!shown || this.manualAt) return;
      const nx = (this.step + 1) % this.rows.length;
      this.set(nx);
      timer = window.setTimeout(tick, nx === 3 ? 8200 : 4600);
    };
    new IntersectionObserver(
      (es) => {
        shown = es.some((e) => e.isIntersecting);
        // The first time: after the sheets have risen (.ready).
        if (shown && !timer && !this.manualAt) timer = window.setTimeout(tick, this.box?.classList.contains('ready') ? 2600 : 4200);
        else if (!shown && timer) {
          clearTimeout(timer);
          timer = 0;
        }
      },
      { threshold: 0.6 },
    ).observe(v);
  }

  /** The tallest note in the side by side layout · --D grows (never shrinks below the CSS room). */
  private room(): void {
    const box = this.box;
    if (!box) return;
    box.style.removeProperty('--D');
    const notes = $$<HTMLElement>('.ly-d', box);
    if (!notes[0] || getComputedStyle(notes[0]).position !== 'absolute') return;
    const need = Math.max(
      ...notes.map((d) => {
        const first = d.firstElementChild;
        const last = d.lastElementChild;
        return first && last ? last.getBoundingClientRect().bottom - first.getBoundingClientRect().top : 0;
      }),
    );
    if (need > notes[0].clientHeight + 1) box.style.setProperty('--D', `${Math.ceil(need) + 16}px`);
  }

  get current(): number {
    return this.step;
  }

  get recentlyTouched(): boolean {
    return Date.now() - this.manualAt < 12_000;
  }

  set(i: number): void {
    const box = this.box;
    if (!box || i < 0 || i >= this.rows.length) return;
    box.classList.remove(`s${this.step}`);
    box.classList.add(`s${i}`);
    this.step = i;
    const mark = (el: HTMLElement, j: number) => {
      el.classList.toggle('on', j === i);
      el.classList.toggle('done', j < i);
      el.classList.toggle('fut', j > i);
    };
    this.sheets.forEach(mark);
    this.rows.forEach((r, j) => {
      mark(r, j);
      const d = $('.ly-d', r);
      if (j === i) d?.removeAttribute('aria-hidden');
      else d?.setAttribute('aria-hidden', 'true');
    });
    this.buttons.forEach((b, j) => b.setAttribute('aria-expanded', String(j === i)));
  }

  /** The host (code) opens the next step every few seconds · a word on build and launch. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('prc');
    await c.sleep(1800, signal);
    for (;;) {
      if (this.recentlyTouched) {
        await c.sleep(900, signal);
        continue;
      }
      const nx = (this.step + 1) % this.rows.length;
      const b = this.buttons[nx];
      if (!b) return;
      doing[host] = t('Katmanları kaldırıyor');
      await c.go(host, { el: $('.ly-t', b) ?? b, fx: 1, fy: 0.6, dx: 10 }, signal);
      if (this.recentlyTouched) {
        c.home(host);
        continue;
      }
      c.press(host);
      this.set(nx);
      await c.sleep(700, signal);
      c.home(host);
      if (nx === 4) c.say(host, t('yayın günü'), 1600);
      // The build sheet types its code and runs the tests (about seven seconds): let it finish.
      if (nx === 3) {
        await c.sleep(6200, signal);
        c.say(host, t('testler yeşil'), 1600);
      }
      await c.sleep(4200, signal);
    }
  };
}
