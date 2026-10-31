/**
 * The Process page edit suite: ten weeks on four tracks. Positions are in weeks (0 to 10).
 * Labels live per language in src/server/content/process.ts in the same order.
 * Shared by the server (first paint) and the client.
 */
export const WEEKS = 10;
/** Where the playhead waits when the page opens (the middle of Design). */
export const START = 4.5;
/** Seconds of playback for one week. */
export const WEEK_SECONDS = 1.4;

export type Who = 'you' | 'design' | 'motion' | 'code';

export const TRACKS: readonly { who: Who; clips: readonly [start: number, length: number][] }[] = [
  { who: 'you', clips: [[0, 0.45], [1, 0.7], [2.55, 0.45], [3.2, 2.7], [8, 0.9], [9.35, 0.65]] },
  { who: 'design', clips: [[0, 2], [2, 1], [3, 2.4], [5.4, 3.5]] },
  { who: 'motion', clips: [[3.2, 1.8], [6, 2.2], [9.3, 0.7]] },
  { who: 'code', clips: [[1, 0.9], [5, 3.5], [8.5, 0.85], [9.4, 0.6]] },
];

export const MILESTONES: readonly number[] = [2.95, 5.4, 8.2, 10];

/** Who is on each phase (kickoff · shape · look · design · build · polish · launch). */
export const PHASE_WHO: readonly Who[][] = [
  ['design', 'code', 'you'],
  ['design', 'you'],
  ['design', 'motion'],
  ['design', 'motion'],
  ['code', 'motion'],
  ['code', 'design', 'you'],
  ['design', 'code', 'motion', 'you'],
];

/** The phase at a playhead position: week 1 kickoff · 2 shape · 3 look · 4–5 design · 6–8 build · 9 polish · 10 launch. */
export function phaseOf(p: number): number {
  const w = Math.min(WEEKS, Math.floor(p) + 1);
  return w <= 1 ? 0 : w === 2 ? 1 : w === 3 ? 2 : w <= 5 ? 3 : w <= 8 ? 4 : w === 9 ? 5 : 6;
}

/** Week (1–10) and working day (1–5) at a playhead position. */
export function weekDay(p: number): { week: number; day: number } {
  // Positions move in fifths of a week (one day): a tiny epsilon keeps 1.2 on day 2 despite floating point.
  const fifths = Math.floor(p * 5 + 1e-6);
  const week = Math.min(WEEKS, Math.floor(fifths / 5) + 1);
  const day = p >= WEEKS ? 5 : (fifths % 5) + 1;
  return { week, day };
}

/** Is a clip playing at p? The last clip stays on at the very end. */
export function clipOn(start: number, length: number, p: number): boolean {
  const end = start + length;
  return p >= start && (p < end || (end >= WEEKS && p >= WEEKS));
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
