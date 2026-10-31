/** 03 · Services: one frame that changes shape · an inspector that shows its CSS. */
import type { Crew } from '../lib/crew';
import { t } from '../lib/t';
import { $, $$, doing, type HomeData } from './shared';

export class Services {
  private readonly opts = $$<HTMLButtonElement>('[data-opt]');
  private readonly frm = $('[data-frm]');
  private readonly insp = $<HTMLButtonElement>('[data-inspb]');
  private readonly code = $<HTMLPreElement>('[data-code]');
  private readonly stage = $('[data-stage]');
  private readonly scaler = $('[data-sscale]');
  private v = 0;
  private manualAt = 0;

  constructor(private readonly data: HomeData) {
    this.opts.forEach((o, i) =>
      o.addEventListener('click', () => {
        this.manualAt = Date.now();
        this.pick(i);
      }),
    );
    // Arrow keys move through the radio group.
    this.opts.forEach((o, i) =>
      o.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (i + d + this.opts.length) % this.opts.length;
        this.manualAt = Date.now();
        this.pick(n);
        this.opts[n]?.focus();
      }),
    );
    this.insp?.addEventListener('click', () => {
      this.manualAt = Date.now();
      this.inspect(this.code?.hidden ?? true);
    });
    this.fit();
    addEventListener('resize', () => this.fit(), { passive: true });
  }

  /** The 1440 layout needs 890 px for the widest frame. Smaller stages scale it down. */
  private fit(): void {
    if (!this.stage || !this.scaler) return;
    const w = this.stage.clientWidth;
    const k = Math.min(1, w / 890);
    this.scaler.style.setProperty('--k', k.toFixed(3));
    this.stage.style.height = k < 1 ? `${Math.round(700 * k + 90)}px` : '';
  }

  get current(): number {
    return this.v;
  }

  get recentlyTouched(): boolean {
    return Date.now() - this.manualAt < 12_000;
  }

  pick(i: number): void {
    const sv = this.data.services[i];
    if (!sv || !this.frm) return;
    this.v = i;
    this.opts.forEach((o, j) => {
      o.classList.toggle('act', j === i);
      o.setAttribute('aria-checked', String(j === i));
      o.tabIndex = j === i ? 0 : -1;
    });
    this.frm.className = 'frm v' + i;
    $$('[data-fc]').forEach((f, j) => f.classList.toggle('on', j === i));
    const lab = $('[data-frmlab]');
    if (lab) lab.textContent = sv.lab;
    const size = $('[data-frmsize]');
    if (size) size.textContent = sv.size;
    if (this.code) this.code.textContent = sv.code;
    this.inspect(false);
  }

  inspect(on: boolean): void {
    if (!this.code || !this.insp) return;
    this.code.hidden = !on;
    this.insp.setAttribute('aria-pressed', String(on));
  }

  /** The host (motion) switches the frame · every second round it inspects the code. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('svc');
    await c.sleep(1500, signal);
    for (let n = 0; ; n++) {
      if (this.recentlyTouched) {
        await c.sleep(900, signal);
        continue;
      }
      const nx = (this.v + 1) % this.opts.length;
      const opt = this.opts[nx];
      if (!opt || !this.frm) return;
      doing[host] = t('Çerçeveyi değiştiriyor');
      await c.go(host, { el: opt, fx: 0, fy: 0.5, dx: 12 }, signal);
      c.press(host);
      this.pick(nx);
      await c.sleep(500, signal);
      await c.go(host, { el: this.frm, fx: 1, fy: 1, dx: -4, dy: -4 }, signal, 1800);
      c.say(host, this.data.services[nx]?.say ?? '', 1400);
      await c.sleep(900, signal);
      if (n % 2 === 1 && this.insp) {
        await c.go(host, { el: this.insp, fx: 0.5, fy: 0.7 }, signal);
        c.press(host);
        this.inspect(true);
        await c.sleep(2600, signal);
        this.inspect(false);
      }
      c.home(host);
      await c.sleep(2600, signal);
    }
  };
}
