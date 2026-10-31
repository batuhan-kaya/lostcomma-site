import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { boardProjects } from '../src/server/data/content';
import { projects } from '../src/server/db/schema';
import { ingestImage, MediaError, mediaDirs, variantWidths } from '../src/server/media/ingest';
import { picture, type MediaRef } from '../src/server/media/picture';

const dataDir = mkdtempSync(join(tmpdir(), 'lc-media-'));
const dirs = mediaDirs(dataDir);
// SEED=demo: sample content plus a generated cover on board frame 0.
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://lostcomma.co', DATA_DIR: dataDir, SEED: 'demo' }) });
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

/** A photo-like JPEG lying on its side (EXIF orientation 6) with a camera and GPS tag. */
async function cameraPhoto(width = 1600, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#3a6ea5' } })
    .composite([{ input: { create: { width: width / 2, height: height / 2, channels: 3, background: '#f2c14e' } }, left: 0, top: 0 }])
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .withExifMerge({ IFD0: { Make: 'Lost Comma Camera' }, IFD3: { GPSLatitude: '41/1 0/1 0/1', GPSLatitudeRef: 'N' } })
    .toBuffer();
}

describe('variant widths', () => {
  it('never upscales and stops at 2560', () => {
    expect(variantWidths(200)).toEqual([200]);
    expect(variantWidths(1000)).toEqual([320, 640, 960, 1000]);
    expect(variantWidths(1280)).toEqual([320, 640, 960, 1280]);
    expect(variantWidths(6000)).toEqual([320, 640, 960, 1280, 1920, 2560]);
  });
});

describe('ingest', async () => {
  const input = await cameraPhoto();
  const image = await ingestImage(app.db, dirs, input, { alt: { tr: 'Mavi ve sarı', en: 'Blue and yellow' }, source: 'IMG_0001.jpg' });

  it('stores the upright size and every width in AVIF and WebP', async () => {
    expect([image.width, image.height]).toEqual([1000, 1600]);
    expect(image.widths).toEqual([320, 640, 960, 1000]);
    const files = readdirSync(join(dirs.public, image.key)).sort();
    expect(files).toEqual(['1000.avif', '1000.webp', '320.avif', '320.webp', '640.avif', '640.webp', '960.avif', '960.webp']);
    const avif = await sharp(join(dirs.public, image.key, '640.avif')).metadata();
    expect([avif.width, avif.height, avif.compression]).toEqual([640, 1024, 'av1']);
  });

  it('strips camera and GPS metadata from what it serves', async () => {
    const webp = await sharp(join(dirs.public, image.key, '960.webp')).metadata();
    expect(webp.exif).toBeUndefined();
    expect(webp.orientation).toBeUndefined();
  });

  it('keeps the original privately and picks the dominant colour', () => {
    expect(existsSync(join(dirs.originals, `${image.key}.jpg`))).toBe(true);
    expect(image.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(image.alt).toEqual({ tr: 'Mavi ve sarı', en: 'Blue and yellow' });
  });

  it('stores the same file once', async () => {
    const again = await ingestImage(app.db, dirs, input);
    expect(again.id).toBe(image.id);
  });

  it('refuses what is not a photo', async () => {
    await expect(ingestImage(app.db, dirs, Buffer.from('hello'))).rejects.toBeInstanceOf(MediaError);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    await expect(ingestImage(app.db, dirs, svg)).rejects.toThrow(/svg is not accepted/);
  });

  it('serves variants for a year · nothing else under /media', async () => {
    const res = await app.inject(`/media/${image.key}/640.avif`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/avif');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await app.inject(`/media/${image.key}/640.webp`)).headers['content-type']).toBe('image/webp');
    // (A trailing slash first redirects to the canonical address · that one is a 404 too.)
    for (const url of [`/media/${image.key}/641.avif`, `/media/${image.key}`, '/media', `/media/${image.key}/640.png`, `/media/..%2foriginals%2f${image.key}.jpg`, `/media/../originals/${image.key}.jpg`, `/originals/${image.key}.jpg`]) {
      expect((await app.inject(url)).statusCode, url).toBe(404);
    }
  });
});

describe('picture()', () => {
  const m: MediaRef = { key: '0123456789abcdef', width: 1200, height: 800, widths: [320, 640, 960, 1200], color: '#aabbcc', alt: { tr: 'Türkçe "alt"', en: 'English alt' } };

  it('offers AVIF first then WebP with every width', () => {
    const out = picture(m, { lang: 'en', sizes: '(max-width: 760px) 92vw, 600px' }).value;
    expect(out).toMatch(/^<picture class="pic"><source type="image\/avif" srcset="\/media\/0123456789abcdef\/320\.avif 320w, [^"]+ 1200w" sizes="\(max-width: 760px\) 92vw, 600px"><source type="image\/webp"/);
    expect(out).toContain('<img src="/media/0123456789abcdef/960.webp" width="1200" height="800" alt="English alt" loading="lazy" decoding="async" data-c="#aabbcc">');
  });

  it('escapes alt text · falls back to the other language · allows decorative', () => {
    expect(picture(m, { lang: 'tr', sizes: '100vw' }).value).toContain('alt="Türkçe &quot;alt&quot;"');
    expect(picture({ ...m, alt: { tr: 'Sadece Türkçe' } }, { lang: 'en', sizes: '100vw' }).value).toContain('alt="Sadece Türkçe"');
    expect(picture(m, { lang: 'en', sizes: '100vw', alt: '' }).value).toContain('alt=""');
  });

  it('loads above-the-fold images at once', () => {
    const out = picture(m, { lang: 'en', sizes: '100vw', priority: true, class: 'hero' }).value;
    expect(out).toContain('fetchpriority="high"');
    expect(out).not.toContain('loading="lazy"');
    expect(out).toContain('class="pic hero"');
  });
});

describe('the homepage board', () => {
  it('shows a cover image where a project has one and the drawing elsewhere', async () => {
    const doc = (await app.inject('/en')).body;
    const frame0 = doc.split('data-bf="0"')[1]!.split('data-bf="1"')[0]!;
    expect(frame0).toMatch(/<picture class="pic"><source type="image\/avif" srcset="\/media\/[0-9a-f]{16}\/320\.avif 320w/);
    expect(frame0).toContain('alt=""');
    expect(frame0).not.toContain('ar-sail');
    const frame1 = doc.split('data-bf="1"')[1]!.split('data-bf="2"')[0]!;
    expect(frame1).toContain('ar ar-clay');
    expect(doc).toContain('data-bf="7"');
  });

  it('skips an empty frame and keeps the others in place', async () => {
    await app.db.update(projects).set({ boardSlot: null }).where(eq(projects.no, 9));
    const doc = (await app.inject('/tr')).body;
    expect([...doc.matchAll(/data-bf="(\d)"/g)].map((x) => x[1])).toEqual(['0', '1', '3', '4', '5', '6', '7']);
    expect((await boardProjects(app.db, 'tr')).map((p) => p.slot)).toEqual([0, 1, 3, 4, 5, 6]);
    await app.db.update(projects).set({ boardSlot: 2 }).where(eq(projects.no, 9));
  });
});
