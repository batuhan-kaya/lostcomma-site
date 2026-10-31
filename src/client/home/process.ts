/** 05 · How a project moves: the clickable prototype. */
import type { Crew } from '../lib/crew';
import { t } from '../lib/t';
import { $, $$, doing } from './shared';

export class Process {
  private readonly cards = $$<HTMLElement>('[data-pf]');
  private readonly box = $('[data-flowbox]');
  private readonly dot = $<SVGCircleElement>('[data-pdot]');
  private step = 0;
  private manualAt = 0;
  private timer = 0;

  constructor() {
    this.cards.forEach((card, i) =>
      card.addEventListener('click', (e) => {
        if ((e.target as Element).closest('[data-hot]')) return;
        this.manualAt = Date.now();
        this.set(i);
      }),
    );
    for (const b of $$<HTMLButtonElement>('[data-hot]'))
      b.addEventListener('click', () => {
        this.manualAt = Date.now();
        this.advance(Number(b.dataset.hot));
      });
    this.fit();
    addEventListener('resize', () => this.fit(), { passive: true });
  }

  /** The prototype is drawn at 1360 px: scale it to the column. Phones get a swipe row (CSS). */
  private fit(): void {
    const box = this.box;
    if (!box) return;
    const k = Math.min(1, box.clientWidth / 1360);
    box.style.setProperty('--pk', k.toFixed(3));
  }

  get current(): number {
    return this.step;
  }

  get recentlyTouched(): boolean {
    return Date.now() - this.manualAt < 10_000;
  }

  set(i: number): void {
    this.step = i;
    this.cards.forEach((c, j) => c.classList.toggle('act', j === i));
    $$('[data-pd]').forEach((d, j) => {
      d.classList.toggle('act', j === i);
      if (j === i) d.removeAttribute('aria-hidden');
      else d.setAttribute('aria-hidden', 'true');
    });
    $$('[data-np]').forEach((p, j) => p.classList.toggle('act', j === i));
    $$('[data-ah]').forEach((p, j) => p.classList.toggle('act', j === i));
    // Keep the active screen in view in the phone swipe row.
    const card = this.cards[i];
    const row = card?.parentElement;
    if (card && row && row.scrollWidth > row.clientWidth + 4) row.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
  }

  /** Next: a dot travels along the noodle · then the next screen lights up. */
  advance(from: number): void {
    const nx = (from + 1) % this.cards.length;
    clearTimeout(this.timer);
    if (nx === 0) return this.set(0);
    if (this.step !== from) this.set(from);
    this.travel(from);
    this.timer = window.setTimeout(() => this.set(nx), 720);
  }

  private travel(i: number): void {
    const path = $<SVGPathElement>(`[data-np="${i}"]`);
    const dot = this.dot;
    if (!path || !dot || !path.getTotalLength) return;
    const L = path.getTotalLength();
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / 720);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const p = path.getPointAtLength(L * e);
      dot.setAttribute('cx', p.x.toFixed(1));
      dot.setAttribute('cy', p.y.toFixed(1));
      dot.style.opacity = k < 1 ? '1' : '0';
      if (k < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** The host (code) clicks through the prototype unless the visitor is doing it. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('prc');
    await c.sleep(1600, signal);
    for (;;) {
      if (this.recentlyTouched) {
        await c.sleep(800, signal);
        continue;
      }
      const st = this.step;
      const hot = $(`[data-hot="${st}"]`);
      if (!hot) return;
      doing[host] = t('Prototipte geziniyor');
      await c.go(host, { el: hot, fx: 0.45, fy: 0.7 }, signal);
      if (this.recentlyTouched) {
        c.home(host);
        continue;
      }
      c.press(host);
      this.advance(st);
      await c.sleep(600, signal);
      c.home(host);
      if (st === 2) c.say(host, t('testler yeşil'), 1600);
      if (st === 3) c.say(host, t('yayın günü'), 1600);
      await c.sleep(3800, signal);
    }
  };
}
