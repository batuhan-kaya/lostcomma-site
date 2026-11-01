import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import * as q from '../src/server/data/stats';
import { briefs, bookings, statsEvents, statsSalts, statsViews, statsVisits } from '../src/server/db/schema';
import { MemoryMailer } from '../src/server/mail';
import { deviceOf, parseAgent } from '../src/server/stats/agent';
import { countryOfZone, placeOf } from '../src/server/stats/geo';
import { parseReferrer, sourceName, utmOf } from '../src/server/stats/source';

const SITE = 'https://lostcomma.co';
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// Saturday 31 October 2026 · 15:00 in Istanbul. The clock is moved by hand in some tests.
let now = new Date('2026-10-31T12:00:00Z');
const dataDir = mkdtempSync(join(tmpdir(), 'lc-stats-'));
const app = await buildApp({
  config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, SEED: 'none', DATA_DIR: dataDir, BRIEF_LIMIT: '1000', BOOK_LIMIT: '1000' }),
  now: () => now,
  mailer: new MemoryMailer(),
});
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const db = app.db;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const beacon = (o: Record<string, unknown> = {}) => ({ id: uuid(), path: '/tr', page: 'home', lang: 'tr', ref: '', q: '', w: 1440, tz: 'Europe/Istanbul', bl: 'tr-TR', ms: 0, sc: 0, age: 0, ev: [], ...o });
const send = (body: unknown, h: Record<string, string> = {}, ip = '203.0.113.7') =>
  app.inject({ method: 'POST', url: '/api/stats', remoteAddress: ip, headers: { 'content-type': 'application/json', 'user-agent': CHROME, origin: SITE, ...h }, payload: JSON.stringify(body) });

beforeEach(async () => {
  now = new Date('2026-10-31T12:00:00Z');
  await db.delete(statsVisits);
});

