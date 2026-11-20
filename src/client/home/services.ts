/** 03 · Services: one frame that changes shape · an inspector that shows its CSS. */
import type { Crew } from '../lib/crew';
import { Loop } from '../lib/loops';
import { reducedMotion } from '../lib/motion';
import { LiveMocks } from './live';
import { Viewer } from './viewer';
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
  /** The motion frame's real loop (when a project has one): plays only while motion is picked. */
  private readonly loop = (() => {
    const v = $<HTMLVideoElement>('.fc-vid video');
    return v ? new Loop(v, false) : null;
  })();

  /** Lodos and Pocket work under the visitor's pointer (live.ts). */
  private readonly live = new LiveMocks(() => {
    this.manualAt = Date.now();
  });

  /** Narrow screens: Lodos and Pocket open full screen (viewer.ts). */
  private readonly viewer = new Viewer(this.live, (fc) =>
    fc.dataset.fca !== undefined
      ? `${this.data.services[1]?.lab ?? ''} · Pocket · Android`
      : `${this.data.services[this.v]?.lab ?? ''} · ${this.v === 0 ? 'Lodos' : 'Pocket · iOS'}`,
  );
  private narrow = false;

  constructor(
    private readonly data: HomeData,
    crew: Crew | null = null,
  ) {
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
    if (!crew?.animates('svc') && !reducedMotion() && !document.documentElement.classList.contains('still')) this.alone();
    // The list's height depends on its letters: measure again once the fonts are in.
    void document.fonts?.ready.then(() => this.align());
    if (this.viewer.ok) {
      const fxp = $<HTMLButtonElement>('[data-fxp]');
      if (fxp) {
        fxp.hidden = false;
        fxp.addEventListener('click', () => this.expand());
      }
      // Too small to use in place: a tap opens it full screen (before the frame itself hears it).
      // The selected frame's clip · and the Android artboard beside the iPhone.
      const mine = () => this.narrow && this.v <= 1;
      const clips: [HTMLElement | null, () => HTMLElement | null][] = [
        [$('.clip', this.frm ?? document), () => $(`[data-fc="${this.v}"]`)],
        [$('.clip2'), () => $('[data-fca]')],
      ];
      for (const [clip, which] of clips) {
        clip?.addEventListener('pointerdown', (e) => mine() && e.stopPropagation(), true);
        clip?.addEventListener(
          'click',
          (e) => {
            if (!mine()) return;
            e.stopPropagation();
            e.preventDefault();
            this.expand(which());
          },
          true,
        );
      }
    }
  }

  private expand(fc = $(`[data-fc="${this.v}"]`)): void {
    if (fc && this.v <= 1) {
      this.manualAt = Date.now();
      this.viewer.open(fc);
    }
  }

  /** The 1440 layout needs 890 px for the widest frame. Smaller stages scale it down. */
  private fit(): void {
    if (!this.stage || !this.scaler) return;
    const w = this.stage.clientWidth;
    const k = Math.min(1, w / 890);
    this.scaler.style.setProperty('--k', k.toFixed(3));
    this.narrow = k < 0.75;
    this.stage.classList.toggle('nw', this.narrow);
    this.align(k);
  }

  /** Each frame's height (frame pixels) when it ends with the list · one per option (align). */
  private tall: number[] = [];

  /**
   * The website · identity · motion and automation frames end where the list on their left ends
   * with their own row open (the rows' words differ in length): --hl in frame pixels. Only side by
   * side · else 720. The phones keep their own size. The stage is tall enough for the tallest of them
   * whichever frame is on show, so nothing below moves when the frames change.
   */
  private align(k = Number(this.scaler?.style.getPropertyValue('--k')) || 1): void {
    const frm = this.frm;
    const stage = this.stage;
    const opts = this.opts[0]?.parentElement;
    if (!frm || !stage || !opts) return;
    const side = opts.getBoundingClientRect().right <= stage.getBoundingClientRect().left + 1;
    // The list as it is once a row is open (the open rows may be mid transition). Measured in the
    // same fractional pixels as the list's edge (offsetHeight rounds: the stage drifted by a pixel).
    const open = $$<HTMLElement>('.od', opts).reduce((s, od) => s + od.getBoundingClientRect().height, 0);
    const bottom = opts.getBoundingClientRect().bottom - open;
    const top = frm.getBoundingClientRect().top;
    this.tall = this.opts.map((o) => {
      const h = side ? (bottom + ($<HTMLElement>('.odi', o)?.scrollHeight ?? 0) - top) / k : 720;
      return Math.round(Math.min(860, Math.max(700, h)));
    });
    frm.style.setProperty('--hl', `${this.tall[this.v] ?? 720}px`);
    const most = Math.max(610, ...this.tall);
    stage.style.height = `${Math.round(Math.max(k < 1 ? 700 * k + 90 : 780, 64 + most * k + 56))}px`;
  }

  get current(): number {
    return this.v;
  }

  get recentlyTouched(): boolean {
    return Date.now() - this.manualAt < 12_000;
  }

  /**
   * No team below the hero (a touch screen): the frames change by themselves every few seconds
   * while the stage is on screen · the visitor's first choice (a chip · the frame · full screen)
   * makes it theirs for good.
   */
  private alone(): void {
    const stage = this.stage;
    if (!stage) return;
    let shown = false;
    let timer = 0;
    const tick = () => {
      timer = 0;
      if (!shown || this.manualAt) return;
      if (!this.live.holding) this.pick((this.v + 1) % this.opts.length);
      timer = window.setTimeout(tick, 6500);
    };
    new IntersectionObserver(
      (es) => {
        shown = es.some((e) => e.isIntersecting);
        if (shown && !timer && !this.manualAt) timer = window.setTimeout(tick, 4200);
        else if (!shown && timer) {
          clearTimeout(timer);
          timer = 0;
        }
      },
      { threshold: 0.6 },
    ).observe(stage);
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
    // A phone: the picked row's words under the frame · its chip comes into the row's view.
    $$('[data-sd]').forEach((d, j) => d.classList.toggle('on', j === i));
    const row = this.opts[i]?.parentElement;
    const chip = this.opts[i];
    if (row && chip && row.scrollWidth > row.clientWidth + 1) {
      const pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      const left = chip.offsetLeft - row.offsetLeft - pad;
      const right = left + chip.offsetWidth + 2 * pad - row.clientWidth;
      if (left < row.scrollLeft || right > row.scrollLeft) row.scrollTo({ left: left < row.scrollLeft ? left : right, behavior: 'smooth' });
    }
    this.frm.className = 'frm v' + i;
    $$('[data-fc]').forEach((f, j) => f.classList.toggle('on', j === i));
    $('[data-fca]')?.classList.toggle('on', i === 1);
    this.live.shown(i);
    this.loop?.set(i === 3);
    const lab = $('[data-frmlab]');
    if (lab) lab.textContent = sv.lab;
    const size = $('[data-frmsize]');
    if (size) size.textContent = sv.size;
    if (this.code) this.code.textContent = sv.code;
    this.inspect(false);
    this.align();
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
      if (this.recentlyTouched || this.live.holding) {
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
