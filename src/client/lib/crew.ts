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
 * A resting spot is nudged a few pixels when the arrow or the tag would cover text people read.
 *
 * Pages add little scripted moments per section with crew.addScenes({ hero: async (c, signal) => … }).
 *
 * Cost: the spring runs in requestAnimationFrame only while someone is moving. A settled team
 * stops the loop · the resting drift is a CSS animation (compositor only) · a slow watch notices
 * when the page moves under a resting cursor (content opened · images arrived · a resize).
 */
import { between, clampPoint, clearSpot, Clock, fitShift, HOP_DIST, parseRestAt, pickSection, probeLine, SECTION_SETTLE_MS, settled, shouldFlip, step, TEAM, type Box, type Name } from './crew-math';
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
  /** The inner wrapper that carries the CSS drift. */
  dr: HTMLElement;
  tag: HTMLElement;
  bub: HTMLElement;
  x: number;
  y: number;
  /** Where it was one step ago: frames between two steps are drawn in between. */
  px: number;
  py: number;
  vx: number;
  vy: number;
  target: Target | null;
  arrived: boolean;
  /** Arrived and still: the loop can stop for this one. */
  still: boolean;
  /** The CSS drift is on. */
  resting: boolean;
  hidden: boolean;
  born: boolean;
  flipped: boolean;
  saying: boolean;
  tagW: number;
  bubW: number;
  /** How far the bubble slides to stay on the page. */
  shift: number;
  timer: number;
  sayTimer: number;
  /** Positioned on stage. Until then the loop leaves it alone. */
  placed: boolean;
}

/** Fallback spots (fractions of the section box) when a section has no anchors. */
const HERO_SPOTS: Record<Name, [number, number]> = { design: [0.62, 0.42], code: [0.78, 0.7], motion: [0.86, 0.22] };
const HOST_SPOT: [number, number] = [0.8, 0.38];
const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';
/** How often the watch looks for a page that moved under a resting cursor. */
const WATCH_MS = 700;
/** Text at least this large is a display headline: the arrow may point into it · the tag keeps off. */
const BIG_TEXT = 40;

export class Crew {
  readonly root: HTMLElement;
  /** The visitor's OS asked for less motion. */
  private readonly osReduce: boolean;
  /** A page switch asked for less motion (Studio · Display · Reduce motion). */
  private calmOn = false;
  readonly touch: boolean;
  private readonly layer: HTMLElement;
  private readonly you: HTMLElement;
  private readonly cursors: Record<Name, Cursor>;
  private readonly scenes = new Map<string, Scene>();
  private readonly said = new Set<string>();
  /** Lines of text per section (viewport boxes) · kept for a moment (one section change asks three times). */
  private readonly lines = new Map<string, { at: number; boxes: Box[] }>();
  private section: string | null = null;
  private candidate: string | null = null;
  private candidateAt = 0;
  private ctrl: AbortController | null = null;
  private raf = 0;
  /** Fixed 60 Hz steps drawn in between on fast screens (crew-math.ts). */
  private clock = new Clock();
  /** How far this frame is between the last two steps. */
  private alpha = 1;
  private started = false;
  private width = 0;
  private resizeTimer = 0;
  private watched = 0;
  private pointer: { x: number; y: number } | null = null;
  private idleOn = false;
  private idle = false;
  private lastActive = 0;

