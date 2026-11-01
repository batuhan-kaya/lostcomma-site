import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { STATIC_PAGES } from '../src/server/pages';
import { href, type RouteId } from '../src/server/routes';

const SITE = 'https://lostcomma.co';
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({
    config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE }),
    now: () => new Date('2026-10-31T09:41:00+03:00'),
  });
});
afterAll(() => app.close());

const ids = Object.keys(STATIC_PAGES) as RouteId[];
const get = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers });

/** Visible body text: data blocks and the comma egg removed · tags stripped. Used for the comma rule. */
function bodyText(doc: string): string {
  const body = doc.split('<body>')[1]?.split('</body>')[0] ?? '';
  return body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

describe('pages', () => {
  for (const id of ids) {
    for (const lang of ['tr', 'en'] as const) {
      it(`${href(lang, id)} renders`, async () => {
        const res = await get(href(lang, id));
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
        const doc = res.body;
        expect(doc).toContain(`<html lang="${lang}"`);
        expect(doc).toContain(`<link rel="canonical" href="${SITE}${href(lang, id)}">`);
        expect(doc).toContain(`hreflang="tr" href="${SITE}${href('tr', id)}"`);
        expect(doc).toContain(`hreflang="en" href="${SITE}${href('en', id)}"`);
        expect(doc).toContain('hreflang="x-default"');
        expect(doc).toMatch(/<title>[^<,]+<\/title>/);
        expect(doc).toContain('<main id="main">');
        expect(bodyText(doc)).not.toContain(',');
        expect(doc).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
        expect(doc).not.toMatch(/\sstyle="/);
      });
    }
  }

  it('marks the active section in the header', async () => {
    const doc = (await get('/en/work')).body;
    expect(doc).toMatch(/<a class="lk act" href="\/en\/work" aria-current="page">/);
  });

  it('language switch points at the same page in the other language', async () => {
    const doc = (await get('/tr/isler')).body;
    expect(doc).toContain('<a class="lg" href="/en/work" hreflang="en"');
  });

  it('prints the Istanbul clock in the footer', async () => {
    expect((await get('/en/work')).body).toContain('>09:41</time>');
  });
});

describe('root and redirects', () => {
  it('sends / to the language from Accept-Language', async () => {
    const res = await get('/', { 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/tr');
    expect(res.headers.vary).toContain('Accept-Language');
  });

  it('lets the cookie win over the header', async () => {
    const res = await get('/', { 'accept-language': 'tr', cookie: 'x=1; lang=en' });
    expect(res.headers.location).toBe('/en');
  });

  it('defaults to English', async () => {
    expect((await get('/')).headers.location).toBe('/en');
  });

  it('drops trailing slashes with 301 and keeps the query', async () => {
    const res = await get('/en/work/?a=1');
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/en/work?a=1');
  });
});

describe('not found', () => {
  it('renders the 404 page in the language of the path', async () => {
    const res = await get('/tr/yok-boyle-bir-sayfa');
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('<html lang="tr"');
    expect(res.body).toContain('Burası haritada yok.');
    expect(res.body).toContain('<meta name="robots" content="noindex">');
    expect(res.body).not.toContain('rel="canonical"');
  });

  it('falls back to negotiation outside a language prefix', async () => {
    const res = await get('/nope', { 'accept-language': 'tr' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('<html lang="tr"');
  });

  it('escapes the requested path', async () => {
    const res = await get('/en/%3Cscript%3Ealert(1)%3C/script%3E');
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('<script>alert(1)');
  });
});

describe('headers and meta files', () => {
  it('sends a strict CSP and the usual hardening headers on HTML', async () => {
    const res = await get('/en');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves robots.txt with the sitemap', async () => {
    const res = await get('/robots.txt');
    expect(res.body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(res.body).toContain('Disallow: /panel');
  });

  it('lists every static page in both languages in the sitemap', async () => {
    const res = await get('/sitemap.xml');
    expect(res.headers['content-type']).toContain('application/xml');
    for (const id of ids) for (const lang of ['tr', 'en'] as const) expect(res.body).toContain(`<loc>${SITE}${href(lang, id)}</loc>`);
  });

  it('answers the health check', async () => {
    expect((await get('/healthz')).json()).toEqual({ ok: true });
  });
});
