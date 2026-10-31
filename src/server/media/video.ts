/**
 * Loops: short silent videos of motion work, delivered ready made (decision · phase 8):
 *   an MP4 (H.264 · plays everywhere) · optionally a WebM (smaller in browsers that take it) ·
 *   a poster image (the first frame) that goes through the image pipeline.
 * The server checks the files instead of encoding them (no ffmpeg in the container):
 *   DATA_DIR/media/<key>/loop.mp4 · loop.webm   served at /media/ with range requests
 *   a row in the videos table                   size · duration · poster · alt text
 * docs/GORSELLER.md says how to export them.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { videos, type Localized } from '../db/schema';
import { html, type Safe } from '../html';
import type { Lang } from '../i18n';
import { ingestImage, MediaError, type MediaDirs } from './ingest';
import { mediaUrl, type MediaRef } from './picture';

/** A loop should stay light: a warning above this · a refusal above the hard limit. */
export const LOOP_LIMITS = { warnBytes: 3_000_000, maxBytes: 20_000_000, minMs: 2_000, maxMs: 15_000 } as const;

export interface VideoRef {
  key: string;
  width: number;
  height: number;
  durationMs: number;
  webm: boolean;
  poster: MediaRef;
  alt: Partial<Record<Lang, string>>;
}

/* ---------------- reading an MP4 ---------------- */

export interface Mp4Info {
  width: number;
  height: number;
  durationMs: number;
  /** The video track's sample format (avc1 = H.264). */
  codec: string | null;
  audio: boolean;
  /** The index (moov) comes before the data (mdat): it can start playing before it has all arrived. */
  fastStart: boolean;
}

interface Box {
  type: string;
  /** Where the content starts (after the header) and where the box ends. */
  start: number;
  end: number;
}

function boxes(buf: Buffer, from: number, to: number): Box[] {
  const out: Box[] = [];
  let off = from;
  while (off + 8 <= to) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (size === 1) {
      if (off + 16 > to) break;
      size = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (size === 0) size = to - off;
    if (size < header || off + size > to) break;
    out.push({ type, start: off + header, end: off + size });
    off += size;
  }
  return out;
}

const child = (buf: Buffer, box: Box | undefined, type: string) => (box ? boxes(buf, box.start, box.end).find((b) => b.type === type) : undefined);

export function probeMp4(buf: Buffer): Mp4Info {
  const top = boxes(buf, 0, buf.length);
  if (top[0]?.type !== 'ftyp') throw new MediaError('not an MP4 file (no ftyp box)');
  const moovAt = top.findIndex((b) => b.type === 'moov');
  const mdatAt = top.findIndex((b) => b.type === 'mdat');
  const moov = top[moovAt];
  if (!moov) throw new MediaError('MP4 has no index (moov box)');

  const mvhd = child(buf, moov, 'mvhd');
  let durationMs = 0;
  if (mvhd) {
    const v = buf[mvhd.start]!;
    const scale = v === 1 ? buf.readUInt32BE(mvhd.start + 20) : buf.readUInt32BE(mvhd.start + 12);
    const dur = v === 1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    durationMs = scale ? Math.round((dur / scale) * 1000) : 0;
  }

  let width = 0;
  let height = 0;
  let codec: string | null = null;
  let audio = false;
  for (const trak of boxes(buf, moov.start, moov.end).filter((b) => b.type === 'trak')) {
    const mdia = child(buf, trak, 'mdia');
    const hdlr = child(buf, mdia, 'hdlr');
    const kind = hdlr ? buf.toString('latin1', hdlr.start + 8, hdlr.start + 12) : '';
    if (kind === 'soun') audio = true;
    if (kind !== 'vide' || width) continue;
    const tkhd = child(buf, trak, 'tkhd');
    if (tkhd) {
      const at = buf[tkhd.start] === 1 ? 88 : 76;
      width = Math.round(buf.readUInt32BE(tkhd.start + at) / 65536);
      height = Math.round(buf.readUInt32BE(tkhd.start + at + 4) / 65536);
    }
    const stsd = child(buf, child(buf, child(buf, mdia, 'minf'), 'stbl'), 'stsd');
    if (stsd && stsd.start + 16 <= stsd.end) codec = buf.toString('latin1', stsd.start + 12, stsd.start + 16);
  }
  if (!width || !height) throw new MediaError('MP4 has no video track');
  return { width, height, durationMs, codec, audio, fastStart: mdatAt === -1 || moovAt < mdatAt };
}

/** WebM is Matroska with the doc type "webm". */
export function isWebm(buf: Buffer): boolean {
  return buf.length > 40 && buf.readUInt32BE(0) === 0x1a45dfa3 && buf.subarray(0, 64).includes('webm');
}

/* ---------------- storing a loop ---------------- */

export interface LoopInput {
  mp4: Buffer;
  webm?: Buffer;
  poster: Buffer;
  alt?: Localized;
  source?: string;
}

const mb = (n: number) => `${(n / 1_000_000).toFixed(1)} MB`;

