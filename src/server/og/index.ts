/**
 * Share images (og:image). Drawn by the server from our own fonts: fontkit turns every letter into
 * an outline · the outlines go into an SVG · sharp turns it into a 1200 × 630 PNG.
 *
 * fontkit cannot apply variation axes to woff2 files, so each font is unpacked to TTF once
 * (wawoff2) and kept in memory. Images are cached on disk by a hash of what they show:
 * a changed title draws a new image and nothing is drawn twice.
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
import type { CrewName } from '../page';
import { THEMES } from '../themes';
import { MARK, MARK_EM } from '../../shared/logo';

export const OG_W = 1200;
export const OG_H = 630;
/** Bump when the drawing changes so cached images are drawn again. */
const VERSION = 5;

export interface OgSpec {
  lang: Lang;
  /** The hero's lines (Metinler) · {w} is the selected word. */
  lines: string[];
  /** The word in the box (the hero's first word). */
  word: string;
  /** The line under the rule (the studio · the city). */
  foot: string;
}

export function ogKey(spec: OgSpec): string {
  return createHash('sha1').update(JSON.stringify([VERSION, spec.lang, spec.lines, spec.word, spec.foot])).digest('hex').slice(0, 12);
}

/** The card's words in one sentence (og:image:alt · the SVG title). */
export const ogSentence = (spec: OgSpec): string => spec.lines.join(' ').replace('{w}', spec.word).replace(/\s+/g, ' ').trim();

/* ---------------- colours ---------------- */

const CREW: Record<CrewName, string> = { design: '#3B35FF', code: '#3EE0A8', motion: '#FF9BD2' };
const CREW_ON: Record<CrewName, string> = { design: '#F2F1EC', code: '#0E0E0F', motion: '#0E0E0F' };
const LETTER: Record<CrewName, string> = { design: 'D', code: 'C', motion: 'M' };
const CORAL = '#FF5A2B';
const MINT = '#3EE0A8';

/** The homepage's paper: ink words · the hero's blue selection. */
const c = {
  bg: THEMES.paper,
  fg: '#0E0E0F',
  mu: 'rgba(14,14,15,.6)',
  rule: 'rgba(14,14,15,.14)',
  dots: 'rgba(14,14,15,.11)',
  sel: '#3B35FF',
  selOn: '#F2F1EC',
  wash: 'rgba(59,53,255,.16)',
};
type Palette = typeof c;

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
const PAD = 72;

interface Faces {
  display: Font[];
  mono: Font[];
  sans: Font[];
  mark: Font[];
}

const n = (v: number) => v.toFixed(1);

/** The site's dotted ground (26 px like the page) · under everything. */
function ground(c: Palette): string {
  return (
    `<defs><pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1.25" fill="${c.dots}"/></pattern>` +
    `<filter id="soft" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="18"/></filter></defs>` +
    `<rect width="${OG_W}" height="${OG_H}" fill="${c.bg}"/><rect width="${OG_W}" height="${OG_H}" fill="url(#dots)"/>`
  );
}

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

/** The team in the file (the header's avatars): three overlapping circles · right edge at x. */
function avatars(f: Faces, right: number, cy: number, c: Palette): string {
  const r = 17;
  return (['design', 'code', 'motion'] as const)
    .map((who, i) => {
      const cx = right - r - (2 - i) * (2 * r - 8);
      const l = shape(LETTER[who], f.sans, 15);
      // An avatar the colour of the ground gets an ink ring (motion on pink · design on blue).
      const same = CREW[who].toLowerCase() === c.bg.toLowerCase();
      return (
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${CREW[who]}" stroke="${c.bg}" stroke-width="3"/>` +
        (same ? `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r - 1.5}" fill="none" stroke="#0E0E0F" stroke-width="1.5"/>` : '') +
        at(l, cx - l.width / 2, cy + 5.3, CREW_ON[who])
      );
    })
    .join('');
}

