import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { extractAll, whereOf } from '../scripts/lib/i18n';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { HOME } from '../src/server/content/home';
import { homeLeaves, leafError, leafValue, linesOf, placeholders, TEXT_GROUPS, WHERE } from '../src/server/data/texts';
import { audit, settings } from '../src/server/db/schema';
import { homeField, textField } from '../src/server/panel/views/texts';

const PASSWORD = 'a long and boring test password';
const dataDir = mkdtempSync(join(tmpdir(), 'lc-texts-'));
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://lostcomma.co', SEED: 'sample', DATA_DIR: dataDir, PANEL_PASSWORD: PASSWORD }), now: () => new Date('2026-11-13T12:00:00Z') });
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const signed = await app.inject({ method: 'POST', url: '/panel/login', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ password: PASSWORD, next: '/panel' }) });
const cookie = String(signed.headers['set-cookie'] ?? '').split(';')[0]!;
const get = (url: string) => app.inject({ method: 'GET', url, headers: url.startsWith('/panel') ? { cookie } : {} });
const csrf = /data-csrf="([^"]+)"/.exec((await get('/panel')).body)![1]!;
const post = (url: string, fields: Record<string, string>) => app.inject({ method: 'POST', url, headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, payload: form({ _csrf: csrf, ...fields }) });

describe('where each line is said (i18n/where.json)', () => {
  it('is what npm run i18n writes today', () => {
    const root = resolve(import.meta.dirname, '..');
    expect(JSON.parse(readFileSync(join(root, 'i18n/where.json'), 'utf8'))).toEqual(whereOf(extractAll(root)));
  });

  it('files every server line under a group the panel shows · and leaves the browser only lines out', () => {
    const known = new Set(TEXT_GROUPS.map(([id]) => id));
    for (const [line, groups] of Object.entries(WHERE)) for (const g of groups) expect(known.has(g), `${g}: ${line}`).toBe(true);
    expect(linesOf('home')).toContain('Dört biçim. Tek stüdyo.');
    expect(linesOf('chrome')).toContain('Bir fikrin mi var?');
    // A cursor bubble lives in src/client only: compiled into the bundle.
    expect(WHERE['güzel kelime']).toBeUndefined();
  });
});

