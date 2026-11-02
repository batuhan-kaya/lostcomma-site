import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { addressKey, chart, distance, EDGE, isClose, labelBox, letters, placeYou, RING } from '../src/shared/lost';

const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://lostcomma.co' }), now: () => new Date('2026-10-31T12:00:00Z') });
afterAll(() => app.close());

const get = (url: string) => app.inject({ method: 'GET', url });
const text = (doc: string) =>
  (doc.split('<body>')[1] ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
const near = (doc: string) => ({
  kick: /data-rk>([^<]*)</.exec(doc)?.[1],
  href: /class="nl" href="([^"]+)"/.exec(doc)?.[1],
  label: /data-rlabel[^>]*>([^<]*)</.exec(doc)?.[1],
  dist: /data-rd>([^<]*)</.exec(doc)?.[1],
});

describe('letters between addresses (src/shared/lost)', () => {
  it('counts edits · a swap of two neighbours is one', () => {
    expect(letters('hizmetlr', 'hizmetler')).toBe(1);
    expect(letters('wrok', 'work')).toBe(1);
    expect(letters('kitten', 'sitting')).toBe(3);
    expect(letters('', 'lab')).toBe(3);
    expect(letters('lab', 'lab')).toBe(0);
  });

  it('reads the part after the language · decoded · folded', () => {
    expect(addressKey('/tr/Hizmetlér/')).toBe('hizmetler');
    expect(addressKey('/tr/Stüdyo')).toBe('studyo');
    expect(addressKey('/en/work/Sailing%20Club?x=1')).toBe('work/sailing-club');
    expect(addressKey('/en/%E0%A4%A')).toBe('%e0%a4%a');
    expect(addressKey('/tr')).toBe('');
    expect(addressKey('/trabzon')).toBe('trabzon');
    expect(addressKey('/en/' + 'x'.repeat(200))).toHaveLength(80);
  });

  it('measures a page by the closer of its two addresses', () => {
    expect(distance('hizmetler', ['/tr/hizmetler', '/en/services'])).toBe(0);
    expect(distance('servces', ['/tr/hizmetler', '/en/services'])).toBe(1);
    expect(isClose(1, 'servces')).toBe(true);
    expect(isClose(6, 'asdkjasd')).toBe(false);
  });

  it('lays the site out on two rings around home', () => {
    const { main, kids } = chart([4, 4, 0, 0, 3, 0, 0]);
    expect(main).toHaveLength(7);
    for (const s of main) expect(Math.hypot(s.x, s.y)).toBeCloseTo(RING[1], 1);
    expect(main[0]).toMatchObject({ x: 0, y: -RING[1], side: 't' });
    expect(kids[0]).toHaveLength(4);
    for (const s of kids.flat()) expect(['r', 'l']).toContain(s.side);
    for (const s of kids.flat()) expect(Math.hypot(s.x, s.y)).toBeCloseTo(RING[2], 1);
  });

  it('puts the comma beside its page without covering a label · or outside the edge', () => {
    const { main, kids } = chart([4, 4, 0, 0, 3, 0, 0]);
    const nodes = [{ x: 0, y: 0, side: 'b' as const, ring: 0, label: 'Ana sayfa' }, ...main.map((s, i) => ({ ...s, ring: 1, label: `Page ${i}` })), ...kids.flat().map((s) => ({ ...s, ring: 2, label: 'Kid' }))];
    for (let target = 1; target < nodes.length; target++) {
      const p = placeYou(nodes, target, 1, true, 'sen /hizmetlr');
      const t = nodes[target]!;
      expect(Math.hypot(p.x - t.x, p.y - t.y)).toBeLessThan(14);
      const lb = labelBox(t, t.label);
      expect(p.x > lb.x0 - 3 && p.x < lb.x1 + 3 && p.y > lb.y0 - 3 && p.y < lb.y1 + 3, `comma on the label of ${target}`).toBe(false);
    }
    const off = placeYou(nodes, 0, 9, false, 'sen /asdkjasd');
    expect(Math.hypot(off.x, off.y)).toBeGreaterThan(EDGE);
  });
});

describe('404 page', () => {
  it('points at the closest page in letters', async () => {
    const res = await get('/tr/hizmetlr');
    expect(res.statusCode).toBe(404);
    expect(near(res.body)).toEqual({ kick: 'En yakın sayfa', href: '/tr/hizmetler', label: 'Hizmetler', dist: '1 harf uzakta' });
    expect(res.body).toMatch(/<a class="nd r1 on" href="\/tr\/hizmetler"/);
    expect(res.body).toContain('data-route');
  });

  it('forgives a swap · finds pages of pages · knows the other language', async () => {
    expect(near((await get('/en/wrok')).body)).toMatchObject({ href: '/en/work', dist: '1 letter away' });
    expect(near((await get('/en/servics/websits')).body)).toMatchObject({ href: '/en/services/websites', label: 'Websites' });
    expect(near((await get('/en/work/sailing-clb')).body)).toMatchObject({ href: '/en/work/sailing-club', dist: '1 letter away' });
    expect(near((await get('/en/hizmetler')).body)).toMatchObject({ href: '/en/services', dist: 'Only the language is different' });
  });

  it('sends people home when nothing is close · the comma stands off the map', async () => {
    const doc = (await get('/tr/qwzxqwzx')).body;
    expect(near(doc)).toEqual({ kick: 'Yakında bir sayfa yok', href: '/tr', label: 'Ana sayfa', dist: 'Haritanın ortasından başla' });
    expect(doc).toContain('<g class="me off"');
  });

  it('draws every main page as a link and keeps the comma rule', async () => {
    const doc = (await get('/en/nowhere')).body;
    for (const h of ['/en', '/en/work', '/en/services', '/en/process', '/en/studio', '/en/notes', '/en/lab', '/en/start']) expect(doc).toContain(`href="${h}" data-node`);
    expect(doc).toContain('aria-label="Map of the site"');
    expect(doc).toContain('data-sec="hero"');
    expect(text(doc)).not.toContain(',');
  });

  it('works for a missing case study or note too', async () => {
    const res = await get('/tr/isler/olmayan-proje');
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('Burası haritada yok.');
  });
});
