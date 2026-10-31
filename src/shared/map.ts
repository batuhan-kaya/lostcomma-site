/**
 * The drawn Istanbul map on the Studio page (viewBox 1360 × 580). The ferry rides one cubic curve
 * from Karaköy to Kadıköy. Shared so the server draws the boat where the client will put it.
 */
export const MAP = { w: 1360, h: 580 } as const;
/** Karaköy → Kadıköy: start · two controls · end. */
export const ROUTE = [690, 366, 730, 470, 840, 500, 902, 432] as const;
export const ROUTE_D = `M ${ROUTE[0]} ${ROUTE[1]} C ${ROUTE[2]} ${ROUTE[3]} ${ROUTE[4]} ${ROUTE[5]} ${ROUTE[6]} ${ROUTE[7]}`;

/** Point and heading (degrees) at q (0 Karaköy … 1 Kadıköy). Heading west flips the boat. */
export function onRoute(q: number, east = true): { x: number; y: number; a: number } {
  const t = Math.max(0, Math.min(1, q));
  const [x0, y0, x1, y1, x2, y2, x3, y3] = ROUTE;
  const u = 1 - t;
  const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
  const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
  const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
  const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (!east) a += 180;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, a: Math.round(a * 10) / 10 };
}

/** The SVG transform for the boat group. The boat is drawn facing east · west turns it around. */
export function boatTransform(q: number, east: boolean): string {
  const p = onRoute(q, true);
  const tilt = Math.max(-28, Math.min(28, p.a));
  return `translate(${p.x} ${p.y}) rotate(${tilt}) scale(${east ? 1 : -1} 1)`;
}
