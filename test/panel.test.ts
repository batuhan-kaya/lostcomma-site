import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { audit, bookings, briefs, closures, media, notes, noteText, outbox, panelSessions, panelUser, people, projects, projectText, redirects } from '../src/server/db/schema';
import { MemoryMailer } from '../src/server/mail';
import { hashPassword, passwordProblem, readSession, sha256, verifyPassword } from '../src/server/panel/auth';
import { base32, checkCode, codeAt, fromBase32, stepOf } from '../src/server/panel/totp';
import { istInstant } from '../src/shared/booking';

const SITE = 'https://lostcomma.co';
const PASSWORD = 'a long and boring test password';
// Saturday 31 October 2026 · 15:00 in Istanbul.
const NOW = new Date('2026-10-31T12:00:00Z');
const dataDir = mkdtempSync(join(tmpdir(), 'lc-panel-'));
const mailer = new MemoryMailer();
const app = await buildApp({
  config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, SEED: 'sample', DATA_DIR: dataDir, PANEL_PASSWORD: PASSWORD, PANEL_SIGNIN_LIMIT: '3' }),
  now: () => NOW,
  mailer,
});
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

let ip = 0;
const nextIp = () => `10.9.${Math.floor(++ip / 200)}.${ip % 200}`;
const form = (fields: Record<string, string | string[]>) => new URLSearchParams(Object.entries(fields).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))).toString();

async function signIn(password = PASSWORD) {
  const res = await app.inject({ method: 'POST', url: '/panel/login', remoteAddress: nextIp(), headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ password, next: '/panel' }) });
  const cookie = String(res.headers['set-cookie'] ?? '').split(';')[0]!;
  return { res, cookie };
}

const session = await signIn();
const cookie = session.cookie;
const csrfOf = async (c = cookie) => /data-csrf="([^"]+)"/.exec((await app.inject({ method: 'GET', url: '/panel', headers: { cookie: c } })).body)![1]!;
const csrf = await csrfOf();

const get = (url: string, c = cookie) => app.inject({ method: 'GET', url, headers: { cookie: c } });
const post = (url: string, fields: Record<string, string | string[]> = {}, o: { c?: string; csrf?: string | null; origin?: string } = {}) =>
  app.inject({
    method: 'POST',
    url,
    headers: { cookie: o.c ?? cookie, 'content-type': 'application/x-www-form-urlencoded', ...(o.origin ? { origin: o.origin } : {}) },
    payload: form({ ...(o.csrf === null ? {} : { _csrf: o.csrf ?? csrf }), ...fields }),
  });

const projectFields = (o: Record<string, string> = {}) => ({
  no: '42',
  discipline: 'web',
  year: '2026',
  status: 'draft',
  boardSlot: '',
  art: '',
  coverId: '',
  loopId: '',
  siteUrl: '',
  story: '',
  name_tr: 'Deniz feneri',
  name_en: 'Lighthouse',
  slug_tr: 'deniz-feneri',
  slug_en: 'lighthouse',
  kind_tr: 'Web sitesi',
  kind_en: 'Website',
  summary_tr: 'Bir fener için bir site.',
  summary_en: 'A site for a lighthouse.',
  client_tr: '',
  client_en: '',
  ...o,
});

/* ================= sign in ================= */

