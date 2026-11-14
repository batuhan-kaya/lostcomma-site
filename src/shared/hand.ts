/**
 * How a hand moves a cursor. The team cursors (src/client/lib/crew.ts) are driven by this · no DOM
 * here so it runs under vitest.
 *
 * A spring glides in a straight line at the same pace every time: smooth and plainly a machine.
 * A hand does none of that. What we copy from it:
 *
 *   reach      one sweep of the arm: it sets off gently · is fastest a little before half way ·
 *              takes its time to slow down (a bell that leans forward)
 *   time       grows with the root of the distance (a far spot is not twice as far in time) and
 *              is never twice the same
 *   arc        the path bends a little: an arm turns around an elbow · it does not slide on a rail
 *   miss       a long reach lands a few pixels off · a beat · then a short slow reach fixes it
 *   tremor     under a pixel of sideways unrest while it flies · none at rest
 *   temper     everyone moves their own way (TEMPERS)
 *   stillness  a hand at rest is still. No floating. Now and then it moves the mouse a little
 *              (the fidgets are crew.ts's: this file only knows how to get from here to there)
 *
 * The plan (where the hand means to be: the carrot) is followed by a critically damped follower:
 * a new plan in mid air · a target that moves · a nudge all stay one smooth line.
 */
export interface Pt {
  x: number;
  y: number;
}

export type Rnd = () => number;

/** How one teammate moves. */
export interface Temper {
  /** Time: above 1 takes longer. */
  pace: number;
  /** How far its paths bend (a part of the distance). */
  arc: number;
  /** How far a long reach may land from the spot (a part of the distance). */
  miss: number;
  /** Which side its arcs bend to: −1 always left of the way · 1 always right · 0 either. */
  lean: number;
}

/** design is careful with soft arcs · code goes straight and quick · motion sweeps. */
export const TEMPERS = {
  design: { pace: 1.06, arc: 0.08, miss: 0.03, lean: 0.5 },
  code: { pace: 0.9, arc: 0.04, miss: 0.018, lean: -0.2 },
  motion: { pace: 1, arc: 0.11, miss: 0.045, lean: 0.7 },
} as const satisfies Record<string, Temper>;

/** One sweep from (fx fy) to (tx ty). */
export interface Reach {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  /** The widest the path strays to the side (px · signed). */
  bend: number;
  ms: number;
  /** A beat before it sets off: nobody moves the instant they decide to. */
  lead: number;
  /** Speed carried in from the move it interrupts (px per ms). */
  cvx: number;
  cvy: number;
  /** Tremor: size (px) and phase. */
  wob: number;
  ph: number;
}

/** A cursor: where it is drawn (x y · speed in px per step) and where the hand means to be. */
export interface Hand {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The carrot: the plan's point right now · and how fast it moves (px per ms). */
  cx: number;
  cy: number;
  ux: number;
  uy: number;
  /** Where the plan ends. */
  gx: number;
  gy: number;
  queue: Reach[];
  /** Milliseconds into the first reach of the queue. */
  t: number;
}

export function hand(x = 0, y = 0): Hand {
  return { x, y, vx: 0, vy: 0, cx: x, cy: y, ux: 0, uy: 0, gx: x, gy: y, queue: [], t: 0 };
}

/** Put a hand somewhere at once (a birth · a far jump · reduced motion). */
export function place(h: Hand, x: number, y: number): void {
  h.x = h.cx = h.gx = x;
  h.y = h.cy = h.gy = y;
  h.vx = h.vy = h.ux = h.uy = 0;
  h.queue = [];
  h.t = 0;
}

/** Milliseconds per root pixel: 300 px in about .7 s · 700 px in about 1.06 s. */
export const TEMPO = 40;
export const REACH_MS = { min: 120, max: 1700 } as const;
/** How long a carried speed lives on in the next reach (ms). */
const CARRY_MS = 130;
/** The follower: how much of the gap to the carrot closes per 60 Hz step (about three frames behind). */
export const FOLLOW = 0.6;
/** A target that moved less than this while the hand is on its way bends the way instead of starting a new one. */
export const SHIFT_DIST = 48;

/** How long one reach of `d` px takes. Never twice the same (±10 %). */
export function reachMs(d: number, pace = 1, rnd: Rnd = Math.random): number {
  const base = Math.min(REACH_MS.max, Math.max(REACH_MS.min, TEMPO * Math.sqrt(d)));
  return base * pace * (0.9 + rnd() * 0.2);
}

