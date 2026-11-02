/**
 * Pure maths behind the team cursors. No DOM here so it runs under vitest.
 * Numbers come from the approved drafts: calm spring (src/shared/spring.ts) · 24 px per frame cap.
 * The ±6 px idle drift is a CSS animation (styles/crew.css) so a resting team costs no JavaScript at all.
 */
export type Name = 'design' | 'code' | 'motion';
export const TEAM: readonly Name[] = ['design', 'code', 'motion'];

export { SPRING, step, type Body } from '../../shared/spring';
import type { Body } from '../../shared/spring';

/** Fixed 60 Hz step. */
export const STEP_MS = 1000 / 60;
/** Farther than this a cursor fades out and reappears near its target instead of flying. */
export const HOP_DIST = 720;
/** Section changes wait this long so a quick scroll past does not wake anyone. */
export const SECTION_SETTLE_MS = 380;

/** How many fixed steps fit in the time since the last frame. Long pauses are capped. */
export function stepsFor(acc: number, dt: number): { steps: number; rest: number } {
  const total = acc + Math.min(dt, 100);
  const steps = Math.floor(total / STEP_MS);
  return { steps, rest: total - steps * STEP_MS };
}

/**
 * Springs at the same pace on every screen (60 · 120 · 144 Hz): each frame runs the whole 60 Hz
 * steps that fit (`steps`) and is drawn `alpha` of the way from the step before to the last one.
 * So a fast screen draws every frame in a new place (no frozen frames · no double jumps) and the
 * motion is one frame behind at most.
 */
export class Clock {
  private last = -1;
  private acc = 0;

  /** After a pause (the loop slept): count from the next frame. */
  reset(): void {
    this.last = -1;
    this.acc = 0;
  }

  tick(now: number): { steps: number; alpha: number } {
    if (this.last < 0) {
      this.last = now;
      return { steps: 0, alpha: 0 };
    }
    const { steps, rest } = stepsFor(this.acc, now - this.last);
    this.acc = rest;
    this.last = now;
    return { steps, alpha: rest / STEP_MS };
  }
}

/** Where to draw a body between its last two steps. */
export const between = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;

/**
 * A cursor counts as settled (and the loop may stop) once it is this close and this slow.
 * Looser than nothing so the spring's tail does not keep the page busy · tighter than arrived.
 */
export const SETTLE = { dist: 0.45, speed: 0.06 } as const;

export function settled(b: Body, tx: number, ty: number): boolean {
  return Math.hypot(tx - b.x, ty - b.y) < SETTLE.dist && Math.hypot(b.vx, b.vy) < SETTLE.speed;
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

/** Room kept between a tag or a bubble and the edge of the page. */
export const EDGE = 8;

/**
 * Tags and bubbles flip to the left near the right edge (past the middle on narrow screens).
 * With `need` (the widest piece showing: the tag or the bubble) the side that fits wins:
 * a long bubble flips early · a cursor near the left edge never flips into the wall.
 */
export function shouldFlip(x: number, width: number, need?: number): boolean {
  const near = x > (width < 700 ? width * 0.55 : width - 290);
  if (need === undefined) return near;
  const right = width - EDGE - (x + 18);
  const left = x + 20 - EDGE;
  if (near) return left >= need || left >= right;
  return right < need && left > right;
}

/** How far to slide a piece that starts at `left` and is `w` wide so it stays on the page. */
export function fitShift(left: number, w: number, width: number): number {
  if (w >= width - 2 * EDGE) return EDGE - left;
  if (left < EDGE) return EDGE - left;
  if (left + w > width - EDGE) return width - EDGE - (left + w);
  return 0;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** An obstacle: a display headline. Only the tag has to keep off it (the arrow may point into it). */
  big?: boolean;
  /** A cursor part that keeps off headlines too (the tag). */
  strict?: boolean;
}

/** Overlap area of two boxes. */
export function overlap(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

/** Small steps around a resting spot · nearest first · down and right before up and left. */
export const NUDGES: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [[0, 0]];
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const;
  for (const r of [10, 20, 32, 46, 62, 80, 100, 124]) for (const [ux, uy] of dirs) out.push([Math.round(ux * r), Math.round(uy * r)]);
  return out;
})();

/**
 * A resting cursor should never sit on words people are reading.
 * `boxesAt(dx, dy)` gives the arrow and tag boxes for a nudge · `obstacles` are lines of text.
 * Returns the nearest nudge that covers nothing (or covers the least) and stays on the page.
 */
export function clearSpot(boxesAt: (dx: number, dy: number) => Box[], obstacles: Box[], width: number): [number, number] {
  if (!obstacles.length) return [0, 0];
  let best: [number, number] = [0, 0];
  let bestHit = Infinity;
  for (const [dx, dy] of NUDGES) {
    const boxes = boxesAt(dx, dy);
    if (boxes.some((b) => b.left < EDGE / 2 || b.right > width - EDGE / 2)) continue;
    let hit = 0;
    for (const b of boxes) for (const o of obstacles) if (b.strict || !o.big) hit += overlap(b, o);
    if (hit === 0) return [dx, dy];
    if (hit < bestHit) {
      bestHit = hit;
      best = [dx, dy];
    }
  }
  return best;
}