describe('browsers', () => {
  it('names the families people use', () => {
    expect(parseAgent(CHROME)).toMatchObject({ bot: false, os: 'macOS', browser: 'Chrome', mobile: false });
    expect(parseAgent(IPHONE)).toMatchObject({ bot: false, os: 'iOS', browser: 'Safari', mobile: true });
    expect(parseAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0').browser).toBe('Edge');
    expect(parseAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')).toMatchObject({ os: 'Android', tablet: true });
  });
  it('never counts bots · previews · automation', () => {
    for (const ua of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'facebookexternalhit/1.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36', 'curl/8.4.0', 'WhatsApp/2.23', '']) {
      expect(parseAgent(ua).bot, ua).toBe(true);
    }
  });
  it('tells a phone from a desktop (the width decides when the browser does not)', () => {
    expect(deviceOf(parseAgent(IPHONE), 390)).toBe('phone');
    expect(deviceOf(parseAgent(CHROME), 1440)).toBe('desktop');
    expect(deviceOf(parseAgent('SomeBrowser/1.0 (Unknown)'), 800)).toBe('tablet');
  });
});

describe('sources · places', () => {
  it('keeps only the site and the path of a referrer (never the query)', () => {
    expect(parseReferrer('https://www.google.com.tr/search?q=lost+comma', 'lostcomma.co')).toEqual({ host: 'google.com.tr', path: '/search' });
    expect(parseReferrer('https://lostcomma.co/tr/isler', 'lostcomma.co')).toBeNull();
    expect(parseReferrer('android-app://com.linkedin.android/', 'lostcomma.co')).toEqual({ host: 'linkedin.com', path: '' });
    expect(parseReferrer('javascript:alert(1)', 'lostcomma.co')).toBeNull();
  });
  it('gives places friendly names', () => {
    expect(sourceName('google.com.tr')).toBe('Google');
    expect(sourceName('l.instagram.com')).toBe('Instagram');
    expect(sourceName('t.co')).toBe('X');
    expect(sourceName('')).toBe('Doğrudan');
    expect(sourceName('example.org')).toBe('example.org');
  });
  it('reads utm tags and drops the rest', () => {
    expect(utmOf('?utm_source=Instagram&utm_medium=bio&utm_campaign=launch&email=a@b.c')).toEqual({ source: 'instagram', medium: 'bio', campaign: 'launch' });
  });
  it('finds the country from the time zone when there is no IP database', () => {
    expect(countryOfZone('Europe/Istanbul')).toBe('TR');
    expect(countryOfZone('Asia/Calcutta')).toBe('IN');
    expect(placeOf(null, '1.2.3.4', 'Europe/Berlin')).toEqual({ country: 'DE', city: '' });
    expect(placeOf(() => ({ country: 'tr', city: 'Antalya' }), '1.2.3.4', 'Europe/Berlin')).toEqual({ country: 'TR', city: 'Antalya' });
  });
});

describe('collecting', () => {
  it('a page view starts a visit · later beacons only add time and depth', async () => {
    const b = beacon({ ref: 'https://www.instagram.com/lostcomma', q: 'utm_source=instagram&utm_campaign=launch' });
    expect((await send(b)).statusCode).toBe(204);
    expect((await send({ ...b, ms: 12_000, sc: 60 })).statusCode).toBe(204);
    expect((await send({ ...b, ms: 9_000, sc: 40 })).statusCode).toBe(204);
    const [v] = await db.select().from(statsVisits);
    expect(v).toMatchObject({ entry: '/tr', views: 1, engagedMs: 12_000, refHost: 'instagram.com', utmSource: 'instagram', utmCampaign: 'launch', country: 'TR', device: 'desktop', os: 'macOS', browser: 'Chrome' });
    const [w] = await db.select().from(statsViews);
    expect(w).toMatchObject({ path: '/tr', engagedMs: 12_000, scroll: 60 });
  });

  it('pages within thirty minutes are one visit · a quiet half hour starts a new one', async () => {
    await send(beacon({ path: '/tr' }));
    now = new Date(now.getTime() + 10 * 60_000);
    await send(beacon({ path: '/tr/isler' }));
    let visits = await db.select().from(statsVisits);
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ views: 2, entry: '/tr', exit: '/tr/isler' });
    now = new Date(now.getTime() + 31 * 60_000);
    await send(beacon({ path: '/tr/basla' }));
    visits = await db.select().from(statsVisits);
    expect(visits).toHaveLength(2);
  });

  it('another browser or address is another visitor', async () => {
    await send(beacon());
    await send(beacon(), { 'user-agent': IPHONE });
    await send(beacon(), {}, '198.51.100.1');
    expect(await db.select().from(statsVisits)).toHaveLength(3);
  });

  it('keeps clicks with their place on the page', async () => {
    const b = beacon({ age: 5000, ev: [{ k: 'click', n: 'Proje başlat', g: '/tr/basla', x: 420, y: 760, t: 3000 }, { k: 'out', n: 'Instagram', g: 'instagram.com/lostcomma', t: 4000 }] });
    await send(b);
    const evs = await db.select().from(statsEvents).orderBy(statsEvents.id);
    expect(evs.map((e) => [e.kind, e.name, e.target, e.x, e.y, e.width])).toEqual([
      ['click', 'Proje başlat', '/tr/basla', 420, 760, 1440],
      ['out', 'Instagram', 'instagram.com/lostcomma', null, null, null],
    ]);
    // Event times come from the page's own clock: opened 5 s ago · clicked 3 s after opening.
    expect(evs[0]!.at.getTime()).toBe(now.getTime() - 2000);
  });

  it('counts nothing from bots · Do Not Track · Global Privacy Control · other sites', async () => {
    expect((await send(beacon(), { 'user-agent': 'Googlebot/2.1' })).statusCode).toBe(204);
    expect((await send(beacon(), { dnt: '1' })).statusCode).toBe(204);
    expect((await send(beacon(), { 'sec-gpc': '1' })).statusCode).toBe(204);
    expect((await send(beacon(), { origin: 'https://evil.example' })).statusCode).toBe(403);
    expect(await db.select().from(statsVisits)).toHaveLength(0);
  });

  it('refuses the panel · broken payloads · huge ones', async () => {
    expect((await send(beacon({ path: '/panel/stats' }))).statusCode).toBe(400);
    expect((await send(beacon({ path: 'https://evil.example/' }))).statusCode).toBe(400);
    expect((await send({ id: 'nope' })).statusCode).toBe(400);
    // Too many events in one beacon: the view counts · the events are dropped.
    expect((await send(beacon({ ev: Array.from({ length: 61 }, () => ({ k: 'click', n: 'x' })) }))).statusCode).toBe(204);
    expect(await db.select().from(statsEvents)).toHaveLength(0);
    expect((await send(beacon({ ref: 'x'.repeat(20_000) }))).statusCode).toBe(413);
  });

  it('time on one page counts up to half an hour', async () => {
    await send(beacon({ ms: 5 * 3600_000 }));
    expect((await db.select().from(statsViews))[0]!.engagedMs).toBe(30 * 60_000);
  });
});

