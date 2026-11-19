/**
 * The share card (og:image · phase 17e · Batuhan picked the design and the line "Bir virgül. Koca
 * fark."): the found comma on a night ground · selected in the file with its real size · the team
 * reaching for it on dotted ways · faint artboards around · the slogan with the coral period. One per
 * language for every page. Drawn by the server from our own fonts: fontkit turns every letter into an
 * outline · the outlines go into an SVG · sharp turns it into a 1200 × 630 JPEG.
 *
 * fontkit cannot apply variation axes to woff2 files, so each font is unpacked to TTF once
 * (wawoff2) and kept in memory. Cards are cached on disk by a hash of their words: a slogan
 * rewritten in Metinler draws a new card and nothing is drawn twice.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { create, type Font, type Glyph } from 'fontkit';
import sharp from 'sharp';
import decompress from 'wawoff2/decompress.js';
import { esc } from '../html';
import type { Lang } from '../i18n';
import { MARK, MARK_EM } from '../../shared/logo';

export const OG_W = 1200;
export const OG_H = 630;
/** Bump when the drawing changes so cached images are drawn again. */
const VERSION = 6;

export interface OgSpec {
  lang: Lang;
  /** The line under the mark (Metinler · "Bir virgül. Koca fark."). */
  slogan: string;
  /** The small line under it (the studio · the city). */
  foot: string;
  /** The header's live label (Canlı · Live). */
  live: string;
}

export function ogKey(spec: OgSpec): string {
  return createHash('sha1').update(JSON.stringify([VERSION, spec.lang, spec.slogan, spec.foot, spec.live])).digest('hex').slice(0, 12);
}

/** The card in words (og:image:alt · the SVG title). */
export const ogSentence = (spec: OgSpec): string => spec.slogan.trim();

/* ---------------- colours ---------------- */

const INK = '#0E0E0F';
const MILK = '#F2F1EC';
const BLUE = '#3B35FF';
const MINT = '#3EE0A8';
const PINK = '#FF9BD2';
const CORAL = '#FF5A2B';
const milk = (a: number) => `rgba(242,241,236,${a})`;

/* ---------------- fonts ---------------- */

type Face = 'display' | 'mono' | 'sans';

/** Manifest keys (scripts/build.ts) · the package file each one comes from in development. */
const FACES: Record<Face, { keys: string[]; pkg: string; file: (key: string) => string; axes: Record<string, number> }> = {
  display: { keys: ['anybody-latin', 'anybody-latin-ext'], pkg: '@fontsource-variable/anybody', file: (k) => `${k}-standard-normal.woff2`, axes: { wdth: 80, wght: 840 } },
  mono: { keys: ['martian-latin', 'martian-latin-ext'], pkg: '@fontsource-variable/martian-mono', file: (k) => `${k.replace('martian', 'martian-mono')}-standard-normal.woff2`, axes: { wdth: 87.5, wght: 480 } },
  sans: { keys: ['geist-latin', 'geist-latin-ext'], pkg: '@fontsource-variable/geist', file: (k) => `${k}-wght-normal.woff2`, axes: { wght: 560 } },
};

export interface FontSource {
  /** The built font for a manifest key (production) · null to fall back to the package (development and tests). */
  built(key: string): string | null;
}

const require = createRequire(import.meta.url);
const ttfs = new Map<string, Promise<Buffer>>();

function fileFor(face: Face, key: string, src: FontSource): string {
  const built = src.built(key);
  if (built && existsSync(built)) return built;
  return require.resolve(`${FACES[face].pkg}/files/${FACES[face].file(key)}`);
}

/** The decoder hands back a view into its own memory: one file at a time · copied before the next. */
let queue: Promise<unknown> = Promise.resolve();

function ttf(path: string): Promise<Buffer> {
  let p = ttfs.get(path);
  if (!p) {
    p = queue.then(() => decompress(readFileSync(path))).then((b) => Buffer.from(b));
    queue = p.catch(() => {});
    ttfs.set(path, p);
  }
  return p;
}

