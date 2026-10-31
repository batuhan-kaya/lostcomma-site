/**
 * The team cursors (design · code · motion) plus the visitor's "you" tag.
 *
 * Rules from the approved design:
 *  - In the hero the whole team is on stage. They are born from the avatars in the header.
 *  - Below the hero only one calm host is visible: the section's data-host or the page's.
 *  - On touch screens the team only appears in the hero.
 *  - prefers-reduced-motion: cursors snap to their spots · no drift · no scenes.
 *
 * Where a cursor rests is set in markup with anchors inside a [data-sec] section:
 *   <h1 data-rest="design" data-rest-at="end">…</h1>
 *   <svg data-rest="host" data-rest-at="0.35 0.5">…</svg>   (whoever hosts that section)
 * Without an anchor a cursor falls back to a spot inside the section box.
 *
 * Pages add little scripted moments per section with crew.addScenes({ hero: async (c, signal) => … }).
 */
import { clampPoint, drift, HOP_DIST, parseRestAt, pickSection, probeLine, SECTION_SETTLE_MS, shouldFlip, step, stepsFor, TEAM, type Name } from './crew-math';
import { reducedMotion } from './motion';
import { t } from './t';

export type { Name } from './crew-math';

export interface Target {
  /** A fixed point in root coordinates (used by the idle gather). */
  at?: { x: number; y: number };
  el?: Element | null;
  /** Re-queried when el is gone (markup re-rendered). */
  sel?: string;
  end?: boolean;
  fx?: number;
  fy?: number;
  dx?: number;
  dy?: number;
  /** Resting spots get the idle drift. Scene targets do not. */
  rest?: boolean;
}

export type Scene = (crew: Crew, signal: AbortSignal) => Promise<void>;

interface Cursor {
  name: Name;
  el: HTMLElement;
  bub: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: Target | null;
  arrived: boolean;
  hidden: boolean;
  born: boolean;
  flipped: boolean;
  phase: number;
  timer: number;
  sayTimer: number;
  /** Positioned on stage. Until then the loop leaves it alone. */
  placed: boolean;
}

/** Fallback spots (fractions of the section box) when a section has no anchors. */
const HERO_SPOTS: Record<Name, [number, number]> = { design: [0.62, 0.42], code: [0.78, 0.7], motion: [0.86, 0.22] };
const HOST_SPOT: [number, number] = [0.8, 0.38];
const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';

export class Crew {
  readonly root: HTMLElement;
  readonly reduce: boolean;
  readonly touch: boolean;
  private readonly layer: HTMLElement;
  private readonly you: HTMLElement;
  private readonly cursors: Record<Name, Cursor>;
  private readonly scenes = new Map<string, Scene>();
  private readonly said = new Set<string>();
  private section: string | null = null;
  private candidate: string | null = null;
  private candidateAt = 0;
  private ctrl: AbortController | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private started = false;
  private pointer: { x: number; y: number } | null = null;
  private idleOn = false;
  private idle = false;
  private lastActive = 0;

  constructor(root: HTMLElement, opts: { reduce?: boolean; touch?: boolean } = {}) {
    this.root = root;
    this.reduce = opts.reduce ?? reducedMotion();
    this.touch = opts.touch ?? matchMedia('(hover: none), (pointer: coarse)').matches;

    this.layer = document.createElement('div');
    this.layer.className = 'crew' + (this.touch ? ' touch' : '');
    this.layer.setAttribute('aria-hidden', 'true');

    const make = (name: Name, i: number): Cursor => {
      const el = document.createElement('div');
      el.className = `cur c-${name} zz`;
      el.dataset.cur = name;
      el.innerHTML = `<svg class="arw" viewBox="0 0 24 24"><path d="${ARROW}"></path></svg><span class="tag">${name}</span><span class="bub"></span>`;
      this.layer.append(el);
      return {
        name,
        el,
        bub: el.querySelector('.bub') as HTMLElement,
        x: -300,
        y: -300,
        vx: 0,
        vy: 0,
        target: null,
        arrived: false,
        hidden: true,
        born: false,
        flipped: false,
        phase: i * 1.9 + 0.3,
        timer: 0,
        sayTimer: 0,
        placed: false,
      };
    };
    this.cursors = { design: make('design', 0), code: make('code', 1), motion: make('motion', 2) };

    this.you = document.createElement('div');
    this.you.className = 'you c-you';
    this.you.dataset.you = '';
    const label = document.createElement('span');
    label.textContent = t('sen');
    this.you.append(label);
    this.layer.append(this.you);

    root.append(this.layer);
    this.tick = this.tick.bind(this);
  }