/** A teammate's cursor with its name tag · the tip at (x y) · the tag to the left when there is no room. */
function cursor(f: Faces, who: CrewName, x: number, y: number, c: Palette, side: 'auto' | 'left' = 'auto'): string {
  const k = 2.2;
  const name = shape(who, f.sans, 22);
  const tw = name.width + 26;
  const left = side === 'left' || x + 17 * k + tw > OG_W - 24;
  const tx = left ? -tw - 4 : 15 * k;
  const fill = CREW[who];
  const clash = fill.toLowerCase() === c.bg.toLowerCase();
  const edge = clash ? '#0E0E0F' : '#FFFFFF';
  return (
    `<g transform="translate(${n(x - 3 * k)} ${n(y - 2 * k)})"><path transform="scale(${k})" d="${ARROW}" fill="${fill}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<rect x="${n(tx)}" y="${n(19 * k)}" width="${n(tw)}" height="36" rx="18" fill="${fill}"${clash ? ' stroke="#0E0E0F" stroke-width="2"' : ''}/>` +
    at(name, tx + 13, 19 * k + 25, CREW_ON[who]) +
    '</g>'
  );
}

/** A selected layer (the hero's word box · the board's frames): frame · four handles · its label on top. */
function selection(f: Faces, x0: number, y0: number, x1: number, y1: number, label: string, c: Palette, wash = true, below = false): string {
  const h = 11;
  const handles = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ]
    .map(([x, y]) => `<rect x="${n(x! - h / 2)}" y="${n(y! - h / 2)}" width="${h}" height="${h}" fill="${c.bg}" stroke="${c.sel}" stroke-width="2.5"/>`)
    .join('');
  const t = shape(label, f.mono, 14, 0.04);
  return (
    (wash ? `<rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" fill="${c.wash}"/>` : '') +
    `<rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" fill="none" stroke="${c.sel}" stroke-width="2.5"/>` +
    handles +
    // The label sits above the layer · under it when a line of words is above (the hero's own way).
    `<rect x="${n(x0 - 1.25)}" y="${n(below ? y1 + 8 : y0 - 33)}" width="${n(t.width + 20)}" height="25" rx="3" fill="${c.sel}"/>` +
    at(t, x0 + 9, below ? y1 + 25.5 : y0 - 15.5, c.selOn)
  );
}

