import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { EDITOR_SAMPLE, HERO, SERVICE_KEYS, SERVICE_SLUGS, SERVICES, serviceBySlug } from '../src/server/content/services';
import { tierOf } from '../src/shared/checklist';
import { contrast, PALETTE } from '../src/shared/contrast';
import { cssCurve, ease, PRESETS, plotPath, X, Y } from '../src/shared/curve';
import { FRAME } from '../src/shared/frame';
import { ACTIONS, actionAt, boxOf, easyCount, zoneAt } from '../src/shared/thumb';
import { WIDTHS } from '../src/server/pages/service/heroes';

const SITE = 'https://lostcomma.co';
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE }), now: () => new Date('2026-10-31T09:41:00+03:00') });
afterAll(() => app.close());

const get = (url: string) => app.inject(url);
const secs = (doc: string) => [...doc.matchAll(/data-sec="([a-z]+)"/g)].map((m) => m[1]);
const text = (doc: string) =>
  (doc.split('<body>')[1] ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<code[\s\S]*?<\/code>/g, ' ')
    // The logo sting draws the comma on purpose (aria-hidden).
    .replace(/<div class="tlv"[\s\S]*?<\/svg><\/div>/g, ' ')
    .replace(/<[^>]+aria-hidden="true"[^>]*>[^<]*<\/[a-z]+>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
const css = readFileSync(new URL('../src/styles/pages/service.css', import.meta.url), 'utf8');

/** Every string inside a value (deep). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe('Services content', () => {
  it('has no comma anywhere in either language', () => {
    const all = strings([SERVICES, HERO, EDITOR_SAMPLE]);
    expect(all.length).toBeGreaterThan(400);
    expect(all.filter((s) => s.includes(','))).toEqual([]);
  });

  it('has the same shape in both languages', () => {
    for (const k of SERVICE_KEYS) {
      const tr = SERVICES.tr.services[k];
      const en = SERVICES.en.services[k];
      expect(tr.checks).toHaveLength(12);
      expect(en.checks.map((c) => !!c.on)).toEqual(tr.checks.map((c) => !!c.on));
      expect(tr.tiers.filter((x) => x.hot)).toHaveLength(1);
      expect(en.tiers.map((x) => !!x.hot)).toEqual(tr.tiers.map((x) => !!x.hot));
      expect(tr.hood.budget).toHaveLength(en.hood.budget.length);
      expect(tr.dl).toHaveLength(en.dl.length);
    }
    expect(HERO.tr.sizes.map((z) => z.v)).toEqual(HERO.en.sizes.map((z) => z.v));
    expect(HERO.tr.palette).toHaveLength(PALETTE.length);
    expect(SERVICES.tr.overview.faq).toHaveLength(SERVICES.en.overview.faq.length);
  });

  it('finds a service by its slug in that language only', () => {
    expect(serviceBySlug('tr', 'web-siteleri')).toBe('web');
    expect(serviceBySlug('en', 'motion')).toBe('motion');
    expect(serviceBySlug('tr', 'websites')).toBeNull();
    expect(serviceBySlug('en', '')).toBeNull();
  });
});

describe('the checklist verdict', () => {
  const ticks = (n: number, at: number[] = []) => Array.from({ length: 12 }, (_, i) => (at.length ? at.includes(i) : i < n));
  it('counts ticks for websites · apps · identity', () => {
    expect(tierOf('web', ticks(4))).toBe(0);
    expect(tierOf('web', ticks(5))).toBe(1);
    expect(tierOf('app', ticks(9))).toBe(1);
    expect(tierOf('identity', ticks(10))).toBe(2);
  });
  it('turns motion into a film when any film work is ticked', () => {
    expect(tierOf('motion', ticks(0, [0, 1, 2, 9, 10]))).toBe(0);
    expect(tierOf('motion', ticks(0, [0, 5]))).toBe(1);
    expect(tierOf('motion', ticks(10))).toBe(2);
  });
});

describe('the thumb zone', () => {
  it('puts nothing in easy reach before and everything after · for either hand', () => {
    expect(easyCount('b', 'r')).toBe(0);
    expect(easyCount('a', 'r')).toBe(5);
    expect(easyCount('b', 'l')).toBe(0);
    expect(easyCount('a', 'l')).toBe(5);
  });
  it('mirrors the layout for the left hand', () => {
    const r = boxOf(0, 'a', 'r');
    const l = boxOf(0, 'a', 'l');
    expect(l.x).toBeCloseTo(360 - r.x - r.w);
    expect(l.y).toBe(r.y);
  });
  it('measures reach from the bottom corner', () => {
    expect(zoneAt(330, 740, 'r')).toBe('easy');
    expect(zoneAt(60, 500, 'r')).toBe('ok');
    expect(zoneAt(30, 40, 'r')).toBe('hard');
    expect(zoneAt(30, 740, 'l')).toBe('easy');
  });
  it('finds the action under the thumb', () => {
    const b = boxOf(2, 'a', 'r');
    expect(actionAt(b.x + 4, b.y + 4, 'a', 'r')).toBe(2);
    expect(actionAt(180, 380, 'a', 'r')).toBe(-1);
  });
  it('the resizable frame starts in CSS where the client starts (no jump when JS arrives)', () => {
    expect(css).toContain(`width: min(${FRAME.start}px, calc(100% * ${FRAME.start} / ${FRAME.max}))`);
    for (const { w } of WIDTHS) expect(css).toContain(`.bp[data-bp="${w}"] { left: min(${w}px, calc(100% * ${w} / ${FRAME.max})); }`);
  });
  it('draws the same first layout in CSS (the page without JS)', () => {
    ACTIONS.forEach((a, i) => {
      const [x, y, w, h] = a.b;
      expect(css).toContain(`.scr .act.a${i} { left: ${x}%; top: ${y}%; width: ${w}%; height: ${h}%; }`);
    });
  });
});

describe('the curve', () => {
  it('plots and prints a preset', () => {
    const roll = PRESETS[0]!.c;
    expect(plotPath(roll)).toBe('M0 510 C210 510 60 210 300 210');
    expect(cssCurve(roll)).toBe('cubic-bezier(0.7, 0, 0.2, 1)');
    expect(cssCurve([0.21, 1.61, 0.3, 1])).toBe('cubic-bezier(0.21, 1.61, 0.3, 1)');
  });
  it('eases from 0 to 1 · overshoots with Pop', () => {
    const roll = PRESETS[0]!.c;
    expect(ease(roll, 0)).toBe(0);
    expect(ease(roll, 1)).toBe(1);
    const steps = [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => ease(roll, p));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    const pop = PRESETS[1]!.c;
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map((p) => ease(pop, p)))).toBeGreaterThan(1);
  });
  it('puts the handles where the first preset says (CSS without JS)', () => {
    const roll = PRESETS[0]!.c;
    const pct = (v: number, off: number, size: number) => (((v + off) / size) * 100).toFixed(2);
    expect(css).toContain(`.hdl.h0 { left: ${pct(X(roll[0]), 20, 340)}%; top: ${pct(Y(roll[1]), 10, 680)}%; }`);
    expect(css).toContain(`.hdl.h1 { left: ${pct(X(roll[2]), 20, 340)}%; top: ${pct(Y(roll[3]), 10, 680)}%; }`);
  });
});

describe('contrast', () => {
  it('follows WCAG', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1);
    expect(contrast(PALETTE[0], PALETTE[3])).toBeGreaterThan(7);
  });
});

describe('Services · the overview', async () => {
  const en = (await get('/en/services')).body;
  const tr = (await get('/tr/hizmetler')).body;

  it('has its sections in order', () => {
    expect(secs(en)).toEqual(['hero', 'tools', 'combo', 'faq', 'next', 'ft']);
  });

  it('has a tool and an inspector for each service · only the first one showing', () => {
    expect(en.match(/data-tool="\w+"/g)).toEqual(['data-tool="web"', 'data-tool="app"', 'data-tool="identity"', 'data-tool="motion"']);
    expect(en).toContain('data-tool="web" aria-pressed="true"');
    expect(en.match(/data-ib="\w+" hidden/g)).toHaveLength(3);
    expect(en).toContain('[PRICE]');
    expect(tr).toContain('[FİYAT]');
  });

  it('links every tile to its page in its language', () => {
    for (const k of SERVICE_KEYS) {
      expect(en).toContain(`<a class="tile t-`);
      expect(en).toContain(`href="/en/services/${SERVICE_SLUGS[k].en}"`);
      expect(tr).toContain(`href="/tr/hizmetler/${SERVICE_SLUGS[k].tr}"`);
    }
  });

  it('opens the first question · the rest are buttons with regions', () => {
    expect(en.match(/class="qb"/g)).toHaveLength(6);
    expect(en).toContain('id="q0" aria-expanded="true" aria-controls="a0"');
    expect(en).toContain('id="q1" aria-expanded="false" aria-controls="a1"');
  });

  it('keeps the comma rule', () => {
    expect(text(en)).not.toContain(',');
    expect(text(tr)).not.toContain(',');
  });
});

describe('Service pages', async () => {
  const pages = Object.fromEntries(
    await Promise.all(
      SERVICE_KEYS.flatMap((k) => (['tr', 'en'] as const).map(async (l) => [`${l}:${k}`, (await get(`${l === 'tr' ? '/tr/hizmetler' : '/en/services'}/${SERVICE_SLUGS[k][l]}`))] as const)),
    ),
  );

  it('answer in both languages with their own theme', () => {
    const theme = { web: 'blue', app: 'lime', identity: 'pink', motion: 'ink' } as const;
    for (const k of SERVICE_KEYS) {
      for (const l of ['tr', 'en'] as const) {
        const res = pages[`${l}:${k}`]!;
        expect(res.statusCode, `${l} ${k}`).toBe(200);
        expect(res.body).toContain(`class="th-${theme[k]}" data-page="service"`);
        expect(res.body).toMatch(/<h1 class="ttl( long)?"/);
        expect(text(res.body), `${l} ${k}`).not.toContain(',');
      }
    }
  });

  it('point to each other across languages', () => {
    const body = pages['en:identity']!.body;
    expect(body).toContain(`<link rel="alternate" hreflang="tr" href="${SITE}/tr/hizmetler/kimlik">`);
    expect(body).toContain(`<link rel="canonical" href="${SITE}/en/services/identity">`);
    expect(body).toMatch(/<a [^>]*href="\/tr\/hizmetler\/kimlik"/);
  });

  it('are 404 for an unknown slug or a slug from the other language', async () => {
    expect((await get('/en/services/logos')).statusCode).toBe(404);
    expect((await get('/tr/hizmetler/websites')).statusCode).toBe(404);
  });

  it('have the five beats below the hero', () => {
    expect(secs(pages['en:web']!.body)).toEqual(['hero', 'get', 'hood', 'price', 'rel', 'next', 'ft']);
    expect(secs(pages['tr:motion']!.body)).toEqual(['hero', 'get', 'hood', 'price', 'reel', 'next', 'ft']);
  });

  it('start the checklist with its verdict', () => {
    for (const k of SERVICE_KEYS) {
      const s = SERVICES.en.services[k];
      const tier = tierOf(k, s.checks.map((c) => !!c.on));
      const body = pages[`en:${k}`]!.body;
      expect(body).toContain(`<b data-picked>${s.checks.filter((c) => c.on).length}</b>`);
      expect(body).toContain(`<span data-verdict>${s.verdict[tier]}</span>`);
      expect(body.match(/data-ck="\d+"/g)).toHaveLength(12);
    }
  });

  it('show work of the same kind from the database (never this website)', () => {
    const web = pages['en:web']!.body;
    const cards = [...web.matchAll(/<a class="rc" href="([^"]+)"/g)].map((m) => m[1]);
    expect(cards).toEqual(['/en/work/climate-data-platform', '/en/work/sailing-club', '/en/work/coffee-roaster']);
    const reel = pages['en:motion']!.body;
    expect(reel.match(/data-loop/g)).toHaveLength(3);
    expect(reel).toContain('href="/en/work/product-launch-film"');
  });

  it('walk to the next tool and back to all of them', () => {
    expect(pages['en:web']!.body).toMatch(/<a class="nx nb-lime" href="\/en\/services\/apps"/);
    expect(pages['tr:app']!.body).toMatch(/<a class="nx nb-pink" href="\/tr\/hizmetler\/kimlik"/);
    expect(pages['en:motion']!.body).toMatch(/<a class="nx nb-blue" href="\/en\/services"/);
  });

  it('wrap the Websites page below its blue hero in paper', () => {
    const body = pages['en:web']!.body;
    expect(body).toContain('<div class="below th-paper"><section class="get"');
    // The footer is always ink · it follows the paper wrapper instead of sitting in it.
    expect(body).toMatch(/<\/main>\s*<footer class="ft th-ink" data-sec="ft"/);
  });

  it('render each hero first state on the server', () => {
    expect(pages['en:web']!.body).toContain('aria-valuenow="1280"');
    expect(pages['en:app']!.body).toContain('<span data-easy>0</span>');
    expect(pages['en:identity']!.body).toContain('<span class="sz" data-sz>85 mm</span>');
    expect(pages['en:identity']!.body).toContain(`${contrast(PALETTE[0], PALETTE[3]).toFixed(2)} : 1`);
    expect(pages['en:motion']!.body).toContain(`d="${plotPath(PRESETS[0]!.c)}"`);
  });

  it('are in the sitemap with their alternates', async () => {
    const xml = (await get('/sitemap.xml')).body;
    for (const k of SERVICE_KEYS) {
      expect(xml).toContain(`<loc>${SITE}/en/services/${SERVICE_SLUGS[k].en}</loc>`);
      expect(xml).toContain(`<loc>${SITE}/tr/hizmetler/${SERVICE_SLUGS[k].tr}</loc>`);
    }
  });
});
