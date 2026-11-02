import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drawIcons, ICON_FILES } from '../scripts/icons';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { fontsFor } from '../src/server/og';
import { fromHere, originHosts } from '../src/server/origin';
import { socialError } from '../src/server/panel/views/settings';
import { href } from '../src/server/routes';
import { L_HEIGHT, MARK, MARK_EM } from '../src/shared/logo';

const SITE = 'https://lostcomma.co';
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  // The icons straight from public/ (the build copies them to dist/public): CI runs the unit tests before it builds.
  app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, PUBLIC_DIR: 'public' }), now: () => new Date('2026-11-02T01:20:00+03:00') });
});
afterAll(() => app.close());

const get = (url: string) => app.inject({ method: 'GET', url });

describe('the mark', () => {
  it('is one size with the name: the corner is as tall as the l of the wordmark', async () => {
    // Every width and weight the wordmark uses (header 88/820 · share images · footer).
    for (const axes of [{ wdth: 88, wght: 820 }, { wdth: 80, wght: 840 }, { wdth: 88, wght: 260 }]) {
      const [latin] = await fontsFor('display', { built: () => null }, axes);
      const l = latin!.glyphForCodePoint('l'.codePointAt(0)!);
      expect(l.bbox.maxY / latin!.unitsPerEm).toBeCloseTo(L_HEIGHT, 3);
    }
    expect(MARK_EM.h - MARK_EM.drop).toBeCloseTo(L_HEIGHT, 6);
  });

  it('keeps the CSS sizes equal to the numbers in src/shared/logo.ts', () => {
    const css = readFileSync('src/styles/chrome.css', 'utf8');
    const rule = css.match(/\.lc-mark \{([^}]*)\}/)![1]!;
    const em = (prop: string) => Number(rule.match(new RegExp(`${prop}: (-?[.\\d]+)em`))![1]);
    expect(em('width')).toBeCloseTo(MARK_EM.w, 3);
    expect(em('height')).toBeCloseTo(MARK_EM.h, 3);
    // The bottom margin lifts the hanging comma out of the line box.
    expect(rule).toContain(`margin: 0 .16em -${MARK_EM.drop.toFixed(4).replace(/^0/, '')}em 0`);
  });

  it('draws every icon from the mark · the committed files are up to date', async () => {
    const files = await drawIcons();
    for (const name of ICON_FILES) expect(readFileSync(`public/${name}`).equals(files[name]), `public/${name} is stale · npm run icons`).toBe(true);
    const svg = files['favicon.svg'].toString();
    expect(svg).toContain(MARK.top);
    expect(svg).toContain('prefers-color-scheme:dark');
    // The .ico holds three PNG frames: 16 · 32 · 48.
    const ico = files['favicon.ico'];
    expect(ico.readUInt16LE(4)).toBe(3);
    expect([0, 1, 2].map((i) => ico.readUInt8(6 + i * 16))).toEqual([16, 32, 48]);
    const manifest = JSON.parse(files['site.webmanifest'].toString());
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual(['/icon-192.png', '/icon-512.png', '/icon-maskable.png']);
  });

  it('serves the icons with their types and links them in every page head', async () => {
    const types: Record<string, string> = { 'favicon.svg': 'image/svg+xml', 'favicon.ico': 'image/vnd.microsoft.icon', 'apple-touch-icon.png': 'image/png', 'icon-512.png': 'image/png', 'site.webmanifest': 'application/manifest+json' };
    for (const [file, type] of Object.entries(types)) {
      const res = await get(`/${file}`);
      expect(res.statusCode, file).toBe(200);
      expect(res.headers['content-type']).toContain(type);
      expect(res.headers['cache-control']).toBe('public, max-age=86400');
    }
    const doc = (await get('/en/work')).body;
    expect(doc).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32">');
    expect(doc).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
    expect(doc).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    expect(doc).toContain('<link rel="manifest" href="/site.webmanifest">');
  });

  it('stands beside the name in the header · the panel · the feed and the search data', async () => {
    const doc = (await get('/tr')).body;
    expect(doc).toMatch(/<a href="\/tr" class="logo"><span class="lc-lock"><svg class="lc-mark" viewBox="0 0 493 869" aria-hidden="true"/);
    expect((await get('/panel/login')).body).toContain('<span class="lc-lock"><svg class="lc-mark"');
    const rss = (await get(href('en', 'rss'))).body;
    expect(rss).toContain(`<image><url>${SITE}/icon-144.png</url>`);
    expect(doc).toContain(`"logo":"${SITE}/icon-512.png"`);
  });
});