describe('the daily salt', () => {
  it('a visitor is a new one tomorrow · yesterday\'s salt is gone', async () => {
    await send(beacon());
    const [a] = await db.select().from(statsVisits);
    now = new Date('2026-11-01T12:00:00Z');
    await send(beacon());
    const rows = await db.select().from(statsVisits);
    expect(rows).toHaveLength(2);
    expect(rows[1]!.visitor).not.toBe(a!.visitor);
    expect((await db.select().from(statsSalts)).map((s) => s.day)).toEqual(['2026-11-01']);
  });
});

describe('how they came (briefs and calls)', () => {
  it('a brief is linked to the visit that sent it', async () => {
    await send(beacon({ path: '/tr/hizmetler', ref: 'https://www.google.com/' }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/brief',
      remoteAddress: '203.0.113.7',
      headers: { 'content-type': 'application/json', 'user-agent': CHROME, origin: SITE },
      payload: JSON.stringify({ lang: 'tr', email: 'deniz@example.com', name: 'Deniz', types: ['website'] }),
    });
    expect(res.statusCode).toBe(200);
    const [b] = await db.select().from(briefs).where(eq(briefs.email, 'deniz@example.com'));
    const [v] = await db.select().from(statsVisits);
    expect(b!.visitId).toBe(v!.id);
    const detail = await q.visitDetail(db, v!.id);
    expect(detail!.brief?.email).toBe('deniz@example.com');
    expect(detail!.events.map((e) => e.name)).toContain('brief');
  });

  it('a brief with no visit (JS off · another browser) has none', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/brief',
      remoteAddress: '192.0.2.9',
      headers: { 'content-type': 'application/json', 'user-agent': CHROME, origin: SITE },
      payload: JSON.stringify({ lang: 'en', email: 'nobody@example.com' }),
    });
    const [b] = await db.select().from(briefs).where(eq(briefs.email, 'nobody@example.com'));
    expect(b!.visitId).toBeNull();
  });
});

describe('your record (the privacy page)', () => {
  it('shows a visitor what we hold today and forgets it on request', async () => {
    const b = beacon({ path: '/tr/gizlilik', ms: 4000 });
    await send(b);
    await send(beacon(), {}, '198.51.100.1');
    const me = await app.inject({ method: 'GET', url: '/api/stats/me', remoteAddress: '203.0.113.7', headers: { 'user-agent': CHROME } });
    const body = me.json();
    expect(body.visits).toHaveLength(1);
    expect(body.visits[0].views[0]).toMatchObject({ path: '/tr/gizlilik', ms: 4000 });
    expect(JSON.stringify(body)).not.toContain('203.0.113.7');
    const gone = await app.inject({ method: 'POST', url: '/api/stats/forget', remoteAddress: '203.0.113.7', headers: { 'user-agent': CHROME, origin: SITE } });
    expect(gone.json()).toEqual({ ok: true, removed: 1 });
    // The other visitor stays.
    expect(await db.select().from(statsVisits)).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: '/api/stats/forget', remoteAddress: '203.0.113.7', headers: { 'user-agent': CHROME, origin: 'https://evil.example' } })).statusCode).toBe(403);
  });
});

