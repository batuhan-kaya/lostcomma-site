import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

/**
 * The preloader (layout/intro.ts · src/client/lib/intro.ts). The shared e2e server runs with
 * PRELOADER=off (every page.goto arrives "from outside") · this file starts its own with it on.
 */
let server: ChildProcess | null = null;
let base = '';

test.beforeAll(async ({}, info) => {
  const port = 3260 + info.workerIndex;
  base = `http://127.0.0.1:${port}`;
  server = spawn('node', ['dist/server/index.js'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production', SITE_URL: base, DATA_DIR: `test-results/data-intro-${port}`, DATABASE_URL: 'memory://', SEED: 'sample', PRELOADER: 'on' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('the preloader server did not start');
});

test.afterAll(() => {
  server?.kill();
});

test.describe('preloader', () => {
  test('arriving from outside: the comma is found · the mark lands on the logo · the page is free', async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto(`${base}/en`);
    const box = page.locator('[data-intro]');
    await expect(box).toBeVisible();
    await expect(box).toHaveClass(/go/);
    // The comma is carried in (from 1.236 s) and settles under the corner. It stays until the mark
    // has landed (about 3.4 s) · a busy machine starts CSS animations a little late.
    await expect.poll(() => page.locator('.lci-cm').evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000, intervals: [100] }).toBe('1');
    await expect(box).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('.hd .lc-mark')).toBeVisible();
    // The team starts after it: born from the header avatars (pointer devices).
    if (info.project.name === 'desktop') await expect(page.locator('.crew .cur').first()).toBeVisible({ timeout: 4000 });
    // Nothing moved under it.
    const cls = await page.evaluate(
      () =>
        new Promise<number>((done) => {
          let v = 0;
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) v += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => done(v), 200);
        }),
    );
    expect(cls).toBeLessThan(0.02);
    expect(errors).toEqual([]);
  });

  test('a page reached from our own pages has none', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the header links are in the menu on smaller screens');
    await page.goto(`${base}/en`);
    await expect(page.locator('[data-intro]')).toHaveCount(0, { timeout: 4000 });
    await page.locator('.hd .lk').first().click();
    await page.waitForURL('**/en/work');
    expect(await page.locator('[data-intro]').count()).toBe(0);
  });

  test('a click lets you in at once', async ({ page }) => {
    await page.goto(`${base}/tr/studyo`);
    const box = page.locator('[data-intro]');
    await expect(box).toHaveClass(/go/);
    await box.click({ position: { x: 20, y: 20 } });
    await expect(box).toHaveCount(0, { timeout: 900 });
  });

  test('reduced motion and no JavaScript: the page as it is', async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/en/notes`);
    await expect(page.locator('[data-intro]')).toHaveCount(0);
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const plain = await ctx.newPage();
    await plain.goto(`${base}/en/notes`);
    // Drawn by the server · never shown without a script to take it away.
    await expect(plain.locator('[data-intro]')).toHaveCount(1);
    await expect(plain.locator('[data-intro]')).toBeHidden();
    await ctx.close();
  });
});