describe('the footer', () => {
  it('is the same on every page: a way to start · the whole site · the drawn sign-off · the small print', async () => {
    for (const lang of ['tr', 'en'] as const) {
      for (const page of [href(lang, 'home'), href(lang, 'work'), href(lang, 'privacy')]) {
        const doc = (await get(page)).body;
        const ft = doc.slice(doc.indexOf('<footer class="ft th-ink" data-sec="ft" data-ft>'));
        expect(ft.length, page).toBeGreaterThan(100);
        for (const id of ['start', 'work', 'services', 'process', 'studio', 'notes', 'lab', 'now', 'uses', 'rss', 'privacy', 'kvkk', 'cookies'] as const) {
          expect(ft, `${page} → ${id}`).toContain(`href="${href(lang, id)}"`);
        }
        expect(ft).toContain(`href="${href(lang, 'start')}#book"`);
        expect(ft).toContain(`href="${href(lang, 'home')}#contact"`);
        expect(ft).toContain('href="mailto:hello@lostcomma.co"');
        expect(ft).toMatch(/<svg class="lc-mark ft-mk"[^>]*><path class="lc-t" pathLength="1"/);
        expect(ft).toContain('href="#top"');
      }
    }
    // The homepage's own big footer is gone.
    expect((await get('/en')).body).not.toContain('bigft');
  });

  it('links the four services in the page language', async () => {
    const ft = (await get('/en/work')).body.split('data-ft>')[1]!;
    for (const slug of ['websites', 'apps', 'identity', 'motion']) expect(ft).toContain(`href="/en/services/${slug}"`);
    expect((await get('/tr/isler')).body.split('data-ft>')[1]).toContain('>Web siteleri</a>');
  });

  it('shows social accounts · the phone and the address only once they are filled', async () => {
    let ft = (await get('/en/work')).body.split('data-ft>')[1]!;
    expect(ft).not.toContain('instagram.com');
    expect(ft).not.toContain('href="tel:');
    await app.settings.set('social.instagram', 'https://www.instagram.com/lostcomma');
    await app.settings.set('social.github', 'https://github.com/lostcomma');
    await app.settings.set('studio.phone', '+90 216 555 01 23');
    await app.settings.set('work.nextMonth', '2027-01');
    ft = (await get('/en/work')).body.split('data-ft>')[1]!;
    expect(ft).toContain('href="https://www.instagram.com/lostcomma" rel="me noopener">Instagram');
    expect(ft).toContain('href="https://github.com/lostcomma"');
    expect(ft).toContain('href="tel:+902165550123"');
    expect(ft).toContain('Our next free spot opens in January');
    expect((await get('/en')).body).toContain('"sameAs":["https://www.instagram.com/lostcomma","https://github.com/lostcomma"]');
    for (const k of ['social.instagram', 'social.github', 'studio.phone', 'work.nextMonth']) await app.settings.set(k, null);
  });

  it('checks a social address belongs to its network', () => {
    expect(socialError('', 'instagram.com')).toBeNull();
    expect(socialError('https://instagram.com/lostcomma', 'instagram.com')).toBeNull();
    expect(socialError('https://www.instagram.com/lostcomma', 'instagram.com')).toBeNull();
    expect(socialError('http://instagram.com/lostcomma', 'instagram.com')).toMatch(/https/);
    expect(socialError('https://instagram.com.evil.example/x', 'instagram.com')).toMatch(/instagram\.com/);
    expect(socialError('instagram.com/lostcomma', 'instagram.com')).toMatch(/Tam adres/);
  });
});

describe('posts from a preview behind a proxy', () => {
  it('accept the site itself · no Origin · and the extra hosts only', () => {
    const plain = originHosts(SITE);
    expect(fromHere(undefined, plain)).toBe(true);
    expect(fromHere('https://lostcomma.co', plain)).toBe(true);
    expect(fromHere('http://localhost:3000', plain)).toBe(false);
    expect(fromHere('nonsense', plain)).toBe(false);
    const preview = originHosts('https://x-3000.app.github.dev', 'localhost:3000');
    expect(fromHere('http://localhost:3000', preview)).toBe(true);
    expect(fromHere('https://x-3000.app.github.dev', preview)).toBe(true);
    expect(fromHere('https://evil.example', preview)).toBe(false);
  });

  it('let the brief through with EXTRA_ORIGINS and not without it', async () => {
    const post = (a: typeof app) =>
      a.inject({ method: 'POST', url: '/api/brief', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, payload: { lang: 'en', email: 'a@b.co' } });
    expect((await post(app)).statusCode).toBe(403);
    const preview = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://x-3000.app.github.dev', EXTRA_ORIGINS: 'localhost:3000' }) });
    try {
      expect((await post(preview)).statusCode).not.toBe(403);
    } finally {
      await preview.close();
    }
  });
});
