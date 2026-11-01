import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

/**
 * The footer on every page (layout/chrome.ts) and the mark beside the name (src/shared/logo.ts):
 * the sign-off is drawn with a pen once it shows · every link in it leads somewhere · the mark is
 * one size with the name.
 */

test.describe('footer', () => {
  test('draws the sign-off when it comes into view · not before', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/work');
    const ft = page.locator('[data-ft]');
    await expect(ft).toHaveAttribute('data-draw', 'wait');
    const corner = page.locator('.ft-mk .lc-t');
    expect(await corner.evaluate((el) => getComputedStyle(el).fillOpacity)).toBe('0');
    await page.locator('.ft-lock').scrollIntoViewIfNeeded();
    await expect(ft).toHaveAttribute('data-draw', 'go');
    // Drawn · then filled: the corner and the comma end up solid · the letters in place.
    await expect.poll(() => corner.evaluate((el) => getComputedStyle(el).fillOpacity), { timeout: 5000 }).toBe('1');
    await expect.poll(() => page.locator('.ft-mk .lc-c').evaluate((el) => getComputedStyle(el).fillOpacity), { timeout: 5000 }).toBe('1');
    await expect.poll(() => page.locator('.ft-w > span').last().evaluate((el) => getComputedStyle(el).opacity), { timeout: 5000 }).toBe('1');
    expect(errors).toEqual([]);
  });

  test('is simply there with reduced motion and without JavaScript', async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tr/studyo');
    await expect(page.locator('[data-ft]')).not.toHaveAttribute('data-draw', /./);
    expect(await page.locator('.ft-mk .lc-t').evaluate((el) => getComputedStyle(el).fillOpacity)).toBe('1');
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const plain = await ctx.newPage();
    await plain.goto('/en/notes');
    await expect(plain.locator('[data-ft]')).not.toHaveAttribute('data-draw', /./);
    expect(await plain.locator('.ft-mk .lc-t').evaluate((el) => getComputedStyle(el).fillOpacity)).toBe('1');
    await ctx.close();
  });

  test('every link leads to a page that exists', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'the same links on every device');
    for (const path of ['/tr', '/en/process']) {
      await page.goto(path);
      const hrefs = await page.locator('[data-ft] a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!.split('#')[0]!))]);
      expect(hrefs.length).toBeGreaterThan(15);
      for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
    }
  });

  test('back to top goes to the top', async ({ page }) => {
    await page.goto('/en/studio');
    await page.locator('.ft-up').scrollIntoViewIfNeeded();
    await page.locator('.ft-up').click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeLessThan(5);
  });
});

test.describe('the mark beside the name', () => {
  test('its corner is as tall as the l · the comma hangs under the baseline', async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const logo = document.querySelector('.hd .logo')!;
      const svg = logo.querySelector('svg')!.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(logo).fontSize);
      // The baseline: a zero-height inline box at the end of the name sits on it.
      const probe = document.createElement('span');
      probe.style.display = 'inline-block';
      probe.style.height = '0';
      logo.querySelector('.lc-lock')!.append(probe);
      const base = probe.getBoundingClientRect().bottom;
      probe.remove();
      return { corner: base - svg.top, l: 0.785 * size, drop: svg.bottom - base, size };
    });
    expect(Math.abs(m.corner - m.l)).toBeLessThan(1);
    expect(m.drop).toBeGreaterThan(m.size * 0.35);
  });

  test('the icons are there', async ({ request }) => {
    for (const f of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest']) expect((await request.get(f)).status(), f).toBe(200);
  });
});
