/**
 * Cubic bezier curves for the Motion page: the plot (x 0–1 over 300 px · y 1 at 210 px and 0 at
 * 510 px so overshoot has room) · the easing itself · the CSS it becomes.
 * Shared by the server (first paint) and the client.
 */
export type Curve = [number, number, number, number];

export const PRESETS: { key: 'roll' | 'pop' | 'settle' | 'exit'; c: Curve }[] = [
  { key: 'roll', c: [0.7, 0, 0.2, 1] },
  { key: 'pop', c: [0.2, 1.6, 0.3, 1] },
  { key: 'settle', c: [0.2, 0.9, 0.2, 1] },
  { key: 'exit', c: [0.4, 0, 1, 1] },
];

export const X = (x: number): number => Math.round(x * 300 * 10) / 10;
export const Y = (y: number): number => Math.round((510 - y * 300) * 10) / 10;

export function plotPath(c: Curve): string {
  return `M0 510 C${X(c[0])} ${Y(c[1])} ${X(c[2])} ${Y(c[3])} 300 210`;
}

export function cssCurve(c: Curve): string {
  return `cubic-bezier(${c.map((v) => Number(v.toFixed(2))).join(', ')})`;
}

/** Progress p (0–1) through time → progress along the curve. */
export function ease(c: Curve, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * c[0] + 3 * (1 - t) * t * t * c[2] + t ** 3;
  const by = (t: number) => 3 * (1 - t) ** 2 * t * c[1] + 3 * (1 - t) * t * t * c[3] + t ** 3;
  let lo = 0;
  let hi = 1;
  let t = p;
  for (let i = 0; i < 24; i++) {
    t = (lo + hi) / 2;
    if (bx(t) < p) lo = t;
    else hi = t;
  }
  return by(t);
}