  constructor(root: HTMLElement, opts: { reduce?: boolean; touch?: boolean } = {}) {
    this.root = root;
    this.osReduce = opts.reduce ?? reducedMotion();
    this.touch = opts.touch ?? matchMedia('(hover: none), (pointer: coarse)').matches;

    this.layer = document.createElement('div');
    this.layer.className = 'crew' + (this.touch ? ' touch' : '');
    this.layer.setAttribute('aria-hidden', 'true');

    const make = (name: Name): Cursor => {
      const el = document.createElement('div');
      el.className = `cur c-${name} zz`;
      el.dataset.cur = name;
      el.innerHTML = `<span class="dr"><svg class="arw" viewBox="0 0 24 24"><path d="${ARROW}"></path></svg><span class="tag">${name}</span><span class="bub"></span></span>`;
      this.layer.append(el);
      return {
        name,
        el,
        dr: el.firstElementChild as HTMLElement,
        tag: el.querySelector('.tag') as HTMLElement,
        bub: el.querySelector('.bub') as HTMLElement,
        x: -300,
        y: -300,
        px: -300,
        py: -300,
        vx: 0,
        vy: 0,
        target: null,
        arrived: false,
        still: false,
        resting: false,
        hidden: true,
        born: false,
        flipped: false,
        saying: false,
        tagW: 0,
        bubW: 0,
        shift: 0,
        timer: 0,
        sayTimer: 0,
        placed: false,
      };
    };
    this.cursors = { design: make('design'), code: make('code'), motion: make('motion') };

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
    this.width = this.root.clientWidth;
    addEventListener('scroll', () => {
      this.lastActive = performance.now();
      this.wake();
    }, { passive: true });
    addEventListener('resize', () => this.resized(), { passive: true });
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
    // Late fonts change line lengths: look again once they are in. (fonts.ready alone can
    // resolve before the page has asked for a single font · loadingdone and load come after.)
    document.fonts?.addEventListener('loadingdone', () => this.resized());
    if (document.readyState !== 'complete') addEventListener('load', () => this.resized(), { once: true });
    window.setInterval(() => this.watch(), WATCH_MS);
    this.pickNow(true);
    this.wake();
  }

  /** Less motion: from the OS or from a page switch. Cursors snap · no drift · no scenes. */
  get reduce(): boolean {
    return this.osReduce || this.calmOn;
  }

  /** Turn the page switch on or off. On stops the running scene and closes the bubbles. */
  calm(on: boolean): void {
    if (on === this.calmOn) return;
    this.calmOn = on;
    if (on) {
      this.ctrl?.abort(new DOMException('calm', 'AbortError'));
      for (const n of TEAM) {
        const c = this.cursors[n];
        this.hush(c);
        this.unrest(c, false);
      }
      document.documentElement.classList.add('still');
    } else document.documentElement.classList.remove('still');
    for (const n of TEAM) this.cursors[n].still = false;
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
    this.send(c, target);
    const t0 = performance.now();
    await this.sleep(80, signal);
    while (!c.arrived && performance.now() - t0 < maxMs) await this.sleep(50, signal);
  }

  /** Point a cursor somewhere without waiting (typing along a line of text). */
  aim(name: Name, target: Target): void {
    const c = this.cursors[name];
    if (c.hidden) return;
    this.send(c, target);
  }

  /** Where a cursor's arrow tip is right now in viewport coordinates · null when it is off stage. */
  tip(name: Name): { x: number; y: number } | null {
    const c = this.cursors[name];
    if (c.hidden || !c.placed) return null;
    const rr = this.root.getBoundingClientRect();
    return { x: rr.left + c.x + 3, y: rr.top + c.y + 2 };
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
    if (r) this.send(c, r);
  }

