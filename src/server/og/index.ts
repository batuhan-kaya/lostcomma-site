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
import { THEMES, type ThemeId } from '../themes';
import { MARK, MARK_EM } from '../../shared/logo';

export const OG_W = 1200;
export const OG_H = 630;
/** Bump when the drawing changes so cached images are drawn again. */
const VERSION = 2;

export interface OgSpec {
  lang: Lang;
  theme: ThemeId;
  /** The small label on top (mono · upper case). */
  kick: string;
  title: string;
  /** Whose cursor rests at the end of the title. */
  who: CrewName;
}

export function ogKey(spec: OgSpec): string {
  return createHash('sha1')
    .update(JSON.stringify([VERSION, spec.lang, spec.theme, spec.kick, spec.title, spec.who]))
    .digest('hex')
    .slice(0, 12);
}

/* ---------------- colours ---------------- */

const CREW: Record<CrewName, string> = { design: '#3B35FF', code: '#3EE0A8', motion: '#FF9BD2' };
const CREW_ON: Record<CrewName, string> = { design: '#F2F1EC', code: '#0E0E0F', motion: '#0E0E0F' };
const DARK = new Set<ThemeId>(['ink', 'navy', 'blue', 'night', 'lab']);

function palette(theme: ThemeId) {
  const dark = DARK.has(theme);
  const fg = theme === 'navy' ? '#F6EFE6' : dark ? '#F2F1EC' : '#0E0E0F';
  return { bg: THEMES[theme], fg, mu: dark ? 'rgba(242,241,236,.62)' : 'rgba(14,14,15,.6)', rule: dark ? 'rgba(242,241,236,.16)' : 'rgba(14,14,15,.14)' };
}

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
function wrap(words: string[], widthOf: (s: string) => number, max: number): string[] | null {
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (widthOf(w) > max) return null;
    const next = line ? `${line} ${w}` : w;
    if (line && widthOf(next) > max) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';
const PAD = 72;

export async function drawOg(spec: OgSpec, src: FontSource): Promise<Buffer> {
  const [display, mono, sans, mark] = await Promise.all([
    fontsFor('display', src),
    fontsFor('mono', src),
    fontsFor('sans', src),
    fontsFor('display', src, { wdth: 88, wght: 820 }),
  ]);
  const c = palette(spec.theme);
  const out: string[] = [];

  // Kick: mono upper case · muted.
  const kick = shape(spec.kick.toLocaleUpperCase(spec.lang), mono, 21, 0.03);
  out.push(at(kick, PAD, PAD + 22, c.mu));

  // Title: the biggest size that fits above the footer in three lines at most
  // (room for the cursor on the last one · leading loose enough for a cedilla over the next line).
  const words = spec.title.trim().split(/\s+/);
  const max = OG_W - PAD * 2 - 110;
  const top = PAD + 92;
  const room = OG_H - PAD - 58 - 28 - top;
  const LH = 1.04;
  let size = 132;
  let lines: string[] | null = null;
  for (; size >= 56; size -= 4) {
    const s = size;
    lines = wrap(words, (t) => shape(t, display, s, -0.05).width, max);
    if (lines && lines.length <= 3 && s * (0.78 + 0.2) + (lines.length - 1) * s * LH <= room) break;
  }
  lines ??= [spec.title];
  const lh = size * LH;
  let endX = PAD;
  let endY = top;
  lines.forEach((line, i) => {
    const sh = shape(line, display, size, -0.05);
    const y = top + size * 0.78 + i * lh;
    out.push(at(sh, PAD - size * 0.04, y, c.fg));
    endX = PAD - size * 0.04 + sh.width;
    endY = y;
  });

  // The cursor resting at the end of the title · its name tag.
  const k = 2.4;
  const ax = endX + 18;
  const ay = endY - size * 0.62;
  const tagText = shape(spec.who, sans, 25);
  const tagW = tagText.width + 28;
  const tagFill = CREW[spec.who];
  const clash = tagFill.toLowerCase() === c.bg.toLowerCase();
  out.push(
    `<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)})"><path transform="scale(${k})" d="${ARROW}" fill="${tagFill}" stroke="${clash ? '#0E0E0F' : '#FFFFFF'}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<rect x="${(17 * k).toFixed(1)}" y="${(20 * k).toFixed(1)}" width="${tagW.toFixed(1)}" height="40" rx="20" fill="${tagFill}"${clash ? ' stroke="#0E0E0F" stroke-width="2"' : ''}/>` +
      at(tagText, 17 * k + 14, 20 * k + 28, CREW_ON[spec.who]) +
      '</g>',
  );

  // Footer: rule · the mark and the wordmark with its caret (one size: the corner is as tall as
  // the l · the comma hangs under the baseline) · the three team dots.
  const fy = OG_H - PAD;
  out.push(`<rect x="${PAD}" y="${fy - 58}" width="${OG_W - PAD * 2}" height="1.5" fill="${c.rule}"/>`);
  const WM = 36;
  const mk = (MARK_EM.h * WM) / MARK.h;
  out.push(`<g transform="translate(${PAD} ${(fy - MARK.base * mk).toFixed(2)}) scale(${mk.toFixed(5)})" fill="${c.fg}"><path d="${MARK.top}"/><path d="${MARK.comma}"/></g>`);
  const wx = PAD + MARK_EM.w * WM + 0.16 * WM;
  const lost = shape('lost', mark, WM, -0.02);
  const comma = shape('comma', mark, WM, -0.02);
  out.push(at(lost, wx, fy, c.fg));
  out.push(`<rect x="${(wx + lost.width + 6).toFixed(1)}" y="${fy - 27}" width="3" height="28" fill="${c.fg}"/>`);
  out.push(at(comma, wx + lost.width + 15, fy, c.fg));
  (['design', 'code', 'motion'] as const).forEach((n, i) => {
    const ring = CREW[n].toLowerCase() === c.bg.toLowerCase() ? ` stroke="${c.fg}" stroke-width="1.5"` : '';
    out.push(`<circle cx="${OG_W - PAD - 9 - (2 - i) * 26}" cy="${fy - 11}" r="9" fill="${CREW[n]}"${ring}/>`);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}"><title>${esc(spec.title)}</title><rect width="${OG_W}" height="${OG_H}" fill="${c.bg}"/>${out.join('')}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toBuffer();
}

/** Draws once per content · keeps the PNG on disk (DATA_DIR/og) and answers repeats from there. */
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
