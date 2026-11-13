import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

/**
 * The footer on every page (layout/chrome.ts) and the mark beside the name (src/shared/logo.ts):
 * the sign-off is the logo · the team · the way back up · every link in it
 * leads somewhere · the mark is one size with the name.
 */

test.describe('footer', () => {
  test('signs off with the logo · the team and a place for you · the way back up', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/work');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const base = page.locator('.ft-base');
    await expect(base.locator('.ft-logo')).toHaveAttribute('href', '/en');
    await expect(base.locator('.ft-team .av')).toHaveText(['D', 'C', 'M', 'Y']);
    await expect(base.locator('.ft-team p')).toHaveText('Three of us · you are the fourth');
    // The logo is two plain words: nothing between them · nothing blinks.
    await expect(base.locator('.ft-logo .lc-lock')).toHaveText('lost comma');
    expect(await page.locator('.hd .logo .lc-lock > *').count()).toBe(3);
    await expect(base.locator('.ft-up')).toHaveAttribute('href', '#top');
    // Nothing waits for a script or an animation: it is simply there · and fits the screen.
    expect(await base.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    expect(errors).toEqual([]);
  });

  test('is the same without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const plain = await ctx.newPage();
    await plain.goto('/tr/notes');
    await expect(plain.locator('.ft-team p')).toHaveText('Üç kişiyiz · dördüncü sensin');
    await expect(plain.locator('.ft-up')).toBeVisible();
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
