/**
 * npm run icons · draws every icon from the mark (src/shared/logo.ts) into public/:
 *   favicon.svg            the mark alone · ink on light tabs · milk on dark ones
 *   favicon.ico            16 · 32 · 48 on an ink tile (browsers without SVG favicons)
 *   apple-touch-icon.png   180 · ink square (iOS rounds it)
 *   icon-192.png · icon-512.png   ink rounded tile (the web app manifest)
 *   icon-maskable.png      512 · full bleed with the mark inside the safe circle
 *   icon-144.png           the Notes RSS feed image (RSS allows 144 px at most)
 *   site.webmanifest
 * The files are committed. A unit test draws them again and fails when they drift from the mark.
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { markFile } from '../src/shared/logo';

const INK = '#0E0E0F';
const MILK = '#F2F1EC';
const PAPER = '#ECECE8';

export const ICON_FILES = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'icon-144.png', 'site.webmanifest'] as const;

/** The favicon: the mark alone · its colour follows the browser's light or dark tabs. */
export function faviconSvg(): string {
  return markFile({ size: 64, fill: INK, css: `g{fill:${INK}}@media (prefers-color-scheme:dark){g{fill:${MILK}}}` });
}

const tile = (size: number, o: { radius?: number; scale: number }) => markFile({ size, fill: MILK, bg: INK, radius: o.radius ?? 0, scale: o.scale });

async function png(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/** An .ico with PNG frames (every browser since IE 11 reads them). */
export function ico(frames: { size: number; png: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + frames.length * 16);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(frames.length, 4);
  let offset = head.length;
  frames.forEach((f, i) => {
    const at = 6 + i * 16;
    head.writeUInt8(f.size >= 256 ? 0 : f.size, at);
    head.writeUInt8(f.size >= 256 ? 0 : f.size, at + 1);
    head.writeUInt8(0, at + 2);
    head.writeUInt8(0, at + 3);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(f.png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += f.png.length;
  });
  return Buffer.concat([head, ...frames.map((f) => f.png)]);
}

export function manifest(): string {
  return `${JSON.stringify(
    {
      name: 'Lost Comma',
      short_name: 'Lost Comma',
      start_url: '/',
      display: 'browser',
      background_color: PAPER,
      theme_color: INK,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )}\n`;
}

/** Every icon file by name · the same bytes each time for the same mark. */
export async function drawIcons(): Promise<Record<(typeof ICON_FILES)[number], Buffer>> {
  const rounded = (s: number) => tile(s, { radius: s * 0.22, scale: 0.62 });
  const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await png(tile(size * 8, { radius: size * 8 * 0.22, scale: 0.7 }), size) })));
  return {
    'favicon.svg': Buffer.from(`${faviconSvg()}\n`),
    'favicon.ico': ico(small),
    'apple-touch-icon.png': await png(tile(180, { scale: 0.58 }), 180),
    'icon-192.png': await png(rounded(192), 192),
    'icon-512.png': await png(rounded(512), 512),
    'icon-maskable.png': await png(tile(512, { scale: 0.48 }), 512),
    'icon-144.png': await png(rounded(144), 144),
    'site.webmanifest': Buffer.from(manifest()),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const out = resolve(import.meta.dirname, '../public');
  const files = await drawIcons();
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(join(out, name), bytes);
    console.log(`public/${name}  ${bytes.length} B`);
  }
}