export async function fontsFor(face: Face, src: FontSource, axes: Record<string, number> = FACES[face].axes): Promise<Font[]> {
  return Promise.all(
    FACES[face].keys.map(async (key) => {
      const f = create(await ttf(fileFor(face, key, src))) as Font;
      return f.getVariation(axes);
    }),
  );
}

/* ---------------- text to outlines ---------------- */

interface Shaped {
  /** SVG path data with the start of the baseline at (0 0). */
  d: string;
  width: number;
}

/** Lays the text out in runs of one font each (Turkish letters live in the latin-ext file). */
function shape(text: string, fonts: Font[], size: number, tracking = 0): Shaped {
  const runs: { font: Font; text: string }[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const font = fonts.find((f) => f.hasGlyphForCodePoint(cp)) ?? fonts[0]!;
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  }
  let x = 0;
  let d = '';
  for (const run of runs) {
    const s = size / run.font.unitsPerEm;
    const laid = run.font.layout(run.text);
    laid.glyphs.forEach((g: Glyph, i: number) => {
      const pos = laid.positions[i]!;
      const path = g.path.scale(s, -s).translate(x + pos.xOffset * s, -pos.yOffset * s).toSVG();
      d += path;
      x += pos.xAdvance * s + tracking * size;
    });
  }
  return { d, width: x - (text ? tracking * size : 0) };
}

function at(sh: Shaped, x: number, y: number, fill: string): string {
  return sh.d ? `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}" d="${sh.d}"/>` : '';
}

/** Greedy line breaks. Returns null when a single word is wider than the line. */
const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';

interface Faces {
  display: Font[];
  mono: Font[];
  sans: Font[];
  mark: Font[];
}

const n = (v: number) => v.toFixed(1);

/** The mark and the wordmark (one size: the corner as tall as the l · the comma under the baseline). */
function lockup(f: Faces, x: number, base: number, size: number, fill: string): { svg: string; w: number } {
  const mk = (MARK_EM.h * size) / MARK.h;
  const wx = x + MARK_EM.w * size + 0.16 * size;
  const lost = shape('lost', f.mark, size, -0.02);
  const comma = shape('comma', f.mark, size, -0.02);
  const svg =
    `<g transform="translate(${n(x)} ${(base - MARK.base * mk).toFixed(2)}) scale(${mk.toFixed(5)})" fill="${fill}"><path d="${MARK.top}"/><path d="${MARK.comma}"/></g>` +
    at(lost, wx, base, fill) +
    at(comma, wx + lost.width + 0.24 * size, base, fill);
  return { svg, w: wx + lost.width + 0.24 * size + comma.width - x };
}

/** Mono labels: upper case in the card's language · a little air between the letters. */
const label = (f: Faces, text: string, lang: Lang, size: number) => shape(text.toLocaleUpperCase(lang), f.mono, size, 0.06);

/**
 * The night ground: ink · a soft light over the middle · the site's dots only where the light is ·
 * a warm breath behind the comma · a fine grain so the dark reads as paper and not as a screen.
 */
function ground(): string {
  return (
    '<defs>' +
    '<radialGradient id="light" cx="600" cy="277" r="560" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 277) scale(1 .72) translate(-600 -277)"><stop offset="0" stop-color="#F2F1EC" stop-opacity=".085"/><stop offset=".55" stop-color="#F2F1EC" stop-opacity=".025"/><stop offset=".78" stop-color="#F2F1EC" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="warm" cx="580" cy="360" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF5A2B" stop-opacity=".12"/><stop offset="1" stop-color="#FF5A2B" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="fade" cx="600" cy="277" r="620" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 277) scale(1 .7) translate(-600 -277)"><stop offset=".2" stop-color="#fff"/><stop offset=".78" stop-color="#000"/></radialGradient>' +
    '<mask id="near"><rect width="1200" height="630" fill="url(#fade)"/></mask>' +
    '<pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1.15" fill="#F2F1EC" fill-opacity=".13"/></pattern>' +
    '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>' +
    '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>' +
    '</defs>' +
    `<rect width="${OG_W}" height="${OG_H}" fill="${INK}"/>` +
    `<rect width="${OG_W}" height="${OG_H}" fill="url(#light)"/>` +
    `<rect width="${OG_W}" height="${OG_H}" fill="url(#warm)"/>` +
    `<rect width="${OG_W}" height="${OG_H}" fill="url(#dots)" mask="url(#near)"/>` +
    `<rect width="${OG_W}" height="${OG_H}" filter="url(#grain)" opacity=".055"/>`
  );
}