/**
 * Progress along a reach (0 to 1) at `u` of its time. A minimum-jerk curve on a clock that runs
 * ahead: no speed at either end · the peak a little before half way · a long soft landing.
 */
export function ease(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const w = u ** 0.82;
  return w * w * w * (10 - 15 * w + 6 * w * w);
}

export interface PlanOptions {
  /** Aimed at something (a button · a word): a long reach may miss and correct. At rest it does so less often. */
  precise?: boolean;
  /** Beat before it sets off (ms). */
  lead?: number;
  /** Speed of the move it interrupts (px per ms). */
  carry?: { vx: number; vy: number };
  /** Lazy moves (a fidget): above 1 is slower. */
  slow?: number;
  /** No arc · no miss (a nudge of a few pixels). */
  plain?: boolean;
}

/** The reaches that take a hand from `from` to `to`: one sweep · or a sweep that lands a little off and a short fix. */
export function plan(from: Pt, to: Pt, k: Temper, rnd: Rnd = Math.random, o: PlanOptions = {}): Reach[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return [];
  const pace = k.pace * (o.slow ?? 1);
  const cvx = o.carry?.vx ?? 0;
  const cvy = o.carry?.vy ?? 0;
  const lead = o.lead ?? 0;
  const ux = dx / d;
  const uy = dy / d;
  const plain = o.plain || d < 24;
  // The arc: its side follows the teammate's lean · its size the distance (a short hop is straight).
  const side = rnd() < 0.5 + k.lean * 0.4 ? 1 : -1;
  const bend = plain ? 0 : Math.max(-90, Math.min(90, side * d * k.arc * (0.5 + rnd())));
  const wob = plain ? 0 : Math.min(0.8, d / 500) * (0.5 + rnd() * 0.5);
  const ph = rnd() * Math.PI * 2;
  const one = (fx: number, fy: number, tx: number, ty: number, ms: number): Reach => ({ fx, fy, tx, ty, bend, ms, lead, cvx, cvy, wob, ph });

  const chance = o.precise ? 0.72 : 0.4;
  if (plain || d < 110 || rnd() > chance) return [one(from.x, from.y, to.x, to.y, reachMs(d, pace, rnd))];

  // Short of the spot most of the time · past it now and then · a little to the side.
  const m = Math.max(3, Math.min(20, d * k.miss * (0.5 + rnd())));
  const along = rnd() < 0.22 ? m * 0.6 : -m;
  const across = (rnd() - 0.5) * m * 0.9;
  const lx = to.x + ux * along - uy * across;
  const ly = to.y + uy * along + ux * across;
  const fix = Math.hypot(to.x - lx, to.y - ly);
  return [
    one(from.x, from.y, lx, ly, reachMs(d, pace, rnd)),
    { fx: lx, fy: ly, tx: to.x, ty: to.y, bend: 0, ms: Math.max(130, reachMs(fix, pace * 1.25, rnd)), lead: 40 + rnd() * 90, cvx: 0, cvy: 0, wob: 0, ph: 0 },
  ];
}

/** Where a reach is `t` ms after it was planned. */
export function at(r: Reach, t: number): Pt {
  const tt = Math.max(0, t - r.lead);
  const u = Math.min(1, tt / r.ms);
  const s = ease(u);
  const dx = r.tx - r.fx;
  const dy = r.ty - r.fy;
  const d = Math.hypot(dx, dy) || 1;
  // To the side: the arc (widest a little before half way) and the tremor (about 7 Hz · none at either end).
  const lat = r.bend * Math.sin(Math.PI * s ** 0.9) + r.wob * Math.sin(Math.PI * s) * Math.sin(r.ph + tt * 0.044);
  // The carried speed fades in about a tenth of a second and is gone by the end.
  const carry = r.cvx || r.cvy ? tt * Math.exp(-tt / CARRY_MS) * (1 - u) ** 2 : 0;
  return {
    x: r.fx + dx * s - (dy / d) * lat + r.cvx * carry,
    y: r.fy + dy * s + (dx / d) * lat + r.cvy * carry,
  };
}

/**
 * Send a hand to `to`. The new way starts where the plan is (the cursor is a few frames behind it
 * and keeps following) · a hand already moving keeps its speed into the turn and does not wait.
 */
