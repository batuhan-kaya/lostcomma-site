import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { arrivesFromOutside } from '../src/server/layout/intro';

const SITE = 'https://lostcomma.co';
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE }), now: () => new Date('2026-11-02T03:00:00+03:00') });
});
afterAll(() => app.close());

/** A page load as the browser sends it: Sec-Fetch-Site tells where the visitor comes from. */
const visit = (a: typeof app, url: string, site?: 'none' | 'cross-site' | 'same-site' | 'same-origin') =>
  a.inject({ method: 'GET', url, headers: site ? { 'sec-fetch-site': site, 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' } : {} });

describe('the preloader', () => {
  it('greets only visitors who arrive from outside', () => {
    const h = (site: string, mode = 'navigate', dest = 'document') => ({ headers: { 'sec-fetch-site': site, 'sec-fetch-mode': mode, 'sec-fetch-dest': dest } });
    expect(arrivesFromOutside(h('none'))).toBe(true);
    expect(arrivesFromOutside(h('cross-site'))).toBe(true);
    expect(arrivesFromOutside(h('same-site'))).toBe(true);
    expect(arrivesFromOutside(h('same-origin'))).toBe(false);
    // A frame (the panel's click map) · a fetch · an old browser without the headers.
    expect(arrivesFromOutside(h('none', 'navigate', 'iframe'))).toBe(false);
    expect(arrivesFromOutside(h('none', 'cors', 'empty'))).toBe(false);
    expect(arrivesFromOutside({ headers: {} })).toBe(false);
  });

  it('is drawn first in the body for them · never for a page reached from our own pages', async () => {
    const fresh = await visit(app, '/en/work', 'none');
    expect(fresh.body).toMatch(/<body>\n<div class="lci" data-intro aria-hidden="true">/);
    expect(fresh.body).toContain('Looking for the comma · all three of us');
    expect(fresh.headers.vary).toContain('Sec-Fetch-Site');
    expect((await visit(app, '/tr', 'cross-site')).body).toContain('Virgül aranıyor · üç kişi bakıyor');
    expect((await visit(app, '/en/work', 'same-origin')).body).not.toContain('data-intro');
    expect((await visit(app, '/en/work')).body).not.toContain('data-intro');
  });

  it('stays away from error pages and is off with PRELOADER=off', async () => {
    const missing = await visit(app, '/en/no-such-page', 'none');
    expect(missing.statusCode).toBe(404);
    expect(missing.body).not.toContain('data-intro');
    const off = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, PRELOADER: 'off' }) });
    try {
      expect((await visit(off, '/en', 'none')).body).not.toContain('data-intro');
    } finally {
      await off.close();
    }
  });

  it('keeps the comma rule and draws the mark from the shared shape', async () => {
    const doc = (await visit(app, '/tr/studyo', 'none')).body;
    const box = doc.slice(doc.indexOf('<div class="lci"'), doc.indexOf('<a class="skip"'));
    expect(box.replace(/<[^>]+>/g, ' ')).not.toContain(',');
    expect(box).toContain('<path class="lci-t" d="M0 82C0 47.6');
    expect(box).toContain('<span class="lci-cur lci-motion">');
  });
});