/** Checks the files · stores them · returns the row and anything worth fixing in the next export. */
export async function ingestLoop(db: Db, dirs: MediaDirs, input: LoopInput): Promise<{ video: VideoRef & { id: number }; warnings: string[] }> {
  const info = probeMp4(input.mp4);
  const warnings: string[] = [];
  if (info.codec !== 'avc1' && info.codec !== 'avc3') throw new MediaError(`the MP4 must be H.264 (avc1) · this one is ${info.codec ?? 'unknown'}`);
  for (const [name, buf] of [['MP4', input.mp4], ['WebM', input.webm]] as const) {
    if (!buf) continue;
    if (buf.length > LOOP_LIMITS.maxBytes) throw new MediaError(`${name} is ${mb(buf.length)} · a loop must stay under ${mb(LOOP_LIMITS.maxBytes)}`);
    if (buf.length > LOOP_LIMITS.warnBytes) warnings.push(`${name} is ${mb(buf.length)} · aim for under ${mb(LOOP_LIMITS.warnBytes)} (lower the bitrate or the size)`);
  }
  if (input.webm && !isWebm(input.webm)) throw new MediaError('the second file is not a WebM');
  if (!input.webm) warnings.push('no WebM · the MP4 plays everywhere but a WebM is usually smaller');
  if (info.audio) warnings.push('the MP4 has a sound track · loops play muted · export without audio to save bytes');
  if (!info.fastStart) warnings.push('the MP4 is not optimised for the web (fast start) · it can only play once it has fully loaded');
  if (info.durationMs && (info.durationMs < LOOP_LIMITS.minMs || info.durationMs > LOOP_LIMITS.maxMs)) warnings.push(`the loop is ${(info.durationMs / 1000).toFixed(1)} s · 6 to 12 s works best`);

  const poster = await ingestImage(db, dirs, input.poster, { alt: input.alt, source: `${input.source ?? 'loop'} poster` });
  const ratio = info.width / info.height;
  if (Math.abs(poster.width / poster.height - ratio) / ratio > 0.02) {
    throw new MediaError(`the poster (${poster.width}×${poster.height}) does not have the video's shape (${info.width}×${info.height})`);
  }

  const key = createHash('sha256').update(input.mp4).digest('hex').slice(0, 16);
  const ref = (row: typeof videos.$inferSelect): VideoRef & { id: number } => ({
    id: row.id,
    key: row.key,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    webm: row.webmBytes != null,
    poster,
    alt: row.alt,
  });
  const existing = await db.query.videos.findFirst({ where: eq(videos.key, key) });
  if (existing) {
    // The same loop again: keep the files · take the new alt text if one was given.
    if (!input.alt || !Object.keys(input.alt).length) return { video: ref(existing), warnings };
    const [row] = await db.update(videos).set({ alt: input.alt }).where(eq(videos.id, existing.id)).returning();
    return { video: ref(row!), warnings };
  }

  const dir = join(dirs.public, key);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'loop.mp4'), input.mp4);
  if (input.webm) await writeFile(join(dir, 'loop.webm'), input.webm);
  const [row] = await db
    .insert(videos)
    .values({
      key,
      width: info.width,
      height: info.height,
      durationMs: info.durationMs,
      mp4Bytes: input.mp4.length,
      webmBytes: input.webm?.length ?? null,
      posterId: poster.id,
      alt: input.alt ?? {},
      source: input.source ?? 'loop.mp4',
    })
    .returning();
  return { video: ref(row!), warnings };
}

/* ---------------- showing a loop ---------------- */

export const loopUrl = (key: string, format: 'mp4' | 'webm') => `/media/${key}/loop.${format}`;

/** The poster variant closest to `want` px wide (WebP works everywhere a <video> does). */
export function posterUrl(p: MediaRef, want = 1280): string {
  const w = p.widths.reduce((best, x) => (Math.abs(x - want) < Math.abs(best - want) ? x : best), p.widths[0] ?? p.width);
  return mediaUrl(p.key, w, 'webp');
}

/**
 * A muted looping <video>. It never autoplays from markup: the page script plays it while it is
 * on screen and the visitor has not asked for less motion. Until then the poster shows.
 */
export function loopVideo(v: VideoRef, o: { lang: Lang; alt?: string; posterWidth?: number; class?: string }): Safe {
  const other: Lang = o.lang === 'tr' ? 'en' : 'tr';
  const alt = o.alt ?? v.alt[o.lang] ?? v.alt[other] ?? '';
  return html`<video class="loopv${o.class ? ' ' + o.class : ''}" muted loop playsinline disableremoteplayback preload="none" poster="${posterUrl(v.poster, o.posterWidth)}" width="${v.width}" height="${v.height}" data-loopv${alt ? html` aria-label="${alt}"` : html` aria-hidden="true"`}>${v.webm ? html`<source src="${loopUrl(v.key, 'webm')}" type="video/webm">` : ''}<source src="${loopUrl(v.key, 'mp4')}" type="video/mp4"></video>`;
}
