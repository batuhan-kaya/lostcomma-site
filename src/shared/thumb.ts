/**
 * The thumb zone on the Apps page. A 360 × 760 phone screen · every action is a box in % of it:
 * b = before (actions at the top) · a = after (under the thumb). Reach is measured from the pivot
 * of the thumb: the bottom corner on the hand side · 6% below the screen.
 * Shared by the server (first paint · no JS) and the client.
 */
export const SCREEN = { w: 360, h: 760 } as const;
export const EASY = 418;
export const STRETCH = 593;

export type Layout = 'b' | 'a';
export type Hand = 'l' | 'r';
export type Zone = 'easy' | 'ok' | 'hard';
type Pct = readonly [x: number, y: number, w: number, h: number];

export const ACTIONS: readonly { pri?: boolean; b: Pct; a: Pct }[] = [
  { pri: true, b: [62, 6.6, 32, 5.2], a: [6, 79, 72, 8] },
  { b: [6, 6.6, 12, 5.2], a: [81, 79, 13, 8] },
  { b: [6, 13.4, 28, 5], a: [4, 90.4, 30, 6.6] },
  { b: [36, 13.4, 28, 5], a: [35, 90.4, 30, 6.6] },
  { b: [66, 13.4, 28, 5], a: [66, 90.4, 30, 6.6] },
];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An action's box in screen pixels. The left hand mirrors the layout. */
export function boxOf(i: number, lay: Layout, hand: Hand): Box {
  const a = ACTIONS[i];
  if (!a) throw new Error(`no action ${i}`);
  const [px, py, pw, ph] = lay === 'a' ? a.a : a.b;
  const x = hand === 'l' ? 100 - px - pw : px;
  return { x: (x * SCREEN.w) / 100, y: (py * SCREEN.h) / 100, w: (pw * SCREEN.w) / 100, h: (ph * SCREEN.h) / 100 };
}

export function zoneAt(x: number, y: number, hand: Hand): Zone {
  const d = Math.hypot(x - (hand === 'l' ? 0 : SCREEN.w), y - SCREEN.h * 1.06);
  return d < EASY ? 'easy' : d < STRETCH ? 'ok' : 'hard';
}

export function zoneOf(i: number, lay: Layout, hand: Hand): Zone {
  const b = boxOf(i, lay, hand);
  return zoneAt(b.x + b.w / 2, b.y + b.h / 2, hand);
}

/** How many actions sit where the thumb rests. */
export function easyCount(lay: Layout, hand: Hand): number {
  return ACTIONS.filter((_, i) => zoneOf(i, lay, hand) === 'easy').length;
}

/** The action under a point · -1 when the thumb lands on nothing. */
export function actionAt(x: number, y: number, lay: Layout, hand: Hand): number {
  return ACTIONS.findIndex((_, i) => {
    const b = boxOf(i, lay, hand);
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  });
}
