/**
 * Pure maths behind the team cursors. No DOM here so it runs under vitest.
 * Numbers come from the approved drafts: calm spring · 24 px per frame cap · ±6 px idle drift.
 */
export type Name = 'design' | 'code' | 'motion';
export const TEAM: readonly Name[] = ['design', 'code', 'motion'];

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const SPRING = {
  damping: 0.8,
  pull: 0.026,
  maxSpeed: 24,
  arriveDist: 6,
  arriveSpeed: 1.2,
};

/** Fixed 60 Hz step. */
export const STEP_MS = 1000 / 60;
/** Farther than this a cursor fades out and reappears near its target instead of flying. */
export const HOP_DIST = 720;
/** Section changes wait this long so a quick scroll past does not wake anyone. */
export const SECTION_SETTLE_MS = 380;

/** One spring step toward (tx, ty). Returns true once the cursor has settled. */
export function step(b: Body, tx: number, ty: number, k = SPRING): boolean {
  b.vx = b.vx * k.damping + (tx - b.x) * k.pull;
  b.vy = b.vy * k.damping + (ty - b.y) * k.pull;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > k.maxSpeed) {
    b.vx *= k.maxSpeed / sp;
    b.vy *= k.maxSpeed / sp;
  }
  b.x += b.vx;
  b.y += b.vy;
  return Math.hypot(tx - b.x, ty - b.y) < k.arriveDist && sp < k.arriveSpeed;
}

/** How many fixed steps fit in the time since the last frame. Long pauses are capped. */
export function stepsFor(acc: number, dt: number): { steps: number; rest: number } {
  const total = acc + Math.min(dt, 100);
  const steps = Math.floor(total / STEP_MS);
  return { steps, rest: total - steps * STEP_MS };
}

/** Small idle drift while a cursor rests. */
export function drift(now: number, phase: number): { dx: number; dy: number } {
  return { dx: Math.sin(now * 0.0004 + phase) * 6, dy: Math.cos(now * 0.0005 + phase * 1.3) * 5 };
}

export interface Band {
  name: string;
  top: number;
  bottom: number;
}

/**
 * The section under the probe line (viewport coordinates).
 * Between sections the closest edge wins so the footer keeps the last section.
 * At the very top of the page the first section (the hero) always wins, even when it is
 * shorter than the probe line (short heroes on phones).
 */
export function pickSection(bands: Band[], probe: number, atTop = false): string | null {
  if (atTop && bands[0]) return bands[0].name;
  let best: string | null = null;
  let bestD = Infinity;
  for (const b of bands) {
    if (b.top <= probe && b.bottom > probe) return b.name;
    const d = Math.min(Math.abs(b.top - probe), Math.abs(b.bottom - probe));
    if (d < bestD) {
      bestD = d;
      best = b.name;
    }
  }
  return best;
}

/** Probe line: a bit above the middle of the viewport · capped for very tall screens. */
export function probeLine(viewportHeight: number): number {
  return Math.min(viewportHeight || 900, 1000) * 0.45;
}

export type RestAt = { end: true; dx: number; dy: number } | { end: false; fx: number; fy: number; dx: number; dy: number };

/**
 * data-rest-at on an anchor element:
 *   "end"            the end of its last line of text
 *   "end 12 -4"      the same plus an offset in px
 *   "0.5 0.2"        a point inside its box as fractions
 *   "0.5 0.2 -8 6"   the same plus an offset in px
 * Missing or broken values fall back to the right middle of the box.
 */
export function parseRestAt(value: string | null | undefined): RestAt {
  const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);
  const num = (s: string | undefined, d: number) => {
    const n = Number(s);
    return s !== undefined && Number.isFinite(n) ? n : d;
  };
  if (parts[0] === 'end') return { end: true, dx: num(parts[1], 10), dy: num(parts[2], 0) };
  return { end: false, fx: num(parts[0], 1), fy: num(parts[1], 0.5), dx: num(parts[2], 0), dy: num(parts[3], 0) };
}

/** Keep the arrow on the page: never past the right edge or above the top. */
export function clampPoint(x: number, y: number, width: number): { x: number; y: number } {
  return { x: Math.max(4, Math.min(x, width - 28)), y: Math.max(4, y) };
}

/** Tags and bubbles flip to the left near the right edge (past the middle on narrow screens). */
export function shouldFlip(x: number, width: number): boolean {
  return x > (width < 700 ? width * 0.55 : width - 290);
}
