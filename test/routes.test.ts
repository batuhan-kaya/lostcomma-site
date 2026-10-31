import { describe, expect, it } from 'vitest';
import { href, isStatic, ROUTES, type RouteId } from '../src/server/routes';

const ids = Object.keys(ROUTES) as RouteId[];

describe('routes', () => {
  it('every route lives under its language prefix', () => {
    for (const id of ids) {
      expect(ROUTES[id].tr === '/tr' || ROUTES[id].tr.startsWith('/tr/')).toBe(true);
      expect(ROUTES[id].en === '/en' || ROUTES[id].en.startsWith('/en/')).toBe(true);
    }
  });

  it('paths are unique', () => {
    const all = ids.flatMap((id) => [ROUTES[id].tr, ROUTES[id].en]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('paths are lowercase ASCII without trailing slash', () => {
    for (const id of ids) for (const p of [ROUTES[id].tr, ROUTES[id].en]) expect(p).toMatch(/^\/[a-z0-9/:.-]*[a-z0-9]$/);
  });

  it('both languages take the same params', () => {
    const params = (p: string) => (p.match(/:\w+/g) ?? []).sort().join();
    for (const id of ids) expect(params(ROUTES[id].tr)).toBe(params(ROUTES[id].en));
  });

  it('href fills and encodes params', () => {
    expect(href('en', 'work')).toBe('/en/work');
    expect(href('tr', 'case', { slug: 'yelken kulübü' })).toBe('/tr/isler/yelken%20kul%C3%BCb%C3%BC');
    expect(() => href('tr', 'case')).toThrow(/slug/);
  });

  it('knows static routes', () => {
    expect(isStatic('work')).toBe(true);
    expect(isStatic('note')).toBe(false);
  });
});
