/**
 * The site's own cut of its three fonts (scripts/fonts.ts · npm run fonts · src/fonts/): the letters
 * every page writes in two small files per family instead of fontsource's latin and latin-ext files.
 * fontsource's files keep every other letter of their range (fonts.css · the ranges never overlap).
 */

/** ASCII · the Latin-1 and typography the site writes (the copy · the panel · the mocks) · dotless ı. */
const CORE =
  Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCodePoint(0x20 + i)).join('') +
  ' ©°±²·ÂÇÖ×Üâçéîöûüı–—‘’‚“”„•…‹›€←↑→↓↗−';

/** The Turkish letters that live in fontsource's latin-ext file · the lira sign. */
const TURKISH = 'ĞğİŞş₺';

export const FONT_CUTS = [
  { name: 'core', from: 'latin', text: CORE },
  { name: 'tr', from: 'latin-ext', text: TURKISH },
] as const;

export const FONT_FAMILIES = [
  { key: 'anybody', pkg: 'anybody', file: 'anybody', axes: 'standard', family: 'Anybody', weight: '100 900', stretch: '50% 150%' },
  { key: 'geist', pkg: 'geist', file: 'geist', axes: 'wght', family: 'Geist', weight: '100 900', stretch: '' },
  { key: 'martian', pkg: 'martian-mono', file: 'martian-mono', axes: 'standard', family: 'Martian Mono', weight: '100 800', stretch: '75% 112.5%' },
] as const;

/** Every letter the cuts are asked for (a test checks the files hold the ones each font has). */
export const FONT_TEXT = { core: CORE, tr: TURKISH } as const;

/** A CSS unicode-range as code points (U+0000-00FF,U+0131 · wildcards are not used by fontsource). */
export function parseRange(range: string): number[] {
  const out: number[] = [];
  for (const part of range.split(',')) {
    const m = /U\+([0-9A-F]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!m) continue;
    const a = parseInt(m[1]!, 16);
    const b = m[2] ? parseInt(m[2], 16) : a;
    for (let p = a; p <= b; p++) out.push(p);
  }
  return out;
}

/** Code points as a CSS unicode-range (runs joined: U+20-7E,U+A9). */
export function unicodeRange(points: number[]): string {
  const out: string[] = [];
  const hex = (n: number) => n.toString(16).toUpperCase();
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    let b = a;
    while (points[i + 1] === b + 1) b = points[++i]!;
    out.push(a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`);
  }
  return out.join(',');
}