  /* ---------------- public API for pages ---------------- */

  addScenes(map: Record<string, Scene>): void {
    for (const [k, v] of Object.entries(map)) this.scenes.set(k, v);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const onScroll = () => {
      this.lastActive = performance.now();
      this.wake();
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    if (!this.touch) {
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        this.pointer = { x: e.clientX, y: e.clientY };
        this.lastActive = performance.now();
        if (this.idle) this.wakeFromIdle();
        this.placeYou();
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => {
        this.pointer = null;
        this.you.classList.remove('on');
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.wake();
    });
    this.pickNow(true);
    this.wake();
  }

  /** Which cursor hosts a section below the hero. */
  hostOf(sec: string): Name {
    const v = this.sec(sec)?.dataset.host ?? this.root.dataset.host;
    return (TEAM as readonly string[]).includes(v ?? '') ? (v as Name) : 'design';
  }

  /** The section the crew is in right now. */
  get current(): string | null {
    return this.section;
  }

  /** Whether scenes play in a section (never with reduced motion · only the hero on touch screens). */
  animates(sec: string): boolean {
    return !this.reduce && (sec === 'hero' || !this.touch);
  }

  /**
   * Below the hero only one cursor shows at a time. Hand the stage to `name`:
   * the others fade · `name` appears near its spot (or near where go() sends it next).
   */
  cast(name: Name): void {
    const sec = this.section;
    if (!sec || sec === 'hero' || this.touch) return;
    for (const n of TEAM) {
      const c = this.cursors[n];
      if (n !== name) {
        if (!c.hidden) this.fade(c);
        continue;
      }
      if (c.hidden) {
        const tg = this.restTarget(sec, n);
        if (tg) this.appear(c, tg, 120);
      }
    }
  }

  /**
   * Homepage only: after 20 s without a move the visible cursors gather around the visitor's
   * pointer and ask if they are still there. Any move sends them back.
   */
  enableIdle(): void {
    this.idleOn = true;
    this.lastActive = performance.now();
  }

  q<E extends Element = HTMLElement>(sel: string): E | null {
    return this.root.querySelector<E>(sel);
  }

  /** Move a cursor and wait until it settles (or maxMs passes). */
  async go(name: Name, target: Target, signal: AbortSignal, maxMs = 4200): Promise<void> {
    const c = this.cursors[name];
    if (c.hidden) return;
    c.target = target;
    c.arrived = false;
    this.wake();
    const t0 = performance.now();
    await this.sleep(80, signal);
    while (!c.arrived && performance.now() - t0 < maxMs) await this.sleep(50, signal);
  }

  /** Point a cursor somewhere without waiting (typing along a line of text). */
  aim(name: Name, target: Target): void {
    const c = this.cursors[name];
    if (c.hidden) return;
    c.target = target;
    c.arrived = false;
    this.wake();
  }

  /** Is this cursor on stage right now? */
  visible(name: Name): boolean {
    return !this.cursors[name].hidden;
  }

  /** Send a cursor back to its resting spot in the current section. */
  home(name: Name): void {
    const c = this.cursors[name];
    if (c.hidden || !this.section) return;
    const r = this.restTarget(this.section, name);
    if (r) {
      c.target = r;
      c.arrived = false;
      this.wake();
    }
  }

  say(name: Name, text: string, ms = 2200): void {
    const c = this.cursors[name];
    if (c.hidden) return;
    c.bub.textContent = text;
    c.el.classList.add('say');
    clearTimeout(c.sayTimer);
    c.sayTimer = window.setTimeout(() => c.el.classList.remove('say'), ms);
  }

  /** say() once per page view. */
  once(key: string, name: Name, text: string, ms?: number): void {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.say(name, text, ms);
  }

  press(name: Name): void {
    const el = this.cursors[name].el;
    el.classList.add('pr');
    window.setTimeout(() => el.classList.remove('pr'), 180);
  }

  sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const id = window.setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(id);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /** For tests and debugging. */
  state(): { section: string | null; visible: Name[] } {
    return { section: this.section, visible: TEAM.filter((n) => !this.cursors[n].hidden) };
  }

  /* ---------------- sections ---------------- */

  private sec(name: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`[data-sec="${name}"]`);
  }

  private pickNow(force = false): void {
    const probe = probeLine(innerHeight);
    const bands = [...this.root.querySelectorAll<HTMLElement>('[data-sec]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.dataset.sec ?? '', top: r.top, bottom: r.bottom };
    });
    const best = pickSection(bands, probe, scrollY < 24);
    const now = performance.now();
    if (best !== this.candidate) {
      this.candidate = best;
      this.candidateAt = now;
    }
    if (best && best !== this.section && (force || !this.section || now - this.candidateAt > SECTION_SETTLE_MS)) this.run(best);
  }

