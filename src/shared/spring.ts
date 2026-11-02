/**
 * The spring behind every cursor on the site. The cursors (src/client/lib/crew-math.ts) and the
 * playground in the note "How our cursors move" run this same function · the server draws its
 * first graph with it too.
 */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Spring {
  /** Stiffness: how hard the target pulls each frame. */
  pull: number;
  /** How much speed survives each frame. */
  damping: number;
  /** Pixels per frame. */
  maxSpeed: number;
  /** Speed it may gain per frame (px per frame per frame) · none: it leaps off at once. */
  accel?: number;
  arriveDist: number;
  arriveSpeed: number;
}

/**
 * Moves like a hand (phase 15): it sets off slowly (it may gain only .618 px per frame of speed
 * each frame) · cruises at 14.8 px per frame at most (24 / φ · about 890 px/s) · lands softly with
 * an overshoot of a pixel or two. A 300 px move reads in about .6 s and is still at .85 s.
 * The steps are a fixed 60 a second on every screen (crew-math.ts `stepsFor`).
 */
export const SPRING: Spring = {
  damping: 0.79,
  pull: 0.018,
  maxSpeed: 14.8,
  accel: 0.618,
  arriveDist: 6,
  arriveSpeed: 1,
};

/** One spring step toward (tx, ty). Returns true once the body has settled. */
export function step(b: Body, tx: number, ty: number, k: Spring = SPRING): boolean {
  const was = k.accel === undefined ? 0 : Math.hypot(b.vx, b.vy);
  b.vx = b.vx * k.damping + (tx - b.x) * k.pull;
  b.vy = b.vy * k.damping + (ty - b.y) * k.pull;
  const sp = Math.hypot(b.vx, b.vy);
  // Speeding up is gradual · slowing down never is (it would overshoot).
  const top = k.accel === undefined ? k.maxSpeed : Math.min(k.maxSpeed, was + k.accel);
  if (sp > top) {
    b.vx *= top / sp;
    b.vy *= top / sp;
  }
  b.x += b.vx;
  b.y += b.vy;
  return Math.hypot(tx - b.x, ty - b.y) < k.arriveDist && sp < k.arriveSpeed;
}

/** The playground presets. The first one is what the homepage shipped with · the second is today. */
export const PRESETS = [
  { key: 'first', pull: 0.052, damping: 0.74 },
  { key: 'calm', pull: 0.018, damping: 0.79 },
  { key: 'jelly', pull: 0.08, damping: 0.91 },
  { key: 'sleepy', pull: 0.012, damping: 0.8 },
] as const;

export type PresetKey = (typeof PRESETS)[number]['key'];

/** The playground ranges (kept here so the server markup and the client agree). */
export const PULL_RANGE = { min: 0.005, max: 0.12, step: 0.001 } as const;
export const DAMPING_RANGE = { min: 0.5, max: 0.95, step: 0.01 } as const;

export function presetOf(pull: number, damping: number): PresetKey | null {
  return PRESETS.find((p) => Math.abs(p.pull - pull) < 0.0005 && Math.abs(p.damping - damping) < 0.005)?.key ?? null;
}

/**
 * Distance to the target over n frames after a jump of `from` px (1 = where it started ·
 * 0 = on target · below 0 = overshoot). The speed cap is part of it.
 */
export function response(pull: number, damping: number, n = 160, from = 300): number[] {
  const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
  const k = { ...SPRING, pull, damping };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push((from - b.x) / from);
    step(b, from, 0, k);
  }
  return out;
}

/**
 * Below this damping the spring never overshoots (both roots of z² − (1 + d − k)z + d are real).
 * About 0.75 for our stiffness.
 */
export function criticalDamping(pull: number): number {
  return (1 - Math.sqrt(pull)) ** 2;
}

/** How the spring feels: no overshoot (dragged) · a little · wobbly. */
export function feel(pull: number, damping: number): 'none' | 'little' | 'wobbly' {
  const over = -Math.min(0, ...response(pull, damping, 400));
  if (over < 0.005) return 'none';
  return over > 0.12 ? 'wobbly' : 'little';
}

/** The graph line under the playground: distances as SVG points in a 640 × 110 box. */
export function graphPoints(values: readonly number[]): string {
  return values.map((v, i) => `${i * 4} ${(76 - Math.max(-0.7, Math.min(1.15, v)) * 62).toFixed(1)}`).join(' ');
}
