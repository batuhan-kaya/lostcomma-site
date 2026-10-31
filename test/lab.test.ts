import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { EXP_KEYS, EXPS, LAB, LOG_ORDER } from '../src/server/content/lab';
import { listProjects } from '../src/server/data/content';
import { projects, videos } from '../src/server/db/schema';
import { MediaError, mediaDirs } from '../src/server/media/ingest';
import { ingestLoop, isWebm, loopVideo, probeMp4 } from '../src/server/media/video';
import { bayer, BUDGET, breathAxes, cleanWord, ditherLevel, Meter, ms } from '../src/shared/lab';

const SITE = 'https://lostcomma.co';
const dataDir = mkdtempSync(join(tmpdir(), 'lc-lab-'));
const dirs = mediaDirs(dataDir);
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, DATA_DIR: dataDir }) });
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const get = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers });
const fixture = (name: string) => readFileSync(new URL(`./fixtures/loop/${name}`, import.meta.url));
const visible = (doc: string) =>
  (doc.split('<body>')[1] ?? doc)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe('the budget', () => {
  it('a drawing that keeps going over steps its quality down · and back up once there is room', () => {
    const m = new Meter(BUDGET.tile);
    for (let i = 0; i < 30; i++) m.add(0.4);
    expect(m.level).toBe(0);
    for (let i = 0; i < 80; i++) m.add(5);
    expect(m.level).toBe(1);
    for (let i = 0; i < 200; i++) m.add(5);
    expect(m.level).toBe(2);
    for (let i = 0; i < 400; i++) m.add(5);
    expect(m.level).toBe(2);
    for (let i = 0; i < 700; i++) m.add(0.2);
    expect(m.level).toBe(1);
  });

  it('a short spike does not change anything', () => {
    const m = new Meter(BUDGET.field);
    for (let i = 0; i < 100; i++) m.add(i % 20 === 0 ? 30 : 1);
    expect(m.level).toBe(0);
  });

  it('prints milliseconds with a point in both languages', () => {
    expect(ms(1.26)).toBe('1.3');
    expect(ms(0)).toBe('0.0');
  });
});

describe('the specimens', () => {
  it('the breathing word keeps the comma rule and nine letters', () => {
    expect(cleanWord('a,b,c')).toBe('abc');
    expect(cleanWord('İstanbul’u sev')).toBe('İstanbul’');
    expect(cleanWord('<b>hi</b>')).toBe('bhib');
  });

  it('dithering spreads one brightness over a pattern of neighbouring tones', () => {
    const vals = new Set<number>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) vals.add(ditherLevel(0.3, 3, x, y));
    expect([...vals].sort()).toEqual([0, 1]);
    expect(ditherLevel(0, 4, 3, 3)).toBe(0);
    expect(ditherLevel(1, 4, 0, 0)).toBe(3);
    expect(bayer(0, 0)).toBeGreaterThan(0);
    expect(bayer(3, 3)).toBeLessThan(1);
  });

  it('the word gets wider to the right and bolder to the top', () => {
    expect(breathAxes(0, 1)).toEqual({ wdth: 50, wght: 140 });
    expect(breathAxes(1, 0)).toEqual({ wdth: 130, wght: 900 });
    expect(breathAxes(5, -5)).toEqual({ wdth: 130, wght: 900 });
  });

  it('copy is complete in both languages and has no commas', () => {
    for (const lang of ['tr', 'en'] as const) {
      expect(Object.keys(LAB[lang].exps).sort()).toEqual([...EXP_KEYS].sort());
      expect(cleanWord(LAB[lang].word)).toBe(LAB[lang].word);
    }
    expect(strings(LAB).filter((s) => s.includes(','))).toEqual([]);
    expect([...LOG_ORDER].sort()).toEqual([...EXP_KEYS].sort());
    expect(EXP_KEYS.filter((k) => EXPS[k].fate === 'graduated')).toEqual(['dots', 'chain']);
  });
});

