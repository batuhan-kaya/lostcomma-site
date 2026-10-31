import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { projects } from '../src/server/db/schema';
import { StorySchema } from '../src/server/db/story';
import { shortDate } from '../src/server/pages/case';

const SITE = 'https://lostcomma.co';
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE }), now: () => new Date('2026-10-31T09:41:00+03:00') });
afterAll(() => app.close());

const get = (url: string) => app.inject(url);
const secs = (doc: string) => [...doc.matchAll(/data-sec="([a-z]+)"/g)].map((m) => m[1]);
/** Visible text without data blocks · the comma egg · tags (the comma rule). */
const text = (doc: string) =>
  (doc.split('<body>')[1] ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

describe('Work · the Layers panel', async () => {
  const en = (await get('/en/work')).body;
  const tr = (await get('/tr/isler')).body;

  it('has its sections in order', () => {
    expect(secs(en)).toEqual(['hero', 'list', 'lock', 'ask', 'next']);
  });

  it('lists every live layer newest first · each one links to its case', () => {
    const nos = [...en.matchAll(/<span class="rno mono">(\d{3})<\/span>/g)].map((m) => m[1]);
    expect(nos).toEqual(['016', '015', '014', '013', '011', '010', '009', '008', '006', '005', '004', '003', '002', '001']);
    expect(en).toContain('<a class="rw" href="/en/work/sailing-club">');
    expect(tr).toContain('<a class="rw" href="/tr/isler/yelken-kulubu">');
    expect(en).toMatch(/Lost Comma<\/span><span class="here mono">You are here<\/span>/);
  });

  it('counts the groups and the visible layers', () => {
    const groups = [...en.matchAll(/data-gr="(\w+)" aria-pressed="true">[\s\S]*?<span class="n mono">(\d+)<\/span>/g)].map((m) => [m[1], Number(m[2])]);
    expect(groups).toEqual([
      ['web', 5],
      ['app', 3],
      ['identity', 3],
      ['motion', 3],
    ]);
    expect(en).toMatch(/data-count[^>]*>14<\/span>/);
    expect(en).toContain('14 visible');
    expect(tr).toContain('14 görünür');
  });

  it('keeps the canvas view and the empty state for the client', () => {
    expect(en).toContain('<div class="grid" data-grid hidden>');
    expect(en).toContain('data-empty hidden');
    expect(en.match(/data-pa="\d+"/g)).toHaveLength(14);
  });

  it('locks the NDA layers without naming them', () => {
    const locks = [...en.matchAll(/<button type="button" class="lkr" data-knock>[\s\S]*?<span class="mono">(\d{3})<\/span>/g)].map((m) => m[1]);
    expect(locks).toEqual(['012', '007']);
    expect(en).not.toContain('Private project');
    expect(en).toContain('That is where 012 and 007 went.');
  });

  it('offers the next number', () => {
    expect(en).toMatch(/could be layer <span class="badge"[^>]*>017<\/span>\./);
    expect(tr).toMatch(/<span class="badge"[^>]*>017<\/span> numaralı katman olabilir\./);
  });

  it('hands the preview labels to the client', () => {
    const data = JSON.parse(en.split('<script type="application/json" id="page-data">')[1]!.split('</script>')[0]!);
    expect(data.layers[2]).toEqual({ no: '014', name: 'Sailing club', size: '1440 × 900', g: 'web' });
    expect(data.next).toBe('017');
  });

  it('keeps the comma rule', () => {
    expect(text(en)).not.toContain(',');
    expect(text(tr)).not.toContain(',');
  });
});

describe('Case · a full case study', async () => {
  const res = await get('/tr/isler/yelken-kulubu');
  const doc = res.body;

  it('renders every section of the story in order in the story colours', () => {
    expect(res.statusCode).toBe(200);
    expect(secs(doc)).toEqual(['hero', 'hist', 'brief', 'dets', 'res', 'cred', 'next']);
    expect(doc).toContain('<html lang="tr" class="th-navy" data-page="case">');
    expect(doc).toContain('<title>Yelken kulübü · Lost Comma</title>');
  });

  it('knows its address in both languages', () => {
    expect(doc).toContain(`<link rel="canonical" href="${SITE}/tr/isler/yelken-kulubu">`);
    expect(doc).toContain(`hreflang="en" href="${SITE}/en/work/sailing-club"`);
    expect(doc).toContain('<a class="lg" href="/en/work/sailing-club" hreflang="en"');
    expect(doc).toMatch(/<a class="lk act" href="\/tr\/isler" aria-current="page">/);
  });

  it('shows the meta and the drawn cover', () => {
    expect(doc).toContain('<dd>2026 · 14 hafta</dd>');
    expect(doc).toContain('<dd>03 Nis tarihinden beri yayında</dd>');
    expect(doc).toContain('class="sailcover"');
  });

  it('opens the history on the last version', () => {
    expect(doc).toContain('data-sec="hist" data-host="code"');
    expect(doc.match(/class="vi on"/g)).toHaveLength(1);
    expect(doc).toMatch(/class="vi on" data-v="5" aria-pressed="true" data-rest="host"/);
    expect(doc).toContain('<div class="fr vs-5" data-fr role="img" aria-label="Yelken kulübü · v1.2 · Rezervasyon uygulaması">');
    expect(doc).toContain('type="range" min="0" max="5" step="1" value="5"');
  });

  it('draws the swatches without style attributes', () => {
    expect(doc).toContain('<rect width="1" height="1" fill="#1C3564"></rect>');
    expect(doc).toMatch(/class="swb tlt" data-hex="#1C3564"/);
    expect(doc).toMatch(/class="swb tdk" data-hex="#F7CDA6"/);
    expect(doc).not.toMatch(/\sstyle="/);
  });

  it('credits the team and the client · then the next layer', () => {
    expect(doc.match(/class="crr /g)).toHaveLength(4);
    expect(doc).toContain('<span class="mono">kulüp</span>');
    expect(doc).toMatch(/href="\/tr\/isler\/urun-lansman-filmi" data-sec="next"[\s\S]*?Sonraki katman · 013/);
  });

  it('keeps the comma rule in story content', async () => {
    expect(text(doc)).not.toContain(',');
    expect(text((await get('/en/work/sailing-club')).body)).not.toContain(',');
  });
});

describe('Case · short pages and misses', () => {
  it('a project without a story gets the hero and the way on', async () => {
    const doc = (await get('/en/work/ferry-timetable')).body;
    expect(secs(doc)).toEqual(['hero', 'next']);
    expect(doc).toContain('class="th-ink"');
    expect(doc).toContain('Ferry times for Istanbul that still work on a pier without signal.');
    expect(doc).toContain('class="art a-fer on"');
  });

  it('the last layer wraps around to the newest', async () => {
    expect((await get('/en/work/lost-comma')).body).toMatch(/href="\/en\/work\/climate-data-platform" data-sec="next"/);
  });

  it('is a 404 for NDA projects · unknown slugs · a slug from the other language', async () => {
    for (const url of ['/en/work/nda-012', '/en/work/nope', '/en/work/yelken-kulubu', '/tr/isler/sailing-club']) {
      const res = await get(url);
      expect(res.statusCode, url).toBe(404);
      expect(res.body).toContain('data-page="notFound"');
    }
  });

  it('falls back to the short page when a stored story is broken', async () => {
    const [row] = await app.db.select({ story: projects.story }).from(projects).where(eq(projects.no, 4));
    await app.db.update(projects).set({ story: { team: ['nobody'] } as never }).where(eq(projects.no, 4));
    const res = await get('/en/work/architecture-office');
    expect(res.statusCode).toBe(200);
    expect(secs(res.body)).toEqual(['hero', 'next']);
    await app.db.update(projects).set({ story: row!.story }).where(eq(projects.no, 4));
  });

  it('lists every case page in the sitemap with both languages', async () => {
    const xml = (await get('/sitemap.xml')).body;
    expect(xml).toContain(`<loc>${SITE}/tr/isler/yelken-kulubu</loc><xhtml:link rel="alternate" hreflang="tr" href="${SITE}/tr/isler/yelken-kulubu"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/work/sailing-club"/>`);
    expect(xml).not.toContain('nda-012');
  });
});

describe('story schema', () => {
  it('needs both languages and real colours', () => {
    expect(StorySchema.safeParse({ scope: { tr: 'Web' } }).success).toBe(false);
    const tile = { kind: 'palette', kick: { tr: 'a', en: 'a' }, title: { tr: 'b', en: 'b' }, swatches: [] as unknown[] };
    tile.swatches = [1, 2].map(() => ({ name: { tr: 'x', en: 'x' }, hex: 'red', ink: '#000000' }));
    expect(StorySchema.safeParse({ details: { tiles: [tile] } }).success).toBe(false);
    expect(StorySchema.parse({})).toMatchObject({ theme: 'ink', team: [], tags: [], bubbles: [] });
  });

  it('formats dates the way each language writes them', () => {
    expect(shortDate('en', '2026-04-03')).toBe('03 Apr');
    expect(shortDate('tr', '2026-04-03')).toBe('03 Nis');
  });
});