describe('panel sign in', () => {
  it('hashes passwords with scrypt and checks them in constant time', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h).toMatch(/^scrypt\$32768\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword('correct horse battery', h)).toBe(true);
    expect(await verifyPassword('correct horse batterY', h)).toBe(false);
    expect(await verifyPassword('x', 'plain')).toBe(false);
    expect(passwordProblem('short')).toMatch(/12/);
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).toMatch(/tekrar/);
    expect(passwordProblem('a sentence is a fine password')).toBeNull();
  });

  it('sends visitors without a session to the sign in page', async () => {
    const res = await app.inject({ method: 'GET', url: '/panel/projects?status=live' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/panel/login?next=%2Fpanel%2Fprojects%3Fstatus%3Dlive');
    expect((await app.inject({ method: 'POST', url: '/panel/projects' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/panel/media.json' })).statusCode).toBe(401);
    const login = await app.inject({ method: 'GET', url: '/panel/login' });
    expect(login.statusCode).toBe(200);
    expect(login.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(login.headers['cache-control']).toBe('no-store');
    expect(login.body).toContain('name="password"');
  });

  it('signs in with a strict cookie and keeps only a hash of the token', async () => {
    expect(session.res.statusCode).toBe(303);
    expect(session.res.headers.location).toBe('/panel');
    const set = String(session.res.headers['set-cookie']);
    expect(set).toMatch(/^lc_panel=[\w-]{43}; Path=\/panel; HttpOnly; SameSite=Strict; Max-Age=1209600; Secure/);
    const token = cookie.split('=')[1]!;
    const rows = await app.db.select().from(panelSessions);
    expect(rows.some((r) => r.id === sha256(token))).toBe(true);
    expect(rows.some((r) => r.id === token)).toBe(false);
    expect((await get('/panel')).statusCode).toBe(200);
  });

  it('refuses a wrong password · logs it · and slows an address down', async () => {
    const addr = '10.66.0.1';
    const tryOnce = () => app.inject({ method: 'POST', url: '/panel/login', remoteAddress: addr, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ password: 'nope nope nope nope' }) });
    expect((await tryOnce()).statusCode).toBe(401);
    expect((await tryOnce()).statusCode).toBe(401);
    expect((await tryOnce()).statusCode).toBe(401);
    expect((await tryOnce()).statusCode).toBe(429);
    const fails = await app.db.select().from(audit).where(eq(audit.action, 'signin-failed'));
    expect(fails.length).toBeGreaterThanOrEqual(3);
  });

  it('wants the form token and our own origin on every post', async () => {
    expect((await post('/panel/settings', {}, { csrf: null })).statusCode).toBe(403);
    expect((await post('/panel/settings', {}, { csrf: 'wrong' })).statusCode).toBe(403);
    expect((await post('/panel/settings', {}, { origin: 'https://evil.example' })).statusCode).toBe(403);
  });

  it('ends idle sessions after a day and old ones after two weeks', async () => {
    const token = cookie.split('=')[1]!;
    // The app's clock is NOW (sessions start then).
    expect(await readSession(app.db, token, new Date(NOW.getTime() + 30_000))).not.toBeNull();
    const other = await signIn();
    const t2 = other.cookie.split('=')[1]!;
    expect(await readSession(app.db, t2, new Date(NOW.getTime() + 23 * 3_600_000))).not.toBeNull();
    const t3 = (await signIn()).cookie.split('=')[1]!;
    expect(await readSession(app.db, t3, new Date(NOW.getTime() + 25 * 3_600_000))).toBeNull();
    expect(await readSession(app.db, t3, NOW)).toBeNull();
    const t4 = (await signIn()).cookie.split('=')[1]!;
    expect(await readSession(app.db, t4, new Date(NOW.getTime() + 15 * 86_400_000))).toBeNull();
  });

  it('signs out', async () => {
    const s = await signIn();
    const c = await csrfOf(s.cookie);
    const res = await post('/panel/logout', {}, { c: s.cookie, csrf: c });
    expect(res.statusCode).toBe(303);
    expect(String(res.headers['set-cookie'])).toContain('Max-Age=0');
    expect((await get('/panel', s.cookie)).statusCode).toBe(303);
  });
});

describe('two-step sign in (TOTP)', () => {
  it('matches the RFC 6238 test vector and accepts a code only once', () => {
    const secret = base32(Buffer.from('12345678901234567890'));
    expect(secret).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(fromBase32(secret).toString()).toBe('12345678901234567890');
    // RFC 6238 · T = 59 s · 8 digits 94287082 · the last six.
    expect(codeAt(secret, 1)).toBe('287082');
    const at = new Date(59_000);
    expect(checkCode(secret, '287 082', at, null)).toBe(1);
    expect(checkCode(secret, '287082', at, 1)).toBeNull();
    expect(checkCode(secret, '000000', at, null)).toBeNull();
    expect(checkCode(secret, 'abc', at, null)).toBeNull();
  });

  it('is set up with a confirmed code and then asked for at sign in', async () => {
    const s = await signIn();
    const c = await csrfOf(s.cookie);
    expect((await post('/panel/account/totp/start', {}, { c: s.cookie, csrf: c })).statusCode).toBe(303);
    const page = (await get('/panel/account', s.cookie)).body;
    expect(page).toContain('<svg');
    const [user] = await app.db.select().from(panelUser);
    const pending = user!.totpPending!;
    expect((await post('/panel/account/totp/confirm', { code: '000000' }, { c: s.cookie, csrf: c })).statusCode).toBe(422);
    const ok = await post('/panel/account/totp/confirm', { code: codeAt(pending, stepOf(NOW)) }, { c: s.cookie, csrf: c });
    expect(ok.headers.location).toBe('/panel/account?m=totp-on');
    const [after] = await app.db.select().from(panelUser);
    expect(after!.totpSecret).toBe(pending);

    // Sign in again: the password leads to the code step.
    const step = await signIn();
    expect(step.res.headers.location).toBe('/panel/login/code');
    const pendingCookie = String(step.res.headers['set-cookie']).split(';')[0]!;
    expect(pendingCookie).toMatch(/^lc_panel_step=/);
    const wrong = await app.inject({ method: 'POST', url: '/panel/login/code', headers: { cookie: pendingCookie, 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ code: '000000' }) });
    expect(wrong.statusCode).toBe(401);
    const right = await app.inject({ method: 'POST', url: '/panel/login/code', headers: { cookie: pendingCookie, 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ code: codeAt(pending, stepOf(NOW) + 1) }) });
    expect(right.statusCode).toBe(303);
    expect(String(right.headers['set-cookie'])).toMatch(/lc_panel=[\w-]{43}/);

    // Off again (password and a fresh code) so the other tests sign in with the password alone.
    const off = await post('/panel/account/totp/off', { password: PASSWORD, code: codeAt(pending, stepOf(NOW) - 1) }, { c: s.cookie, csrf: c });
    expect(off.statusCode).toBe(422); // older than the code just used
    await app.db.update(panelUser).set({ totpSecret: null, totpLastStep: null });
  });
});

/* ================= content ================= */

describe('projects', () => {
  it('creates a draft that only the panel can see · and previews it', async () => {
    const res = await post('/panel/projects', projectFields());
    expect(res.statusCode).toBe(303);
    const id = Number(/\/panel\/projects\/(\d+)\?m=created/.exec(res.headers.location!)![1]);
    const texts = await app.db.select().from(projectText).where(eq(projectText.projectId, id));
    expect(texts.map((t) => t.slug).sort()).toEqual(['deniz-feneri', 'lighthouse']);
    expect((await app.inject({ method: 'GET', url: '/tr/isler/deniz-feneri' })).statusCode).toBe(404);
    const preview = await get(`/panel/projects/${id}/preview/tr`);
    expect(preview.statusCode).toBe(200);
    expect(preview.body).toContain('Deniz feneri');
    expect(preview.headers['x-robots-tag']).toBe('noindex, nofollow');
    const [entry] = await app.db.select().from(audit).where(and(eq(audit.entity, 'project'), eq(audit.entityId, String(id))));
    expect(entry).toMatchObject({ action: 'create' });
  });

  it('says what is wrong: commas · taken numbers and addresses · a broken story', async () => {
    let res = await post('/panel/projects', projectFields({ no: '43', name_tr: 'Fener, deniz', slug_tr: 'fener-2', slug_en: 'lighthouse-2' }));
    expect(res.statusCode).toBe(422);
    expect(res.body).toContain('Virgül kullanma');
    res = await post('/panel/projects', projectFields());
    expect(res.statusCode).toBe(422);
    expect(res.body).toContain('042 numarası başka bir işte');
    expect(res.body).toContain('başka bir işte kullanılıyor');
    res = await post('/panel/projects', projectFields({ no: '44', slug_tr: 'x-1', slug_en: 'x-1', story: '{nope' }));
    expect(res.body).toContain('okunamadı (JSON)');
    res = await post('/panel/projects', projectFields({ no: '44', slug_tr: 'x-1', slug_en: 'x-1', story: JSON.stringify({ history: { heading: { tr: 'a', en: 'b' } } }) }));
    expect(res.statusCode).toBe(422);
    expect(res.body).toContain('Vaka hikâyesinde');
    res = await post('/panel/projects', projectFields({ no: '44', slug_tr: 'x-1', slug_en: 'x-1', story: JSON.stringify({ scope: { tr: 'Web, uygulama', en: 'Web' } }) }));
    expect(res.body).toContain('virgül var: scope.tr');
  });

  it('keeps an old address working when a live project moves', async () => {
    const [row] = await app.db.select().from(projectText).where(and(eq(projectText.lang, 'tr'), eq(projectText.slug, 'yelken-kulubu')));
    const id = row!.projectId;
    const page = (await get(`/panel/projects/${id}`)).body;
    const v = /name="v" value="(\d+)"/.exec(page)![1]!;
    const val = (name: string) => /name="(\w+)"/.test(name) && new RegExp(`name="${name}"[^>]*value="([^"]*)"`).exec(page)?.[1];
    const [p] = await app.db.select().from(projects).where(eq(projects.id, id));
    const en = await app.db.select().from(projectText).where(and(eq(projectText.projectId, id), eq(projectText.lang, 'en')));
    const res = await post(`/panel/projects/${id}`, {
      v,
      no: String(p!.no),
      discipline: p!.discipline,
      year: String(p!.year),
      status: 'live',
      boardSlot: p!.boardSlot === null ? '' : String(p!.boardSlot),
      art: p!.art ?? '',
      coverId: '',
      loopId: '',
      siteUrl: '',
      story: JSON.stringify(p!.story ?? ''),
      name_tr: row!.name,
      name_en: en[0]!.name,
      slug_tr: 'yelken-kulubu-sitesi',
      slug_en: en[0]!.slug,
      kind_tr: row!.kind,
      kind_en: en[0]!.kind,
      summary_tr: row!.summary,
      summary_en: en[0]!.summary,
      client_tr: row!.client,
      client_en: en[0]!.client,
    });
    expect(res.statusCode, res.body.slice(0, 400)).toBe(303);
    void val;
    const old = await app.inject({ method: 'GET', url: '/tr/isler/yelken-kulubu' });
    expect(old.statusCode).toBe(301);
    expect(old.headers.location).toBe('/tr/isler/yelken-kulubu-sitesi');
    expect((await app.inject({ method: 'GET', url: '/tr/isler/yelken-kulubu-sitesi' })).statusCode).toBe(200);
    const [r] = await app.db.select().from(redirects).where(eq(redirects.from, '/tr/isler/yelken-kulubu'));
    expect(r!.hits).toBe(1);
  });

  it('warns instead of overwriting a change made elsewhere', async () => {
    const [row] = await app.db.select().from(projectText).where(and(eq(projectText.lang, 'tr'), eq(projectText.slug, 'deniz-feneri')));
    const id = row!.projectId;
    const stale = await post(`/panel/projects/${id}`, projectFields({ v: '1', summary_tr: 'Yeni özet.' }));
    expect(stale.statusCode).toBe(409);
    expect(stale.body).toContain('başka bir yerde kaydedildi');
    const forced = await post(`/panel/projects/${id}`, projectFields({ v: '1', force: '1', summary_tr: 'Yeni özet.' }));
    expect(forced.statusCode).toBe(303);
  });

  it('swaps board frames · deletes · and brings a deleted project back from the log', async () => {
    const [mine] = await app.db.select().from(projectText).where(and(eq(projectText.lang, 'tr'), eq(projectText.slug, 'deniz-feneri')));
    const id = mine!.projectId;
    const [holder] = await app.db.select().from(projects).where(eq(projects.boardSlot, 2));
    expect((await post(`/panel/projects/${id}`, projectFields({ boardSlot: '2' }))).statusCode).toBe(303);
    expect((await app.db.select().from(projects).where(eq(projects.id, id)))[0]!.boardSlot).toBe(2);
    expect((await app.db.select().from(projects).where(eq(projects.id, holder!.id)))[0]!.boardSlot).toBeNull();
    // The frame goes back to its old project before the delete.
    expect((await post(`/panel/projects/${id}`, projectFields({ boardSlot: '' }))).statusCode).toBe(303);
    await app.db.update(projects).set({ boardSlot: 2 }).where(eq(projects.id, holder!.id));

    expect((await post(`/panel/projects/${id}/delete`)).statusCode).toBe(303);
    expect(await app.db.select().from(projects).where(eq(projects.id, id))).toHaveLength(0);
    const [entry] = await app.db.select().from(audit).where(and(eq(audit.action, 'delete'), eq(audit.entityId, String(id))));
    const log = await get(`/panel/log/${entry!.id}`);
    expect(log.body).toContain('Geri getir');
    const back = await post(`/panel/log/${entry!.id}/restore`);
    expect(back.headers.location).toBe(`/panel/projects/${id}?m=restored`);
    const texts = await app.db.select().from(projectText).where(eq(projectText.projectId, id));
    expect(texts).toHaveLength(2);
  });
});

describe('notes', () => {
  const noteFields = (o: Record<string, string | string[]> = {}) => ({
    authorId: '1',
    tags: ['code'],
    state: 'draft',
    at: '',
    has_tr: '1',
    has_en: '',
    title_tr: 'Kısa bir not',
    slug_tr: 'kisa-bir-not',
    excerpt_tr: 'Kısa.',
    body_tr: 'İlk paragraf.\n\n~~~ts\nconst a = [1, 2, 3];\n~~~\n',
    ...o,
  });

  it('allows commas in code but not in prose', async () => {
    const bad = await post('/panel/notes', noteFields({ body_tr: 'Bir, iki.' }));
    expect(bad.statusCode).toBe(422);
    expect(bad.body).toContain('Kod bloklarında virgül serbest');
    const ok = await post('/panel/notes', noteFields());
    expect(ok.statusCode).toBe(303);
  });

  it('schedules a note for later and previews it today', async () => {
    const res = await post('/panel/notes', noteFields({ slug_tr: 'yarin', title_tr: 'Yarın', state: 'publish', at: '2026-11-02T09:00' }));
    const id = Number(/\/panel\/notes\/(\d+)/.exec(res.headers.location!)![1]);
    const [n] = await app.db.select().from(notes).where(eq(notes.id, id));
    expect(n!.publishedAt!.toISOString()).toBe('2026-11-02T06:00:00.000Z');
    expect((await app.inject({ method: 'GET', url: '/tr/notes/yarin' })).statusCode).toBe(404);
    const preview = await get(`/panel/notes/${id}/preview/tr`);
    expect(preview.statusCode).toBe(200);
    expect(preview.body).toContain('Yarın');
    const list = (await get('/panel/notes?state=scheduled')).body;
    expect(list).toContain('Yarın');
  });

  it('renders markdown for the live preview', async () => {
    const res = await app.inject({ method: 'POST', url: '/panel/notes/render', headers: { cookie, 'content-type': 'application/json', 'x-csrf': csrf }, payload: JSON.stringify({ body: '## Başlık\n\nMetin.', lang: 'tr' }) });
    const out = res.json() as { ok: boolean; html: string; minutes: number; commas: boolean };
    expect(out.ok).toBe(true);
    expect(out.html).toContain('<h2');
    expect(out.commas).toBe(false);
    const noCsrf = await app.inject({ method: 'POST', url: '/panel/notes/render', headers: { cookie, 'content-type': 'application/json' }, payload: '{}' });
    expect(noCsrf.statusCode).toBe(403);
  });
});

describe('site settings', () => {
  it('fills prices · the month · address and phone on the pages', async () => {
    expect((await app.inject({ method: 'GET', url: '/tr/hizmetler' })).body).toContain('[FİYAT]');
    const bad = await post('/panel/settings', { 'price.web.0_tr': '₺90,000' });
    expect(bad.statusCode).toBe(422);
    const ok = await post('/panel/settings', { 'price.web.0_tr': '₺90.000', 'price.web.0_en': '€2.500', 'work.nextMonth': '2027-01', 'studio.address': 'Moda Caddesi No 12', 'studio.phone': '+90 216 555 01 23' });
    expect(ok.statusCode).toBe(303);
    expect((await app.inject({ method: 'GET', url: '/tr/hizmetler' })).body).toContain('₺90.000');
    expect((await app.inject({ method: 'GET', url: '/en/services/websites' })).body).toContain('€2.500');
    expect((await app.inject({ method: 'GET', url: '/tr/isler' })).body).toContain('Ocak ayında açılıyor');
    expect((await app.inject({ method: 'GET', url: '/en/work' })).body).toContain('opens in January');
    expect((await app.inject({ method: 'GET', url: '/tr/studyo' })).body).toContain('Moda Caddesi No 12');
    expect((await app.inject({ method: 'GET', url: '/en/start' })).body).toContain('href="tel:+902165550123"');
    const dash = (await get('/panel')).body;
    expect(dash).toMatch(/Bir sonraki boş yer<\/b><small>Ocak/);
  });

  it('can be taken back from the log', async () => {
    const [entry] = await app.db.select().from(audit).where(eq(audit.entity, 'settings'));
    expect((await post(`/panel/log/${entry!.id}/restore`)).statusCode).toBe(303);
    expect((await app.inject({ method: 'GET', url: '/tr/hizmetler' })).body).toContain('[FİYAT]');
  });
});

const png = await sharp({ create: { width: 640, height: 400, channels: 3, background: '#3b35ff' } }).png().toBuffer();

describe('media', () => {
  const multipart = (fields: Record<string, string>, files: { field: string; name: string; data: Buffer; type: string }[]) => {
    const boundary = '----lc' + Math.random().toString(16).slice(2);
    const parts: Buffer[] = [];
    for (const [k, v] of Object.entries(fields)) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    for (const f of files) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.name}"\r\nContent-Type: ${f.type}\r\n\r\n`), f.data, Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    return { payload: Buffer.concat(parts), type: `multipart/form-data; boundary=${boundary}` };
  };

  it('uploads images · keeps alt text without commas · refuses to delete what is used', async () => {
    const m = multipart({ _csrf: csrf }, [{ field: 'files', name: 'blue.png', data: png, type: 'image/png' }, { field: 'files', name: 'notes.txt', data: Buffer.from('hello'), type: 'text/plain' }]);
    const res = await app.inject({ method: 'POST', url: '/panel/media/upload', headers: { cookie, 'content-type': m.type, accept: 'application/json' }, payload: m.payload });
    const out = res.json() as { done: { id: number }[]; failed: { name: string; error: string }[] };
    expect(out.done).toHaveLength(1);
    expect(out.failed[0]).toMatchObject({ name: 'notes.txt' });
    const id = out.done[0]!.id;
    const [row] = await app.db.select().from(media).where(eq(media.id, id));
    expect(existsSync(join(dataDir, 'media', row!.key, '640.avif'))).toBe(true);

    expect((await post(`/panel/media/${id}`, { alt_tr: 'Mavi, düz', alt_en: 'Blue' })).statusCode).toBe(422);
    expect((await post(`/panel/media/${id}`, { alt_tr: 'Düz mavi bir yüzey', alt_en: 'A flat blue surface' })).statusCode).toBe(303);

    await app.db.update(people).set({ portraitId: id }).where(eq(people.crew, 'design'));
    const used = await post(`/panel/media/${id}/delete`);
    expect(used.statusCode).toBe(409);
    expect(used.body).toContain('portre');
    await app.db.update(people).set({ portraitId: null }).where(eq(people.crew, 'design'));
    expect((await post(`/panel/media/${id}/delete`)).statusCode).toBe(303);
    expect(existsSync(join(dataDir, 'media', row!.key))).toBe(false);
  });

  it('refuses an upload without the form token', async () => {
    const m = multipart({}, [{ field: 'files', name: 'blue.png', data: png, type: 'image/png' }]);
    const res = await app.inject({ method: 'POST', url: '/panel/media/upload', headers: { cookie, 'content-type': m.type, accept: 'application/json' }, payload: m.payload });
    expect(res.statusCode).toBe(403);
  });
});