describe('the Lab page', () => {
  it('renders the field · six specimens · the log', async () => {
    for (const path of ['/tr/lab', '/en/lab']) {
      const res = await get(path);
      expect(res.statusCode).toBe(200);
      const doc = res.body;
      expect(doc).toContain('data-field');
      expect(doc.match(/<li class="tile" data-exp="/g)).toHaveLength(6);
      expect(doc.match(/<canvas data-cv role="img" aria-label="/g)).toHaveLength(5);
      expect(doc).toContain('data-word');
      expect(doc.match(/<li class="lr">/g)).toHaveLength(6);
      expect(doc.match(/class="chip graduated"/g)).toHaveLength(2);
      expect(doc).toContain('data-sec="grid" data-host="motion"');
      expect(visible(doc).includes(',')).toBe(false);
    }
    expect((await get('/en/lab')).body).toContain('Budget: 8 ms per frame');
  });
});

describe('loops', () => {
  it('reads size · length · codec · sound · fast start from an MP4', () => {
    expect(probeMp4(fixture('demo-loop.mp4'))).toEqual({ width: 640, height: 400, durationMs: 4000, codec: 'avc1', audio: false, fastStart: true });
    expect(probeMp4(fixture('with-sound.mp4')).audio).toBe(true);
    expect(probeMp4(fixture('slow-start.mp4')).fastStart).toBe(false);
    expect(isWebm(fixture('demo-loop.webm'))).toBe(true);
    expect(isWebm(fixture('demo-loop.mp4'))).toBe(false);
    expect(() => probeMp4(fixture('demo-poster.png'))).toThrow(MediaError);
    expect(() => probeMp4(Buffer.alloc(0))).toThrow(MediaError);
  });

  it('stores a loop with its poster and says what to fix in the next export', async () => {
    const { video, warnings } = await ingestLoop(app.db, dirs, { mp4: fixture('with-sound.mp4'), poster: fixture('demo-poster.png'), alt: { en: 'A dot', tr: 'Bir nokta' }, source: 'with-sound.mp4' });
    expect(video).toMatchObject({ width: 640, height: 400, webm: false, alt: { en: 'A dot' } });
    expect(existsSync(join(dirs.public, video.key, 'loop.mp4'))).toBe(true);
    expect(existsSync(join(dirs.public, video.key, 'loop.webm'))).toBe(false);
    expect(warnings.join(' ')).toMatch(/no WebM/);
    expect(warnings.join(' ')).toMatch(/sound track/);
    // The same file again is the same row.
    const again = await ingestLoop(app.db, dirs, { mp4: fixture('with-sound.mp4'), poster: fixture('demo-poster.png') });
    expect(again.video.id).toBe(video.id);
  });

  it('refuses what would not play well', async () => {
    const square = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#161618' } }).png().toBuffer();
    await expect(ingestLoop(app.db, dirs, { mp4: fixture('demo-loop.mp4'), poster: square })).rejects.toThrow(/shape/);
    await expect(ingestLoop(app.db, dirs, { mp4: fixture('demo-loop.mp4'), webm: fixture('demo-loop.mp4'), poster: fixture('demo-poster.png') })).rejects.toThrow(/not a WebM/);
    const slow = await ingestLoop(app.db, dirs, { mp4: fixture('slow-start.mp4'), webm: fixture('demo-loop.webm'), poster: fixture('demo-poster.png') });
    expect(slow.warnings.join(' ')).toMatch(/fast start/);
  });

  it('serves loops with range requests · nothing else from that folder', async () => {
    const { video } = await ingestLoop(app.db, dirs, { mp4: fixture('demo-loop.mp4'), webm: fixture('demo-loop.webm'), poster: fixture('demo-poster.png') });
    const part = await get(`/media/${video.key}/loop.mp4`, { range: 'bytes=0-99' });
    expect(part.statusCode).toBe(206);
    expect(part.headers['content-type']).toBe('video/mp4');
    expect(part.rawPayload.length).toBe(100);
    expect(part.headers['cache-control']).toContain('immutable');
    expect((await get(`/media/${video.key}/loop.webm`)).headers['content-type']).toBe('video/webm');
    expect((await get(`/media/${video.key}/other.mp4`)).statusCode).toBe(404);
  });

  it('a motion project with a loop plays it on the reel and in the homepage motion frame', async () => {
    const { video } = await ingestLoop(app.db, dirs, { mp4: fixture('demo-loop.mp4'), webm: fixture('demo-loop.webm'), poster: fixture('demo-poster.png'), alt: { en: 'A lime dot', tr: 'Yeşil bir nokta' } });
    const motion = (await listProjects(app.db, 'en')).find((p) => p.discipline === 'motion' && p.status === 'live')!;
    await app.db.update(projects).set({ loopId: video.id }).where(eq(projects.id, motion.id));

    const reel = (await get('/en/services/motion')).body;
    expect(reel).toContain(`<source src="/media/${video.key}/loop.webm" type="video/webm"><source src="/media/${video.key}/loop.mp4" type="video/mp4">`);
    expect(reel).toContain('preload="none"');
    expect(reel).not.toContain(' autoplay');
    expect(reel).toContain('aria-label="A lime dot"');
    const home = (await get('/tr')).body;
    expect(home).toContain('<div class="fc-vid"><video class="loopv"');
    expect(home).toContain('aria-hidden="true"><source');

    await app.db.update(projects).set({ loopId: null }).where(eq(projects.id, motion.id));
    expect((await get('/tr')).body).not.toContain('fc-vid');
  });

  it('a loop without alt text is decoration', () => {
    const html = loopVideo({ key: 'k', width: 640, height: 400, durationMs: 4000, webm: false, poster: { key: 'p', width: 640, height: 400, widths: [320, 640], color: '#000000', alt: {} }, alt: {} }, { lang: 'en' }).value;
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('poster="/media/p/640.webp"');
    expect(html).not.toContain('webm');
  });

  it('the videos table follows the comma rule for its alt text too', async () => {
    const rows = await app.db.select({ alt: videos.alt }).from(videos);
    expect(strings(rows).filter((s) => s.includes(','))).toEqual([]);
  });
});