/** The one card every page shares in its language: the homepage hero as it stands in the file. */
export async function drawOg(spec: OgSpec, src: FontSource): Promise<Buffer> {
  const [display, mono, sans, mark] = await Promise.all([fontsFor('display', src), fontsFor('mono', src), fontsFor('sans', src), fontsFor('display', src, { wdth: 88, wght: 820 })]);
  const f: Faces = { display, mono, sans, mark };
  const out: string[] = [ground(c)];
  const upper = (t: string) => t.toLocaleUpperCase(spec.lang);
  const tagWord = spec.lang === 'tr' ? 'Metin' : 'Text';
  const domain = shape('lostcomma.co', mono, 18, 0.03);
  const ruleY = OG_H - PAD - 50;

    // The homepage: the header's line · the hero sentence with its word selected · the team at work.
    const top = lockup(f, PAD, PAD + 22, 30, c.fg);
    out.push(top.svg);
    const lx = PAD + top.w + 26;
    const live = shape(upper(spec.lang === 'tr' ? 'Canlı' : 'Live'), mono, 15, 0.05);
    out.push(`<circle cx="${n(lx + 5)}" cy="${n(PAD + 15)}" r="5" fill="${MINT}"/>` + at(live, lx + 18, PAD + 20.5, c.mu));
    out.push(avatars(f, lx + 18 + live.width + 26 + 3 * 34 - 16, PAD + 14, c));
    out.push(at(domain, OG_W - PAD - domain.width, PAD + 20, c.mu));

    const lines = spec.lines.map((l) => l.replace('{w}', spec.word));
    const maxW = OG_W - PAD * 2 - 40;
    let size = 116;
    for (; size > 56; size -= 2) if (lines.every((l) => shape(l, display, size, -0.05).width <= maxW) && size * 0.98 + (lines.length - 1) * size * 1.02 <= ruleY - 40 - (PAD + 92)) break;
    const lh = size * 1.02;
    const blockH = size * 0.98 + (lines.length - 1) * lh;
    const y0 = PAD + 70 + (ruleY - 30 - (PAD + 70) - blockH) / 2;
    const ends: { x: number; y: number }[] = [];
    let wordBox = null as [number, number, number, number] | null;
    for (const [i, raw] of spec.lines.entries()) {
      const line = raw.replace('{w}', spec.word);
      const base = y0 + size * 0.8 + i * lh;
      const x = PAD - size * 0.04;
      const sh = shape(line, display, size, -0.05);
      const wi = raw.indexOf('{w}');
      if (wi >= 0) {
        const pre = shape(raw.slice(0, wi), display, size, -0.05).width;
        const ww = shape(spec.word, display, size, -0.05).width;
        wordBox = [x + pre - 8, base - size * 0.8, x + pre + ww + 10, base + size * 0.17];
      }
      out.push(at(sh, x, base, c.fg));
      ends.push({ x: x + sh.width, y: base });
    }
    // The period: the hero's coral square (outside the word box when the word ends the sentence).
    const last = ends[ends.length - 1]!;
    const dot = size * 0.13;
    const wordLine = spec.lines.findIndex((l) => l.includes('{w}'));
    const box = wordBox as [number, number, number, number] | null;
    const wordEnds = !!box && wordLine === lines.length - 1 && spec.lines[wordLine]!.trimEnd().endsWith('{w}');
    const px = wordEnds ? box![2] + 5 : last.x + size * 0.02;
    out.push(`<rect x="${n(px)}" y="${n(last.y - dot)}" width="${n(dot)}" height="${n(dot)}" fill="${CORAL}"/>`);
    let designAt = { x: 0, y: 0 };
    if (box) {
      const [x0, y0b, x1, y1] = box;
      // The wash goes under the words (right after the ground).
      out.splice(1, 0, `<rect x="${n(x0)}" y="${n(y0b)}" width="${n(x1 - x0)}" height="${n(y1 - y0b)}" fill="${c.wash}"/>`);
      out.push(selection(f, x0, y0b, x1, y1, upper(`${tagWord} · ${Math.round(size)}`), c, false, wordLine > 0));
      designAt = { x: (wordEnds ? px + dot : x1) + 10, y: y0b + (y1 - y0b) * 0.3 };
      out.push(cursor(f, 'design', designAt.x, designAt.y, c));
    }
    // code and motion rest beside the other lines where they leave room (never on a word) · on the
    // word's line after design when the others are full.
    const spots = ends
      .map((e, i) => ({ x: (i === ends.length - 1 ? px + dot : e.x) + 60, y: e.y - size * 0.55, i }))
      .filter((e) => e.i !== wordLine && e.x + 150 < OG_W - PAD);
    if (box && designAt.x + 220 + 190 < OG_W - PAD) spots.push({ x: designAt.x + 220, y: designAt.y, i: wordLine });
    (['code', 'motion'] as const).forEach((who, j) => {
      const e = spots[j];
      if (e) out.push(cursor(f, who, e.x, e.y, c));
    });

    out.push(`<rect x="${PAD}" y="${ruleY}" width="${OG_W - PAD * 2}" height="1.5" fill="${c.rule}"/>`);
    const foot = shape(upper(spec.foot), mono, 17, 0.05);
    out.push(at(foot, PAD, OG_H - PAD - 4, c.mu));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}"><title>${esc(ogSentence(spec))}</title>${out.join('')}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toBuffer();
}

/** Draws once per language and wording · keeps the PNG on disk (DATA_DIR/og) and answers repeats from there. */
export class OgImages {
  private pending = new Map<string, Promise<Buffer>>();
  constructor(
    private readonly dir: string,
    private readonly src: FontSource,
  ) {}

  async png(spec: OgSpec): Promise<{ key: string; png: Buffer }> {
    const key = ogKey(spec);
    const file = join(this.dir, `${key}.png`);
    if (existsSync(file)) return { key, png: readFileSync(file) };
    let p = this.pending.get(key);
    if (!p) {
      p = drawOg(spec, this.src).then((png) => {
        mkdirSync(this.dir, { recursive: true });
        writeFileSync(file, png);
        return png;
      });
      p.finally(() => this.pending.delete(key)).catch(() => {});
      this.pending.set(key, p);
    }
    return { key, png: await p };
  }
}
