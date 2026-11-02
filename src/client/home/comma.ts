/**
 * The shy comma. The studio lost its comma · it shows up now and then · runs from the pointer
 * twice · gives up the third time. Catch it and it joins the team for good (remembered on
 * this browser · the logo and the footer get their comma back on every page).
 */
import type { Crew } from '../lib/crew';
import { between, Clock, step } from '../lib/crew-math';
import { reducedMotion } from '../lib/motion';
import { track } from '../lib/stats';
import { t } from '../lib/t';
import { $ } from './shared';

const KEY = 'lc-comma';
const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';
const FAST = { damping: 0.68, pull: 0.1, maxSpeed: 95, arriveDist: 5, arriveSpeed: 1 };

export function isFound(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export class Comma {
  private readonly el: HTMLButtonElement;
  private readonly bub: HTMLElement;
  private readonly body = { x: -300, y: -300, vx: 0, vy: 0 };
  /** Where it was one step ago (the cursors' clock · the same pace on every screen). */
  private readonly prev = { x: -300, y: -300 };
  private readonly clock = new Clock();
  private target = { x: -300, y: -300 };
  private on = false;
  private flees = 0;
  private cool = 0;
  private hideAt = 0;
  private next = performance.now() + 15_000;
  private raf = 0;
  private pointer: { x: number; y: number } | null = null;
  private sayTimer = 0;
  private readonly reduce = reducedMotion();

  constructor(
    private readonly root: HTMLElement,
    private readonly crew: Crew | null,
  ) {
    const layer = document.createElement('div');
    layer.className = 'egglayer';
    this.el = document.createElement('button');
    this.el.type = 'button';
    this.el.className = 'cur c-comma egg';
    this.el.tabIndex = -1;
    this.el.setAttribute('aria-label', t('Utangaç bir virgül. Yakala.'));
    this.el.innerHTML = `<svg class="arw" viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW}"></path></svg><span class="tag">comma</span><span class="bub"></span>`;
    this.bub = this.el.querySelector('.bub') as HTMLElement;
    layer.append(this.el);
    root.append(layer);
    this.el.addEventListener('click', () => this.caught());
    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        const rr = root.getBoundingClientRect();
        this.pointer = { x: e.clientX - rr.left, y: e.clientY - rr.top };
        this.flee();
      },
      { passive: true },
    );
    if (isFound()) this.markFound();
    if (!this.reduce && !isFound()) this.loop();
  }

  private say(txt: string, ms: number): void {
    this.bub.textContent = txt;
    this.el.classList.add('say');
    clearTimeout(this.sayTimer);
    this.sayTimer = window.setTimeout(() => this.el.classList.remove('say'), ms);
  }

  /** A random spot in the visible part of the current section, away from the pointer. */
  private spot(): { x: number; y: number } {
    const rr = this.root.getBoundingClientRect();
    const sec = this.root.querySelector(`[data-sec="${this.crew?.current ?? 'hero'}"]`) ?? this.root;
    const b = sec.getBoundingClientRect();
    const top = Math.max(b.top, 80);
    const bottom = Math.min(b.bottom, innerHeight);
    const left = Math.max(b.left, 0);
    const right = Math.min(b.right, innerWidth);
    let best = { x: 400, y: 400 };
    for (let i = 0; i < 14; i++) {
      const p = {
        x: left + 90 + Math.random() * Math.max(10, right - left - 260) - rr.left,
        y: top + 60 + Math.random() * Math.max(10, bottom - top - 200) - rr.top,
      };
      best = p;
      if (!this.pointer || Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y) > 340) return p;
    }
    return best;
  }

  private loop(): void {
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      if (!this.on && now > this.next && this.crew?.current && !document.hidden) {
        const s = this.spot();
        Object.assign(this.body, { x: s.x, y: s.y, vx: 0, vy: 0 });
        Object.assign(this.prev, s);
        this.clock.reset();
        this.target = s;
        this.el.classList.add('in');
        this.on = true;
        this.flees = 0;
        this.hideAt = now + 9000;
        const lines = [t('psst'), t('selam?'), t('buradayım')];
        this.say(lines[Math.floor(Math.random() * lines.length)] ?? '', 1600);
      } else if (this.on && now > this.hideAt) {
        this.el.classList.remove('in');
        this.on = false;
        this.next = now + 24_000;
      }
      if (this.on) {
        const { steps, alpha } = this.clock.tick(now);
        for (let i = 0; i < steps; i++) {
          this.prev.x = this.body.x;
          this.prev.y = this.body.y;
          step(this.body, this.target.x, this.target.y, FAST);
        }
        const x = between(this.prev.x, this.body.x, alpha);
        const y = between(this.prev.y, this.body.y, alpha);
        this.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private flee(): void {
    if (!this.on || !this.pointer || this.flees >= 3) return;
    const now = performance.now();
    if (now < this.cool) return;
    if (Math.hypot(this.pointer.x - this.body.x - 20, this.pointer.y - this.body.y - 18) > 120) return;
    this.flees++;
    this.cool = now + 900;
    if (this.flees < 3) {
      this.target = this.spot();
      this.hideAt = Math.max(this.hideAt, now + 4500);
      this.say(this.flees === 1 ? t('yok') : t('çok yavaş'), 1300);
    } else {
      this.hideAt = now + 12_000;
      this.say(t('tamam tamam. yakaladın'), 3200);
    }
  }

  private markFound(): void {
    document.documentElement.classList.add('found');
    const av = $<HTMLButtonElement>('[data-av="comma"]');
    if (av) av.hidden = false;
    const note = $('[data-footnote]');
    if (note) note.textContent = t('Artık herkes burada');
  }

  private caught(): void {
    if (isFound()) return;
    track('comma');
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* private mode: found for this visit only */
    }
    this.markFound();
    this.say(t('beni bulduğun için teşekkürler'), 2600);
    window.setTimeout(() => {
      this.el.classList.remove('in');
      cancelAnimationFrame(this.raf);
      this.on = false;
      if (this.crew?.current === 'hero') this.crew.say('design', t('tekrar hoş geldin'), 2000);
    }, 2800);
  }
}