export function reach(h: Hand, to: Pt, k: Temper, rnd: Rnd = Math.random, o: PlanOptions = {}): void {
  const moving = Math.hypot(h.ux, h.uy) > 0.03;
  h.queue = plan({ x: h.cx, y: h.cy }, to, k, rnd, moving ? { ...o, lead: 0, carry: { vx: h.ux, vy: h.uy } } : o);
  h.t = 0;
  h.gx = to.x;
  h.gy = to.y;
}

/** The target moved a little: the rest of the way moves with it. */
export function shift(h: Hand, dx: number, dy: number): void {
  h.gx += dx;
  h.gy += dy;
  if (!h.queue.length) {
    h.cx += dx;
    h.cy += dy;
    return;
  }
  h.queue.forEach((r, i) => {
    r.tx += dx;
    r.ty += dy;
    if (i > 0) {
      r.fx += dx;
      r.fy += dy;
    }
  });
}

/**
 * Keep a hand on its way to `to`: nothing when it already goes there · bend the way when the spot
 * moved a little · a new reach otherwise. Returns true when a new reach was planned.
 */
export function steer(h: Hand, to: Pt, k: Temper, rnd: Rnd = Math.random, o: PlanOptions = {}): boolean {
  const gd = Math.hypot(to.x - h.gx, to.y - h.gy);
  if (gd < 0.05) return false;
  if (h.queue.length ? gd <= SHIFT_DIST : Math.hypot(to.x - h.cx, to.y - h.cy) <= 2.5) {
    shift(h, to.x - h.gx, to.y - h.gy);
    return false;
  }
  reach(h, to, k, rnd, o);
  return true;
}

/** Move the plan on by `dt` ms. */
export function advance(h: Hand, dt: number): void {
  const x0 = h.cx;
  const y0 = h.cy;
  let left = dt;
  while (left > 0 && h.queue.length) {
    const r = h.queue[0]!;
    const total = r.lead + r.ms;
    if (h.t + left < total) {
      h.t += left;
      const p = at(r, h.t);
      h.cx = p.x;
      h.cy = p.y;
      left = 0;
      break;
    }
    left -= total - h.t;
    h.t = 0;
    h.cx = r.tx;
    h.cy = r.ty;
    h.queue.shift();
  }
  h.ux = (h.cx - x0) / dt;
  h.uy = (h.cy - y0) / dt;
}

/** One 60 Hz step of the follower: critically damped (it never overshoots the plan) · exact for any stiffness. */
export function follow(h: Hand, w = FOLLOW): void {
  const e = Math.exp(-w);
  const jx = h.x - h.cx;
  const jy = h.y - h.cy;
  const kx = h.vx + w * jx;
  const ky = h.vy + w * jy;
  h.x = h.cx + (jx + kx) * e;
  h.y = h.cy + (jy + ky) * e;
  h.vx = (kx - w * (jx + kx)) * e;
  h.vy = (ky - w * (jy + ky)) * e;
}

/** One step: the plan moves on · the cursor follows. */
export function stepHand(h: Hand, stepMs = 1000 / 60): void {
  advance(h, stepMs);
  follow(h);
}

/** On the spot for anyone watching (a scene may go on). */
export function arrivedHand(h: Hand): boolean {
  return !h.queue.length && Math.hypot(h.cx - h.x, h.cy - h.y) < 1.5 && Math.hypot(h.vx, h.vy) < 0.5;
}

/** On the spot and still: the loop may stop. */
export function settledHand(h: Hand): boolean {
  return !h.queue.length && Math.hypot(h.cx - h.x, h.cy - h.y) < 0.3 && Math.hypot(h.vx, h.vy) < 0.05;
}

/** The whole way of a move from `from` to `to` in 60 Hz steps (tests · the note's figure). */
export function trace(from: Pt, to: Pt, k: Temper, rnd: Rnd = Math.random, o: PlanOptions = {}, max = 600): Pt[] {
  const h = hand(from.x, from.y);
  reach(h, to, k, rnd, o);
  const out: Pt[] = [{ x: h.x, y: h.y }];
  for (let i = 0; i < max && !settledHand(h); i++) {
    stepHand(h);
    out.push({ x: h.x, y: h.y });
  }
  return out;
}