/** Faint artboards around the edges (the homepage's endless board) · their size above each. */
function ghosts(f: Faces): string {
  const frames: [number, number, number, number, string][] = [
    [40, 170, 230, 150, '1440 × 900'],
    [140, 410, 110, 240, '390 × 844'],
    [950, 110, 200, 200, '1080 × 1080'],
    [960, 390, 300, 160, '1920 × 1080'],
  ];
  return frames
    .map(([x, y, w, h, t]) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w}" height="${h}" rx="6" fill="none" stroke="${milk(0.075)}"/>` + at(shape(t, f.mono, 10.5, 0.06), x, y - 8, milk(0.22)))
    .join('');
}

/** Each teammate's way in: a soft arc of dots in their colour that fades toward the edge. */
function trails(): string {
  const way = (d: string, c: string) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0 9"/>`;
  return (
    way('M-20 150 C 140 112, 300 80, 440 104', 'rgba(59,53,255,.55)') +
    way('M1230 250 C 1050 230, 920 250, 812 270', 'rgba(62,224,168,.5)') +
    way('M60 640 C 170 560, 300 420, 470 372', 'rgba(255,155,210,.5)')
  );
}

/** A teammate's cursor: the tip at (x y) · its name in a pill under it to the right (or the left). */
function cursor(f: Faces, who: 'design' | 'code' | 'motion', x: number, y: number, side: 'right' | 'left' = 'right'): string {
  const fill = { design: BLUE, code: MINT, motion: PINK }[who];
  const on = who === 'design' ? MILK : INK;
  const k = 1.7;
  const name = shape(who, f.sans, 13);
  const w = name.width + 20;
  const tx = side === 'right' ? x + 20 : x - w - 2;
  const ty = y + 27;
  return (
    `<path transform="translate(${n(x - 3 * k)} ${n(y - 2 * k)}) scale(${k})" d="${ARROW}" fill="${fill}" stroke="${MILK}" stroke-width="${(1.1).toFixed(2)}" stroke-linejoin="round"/>` +
    `<rect x="${n(tx)}" y="${n(ty)}" width="${n(w)}" height="22" rx="11" fill="${fill}"/>` +
    at(name, tx + 10, ty + 15.4, on)
  );
}

