import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const visibleCursors = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.crew [data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur));

const toSection = (page: Page, sec: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(`[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY);
  }, sec);

test.describe('Case · the version history', () => {
  test('pick a version · scrub · play', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/work/sailing-club');
    await toSection(page, 'hist');
    const frame = page.locator('[data-fr]');
    await expect(frame).toHaveClass(/vs-5/);
    await page.getByRole('button', { name: /First sketch/ }).click();
    await expect(frame).toHaveClass(/vs-0/);
    await expect(frame).toHaveAttribute('aria-label', 'Sailing club · v0.1 · First sketch');
    await expect(page.locator('[data-curs]')).toHaveText('Pen on paper. One big sunset and a booking button you cannot miss.');
    await expect(page.locator('[data-curwho]')).toHaveText('design · v0.1');
    await expect(page.locator('section[data-sec="hist"]')).toHaveAttribute('data-host', 'design');
    await page.locator('[data-rng]').fill('3');
    await expect(frame).toHaveClass(/vs-3/);
    await expect(page.locator('section[data-sec="hist"]')).toHaveAttribute('data-host', 'code');
    await expect(page.locator('[data-v="3"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-play]').click();
    await expect(page.locator('[data-play]')).toHaveAttribute('aria-pressed', 'true');
    await expect(frame).toHaveClass(/vs-4/, { timeout: 4000 });
    await expect(frame).toHaveClass(/vs-5/, { timeout: 4000 });
    await expect(page.locator('[data-play]')).toHaveAttribute('aria-pressed', 'false', { timeout: 4000 });
    expect(errors).toEqual([]);
  });

  test('a swatch copies its colour', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tr/isler/yelken-kulubu');
    await toSection(page, 'dets');
    const sw = page.locator('.swb[data-hex="#1C3564"]');
    await sw.click();
    await expect(sw).toHaveClass(/cp/);
    await expect(page.locator('[data-copied]')).toHaveText('#1C3564 kopyalandı');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#1C3564');
  });

  test('the next layer leads on and the language switch keeps the project', async ({ page }) => {
    await page.goto('/en/work/sailing-club');
    await page.locator('.hd a.lg[hreflang="tr"]').click();
    await expect(page).toHaveURL(/\/tr\/isler\/yelken-kulubu$/);
    await page.locator('a.nx').click();
    await expect(page).toHaveURL(/\/tr\/isler\/urun-lansman-filmi$/);
    await expect(page.locator('h1')).toHaveText('Ürün lansman filmi');
  });
});

test.describe('Case · desktop cursors', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('the teammate who made a version hosts the history · never more than one below the hero', async ({ page }) => {
    await page.goto('/en/work/sailing-club');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toHaveLength(3);
    await toSection(page, 'hist');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toEqual(['code']);
    await page.getByRole('button', { name: /Look and motion/ }).click();
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toEqual(['motion']);
    for (const sec of ['brief', 'dets', 'res', 'cred']) {
      await toSection(page, sec);
      await page.waitForTimeout(1000);
      expect((await visibleCursors(page)).length, sec).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('Case · without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('reads as the finished project', async ({ page }) => {
    await page.goto('/en/work/sailing-club');
    await expect(page.locator('[data-fr]')).toHaveClass(/vs-5/);
    await expect(page.locator('[data-curs]')).toHaveText('The same engine in your pocket. Pick a boat and a time and you are done.');
    await expect(page.locator('.vi.on b')).toHaveText('Booking app');
  });
});