  say(name: Name, text: string, ms = 2618): void {
    const c = this.cursors[name];
    if (c.hidden) return;
    c.bub.textContent = text;
    c.el.classList.add('say');
    c.saying = true;
    c.bubW = c.bub.offsetWidth;
    this.render(c);
    clearTimeout(c.sayTimer);
    c.sayTimer = window.setTimeout(() => this.hush(c), ms);
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

  /** For tests and debugging. `running` is the animation loop (off once everyone has settled). */
  state(): { section: string | null; visible: Name[]; running: boolean } {
    return { section: this.section, visible: TEAM.filter((n) => !this.cursors[n].hidden), running: this.raf !== 0 };
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
    this.lines.delete(sec);
    // Lets page CSS adjust cursors per section (a blue cursor on a blue section).
    this.layer.dataset.sec = sec;
    const team = sec === 'hero';
    const host = this.hostOf(sec);

    TEAM.forEach((name, i) => {
      const c = this.cursors[name];
      const show = team || (!this.touch && name === host);
      const target = show ? (this.restTarget(sec, name) ?? this.restTarget('hero', name)) : null;
      if (!target) return this.fade(c);
      // Born one after the other on golden ratio steps: .618 s · then every .382 s.
      if (c.hidden) return this.appear(c, target, team ? 618 + i * 382 : 382);
      const p = this.point(target);
      if (p && Math.hypot(p.x - c.x, p.y - c.y) > HOP_DIST && !this.reduce) this.hop(c, target);
      else this.send(c, target);
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
    // The first anchor that is on the page right now (one inside a hidden panel would send the
    // cursor to the top left corner).
    const shown = (sel: string) => [...S.querySelectorAll(sel)].find((a) => a.getClientRects().length > 0) ?? null;
    const anchor = shown(`[data-rest~="${name}"]`) ?? (isHost ? shown('[data-rest~="host"]') : null);
    let tg: Target;
    if (anchor) {
      const narrow = this.root.clientWidth < 700 && anchor.getAttribute('data-rest-at-m');
      const at = parseRestAt(narrow || anchor.getAttribute('data-rest-at'));
      tg = at.end ? { el: anchor, end: true, dx: at.dx, dy: at.dy, rest: true } : { el: anchor, fx: at.fx, fy: at.fy, dx: at.dx, dy: at.dy, rest: true };
    } else {
      const [fx, fy] = sec === 'hero' ? HERO_SPOTS[name] : HOST_SPOT;
      tg = { el: S, fx, fy, rest: true };
    }
    return this.clear(sec, S, this.cursors[name], tg);
  }

  /* ---------------- keeping text readable ---------------- */

  /** Lines of text in a section (viewport boxes). Display headlines are marked big. */
  private linesOf(sec: string, S: HTMLElement): Box[] {
    const have = this.lines.get(sec);
    // Scenes rewrite text and scroll moves the boxes: never trust an old measurement for long.
    if (have && performance.now() - have.at < 300) return have.boxes;
    const out: Box[] = [];
    const walk = document.createTreeWalker(S, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    // Font size per element · 0 for text nobody can see (a hidden panel · a faded tab) and for
    // text far off screen (a long section: only what is near the view costs anything).
    const sizes = new Map<Element, number>();
    const top = -240;
    const bottom = innerHeight + 240;
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.nodeValue?.trim() || host.closest('.crew,[aria-hidden="true"]')) continue;
      let size = sizes.get(host);
      if (size === undefined) {
        const hr = host.getBoundingClientRect();
        const seen = hr.bottom > top && hr.top < bottom && (host.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) ?? true);
        size = seen ? parseFloat(getComputedStyle(host).fontSize) || 16 : 0;
        sizes.set(host, size);
      }
      if (!size) continue;
      const big = size >= BIG_TEXT;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        // A headline's line box is a little taller than its letters (ascenders reach close to the top).
        const inset = big ? r.height * 0.04 : 0;
        out.push({ left: r.left, top: r.top + inset, right: r.right, bottom: r.bottom - inset, big });
      }
    }
    this.lines.set(sec, { at: performance.now(), boxes: out });
    return out;
  }

  /** Nudge a resting spot off any text it would cover (arrow and tag). */
  private clear(sec: string, S: HTMLElement, c: Cursor, tg: Target): Target {
    const p = this.point(tg);
    if (!p) return tg;
    const lines = this.linesOf(sec, S);
    if (!lines.length) return tg;
    if (!c.tagW) c.tagW = c.tag.offsetWidth;
    const rr = this.root.getBoundingClientRect();
    const W = this.root.clientWidth;
    const A = this.touch ? 20 : 24;
    const L = this.touch ? 15 : 18;
    const T = this.touch ? 18 : 21;
    const H = c.tag.offsetHeight || 21;
    // Room for the resting drift (±6 · ±5) so the drift never wanders onto the words either.
    const px = 6;
    const py = 5;
    const boxesAt = (dx: number, dy: number): Box[] => {
      const { x, y } = clampPoint(p.x + dx, p.y + dy, W);
      const vx = rr.left + x;
      const vy = rr.top + y;
      const flip = shouldFlip(x, W, c.tagW);
      const tl = flip ? vx + A - 4 - c.tagW : vx + L;
      return [
        { left: vx + 2 - px, top: vy + 1 - py, right: vx + A * 0.72 + px, bottom: vy + A - 1 + py },
        { left: tl - px, top: vy + T - py, right: tl + c.tagW + px, bottom: vy + T + H + py, strict: true },
      ];
    };
    const [dx, dy] = clearSpot(boxesAt, lines, rr.left + W);
    if (!dx && !dy) return tg;
    return { ...tg, dx: (tg.dx ?? (tg.end ? 10 : 0)) + dx, dy: (tg.dy ?? 0) + dy };
  }

