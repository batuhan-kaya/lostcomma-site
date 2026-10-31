/** 04 · The endless board: drag to pan (it wraps) · slow drift · click a frame to open it. */
import type { Crew } from '../lib/crew';
import { reducedMotion } from '../lib/motion';
import { t } from '../lib/t';
import { $, $$, doing, type HomeData } from './shared';

/** Positions on the 2000 × 1080 tile from the design. */
const POS: [number, number][] = [
  [600, 520],
  [1590, 560],
  [1180, 500],
  [60, 580],
  [80, 40],
  [480, 70],
  [1640, 20],
  [1120, 60],
];
const TW = 2000;
const TH = 1080;
const mod = (a: number, m: number) => ((a % m) + m) % m;

export class Board {
  private readonly board = $('[data-board]');
  private readonly frames = $$<HTMLElement>('[data-bf]');
  private readonly mmv = $('[data-mmv]');
  private readonly ov = $('[data-ov]');
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private auto: { vx: number; vy: number; until: number } | null = null;
  private drag: { lx: number; ly: number; sx: number; sy: number; moved: boolean; id: number } | null = null;
  private dragEnd = 0;
  private hover = false;
  private inView = false;
  private raf = 0;
  private readonly reduce = reducedMotion();
  private lastFocus: HTMLElement | null = null;