/** The one card every page shares in its language: the found comma · the team reaching for it · the line under it. */
export async function drawOg(spec: OgSpec, src: FontSource): Promise<Buffer> {
  const [display, mono, sans, mark] = await Promise.all([
    fontsFor('display', src),
    fontsFor('mono', src, { wdth: 87.5, wght: 430 }),
    fontsFor('sans', src, { wght: 600 }),
    fontsFor('display', src, { wdth: 88, wght: 820 }),
  ]);
  const f: Faces = { display, mono, sans, mark };
  const out: string[] = [ground(), ghosts(f), trails()];

  // The header's line: the logo · live · the team.
  out.push(lockup(f, 56, 66, 22, MILK).svg);
  const avR = 13;
  const avRight = OG_W - 56;
  (['design', 'code', 'motion'] as const).forEach((who, i) => {
    const cx = avRight - avR - (2 - i) * (2 * avR - 7);
    const l = shape({ design: 'D', code: 'C', motion: 'M' }[who], sans, 10);
    out.push(`<circle cx="${n(cx)}" cy="57" r="${avR}" fill="${{ design: BLUE, code: MINT, motion: PINK }[who]}" stroke="${INK}" stroke-width="2.5"/>` + at(l, cx - l.width / 2, 60.6, who === 'design' ? MILK : INK));
  });
  const live = label(f, spec.live, spec.lang, 11);
  const lx = avRight - 3 * (2 * avR - 7) - 7 - 14 - live.width;
  out.push(at(live, lx, 61, milk(0.6)));
  out.push(`<circle cx="${n(lx - 17)}" cy="57" r="7.5" fill="${MINT}" fill-opacity=".14"/><circle cx="${n(lx - 17)}" cy="57" r="3.5" fill="${MINT}"/>`);

  // The mark as it stands in the file: selected · its real size under the frame.
  const mh = 250;
  const k = mh / MARK.h;
  const mw = MARK.w * k;
  const [x0, y0, x1, y1] = [490, 122, 710, 428];
  out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${BLUE}" stroke-width="6" stroke-opacity=".35" filter="url(#glow)"/>`);
  out.push(`<g transform="translate(${n(600 - mw / 2)} ${n((y0 + y1) / 2 - mh / 2)}) scale(${k.toFixed(5)})"><path d="${MARK.top}" fill="${MILK}"/><path d="${MARK.comma}" fill="${CORAL}"/></g>`);
  out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${BLUE}" stroke-width="2"/>`);
  for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const) out.push(`<rect x="${hx - 5.5}" y="${hy - 5.5}" width="11" height="11" fill="${INK}" stroke="${BLUE}" stroke-width="2"/>`);
  const size = shape(`${MARK.w} × ${MARK.h}`, mono, 10.5, 0.06);
  const sw = size.width + 16;
  out.push(`<rect x="${n(600 - sw / 2)}" y="${y1 + 9}" width="${n(sw)}" height="21" rx="3" fill="${BLUE}"/>` + at(size, 600 - size.width / 2, y1 + 23.6, MILK));

  // The team reaching for it.
  out.push(cursor(f, 'design', 441, 101));
  out.push(cursor(f, 'code', 813, 265));
  out.push(cursor(f, 'motion', 471, 373, 'left'));

  // The line under it: the slogan with the coral period · the studio and the city.
  const s = shape(spec.slogan.replace(/[.!?]\s*$/, ''), display, 52, -0.04);
  const dot = 52 * 0.13;
  const sx = 600 - (s.width + 52 * 0.04 + dot) / 2;
  out.push(at(s, sx, 512, MILK));
  out.push(`<rect x="${n(sx + s.width + 52 * 0.04)}" y="${n(512 - dot)}" width="${n(dot)}" height="${n(dot)}" fill="${CORAL}"/>`);
  const foot = label(f, spec.foot, spec.lang, 11.5);
  out.push(at(foot, 600 - foot.width / 2, 556, milk(0.55)));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}"><title>${esc(ogSentence(spec))}</title>${out.join('')}</svg>`;
  // A JPEG: the grain and the light would make a PNG several times heavier (WhatsApp wants it light).
  return sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}

/** Draws once per language and wording · keeps the JPEG on disk (DATA_DIR/og) and answers repeats from there. */
export class OgImages {
  private pending = new Map<string, Promise<Buffer>>();
  constructor(
    private readonly dir: string,
    private readonly src: FontSource,
  ) {}

  async jpg(spec: OgSpec): Promise<{ key: string; jpg: Buffer }> {
    const key = ogKey(spec);
    const file = join(this.dir, `${key}.jpg`);
    if (existsSync(file)) return { key, jpg: readFileSync(file) };
    let p = this.pending.get(key);
    if (!p) {
      p = drawOg(spec, this.src).then((jpg) => {
        mkdirSync(this.dir, { recursive: true });
        writeFileSync(file, jpg);
        return jpg;
      });
      p.finally(() => this.pending.delete(key)).catch(() => {});
      this.pending.set(key, p);
    }
    return { key, jpg: await p };
  }
}