  /* ---------------- appearing and hopping ---------------- */

  /** A new target for a cursor that is on stage. */
  private send(c: Cursor, target: Target): void {
    this.unrest(c, true);
    c.target = target;
    c.arrived = false;
    c.still = false;
    this.wake();
  }

  private hush(c: Cursor): void {
    clearTimeout(c.sayTimer);
    c.el.classList.remove('say');
    c.saying = false;
    if (c.placed) this.render(c);
  }

  private fade(c: Cursor): void {
    c.hidden = true;
    c.placed = false;
    c.target = null;
    clearTimeout(c.timer);
    this.unrest(c, false);
    c.el.classList.add('zz');
    this.hush(c);
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
      this.unrest(c, false);
      c.tagW = c.tag.offsetWidth;
      Object.assign(c, { x: sx, y: sy, px: sx, py: sy, vx: 0, vy: 0, target: tg, arrived: false, still: false, placed: true });
      this.render(c);
      c.el.classList.remove('zz');
      this.wake();
    }, this.reduce ? 0 : delay);
  }

  /** Too far to fly calmly: fade out · reappear near the target · glide the last bit. */
  private hop(c: Cursor, target: Target): void {
    c.el.classList.add('zz');
    c.target = null;
    this.unrest(c, false);
    clearTimeout(c.timer);
    c.timer = window.setTimeout(() => {
      if (c.hidden) return;
      const p = this.point(target);
      if (!p) return;
      Object.assign(c, { x: p.x - 50, y: p.y - 34, px: p.x - 50, py: p.y - 34, vx: 0, vy: 0, target, arrived: false, still: false, placed: true });
      this.render(c);
      c.el.classList.remove('zz');
      this.wake();
    }, 618);
  }

  /** Start the resting drift (CSS) once a cursor is still at a resting spot. */
  private rest(c: Cursor): void {
    if (c.resting || this.reduce || !c.target?.rest) return;
    c.resting = true;
    c.el.classList.add('drifting');
  }

  /**
   * Stop the drift. With `keep` the drifted offset becomes the cursor's real position so it
   * glides on from exactly where it is (no jump back to the centre of the drift).
   */
  private unrest(c: Cursor, keep: boolean): void {
    if (!c.resting) return;
    if (keep && c.placed) {
      const a = c.dr.getBoundingClientRect();
      const b = c.el.getBoundingClientRect();
      c.x += a.left - b.left;
      c.y += a.top - b.top;
      c.px = c.x;
      c.py = c.y;
    }
    c.resting = false;
    c.el.classList.remove('drifting');
  }

  /* ---------------- geometry ---------------- */

  /** Target position in root coordinates. */
  private point(tg: Target): { x: number; y: number } | null {
    if (tg.at) return clampPoint(tg.at.x, tg.at.y, this.root.clientWidth);
    let el = tg.el;
    if ((!el || !el.isConnected) && tg.sel) el = tg.el = this.root.querySelector(tg.sel);
    // Gone or hidden (display none): no spot · the cursor stays where it is.
    if (!el || !el.isConnected || !el.getClientRects().length) return null;
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
    for (const n of visible) this.send(this.cursors[n], { at: { x: m.x + off[n][0], y: m.y + off[n][1] } });
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
      this.clock.reset();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** The page changed shape: new widths · new line breaks · maybe a new resting anchor (data-rest-at-m). */
  private resized(): void {
    this.lastActive = performance.now();
    this.wake();
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.width = this.root.clientWidth;
      this.lines.clear();
      const sec = this.section;
      if (!sec) return;
      for (const n of TEAM) {
        const c = this.cursors[n];
        if (c.hidden || !c.target?.rest) continue;
        const tg = this.restTarget(sec, n);
        if (tg) this.send(c, tg);
      }
    }, 160);
  }

  /**
   * Runs a few times a second while the loop sleeps: a section that changed without a scroll ·
   * a resting cursor whose anchor moved · the homepage's idle gather.
   */
  private watch(): void {
    if (this.raf || document.hidden || !this.started) return;
    if (this.idleOn && !this.idle && this.pointer && performance.now() - this.lastActive > 20_000) {
      this.goIdle();
      return;
    }
    this.pickNow();
    if (this.candidate !== this.section) return this.wake();
    for (const n of TEAM) {
      const c = this.cursors[n];
      if (c.hidden || !c.placed || !c.target) continue;
      const p = this.point(c.target);
      if (p && Math.hypot(p.x - c.x, p.y - c.y) > 1) {
        this.unrest(c, true);
        c.still = false;
        return this.wake();
      }
    }
    // Every other second: did words appear under a resting cursor (a scene changed a panel)?
    // Then it steps aside to the nearest clear spot.
    if (++this.watched % 3 || !this.section) return;
    for (const n of TEAM) {
      const c = this.cursors[n];
      if (c.hidden || !c.still || !c.target?.rest) continue;
      const tg = this.restTarget(this.section, n);
      if (tg && (tg.el !== c.target.el || tg.dx !== c.target.dx || tg.dy !== c.target.dy)) this.send(c, tg);
    }
  }

  private tick(now: number): void {
    this.raf = 0;
    this.pickNow();
    const { steps, alpha } = this.clock.tick(now);
    this.alpha = alpha;

    let moving = false;
    for (const name of TEAM) {
      const c = this.cursors[name];
      if (c.hidden || !c.placed || !c.target) continue;
      const p = this.point(c.target);
      if (!p) continue;
      if (this.reduce) {
        c.x = c.px = p.x;
        c.y = c.py = p.y;
        c.arrived = c.still = true;
      } else {
        if (c.still && Math.hypot(p.x - c.x, p.y - c.y) > 0.5) {
          // The spot moved under a resting cursor (a scene changed the text · a late image).
          this.unrest(c, true);
          c.still = false;
        }
        if (!c.still) {
          for (let i = 0; i < steps; i++) {
            c.px = c.x;
            c.py = c.y;
            c.arrived = step(c, p.x, p.y);
          }
          if (settled(c, p.x, p.y)) {
            Object.assign(c, { x: p.x, y: p.y, px: p.x, py: p.y, vx: 0, vy: 0, arrived: true, still: true });
            this.rest(c);
          } else moving = true;
        }
      }
      this.render(c);
    }
    if (this.pointer) this.placeYou();
    // Keep ticking only while someone is moving or a section change is pending.
    // Everyone settled: the loop stops · the drift is CSS · scroll · resize and the watch wake it.
    const pending = this.candidate !== this.section;
    if ((moving || pending) && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  private render(c: Cursor): void {
    const W = this.width || this.root.clientWidth;
    const need = Math.max(c.tagW, c.saying ? c.bubW : 0);
    // Drawn between its last two steps (a fast screen draws two or more frames per step).
    const x = between(c.px, c.x, this.alpha);
    const y = between(c.py, c.y, this.alpha);
    const flip = shouldFlip(x, W, need || undefined);
    if (flip !== c.flipped) {
      c.flipped = flip;
      c.el.classList.toggle('flip', flip);
    }
    // A long bubble near an edge slides back onto the page.
    let shift = 0;
    if (c.saying && c.bubW) {
      const A = this.touch ? 20 : 24;
      const left = c.flipped ? x + A - 4 - c.bubW : x + (this.touch ? 15 : 18);
      shift = Math.round(fitShift(left, c.bubW, W));
    }
    if (shift !== c.shift) {
      c.shift = shift;
      c.bub.style.translate = shift ? `${shift}px 0` : '';
    }
    c.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
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
