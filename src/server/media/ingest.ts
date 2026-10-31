/**
 * The image pipeline. One upload becomes:
 *   DATA_DIR/originals/<key>.<ext>         the untouched file (private · for re-processing later)
 *   DATA_DIR/media/<key>/<width>.avif      served at /media/<key>/<width>.avif
 *   DATA_DIR/media/<key>/<width>.webp
 *   a row in the media table               size · widths · dominant colour · alt text
 *
 * The key is a hash of the file: the same image is stored once and its URLs never change,
 * so they are cached for a year. Variants are rotated upright and carry no metadata
 * (camera · GPS). Large widths are only made when the original is that big.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import type { Db } from '../db';
import { media, type Localized } from '../db/schema';
import type { MediaRef } from './picture';

export const WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;
const MAX = WIDTHS[WIDTHS.length - 1]!;
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff']);
const EXT: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', heif: 'heic', tiff: 'tif' };
/** About 50 megapixels: larger files are refused before they are decoded. */
const PIXEL_LIMIT = 50_000_000;

export interface MediaDirs {
  /** Public variants · served under /media/. */
  public: string;
  /** Originals · never served. */
  originals: string;
}

export const mediaDirs = (dataDir: string): MediaDirs => ({ public: join(dataDir, 'media'), originals: join(dataDir, 'originals') });

export class MediaError extends Error {}

/** Which widths to make for an image this wide: every standard width below it plus its own (capped). */
export function variantWidths(width: number): number[] {
  const out: number[] = WIDTHS.filter((w) => w < width);
  out.push(Math.min(width, MAX));
  return [...new Set(out)];
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

export interface IngestOptions {
  alt?: Localized;
  /** Original file name (shown in the panel). */
  source?: string;
}

export async function ingestImage(db: Db, dirs: MediaDirs, input: Buffer, opts: IngestOptions = {}): Promise<MediaRef & { id: number }> {
  const key = createHash('sha256').update(input).digest('hex').slice(0, 16);
  const existing = await db.query.media.findFirst({ where: eq(media.key, key) });
  if (existing) return existing;

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: PIXEL_LIMIT }).metadata();
  } catch {
    throw new MediaError('not an image this pipeline can read');
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new MediaError(`format ${meta.format ?? 'unknown'} is not accepted (jpeg · png · webp · avif · heic · tiff)`);
  const { width, height } = meta.autoOrient;
  if (!width || !height) throw new MediaError('image has no size');

  const widths = variantWidths(width);
  const dir = join(dirs.public, key);
  await mkdir(dir, { recursive: true });
  await mkdir(dirs.originals, { recursive: true });

  const base = () => sharp(input, { limitInputPixels: PIXEL_LIMIT }).rotate();
  for (const w of widths) {
    const resized = () => base().resize({ width: w, withoutEnlargement: true });
    await resized().avif({ quality: 52, effort: 4 }).toFile(join(dir, `${w}.avif`));
    await resized().webp({ quality: 80, effort: 5 }).toFile(join(dir, `${w}.webp`));
  }
  const ext = meta.format === 'heif' && meta.compression === 'av1' ? 'avif' : (EXT[meta.format] ?? 'bin');
  await writeFile(join(dirs.originals, `${key}.${ext}`), input);

  const { dominant } = await base().stats();
  const color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;

  const [row] = await db
    .insert(media)
    .values({ key, width, height, widths, color, alt: opts.alt ?? {}, source: opts.source ?? '', bytes: input.length })
    .returning();
  return row!;
}
