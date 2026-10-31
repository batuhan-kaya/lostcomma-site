/**
 * SEED=demo: one generated cover and one small loop so e2e tests and screenshots exercise the
 * whole image and video paths (pipeline → /media → <picture> · <video>) before real ones arrive.
 * Never used in production.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';
import type { Db } from '../db';
import { DEMO_ALT } from '../db/sample';
import { projects } from '../db/schema';
import { ingestImage, type MediaDirs } from './ingest';
import { ingestLoop } from './video';

/** The demo loop lives with the test fixtures (a lime dot crossing the night · 4 s · 15 kb). */
const LOOP_DIR = join(process.cwd(), 'test/fixtures/loop');
export const DEMO_LOOP_ALT = { en: 'Demo loop: a lime dot crossing a dark grid', tr: 'Deneme döngüsü: koyu bir ızgarada ilerleyen yeşil bir nokta' };

/** An evening sea with two sails · shapes only (no text so it renders without fonts). */
export function demoSvg(w = 1600, h = 1046): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 520 340">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C3564"/><stop offset=".55" stop-color="#C7869A"/><stop offset="1" stop-color="#F7CDA6"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#284A80"/><stop offset="1" stop-color="#0F1F3A"/></linearGradient></defs>
<rect width="520" height="340" fill="url(#s)"/><circle cx="360" cy="196" r="46" fill="#FFE2B8" opacity=".9"/>
<rect y="206" width="520" height="134" fill="url(#w)"/><rect x="300" y="214" width="120" height="3" fill="#F7CDA6" opacity=".55"/><rect x="320" y="226" width="80" height="2" fill="#F7CDA6" opacity=".4"/>
<path d="M170 92 L170 200 L230 200 Z" fill="#FBF4EA"/><path d="M163 110 L163 200 L128 200 Z" fill="#EFE2D2"/><path d="M118 203 L236 203 L223 214 L131 214 Z" fill="#0E1F40"/>
<path d="M410 160 L410 204 L432 204 Z" fill="#FBF4EA"/><path d="M400 206 L438 206 L434 211 L404 211 Z" fill="#0E1F40"/></svg>`;
}

export async function demoCoverPng(): Promise<Buffer> {
  return sharp(Buffer.from(demoSvg())).png().toBuffer();
}

/** Gives the project in board frame 0 the demo cover, unless it already has a cover. */
export async function addDemoCover(db: Db, dirs: MediaDirs): Promise<void> {
  const [target] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.boardSlot, 0), isNull(projects.coverId)))
    .limit(1);
  if (!target) return;
  const image = await ingestImage(db, dirs, await demoCoverPng(), { alt: DEMO_ALT, source: 'demo-cover.png' });
  await db.update(projects).set({ coverId: image.id }).where(eq(projects.id, target.id));
}

/** Gives the oldest live motion project the demo loop, unless one already has a loop. Skipped without the fixtures. */
export async function addDemoLoop(db: Db, dirs: MediaDirs): Promise<void> {
  if (!existsSync(join(LOOP_DIR, 'demo-loop.mp4'))) return;
  const motion = await db.query.projects.findMany({ where: and(eq(projects.discipline, 'motion'), eq(projects.status, 'live')), orderBy: asc(projects.no) });
  if (!motion.length || motion.some((p) => p.loopId != null)) return;
  const { video } = await ingestLoop(db, dirs, {
    mp4: await readFile(join(LOOP_DIR, 'demo-loop.mp4')),
    webm: await readFile(join(LOOP_DIR, 'demo-loop.webm')),
    poster: await readFile(join(LOOP_DIR, 'demo-poster.png')),
    alt: DEMO_LOOP_ALT,
    source: 'demo-loop.mp4',
  });
  await db.update(projects).set({ loopId: video.id }).where(eq(projects.id, motion[0]!.id));
}
