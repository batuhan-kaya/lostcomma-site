/**
 * The Lost Comma mark: a corner and the comma under it. Redrawn with smooth curves from the traced
 * logo file Batuhan sent (the file was a bitmap trace in one pixel steps · this is the same shape).
 *
 * Coordinates run from the corner's top left (0 0). The corner ends at `base`: in a lockup that is
 * the wordmark's baseline and the comma hangs under it like a real comma. Everything that shows the
 * mark draws it from here (header · footer · panel · share images · favicon and icons).
 */
export const MARK = {
  w: 493,
  h: 869,
  /** The bottom of the corner · the baseline of the wordmark beside it. */
  base: 573,
  /** The corner. */
  top: 'M0 82C0 47.6 45.4 0 79 0H485A8 8 0 0 1 493 8V146A8 8 0 0 1 485 154H174C166.1 154 129 175 129 199V565A8 8 0 0 1 121 573H8A8 8 0 0 1 0 565Z',
  /** The comma. */
  comma: 'M166 586H278A3 3 0 0 1 281 589V593C281 704.6 187.2 869 34 869V768C93.9 768 166 691.1 166 586Z',
} as const;

/**
 * The height of the wordmark's l in Anybody (em) · the same at every width and weight we use.
 * Next to the name the corner is exactly this tall: the mark and the name are one size.
 * A unit test measures it from the font.
 */
export const L_HEIGHT = 0.785;

/** The mark beside text of 1 em: its width · height · how far the comma hangs under the baseline. */
export const MARK_EM = {
  w: (MARK.w * L_HEIGHT) / MARK.base,
  h: (MARK.h * L_HEIGHT) / MARK.base,
  drop: ((MARK.h - MARK.base) * L_HEIGHT) / MARK.base,
};

/** The mark alone as an SVG file (favicon · icons). `fill` per path · optional tile behind it. */
export function markFile(o: { size: number; fill: string; bg?: string; radius?: number; scale?: number; css?: string }): string {
  // The mark sits in the middle of a square tile · `scale` is its height as a part of the tile.
  const s = o.size;
  const k = ((o.scale ?? 1) * s) / MARK.h;
  const x = (s - MARK.w * k) / 2;
  const y = (s - MARK.h * k) / 2;
  const bg = o.bg ? `<rect width="${s}" height="${s}" rx="${o.radius ?? 0}" fill="${o.bg}"/>` : '';
  const style = o.css ? `<style>${o.css}</style>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${style}${bg}` +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})" fill="${o.fill}"><path d="${MARK.top}"/><path d="${MARK.comma}"/></g></svg>`
  );
}