  constructor(private readonly data: HomeData) {
    const B = this.board;
    if (!B) return;
    B.addEventListener('pointerdown', (e) => this.down(e));
    addEventListener('pointermove', (e) => this.move(e), { passive: true });
    addEventListener('pointerup', () => this.up());
    addEventListener('pointercancel', () => this.up());
    B.addEventListener('pointerenter', () => (this.hover = true));
    B.addEventListener('pointerleave', () => (this.hover = false));
    this.frames.forEach((f, i) => {
      f.addEventListener('click', () => {
        if (Date.now() - this.dragEnd < 300) return;
        this.open(i);
      });
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.open(i);
        }
      });
    });
    for (const b of $$('[data-close]')) b.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.close());
    new IntersectionObserver((entries) => {
      this.inView = entries.some((en) => en.isIntersecting);
      if (this.inView) this.wake();
    }).observe(B);
    this.render();
  }

  private scale(): number {
    const v = parseFloat(getComputedStyle(this.board!).getPropertyValue('--bk'));
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0 || this.isOpen) return;
    this.drag = { lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
    this.vx = 0;
    this.vy = 0;
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const k = this.scale();
    const dx = (e.clientX - d.lx) / k;
    const dy = (e.clientY - d.ly) / k;
    d.lx = e.clientX;
    d.ly = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) {
      d.moved = true;
      this.board?.classList.add('drag');
    }
    if (d.moved) {
      this.px += dx;
      this.py += dy;
      this.vx = dx * 0.8 + this.vx * 0.2;
      this.vy = dy * 0.8 + this.vy * 0.2;
      this.wake();
    }
  }

  private up(): void {
    const d = this.drag;
    if (!d) return;
    if (d.moved) {
      this.dragEnd = Date.now();
      this.board?.classList.remove('drag');
    }
    this.drag = null;
  }

  get isOpen(): boolean {
    return !!this.ov && !this.ov.hidden;
  }

  open(i: number): void {
    const f = this.frames[i];
    if (!f || !this.ov) return;
    this.lastFocus = document.activeElement as HTMLElement | null;
    $('[data-ovno]')!.textContent = f.dataset.no ?? '';
    $('[data-ovname]')!.textContent = f.dataset.name ?? '';
    $('[data-ovwhat]')!.textContent = f.dataset.what ?? '';
    const art = $('[data-ovart]')!;
    art.replaceChildren(...[...(f.querySelector('.ba')?.childNodes ?? [])].map((n) => n.cloneNode(true)));
    this.ov.hidden = false;
    this.ov.querySelector<HTMLElement>('.ovr .btn.g')?.focus();
  }

  close(): void {
    if (!this.isOpen || !this.ov) return;
    this.ov.hidden = true;
    this.lastFocus?.focus();
  }

  /** A frame fully inside the visible part of the board (for the host's comments). */
  visibleFrame(): number {
    const B = this.board;
    if (!B) return -1;
    const bb = B.getBoundingClientRect();
    const ok = this.frames
      .map((el, i) => ({ r: el.getBoundingClientRect(), i }))
      .filter(({ r }) => r.left > bb.left + 60 && r.right < bb.right - 60 && r.top > Math.max(bb.top, 0) + 40 && r.top + 160 < Math.min(bb.bottom, innerHeight))
      .map(({ i }) => i);
    return ok.length ? ok[Math.floor(Math.random() * ok.length)]! : -1;
  }

  pin(i: number, txt: string): void {
    const p = this.frames[i]?.querySelector<HTMLElement & { _t?: number }>('.pin');
    if (!p) return;
    p.querySelector('b')!.textContent = txt;
    p.classList.add('show');
    clearTimeout(p._t);
    p._t = window.setTimeout(() => p.classList.remove('show'), 5200);
  }

  nudge(vx: number, vy: number, ms: number): void {
    this.auto = { vx, vy, until: performance.now() + ms };
    this.wake();
  }

  get hovered(): boolean {
    return this.hover;
  }

  private wake(): void {
    if (!this.raf) this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  private tick(now: number): void {
    this.raf = 0;
    const dragging = !!this.drag?.moved;
    let moving = dragging;
    if (!dragging) {
      this.px += this.vx;
      this.py += this.vy;
      this.vx *= 0.94;
      this.vy *= 0.94;
      if (Math.abs(this.vx) > 0.05 || Math.abs(this.vy) > 0.05) moving = true;
      const a = this.auto;
      if (a && now < a.until) {
        this.px += a.vx;
        this.py += a.vy;
        moving = true;
      } else if (!this.hover && !this.isOpen && !this.reduce && this.inView) {
        // The slow drift that makes the board feel endless.
        this.px -= 0.28;
        this.py -= 0.1;
        moving = true;
      }
    }
    this.render();
    if (moving && this.inView) this.wake();
  }

  private render(): void {
    const B = this.board;
    if (!B) return;
    this.frames.forEach((el, i) => {
      const [x, y] = POS[i] ?? [0, 0];
      const sx = mod(x + this.px, TW) - 560;
      const sy = mod(y + this.py, TH) - 460;
      el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
    });
    B.style.backgroundPosition = `${mod(this.px, 26).toFixed(1)}px ${mod(this.py, 26).toFixed(1)}px`;
    if (this.mmv) {
      const s = 216 / TW;
      this.mmv.style.width = `${(B.clientWidth * s).toFixed(1)}px`;
      this.mmv.style.transform = `translate(${(mod(560 - this.px, TW) * s).toFixed(1)}px,${(mod(460 - this.py, TH) * s).toFixed(1)}px)`;
    }
  }

  /** The host leaves notes on frames and now and then gives the board a push. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('work');
    await c.sleep(1300, signal);
    for (let n = 0; ; n++) {
      if (this.isOpen) {
        await c.sleep(800, signal);
        continue;
      }
      const fi = this.visibleFrame();
      const fe = this.frames[fi];
      if (fe) {
        doing[host] = t('Panoya not bırakıyor');
        await c.go(host, { el: fe, fx: 0.8, fy: 0.18 }, signal);
        c.press(host);
        this.pin(fi, this.data.notes[n % this.data.notes.length] ?? '');
        await c.sleep(1500, signal);
        c.home(host);
      }
      await c.sleep(1600, signal);
      if (this.isOpen || this.hover || n % 2 === 0) continue;
      await c.go(host, { el: this.board!, fx: 0.57, fy: 0.6 }, signal);
      c.press(host);
      const s = n % 4 === 1 ? 1 : -1;
      this.nudge(5.5 * s, 2.2 * s, 1300);
      c.aim(host, { el: this.board!, fx: 0.57 + 0.3 * s, fy: 0.6 + 0.27 * s });
      await c.sleep(1450, signal);
      c.home(host);
      await c.sleep(3000, signal);
    }
  };
}