describe('team · inbox · calls · mail', () => {
  it('names a teammate (the studio page shows it)', async () => {
    const page = (await get('/panel/people/code')).body;
    const field = (name: string) => new RegExp(`name="${name}"[^>]*value="([^"]*)"`).exec(page)?.[1] ?? '';
    const fields: Record<string, string> = { name: 'Deniz', keys: '⌘ K', sort: '1', portraitId: '' };
    for (const l of ['tr', 'en']) for (const f of ['role', 'usually', 'rightNow', 'keysDo', 'hello']) fields[`${f}_${l}`] = field(`${f}_${l}`) || 'x';
    expect((await post('/panel/people/code', fields)).statusCode).toBe(303);
    expect((await app.inject({ method: 'GET', url: '/en/studio' })).body).toContain('Deniz');
  });

  it('marks a brief read when opened · changes its state · deletes and restores it', async () => {
    await app.inject({ method: 'POST', url: '/api/brief', remoteAddress: nextIp(), headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ email: 'ada@example.com', name: 'Ada', message: 'Merhaba' }) });
    const [b] = await app.db.select().from(briefs);
    expect(b!.status).toBe('new');
    expect((await get('/panel')).body).toMatch(/Gelen kutusu<\/span><b class="p-count"[^>]*>1</);
    expect((await get(`/panel/briefs/${b!.id}`)).body).toContain('Merhaba');
    expect((await app.db.select().from(briefs))[0]!.status).toBe('read');
    await post(`/panel/briefs/${b!.id}`, { status: 'answered', note: 'Aradım.' });
    expect((await app.db.select().from(briefs))[0]).toMatchObject({ status: 'answered', note: 'Aradım.' });
    await post(`/panel/briefs/${b!.id}/delete`);
    expect(await app.db.select().from(briefs)).toHaveLength(0);
    const [entry] = await app.db.select().from(audit).where(and(eq(audit.entity, 'brief'), eq(audit.action, 'delete')));
    await post(`/panel/log/${entry!.id}/restore`);
    expect(await app.db.select().from(briefs)).toHaveLength(1);
  });

  it('cancels a call · frees the slot · tells the visitor with a calendar cancellation', async () => {
    const book = await app.inject({ method: 'POST', url: '/api/booking', remoteAddress: nextIp(), headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ lang: 'en', slot: '2026-11-04T11:00', tz: 'Europe/London', name: 'Ada Test', email: 'ada@example.com' }) });
    expect(book.statusCode).toBe(200);
    const [b] = await app.db.select().from(bookings);
    expect((await get('/panel/bookings')).body).toContain('Ada Test');
    await post(`/panel/bookings/${b!.id}`, { staffNote: 'Sitesi eski.' });
    const res = await post(`/panel/bookings/${b!.id}/cancel`, { notify: '1', message: 'Bir sorun çıktı, kusura bakma.' });
    expect(res.statusCode).toBe(303);
    const [after] = await app.db.select().from(bookings);
    expect(after).toMatchObject({ status: 'cancelled', staffNote: 'Sitesi eski.' });
    const [mail] = await app.db.select().from(outbox).where(eq(outbox.kind, 'booking-cancel'));
    expect(mail!.subject).toContain('Our call is cancelled');
    expect(mail!.text).toContain('Bir sorun çıktı · kusura bakma.');
    expect(mail!.ics).toContain('METHOD:CANCEL');
    expect(mail!.ics).toContain('STATUS:CANCELLED');
    const again = await app.inject({ method: 'POST', url: '/api/booking', remoteAddress: nextIp(), headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ lang: 'en', slot: '2026-11-04T11:00', tz: 'Europe/London', name: 'Bob', email: 'bob@example.com' }) });
    expect(again.statusCode).toBe(200);
  });

  it('closes whole days and hours on the Start page and in the booking API', async () => {
    expect((await post('/panel/closures', { day: '2026-11-02', from: '', to: '', reason: 'Tatil' })).statusCode).toBe(303);
    expect((await post('/panel/closures', { day: '2026-11-03', from: '14:00', to: '16:00' })).statusCode).toBe(303);
    expect((await post('/panel/closures', { day: '2026-10-31' })).statusCode).toBe(422);
    expect((await post('/panel/closures', { day: '2026-11-05', from: '15:00', to: '14:00' })).statusCode).toBe(422);
    const start = (await app.inject({ method: 'GET', url: '/tr/basla' })).body;
    expect(start).not.toContain('data-day="2026-11-02"');
    expect(start).toContain('data-day="2026-11-16"');
    expect(start).toContain('value="2026-11-03T14:00" disabled');
    expect(start).toContain('value="2026-11-03T15:30" disabled');
    expect(start).not.toContain('value="2026-11-03T16:00" disabled');
    const closed = await app.inject({ method: 'POST', url: '/api/booking', remoteAddress: nextIp(), headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ lang: 'tr', slot: '2026-11-03T14:30', name: 'X', email: 'x@example.com' }) });
    expect(closed.statusCode).toBe(409);
    const holiday = await app.inject({ method: 'POST', url: '/api/booking', remoteAddress: nextIp(), headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ lang: 'tr', slot: '2026-11-02T11:00', name: 'X', email: 'x@example.com' }) });
    expect(holiday.statusCode).toBe(422);
    const [c] = await app.db.select().from(closures).where(eq(closures.day, '2026-11-02'));
    await post(`/panel/closures/${c!.id}/delete`);
    expect((await app.inject({ method: 'GET', url: '/tr/basla' })).body).toContain('data-day="2026-11-02"');
    void istInstant;
  });

  it('retries mail and sends a test message', async () => {
    mailer.fail = true;
    await post('/panel/mail/test', { to: 'me@example.com' });
    await app.postman.drain();
    let [m] = await app.db.select().from(outbox).where(eq(outbox.kind, 'test'));
    expect(m!.tries).toBe(1);
    mailer.fail = false;
    await post(`/panel/mail/${m!.id}/retry`);
    await app.postman.drain();
    [m] = await app.db.select().from(outbox).where(eq(outbox.kind, 'test'));
    expect(m!.status).toBe('sent');
    expect((await get(`/panel/mail/${m!.id}`)).body).toContain('Bu bir deneme');
  });

  it('adds and removes redirects by hand', async () => {
    expect((await post('/panel/redirects', { from: '/tr/eski', to: '/tr/eski' })).statusCode).toBe(422);
    expect((await post('/panel/redirects', { from: 'eski', to: '/tr' })).statusCode).toBe(422);
    expect((await post('/panel/redirects', { from: '/tr/eski-sayfa', to: '/tr/studyo' })).statusCode).toBe(303);
    expect((await app.inject({ method: 'GET', url: '/tr/eski-sayfa' })).headers.location).toBe('/tr/studyo');
    await post('/panel/redirects/delete', { from: '/tr/eski-sayfa' });
    expect((await app.inject({ method: 'GET', url: '/tr/eski-sayfa' })).statusCode).toBe(404);
  });
});

describe('every panel page', () => {
  it('renders for a signed-in browser', async () => {
    const [p] = await app.db.select().from(projects).limit(1);
    const [n] = await app.db.select().from(noteText).limit(1);
    for (const url of ['/panel', '/panel/projects', '/panel/projects?status=live', '/panel/projects/new', `/panel/projects/${p!.id}`, '/panel/notes', '/panel/notes/new', `/panel/notes/${n!.noteId}`, '/panel/media', '/panel/media?filter=noalt', '/panel/people', '/panel/people/motion', '/panel/briefs', '/panel/bookings', '/panel/mail', '/panel/settings', '/panel/redirects', '/panel/log', '/panel/log?entity=project', '/panel/account']) {
      const res = await get(url);
      expect(res.statusCode, url).toBe(200);
      expect(res.headers['content-security-policy'], url).toContain("script-src 'self'");
      expect(res.body, url).not.toMatch(/ style="/);
    }
    expect((await get('/panel/projects/99999')).statusCode).toBe(404);
  });
});
