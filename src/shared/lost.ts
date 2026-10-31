/**
 * The 404 map. The whole site is drawn as a star chart (home in the middle · the main pages on the
 * first ring · their pages on the second). The visitor is a lost comma placed next to the page
 * their address was closest to. Closeness is counted in letters: the edit distance between what
 * they typed and each real address (either language · Turkish letters forgiven · a swap of two
 * neighbouring letters counts as one).
 */
import { fold } from './find';

/** Edit distance with adjacent swaps (optimal string alignment). */
export function letters(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[n]!;
}

/** "/tr/Hizmetlér/" → "hizmetler" · the part after the language · decoded · folded · at most 80 letters. */
export function addressKey(path: string): string {
  let p = path.split(/[?#]/)[0] ?? '';
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep it as typed */
  }
  p = p.replace(/^\/(tr|en)(?=\/|$)/i, '').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
  return fold(p).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

/** A page's distance from the typed key: the closer of its two addresses. */
export function distance(typed: string, addresses: string[]): number {
  return Math.min(...addresses.map((a) => letters(typed, addressKey(a))));
}

/** Close enough to say "you probably meant this". */
export function isClose(d: number, typed: string): boolean {
  return d <= Math.max(2, Math.ceil(typed.length * 0.34));
}

/* ---------------- the chart (viewBox -100 -100 200 200) ---------------- */

export const RING = [0, 36, 66] as const;
export const EDGE = 90;

export interface Spot {
  x: number;
  y: number;
  /** Where the label sits: right of the dot · left · above · below. */
  side: 'r' | 'l' | 't' | 'b';
}

const round = (v: number) => Math.round(v * 100) / 100;

function spot(angleDeg: number, r: number, sideways = false): Spot {
  const a = (angleDeg * Math.PI) / 180;
  const x = round(Math.cos(a) * r);
  const y = round(Math.sin(a) * r);
  // Outer stars always label to the side: the lost comma may stand just outside them.
  const side = !sideways && Math.abs(x) < r * 0.28 ? (y < 0 ? 't' : 'b') : x >= 0 ? 'r' : 'l';
  return { x, y, side };
}

/** The first ring starts at the top and goes clockwise. */
export function ringAngle(i: number, count: number): number {
  return -90 + (360 / count) * i;
}

/** Positions for the main pages and their children (children fan out around their parent). */
export function chart(children: number[]): { main: Spot[]; kids: Spot[][] } {
  const count = children.length;
  const main = children.map((_, i) => spot(ringAngle(i, count), RING[1]));
  const kids = children.map((k, i) => {
    const a = ringAngle(i, count);
    const spread = Math.min(16, 46 / Math.max(1, k));
    return Array.from({ length: k }, (_, j) => spot(a + (j - (k - 1) / 2) * spread, RING[2], true));
  });
  return { main, kids };
}

/** Rough width of a label in chart units (mono at 3.1 units). */
export const labelWidth = (text: string) => text.length * 2.05;

export interface Placed {
  x: number;
  y: number;
  /** Where the comma's own label goes: right · left · below. */
  side: 'r' | 'l' | 'b';
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** The box a node's label takes (same placement the page uses). */
export function labelBox(n: Spot & { ring: number }, text: string): Box {
  const g = n.ring === 0 ? 7 : n.ring === 1 ? 6.4 : 5;
  const w = labelWidth(text);
  if (n.side === 'r') return { x0: n.x + g, y0: n.y - 1.6, x1: n.x + g + w, y1: n.y + 1.8 };
  if (n.side === 'l') return { x0: n.x - g - w, y0: n.y - 1.6, x1: n.x - g, y1: n.y + 1.8 };
  if (n.side === 't') return { x0: n.x - w / 2, y0: n.y - g - 3.4, x1: n.x + w / 2, y1: n.y - g };
  return { x0: n.x - w / 2, y0: n.y + g, x1: n.x + w / 2, y1: n.y + g + 3.4 };
}

/**
 * Where the lost comma stands. Close to a page: beside it (a little further for every letter of
 * difference) on whichever side is free of other stars and labels. Nowhere close: just outside
 * the edge of the site. Tries a ring of spots and keeps the one that covers the least.
 */
export function placeYou(nodes: (Spot & { ring: number; label: string })[], target: number, d: number, close: boolean, own: string): Placed {
  const t = nodes[target]!;
  const obstacles: Box[] = [];
  nodes.forEach((n, i) => {
    const r = n.ring === 0 ? 4 : n.ring === 1 ? 3 : 2.2;
    obstacles.push({ x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r });
    if (n.ring < 2 || i === target) obstacles.push(labelBox(n, n.label));
  });
  const w = labelWidth(own);
  const spots: { x: number; y: number }[] = [];
  if (close) {
    const gap = Math.min(11 + d * 2.5, 24);
    for (let a = 0; a < 360; a += 20) spots.push({ x: t.x + Math.cos((a * Math.PI) / 180) * gap, y: t.y + Math.sin((a * Math.PI) / 180) * gap });
  } else {
    for (let a = 0; a < 360; a += 15) spots.push({ x: Math.cos((a * Math.PI) / 180) * (EDGE + 5), y: Math.sin((a * Math.PI) / 180) * (EDGE + 5) });
  }
  let best: Placed & { score: number } = { x: 0, y: 0, side: 'r', score: Infinity };
  for (const p of spots) {
    const body: Box = { x0: p.x - 3.4, y0: p.y - 3.4, x1: p.x + 3.4, y1: p.y + 8.2 };
    for (const side of ['r', 'l', 'b'] as const) {
      const lab: Box =
        side === 'r' ? { x0: p.x + 5.5, y0: p.y - 1.8, x1: p.x + 5.5 + w, y1: p.y + 2 } : side === 'l' ? { x0: p.x - 5.5 - w, y0: p.y - 1.8, x1: p.x - 5.5, y1: p.y + 2 } : { x0: p.x - w / 2, y0: p.y + 10, x1: p.x + w / 2, y1: p.y + 13.6 };
      let score = 0;
      for (const o of obstacles) score += overlap(body, o) * 3 + overlap(lab, o) * 2;
      // Stay inside the frame · keep a little air from the edge of the chart.
      for (const b of [body, lab]) score += 40 * (Math.max(0, -97 - b.x0) + Math.max(0, b.x1 - 97) + Math.max(0, -97 - b.y0) + Math.max(0, b.y1 - 97));
      if (close && Math.hypot(p.x, p.y) > EDGE - 2) score += 30;
      // Prefer standing outwards (the comma came from outside) and a label pointing away from the star.
      const out = Math.hypot(p.x, p.y) - Math.hypot(t.x, t.y);
      score += out > 0 ? 0 : 0.6 * -out;
      if ((side === 'r' && p.x < t.x - 1) || (side === 'l' && p.x > t.x + 1)) score += 4;
      if (side === 'b') score += 1.5;
      if (score < best.score) best = { x: round(p.x), y: round(p.y), side, score };
    }
  }
  return { x: best.x, y: best.y, side: best.side };
}
