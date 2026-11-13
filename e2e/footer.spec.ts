import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

/**
 * The footer on every page (layout/chrome.ts) and the mark beside the name (src/shared/logo.ts):
 * the sign-off ends on a comma that is typed once it shows · every link in it leads somewhere ·
 * the mark is one size with the name.
 */

test.describe('footer', () => {
  test('types the comma when the last line comes into view · not before', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/work');
    const ft = page.locator('[data-ft]');
    await expect(ft).toHaveAttribute('data-draw', 'wait');
    const comma = page.locator('.ft-cm');
    const caret = page.locator('.ft-caret');
    expect(await comma.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    expect(await caret.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await expect(page.locator('.ft-say')).toHaveText('To be continued');
    const box = await page.locator('.ft-line').evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // A click at the end of the line (the caret) · then the comma.
    await expect(ft).toHaveAttribute('data-draw', 'go', { timeout: 6000 });
    await expect.poll(() => comma.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe('1');
    // The caret stands after the comma and blinks on.
    const at = await page.evaluate(() => {
      const c = document.querySelector('.ft-cm')!.getBoundingClientRect();
      const k = document.querySelector('.ft-caret')!.getBoundingClientRect();
      const s = document.querySelector('.ft-say')!.getBoundingClientRect();
      return { say: s.right, comma: c.left, commaEnd: c.right, caret: k.left, hang: c.bottom - s.bottom };
    });
    expect(at.comma).toBeGreaterThanOrEqual(at.say);
    expect(at.caret).toBeGreaterThanOrEqual(at.commaEnd);
    // Nothing moved while it was typed: the line is as wide and as tall as before.
    const after = await page.locator('.ft-line').evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    expect(after.width).toBe(box.width);
    expect(after.height).toBe(box.height);
    // One line on every screen.
    expect(await page.evaluate(() => document.querySelector('.ft-caret')!.getBoundingClientRect().right)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    expect(errors).toEqual([]);
  });

  test('the comma is a drawing: the page ends on it and the copy still has none', async ({ page }) => {
    await page.goto('/tr/studyo');
    await expect(page.locator('.ft-say')).toHaveText('Devamı var');
    expect(await page.locator('.ft-line').innerText()).not.toContain(',');
    await expect(page.locator('.ft-cm')).toHaveAttribute('aria-hidden', 'true');
    // It hangs under the baseline like a comma does.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('[data-ft]')).toHaveAttribute('data-draw', 'go', { timeout: 6000 });
    const m = await page.evaluate(() => {
      const line = document.querySelector('.ft-line')!;
      const probe = document.createElement('span');
      probe.style.display = 'inline-block';
      line.append(probe);
      const base = probe.getBoundingClientRect().bottom;
      probe.remove();
      const c = document.querySelector('.ft-cm')!.getBoundingClientRect();
      return { above: base - c.top, below: c.bottom - base };
    });
    expect(m.above).toBeGreaterThan(0);
    expect(m.below).toBeGreaterThan(m.above);
  });

  test('is simply there with reduced motion and without JavaScript', async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tr/studyo');
    await expect(page.locator('[data-ft]')).not.toHaveAttribute('data-draw', /./);
    expect(await page.locator('.ft-cm').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await page.locator('.ft-caret').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const plain = await ctx.newPage();
    await plain.goto('/en/notes');
    await expect(plain.locator('[data-ft]')).not.toHaveAttribute('data-draw', /./);
    expect(await plain.locator('.ft-cm').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
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