describe('keeping', () => {
  it('old visits go · ones linked to a brief or a call stay', async () => {
    await send(beacon());
    const [old] = await db.select().from(statsVisits);
    await db.update(statsVisits).set({ startedAt: new Date('2025-01-01T00:00:00Z') });
    await send(beacon(), {}, '198.51.100.2');
    await db.update(statsVisits).set({ startedAt: new Date('2025-01-01T00:00:00Z') }).where(eq(statsVisits.entry, '/tr'));
    const ids = (await db.select().from(statsVisits)).map((v) => v.id);
    await db.insert(briefs).values({ id: uuid(), createdAt: now, lang: 'tr', types: [], name: '', email: 'keep@example.com', message: '', visitId: ids[1]! });
    expect(await app.stats.prune()).toBe(1);
    const left = (await db.select().from(statsVisits)).map((v) => v.id);
    expect(left).toEqual([ids[1]]);
    expect(left).not.toContain(old!.id === ids[1] ? '' : old!.id);
    await db.delete(briefs).where(eq(briefs.email, 'keep@example.com'));
    await db.delete(bookings);
  });
});

describe('the panel\'s questions', () => {
  it('sums visits · pages · sources · places · devices · clicks · funnels', async () => {
    const r = q.rangeOf('7d', now);
    const home = beacon({ path: '/tr', ref: 'https://www.google.com.tr/', ms: 20_000, sc: 80, ev: [{ k: 'click', n: 'Proje başlat', g: '/tr/basla', x: 500, y: 700 }] });
    await send(home);
    await send(beacon({ path: '/tr/basla', page: 'start', ms: 40_000, sc: 100 }));
    await send(beacon({ path: '/en', lang: 'en', tz: 'Europe/Berlin', bl: 'de-DE', ref: 'https://l.instagram.com/' }), { 'user-agent': IPHONE }, '198.51.100.3');
    const s = await q.summary(db, r);
    expect(s).toMatchObject({ visits: 2, visitors: 2, views: 3, single: 50 });
    const pts = await q.series(db, r);
    expect(pts).toHaveLength(7);
    expect(pts.at(-1)).toMatchObject({ key: '2026-10-31', visits: 2, views: 3 });
    expect((await q.pages(db, r)).map((p) => p.path).sort()).toEqual(['/en', '/tr', '/tr/basla']);
    expect((await q.sources(db, r)).map((x) => x.label).sort()).toEqual(['Google', 'Instagram']);
    expect((await q.places(db, r)).map((x) => x.label).sort()).toEqual(['Almanya', 'Türkiye']);
    expect((await q.devices(db, r)).device.map((x) => x.label).sort()).toEqual(['Masaüstü', 'Telefon']);
    expect(await q.clicks(db, r)).toEqual([{ label: 'Proje başlat', n: 1, extra: '/tr/basla' }]);
    const f = await q.funnels(db, r);
    expect(f.call.map((x) => x.n)).toEqual([2, 2, 1, 0]);
    expect((await q.live(db, now)).length).toBe(2);
    expect((await q.clickMap(db, r, '/tr', q.BANDS.desktop)).map((c) => [c.x, c.y])).toEqual([[500, 700]]);
    expect(q.rangeOf('today', now).bucket).toBe('hour');
    expect((await q.series(db, q.rangeOf('today', now))).length).toBe(16);
  });
});
