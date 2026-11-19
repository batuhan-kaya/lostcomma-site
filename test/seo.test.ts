/**
 * Search and share (phase 17d): every page says what it is from its own content · the share card
 * follows the page · the structured data follows the panel · the sitemap knows when things changed.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';

const SITE = 'https://lostcomma.co';
const dataDir = mkdtempSync(join(tmpdir(), 'lc-seo-'));
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, DATA_DIR: dataDir, SEED: 'demo' }), now: () => new Date('2026-10-31T09:41:00+03:00') });
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const get = (url: string) => app.inject(url);
const meta = (doc: string, key: string) => new RegExp(`<meta (?:property|name)="${key.replace(/:/g, '\\:')}" content="([^"]*)"`).exec(doc)?.[1];
type Node = Record<string, unknown> & { '@type': string };
const graph = (doc: string): Node[] => {
  const blocks = [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  expect(blocks.length).toBe(1);
  return JSON.parse(blocks[0]![1]!)['@graph'];
};
const of = (g: Node[], type: string) => g.find((n) => n['@type'] === type);

// Every indexed page the site links to (Now and Uses are still placeholders: phase 10).
const PAGES = ['/tr', '/en', '/tr/isler', '/en/work', '/tr/hizmetler', '/en/services', '/en/services/websites', '/tr/hizmetler/kimlik', '/tr/surec', '/en/studio', '/tr/notes', '/en/lab', '/tr/basla', '/en/privacy', '/tr/kvkk', '/en/cookies'];

describe('every page', () => {
  it('describes itself in a search result’s length · asks for large previews · links its card with its type · speaks to X', async () => {
    for (const p of PAGES) {
      const doc = (await get(p)).body;
      const d = meta(doc, 'description') ?? '';
      expect(d.length, `${p} description`).toBeGreaterThanOrEqual(50);
      expect(d.length, `${p} description`).toBeLessThanOrEqual(160);
      expect(d, p).not.toContain(',');
      expect(meta(doc, 'robots'), p).toBe('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      const image = meta(doc, 'og:image') ?? '';
      // One card per language for every page: the homepage hero.
      expect(image, p).toMatch(new RegExp(`^${SITE}/og/${p.slice(1, 3)}\\.png\\?v=[0-9a-f]{12}$`));
      expect(meta(doc, 'og:image:secure_url'), p).toBe(image);
      expect(meta(doc, 'og:image:type'), p).toBe('image/png');
      expect(meta(doc, 'og:image:alt'), p).toBe(p.startsWith('/tr') ? 'Lost Comma · Akılda kalan web siteleri ve uygulamalar yapıyoruz' : 'Lost Comma · We design and build websites and apps people remember');
      expect(meta(doc, 'twitter:title'), p).toBe(meta(doc, 'og:title'));
      expect(meta(doc, 'twitter:description'), p).toBe(d);
      expect(meta(doc, 'og:locale:alternate'), p).toBe(p.startsWith('/tr') ? 'en_US' : 'tr_TR');
    }
  });

  it('carries one graph from its content: the studio · the site · the page · the way to it', async () => {
    for (const p of PAGES) {
      const g = graph((await get(p)).body);
      const org = of(g, 'Organization')!;
      expect(org['@id']).toBe(`${SITE}/#org`);
      expect(org.logo).toEqual({ '@type': 'ImageObject', url: `${SITE}/icon-512.png`, width: 512, height: 512 });
      expect(of(g, 'WebSite')!.potentialAction).toMatchObject({ '@type': 'SearchAction' });
      const page = g.find((n) => n['@id'] === `${SITE}${p}#webpage`)!;
      expect(page, p).toBeTruthy();
      expect(page.primaryImageOfPage).toMatchObject({ '@type': 'ImageObject', width: 1200, height: 630 });
      if (p === '/tr' || p === '/en') expect(of(g, 'BreadcrumbList')).toBeUndefined();
      else expect((of(g, 'BreadcrumbList')!.itemListElement as unknown[]).length, p).toBeGreaterThanOrEqual(2);
    }
    // A page under a section passes through it.
    const crumbs = of(graph((await get('/en/services/websites')).body), 'BreadcrumbList')!.itemListElement as { name: string; item: string }[];
    expect(crumbs.map((c) => c.name)).toEqual(['Lost Comma', 'Services', 'Websites']);
    expect(crumbs[1]!.item).toBe(`${SITE}/en/services`);
  });

  it('tells its kind: lists · the studio · the contact page', async () => {
    const work = graph((await get('/en/work')).body);
    expect(work.find((n) => n['@id'] === `${SITE}/en/work#webpage`)!['@type']).toBe('CollectionPage');
    const list = of(work, 'ItemList')!;
    expect(list.numberOfItems).toBe(14);
    expect(list.itemListElement).toContainEqual({ '@type': 'ListItem', position: expect.any(Number), name: 'Sailing club', url: `${SITE}/en/work/sailing-club` });
    expect(graph((await get('/tr/studyo')).body).find((n) => n['@id'] === `${SITE}/tr/studyo#webpage`)!['@type']).toBe('AboutPage');
    expect(graph((await get('/en/start')).body).find((n) => n['@id'] === `${SITE}/en/start#webpage`)!['@type']).toBe('ContactPage');
    expect(of(graph((await get('/en/notes')).body), 'ItemList')!.numberOfItems).toBeGreaterThan(0);
  });
});

describe('a note · a case · a service', () => {
  it('a note is an article: its author · dates · reading time · its card', async () => {
    const doc = (await get('/en/notes/how-our-cursors-move')).body;
    const a = of(graph(doc), 'BlogPosting')!;
    expect(a).toMatchObject({ headline: 'How our cursors move', publisher: { '@id': `${SITE}/#org` }, mainEntityOfPage: { '@id': `${SITE}/en/notes/how-our-cursors-move#webpage` } });
    expect(a.datePublished).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(a.dateModified).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(a.timeRequired).toMatch(/^PT\d+M$/);
    expect(a.author).toMatchObject({ '@type': 'Person' });
    expect(a.image).toBe(meta(doc, 'og:image'));
    expect(meta(doc, 'article:modified_time')).toBe(a.dateModified);
  });

  it('a case is a creative work with the card as its image', async () => {
    const doc = (await get('/en/work/sailing-club')).body;
    const w = of(graph(doc), 'CreativeWork')!;
    expect(w).toMatchObject({ name: 'Sailing club', creator: { '@id': `${SITE}/#org` }, dateCreated: expect.stringMatching(/^\d{4}$/) });
    expect(w.image).toBe(meta(doc, 'og:image'));
  });

  it('a service names its provider', async () => {
    const s = of(graph((await get('/en/services/websites')).body), 'Service')!;
    expect(s).toMatchObject({ name: 'Websites', provider: { '@id': `${SITE}/#org` }, areaServed: 'Worldwide' });
  });

  it("the two cards are PNG · light enough for WhatsApp · 1200 × 630 · they follow the hero's words", async () => {
    for (const lang of ['tr', 'en']) {
      const res = await get(meta((await get(`/${lang}`)).body, 'og:image')!.replace(SITE, ''));
      expect(res.headers['content-type'], lang).toBe('image/png');
      expect(res.rawPayload.length, lang).toBeLessThan(300_000);
      const m = await sharp(res.rawPayload).metadata();
      expect([m.width, m.height], lang).toEqual([1200, 630]);
    }
  });
});

describe('the sitemap and robots', () => {
  it('know when a note changed · send crawlers away from the panel and the api', async () => {
    const xml = (await get('/sitemap.xml')).body;
    expect(xml).toMatch(/<loc>https:\/\/lostcomma\.co\/en\/notes\/how-our-cursors-move<\/loc><lastmod>\d{4}-/);
    const robots = (await get('/robots.txt')).body;
    expect(robots).toContain('Disallow: /panel');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});
