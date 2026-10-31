import { expect, test } from '@playwright/test';
import { SERVICE_KEYS, SERVICE_SLUGS } from '../src/server/content/services';
import { STATIC_PAGES } from '../src/server/pages';
import { href, type RouteId } from '../src/server/routes';
import { axeProblems, fontsReady, horizontalOverflow, visibleCommas, watchErrors } from './checks';

const cases = [
  ...(Object.keys(STATIC_PAGES) as RouteId[]).flatMap((id) => (['tr', 'en'] as const).map((lang) => ({ path: href(lang, id), status: 200 }))),
  // Service pages in both languages.
  ...SERVICE_KEYS.flatMap((k) => (['tr', 'en'] as const).map((lang) => ({ path: href(lang, 'service', { slug: SERVICE_SLUGS[k][lang] }), status: 200 }))),
  { path: '/en/services/nope', status: 404 },
  // Case studies: the full sample in both languages and a short one.
  { path: '/tr/isler/yelken-kulubu', status: 200 },
  { path: '/en/work/sailing-club', status: 200 },
  { path: '/en/work/ferry-timetable', status: 200 },
  { path: '/tr/yok-boyle-bir-sayfa', status: 404 },
  { path: '/en/no-such-page', status: 404 },
];

for (const { path, status } of cases) {
  test(`page ${path}`, async ({ page }, info) => {
    const errors = watchErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(status);
    await page.waitForLoadState('networkidle');

    expect(await fontsReady(page), 'fonts').toBe(true);
    expect(await visibleCommas(page), 'comma rule').toEqual([]);
    expect(await horizontalOverflow(page), 'horizontal overflow').toBeLessThanOrEqual(0);
    expect(await axeProblems(page), 'axe').toEqual([]);
    expect(errors, 'console').toEqual([]);

    const name = path.replace(/^\//, '').replace(/\//g, '_');
    await page.screenshot({ path: `e2e/shots/${info.project.name}/${name}.png`, fullPage: true });
  });
}