  private run(sec: string): void {
    this.ctrl?.abort(new DOMException('section changed', 'AbortError'));
    const ctrl = new AbortController();
    this.ctrl = ctrl;
    this.section = sec;
    const team = sec === 'hero';
    const host = this.hostOf(sec);

    TEAM.forEach((name, i) => {
      const c = this.cursors[name];
      const show = team || (!this.touch && name === host);
      const target = show ? (this.restTarget(sec, name) ?? this.restTarget('hero', name)) : null;
      if (!target) return this.fade(c);
      if (c.hidden) return this.appear(c, target, team ? 500 + i * 320 : 260);
      const p = this.point(target);
      if (p && Math.hypot(p.x - c.x, p.y - c.y) > HOP_DIST && !this.reduce) this.hop(c, target);
      else {
        c.target = target;
        c.arrived = false;
      }
    });
    this.placeYou();

    const scene = this.scenes.get(sec);
    if (scene && this.animates(sec)) {
      scene(this, ctrl.signal).catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError')) console.error('[crew]', e);
      });
    }
    this.wake();
  }

  private restTarget(sec: string, name: Name): Target | null {
    const S = this.sec(sec);
    if (!S) return null;
    const isHost = sec !== 'hero' && name === this.hostOf(sec);
    const anchor = S.querySelector(`[data-rest~="${name}"]`) ?? (isHost ? S.querySelector('[data-rest~="host"]') : null);
    if (anchor) {
      const narrow = this.root.clientWidth < 700 && anchor.getAttribute('data-rest-at-m');
      const at = parseRestAt(narrow || anchor.getAttribute('data-rest-at'));
      return at.end ? { el: anchor, end: true, dx: at.dx, dy: at.dy, rest: true } : { el: anchor, fx: at.fx, fy: at.fy, dx: at.dx, dy: at.dy, rest: true };
    }
    const [fx, fy] = sec === 'hero' ? HERO_SPOTS[name] : HOST_SPOT;
    return { el: S, fx, fy, rest: true };
  }

  /* ---------------- appearing and hopping ---------------- */

  private fade(c: Cursor): void {
    c.hidden = true;
    c.placed = false;
    c.target = null;
    clearTimeout(c.timer);
    c.el.classList.add('zz');
    c.el.classList.remove('say');
  }

  private appear(c: Cursor, target: Target, delay: number): void {
    c.hidden = false;
    c.placed = false;
    c.target = null;
    clearTimeout(c.timer);
    c.timer = window.setTimeout(() => {
      if (c.hidden) return;
      // A scene may already have sent it somewhere (cast then go): start near there.
      const tg = c.target ?? target;
      const p = this.point(tg);
      if (!p) return;
      let sx = p.x - 60;
      let sy = p.y - 40;
      if (!c.born) {
        c.born = true;
        const av = this.root.querySelector(`[data-av="${c.name}"]`);
        const b = av?.getBoundingClientRect();
        if (b && b.width > 0) {
          const rr = this.root.getBoundingClientRect();
          sx = b.left + b.width / 2 - rr.left;
          sy = b.top + b.height / 2 - rr.top;
        }
      }
      if (this.reduce) {
        sx = p.x;
        sy = p.y;
      }
      Object.assign(c, { x: sx, y: sy, vx: 0, vy: 0, target: tg, arrived: false, placed: true });
      this.render(c, 0);
      c.el.classList.remove('zz');
      this.wake();
    }, this.reduce ? 0 : delay);
  }

  /** Too far to fly calmly: fade out · reappear near the target · glide the last bit. */
  private hop(c: Cursor, target: Target): void {
    c.el.classList.add('zz');
    c.target = null;
    clearTimeout(c.timer);
    c.timer = window.setTimeout(() => {
      if (c.hidden) return;
      const p = this.point(target);
      if (!p) return;
      Object.assign(c, { x: p.x - 50, y: p.y - 34, vx: 0, vy: 0, target, arrived: false, placed: true });
      this.render(c, 0);
      c.el.classList.remove('zz');
      this.wake();
    }, 460);
  }

  /* ---------------- geometry ---------------- */

  /** Target position in root coordinates. */
  private point(tg: Target): { x: number; y: number } | null {
    if (tg.at) return clampPoint(tg.at.x, tg.at.y, this.root.clientWidth);
    let el = tg.el;
    if ((!el || !el.isConnected) && tg.sel) el = tg.el = this.root.querySelector(tg.sel);
    if (!el || !el.isConnected) return null;
    const rr = this.root.getBoundingClientRect();
    let x: number;
    let y: number;
    if (tg.end) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      const r = rects[rects.length - 1] ?? el.getBoundingClientRect();
      x = r.right - rr.left + (tg.dx ?? 10);
      y = r.top + r.height * 0.55 - rr.top + (tg.dy ?? 0);
    } else {
      const r = el.getBoundingClientRect();
      x = r.left + r.width * (tg.fx ?? 0.5) - rr.left + (tg.dx ?? 0);
      y = r.top + r.height * (tg.fy ?? 0.5) - rr.top + (tg.dy ?? 0);
    }
    return clampPoint(x, y, this.root.clientWidth);
  }

  private placeYou(): void {
    const hero = this.sec('hero');
    if (!this.pointer || this.touch || !hero) {
      this.you.classList.remove('on');
      return;
    }
    const rr = this.root.getBoundingClientRect();
    const x = this.pointer.x - rr.left;
    const y = this.pointer.y - rr.top;
    const h = hero.getBoundingClientRect();
    const inHero = this.pointer.y < h.bottom - 20 && this.section === 'hero';
    this.you.style.transform = `translate3d(${(x + 14).toFixed(1)}px,${(y + 22).toFixed(1)}px,0)`;
    this.you.classList.toggle('on', inHero);
  }

  /* ---------------- idle gather ---------------- */

  private goIdle(): void {
    if (!this.pointer) return;
    this.idle = true;
    this.ctrl?.abort(new DOMException('idle', 'AbortError'));
    const rr = this.root.getBoundingClientRect();
    const m = { x: this.pointer.x - rr.left, y: this.pointer.y - rr.top };
    const off: Record<Name, [number, number]> = { design: [-120, -90], code: [80, -70], motion: [-50, 96] };
    const visible = TEAM.filter((n) => !this.cursors[n].hidden);
    for (const n of visible) {
      const c = this.cursors[n];
      c.target = { at: { x: m.x + off[n][0], y: m.y + off[n][1] } };
      c.arrived = false;
    }
    const first = visible[0];
    if (first) window.setTimeout(() => this.idle && this.say(first, t('hâlâ burada mısın?'), 3200), 1400);
  }

  private wakeFromIdle(): void {
    this.idle = false;
    const sec = this.section;
    if (!sec) return;
    this.section = null;
    this.run(sec);
    const first = TEAM.find((n) => !this.cursors[n].hidden);
    if (first) this.say(first, t('a selam'), 1400);
  }

  /* ---------------- loop ---------------- */

  private wake(): void {
    if (!this.raf && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick(now: number): void {
    this.raf = 0;
    this.pickNow();
    const { steps, rest } = stepsFor(this.acc, now - this.last);
    this.acc = rest;
    this.last = now;

    let moving = false;
    for (const name of TEAM) {
      const c = this.cursors[name];
      if (c.hidden || !c.placed || !c.target) continue;
      const p = this.point(c.target);
      if (!p) continue;
      if (this.reduce) {
        c.x = p.x;
        c.y = p.y;
        c.arrived = true;
      } else {
        for (let i = 0; i < steps; i++) c.arrived = step(c, p.x, p.y);
        moving = true;
      }
      this.render(c, now);
    }
    if (this.pointer) this.placeYou();
    if (this.idleOn && !this.idle && this.pointer && now - this.lastActive > 20_000) this.goIdle();
    // Keep ticking while anyone is on stage (the idle drift) or a section change is pending.
    // With reduced motion everything is still: scroll and resize wake the loop again.
    const pending = this.candidate !== this.section;
    if ((moving || pending) && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  private render(c: Cursor, now: number): void {
    const d = c.target?.rest && !this.reduce ? drift(now, c.phase) : { dx: 0, dy: 0 };
    const flip = shouldFlip(c.x, this.root.clientWidth);
    if (flip !== c.flipped) {
      c.flipped = flip;
      c.el.classList.toggle('flip', flip);
    }
    c.el.style.transform = `translate3d(${(c.x + d.dx).toFixed(1)}px,${(c.y + d.dy).toFixed(1)}px,0)`;
  }
}

let crew: Crew | null = null;

/** One crew per page. Pages call this to add their scenes. */
export function getCrew(): Crew | null {
  if (crew) return crew;
  const root = document.querySelector<HTMLElement>('[data-root]');
  if (!root || !root.querySelector('[data-sec]')) return null;
  crew = new Crew(root);
  return crew;
}