describe('the homepage leaves', () => {
  it('cover the copy and never the ids · colours · code', () => {
    const paths = homeLeaves().map((l) => l.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('headline');
    expect(paths).toContain('manifesto.1.ins');
    expect(paths).toContain('steps.4.text');
    expect(paths.some((p) => !p.startsWith("doing.") && /\.(who|code|size)$/.test(p))).toBe(false);
    for (const lang of ['tr', 'en'] as const) for (const l of homeLeaves(HOME[lang])) expect(leafValue(HOME[lang], l.path), `${lang} ${l.path}`).not.toBe('');
  });

  it('a headline needs its word box exactly once · the team needs two words', () => {
    const leaf = (p: string) => homeLeaves().find((l) => l.path === p)!;
    expect(leafError(leaf('headline'), 'Virgülü kaybettik.\n{w} asla')).toBeNull();
    expect(leafError(leaf('headline'), 'Virgülü kaybettik.')).toMatch(/\{w\}/);
    expect(leafError(leaf('headline'), '{w} ve {w}')).toMatch(/\{w\}/);
    expect(leafError(leaf('words'), 'Detayı')).toMatch(/iki kelime/);
    expect(placeholders('Yayında · v{n}')).toEqual(['{n}']);
  });
});

describe('Metinler in the panel', () => {
  it('lists the homepage content · a group · a search', async () => {
    const home = (await get('/panel/texts')).body;
    expect(home).toContain('<h1>Metinler</h1>');
    expect(home).toContain(`name="${homeField('headline', 'tr')}"`);
    expect(home).toContain('{w}\nweb siteleri ve\nuygulamalar yapıyoruz</textarea>');
    expect(home).toContain('Şu an her satır koddaki hâlinde.');
    const group = (await get('/panel/texts?g=chrome')).body;
    expect(group).toContain(`name="${textField('Bir fikrin mi var?', 'en')}" type="text" value="Got an idea?"`);
    const found = (await get('/panel/texts?q=fikrin')).body;
    expect(found).toMatch(/“fikrin” için \d+ satır/);
    expect(found).toContain(`name="${textField('Bir fikrin mi var?', 'tr')}"`);
    expect((await get('/panel/texts?q=zzzz')).body).toContain('Bu aramaya uyan satır yok.');
    // Signed out: nothing.
    expect((await app.inject({ method: 'GET', url: '/panel/texts' })).statusCode).toBe(303);
  });

  it('rewrites the hero: new lines · new words · on the page and in the data the browser reads', async () => {
    const res = await post('/panel/texts', {
      [homeField('headline', 'tr')]: 'Virgülü kaybettik.\n{w} asla',
      [homeField('words', 'tr')]: 'Detayı\nPikseli\nRitmi',
      [homeField('headline', 'en')]: 'We lost the comma.\nNever the {w}',
      [homeField('words', 'en')]: 'detail\npixel\nplot',
      [homeField('contactWord', 'tr')]: 'senden',
    });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/panel/texts?m=saved');
    const tr = (await get('/tr')).body;
    expect(tr).toContain('<span class="ln">Virgülü kaybettik.</span><span class="ln"><button type="button" class="wbox" data-wbox');
    expect(tr).toContain('data-word>Detayı</span>');
    expect(tr).toMatch(/<\/button> asla<button type="button" class="dot"/);
    expect(tr).toContain('"words":["Detayı","Pikseli","Ritmi"]');
    expect(tr).toContain('<span class="stx">senden</span>');
    const en = (await get('/en')).body;
    expect(en).toContain('<span class="ln">We lost the comma.</span>');
    expect(en).toContain('data-word>detail</span>');
    // The defaults in the code are untouched.
    expect(HOME.tr.words[0]).toBe('Akılda kalan');
    expect((await get('/panel/texts')).body).toContain('<span class="p-badge acc">değişti</span>');
  });

  it('rewrites a line in both languages · everywhere it is said', async () => {
    const res = await post('/panel/texts', { g: 'home', [textField('Dört biçim. Tek stüdyo.', 'tr')]: 'Dört iş. Tek cümle.', [textField('Dört biçim. Tek stüdyo.', 'en')]: 'Four crafts. One sentence.' });
    expect(res.headers.location).toBe('/panel/texts?g=home&m=saved');
    expect((await get('/tr')).body).toContain('<h2 class="h2">Dört iş. Tek cümle.</h2>');
    expect((await get('/en')).body).toContain('<h2 class="h2">Four crafts. One sentence.</h2>');
    // The footer is on every page: a line there changes on all of them · roll labels too.
    await post('/panel/texts', { g: 'chrome', [textField('Bir fikrin mi var?', 'tr')]: 'Yarım bir fikrin mi var?', [textField('Proje başlat', 'en')]: 'Start yours' });
    expect((await get('/tr/studyo')).body).toContain('<h2 class="ft-big">Yarım bir fikrin mi var?</h2>');
    expect((await get('/tr/isler')).body).toContain('<span aria-hidden="true">Start yours</span>');
    const hint = (await get('/panel/texts?g=chrome')).body;
    expect(hint).toContain('Koddaki hâli: TR “Bir fikrin mi var?”');
  });

  it('refuses a comma · a lost placeholder · a headline without its word box', async () => {
    const before = JSON.stringify(app.db ? await app.db.select().from(settings) : []);
    const comma = await post('/panel/texts', { g: 'home', [textField('Pano.', 'tr')]: 'Pano, işte.' });
    expect(comma.statusCode).toBe(422);
    expect(comma.body).toContain('Virgül kullanma');
    expect(comma.body).toContain('value="Pano, işte."');
    const ph = await post('/panel/texts', { g: 'home', [textField('Yayında · v{n}', 'tr')]: 'Yayında' });
    expect(ph.statusCode).toBe(422);
    expect(ph.body).toContain('Şunlar aynen kalmalı: {n}');
    const head = await post('/panel/texts', { [homeField('headline', 'tr')]: 'Kutusuz bir başlık' });
    expect(head.statusCode).toBe(422);
    expect(JSON.stringify(await app.db.select().from(settings))).toBe(before);
    expect((await post('/panel/texts', {}, )).headers.location).toBe('/panel/texts?m=same');
  });

  it('an empty field or the default itself takes the rewrite away', async () => {
    await post('/panel/texts', { g: 'home', [textField('Dört biçim. Tek stüdyo.', 'tr')]: '', [textField('Dört biçim. Tek stüdyo.', 'en')]: 'Four shapes. One studio.' });
    expect((await get('/tr')).body).toContain('<h2 class="h2">Dört biçim. Tek stüdyo.</h2>');
    expect((await get('/en')).body).toContain('<h2 class="h2">Four shapes. One studio.</h2>');
    const rows = await app.db.select().from(settings).where(eq(settings.key, 'texts.t.tr'));
    expect(Object.keys(rows[0]!.value as object)).toEqual(['Bir fikrin mi var?']);
  });

  it('every save is in the log with both states · "Bu hale dön" brings the old copy back', async () => {
    const entries = await app.db.select().from(audit).where(eq(audit.entity, 'texts'));
    expect(entries.length).toBeGreaterThanOrEqual(3);
    const first = entries.sort((a, b) => a.id - b.id)[0]!;
    expect(first.summary).toBe('Metinler: 5 satır değişti (Ana sayfa · bölümler)');
    expect(first.before).toEqual({ t: { tr: {}, en: {} }, home: { tr: {}, en: {} } });
    const res = await post(`/panel/log/${first.id}/restore`, {});
    expect(res.headers.location).toBe('/panel/texts?m=restored');
    const tr = (await get('/tr')).body;
    expect(tr).toContain('data-word>Akılda kalan</span>');
    expect(tr).toContain('<h2 class="ft-big">Bir fikrin mi var?</h2>');
    expect(await app.db.select().from(settings).where(eq(settings.key, 'texts.home.tr'))).toEqual([]);
  });
});
