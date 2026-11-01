import { expect, test, type Page } from '@playwright/test';
import { STATIC_PAGES } from '../src/server/pages';
import { href, type RouteId } from '../src/server/routes';
import { horizontalOverflow } from './checks';

/**
 * Guards from the motion and responsive audit (phase 12):
 *  - a settled team costs nothing (no animation frames · the drift is CSS)
 *  - resting cursors keep off the words people read · cursors and bubbles stay on the page
 *  - no sideways scroll at the in-between widths the three projects do not cover
 *  - nothing jumps while a page loads
 */

/** Counts requestAnimationFrame callbacks and layout shifts from the first script on. */
async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number; __cls: number };
    w.__raf = 0;
    w.__cls = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        w.__raf++;
        cb(t);
      });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const frames = (page: Page) => page.evaluate(() => (window as unknown as { __raf: number }).__raf);
const shifts = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

/** Every resting cursor whose arrow covers small text or whose tag covers any text. */
function coveringCursors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hero = document.querySelector('[data-sec="hero"]');
    if (!hero) return [];
    const lines: { r: DOMRect; big: boolean; s: string }[] = [];
    const walk = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.nodeValue?.trim() || host.closest('.crew,[aria-hidden="true"]')) continue;
      if (!host.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const big = parseFloat(getComputedStyle(host).fontSize) >= 40;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) lines.push({ r, big, s: n.nodeValue.trim().slice(0, 24) });
    }
    const hit = (a: DOMRect, b: DOMRect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const out: string[] = [];
    for (const c of document.querySelectorAll<HTMLElement>('.cur.drifting[data-cur]')) {
      const arw = c.querySelector('.arw')!.getBoundingClientRect();
      const tag = c.querySelector('.tag')!.getBoundingClientRect();
      // A few pixels of the drift are fine: the spot is chosen with the drift in mind.
      for (const l of lines) if (hit(tag, l.r) > 30 || (!l.big && hit(arw, l.r) > 30)) out.push(`${c.dataset.cur} on "${l.s}"`);
    }
    return out;
  });
}

/** Cursors (arrow · tag · open bubble) that stick out of the page sideways. */
function cursorsOffPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const c of document.querySelectorAll<HTMLElement>('.cur[data-cur]:not(.zz)')) {
      const parts = [c.querySelector('.arw'), c.querySelector('.tag'), c.classList.contains('say') ? c.querySelector('.bub') : null];
      for (const p of parts) {
        if (!p) continue;
        const r = p.getBoundingClientRect();
        if (r.left < -1 || r.right > vw + 1) out.push(`${c.dataset.cur} ${p.className} ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    return out;
  });
}

test.describe('motion · cursors', () => {
  test('a settled team stops the animation loop · the drift runs in CSS', async ({ page }) => {
    await instrument(page);
    await page.goto('/en/uses');
    // The stub's host says one line in the hero and then everyone rests.
    await expect.poll(() => page.locator('.cur.drifting').count(), { timeout: 12_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(3000);
    const before = await frames(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(before);
    // Still alive: the resting drift is a CSS animation on the compositor.
    const drift = await page.evaluate(() => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'cur-dx').length);
    expect(drift).toBeGreaterThan(0);
    // A scroll wakes the loop up again.
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect.poll(() => frames(page), { timeout: 3000 }).toBeGreaterThan(before);
  });

  for (const id of ['uses', 'start', 'lab', 'studio', 'process', 'services'] as RouteId[]) {
    test(`resting cursors keep off the words · and stay on the page: ${id}`, async ({ page }) => {
      await page.goto(href('en', id));
      await page.waitForTimeout(6500);
      expect(await coveringCursors(page)).toEqual([]);
      expect(await cursorsOffPage(page)).toEqual([]);
    });
  }
});

test.describe('responsive · in-between widths', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'one sweep is enough');
  const pages = [...(Object.keys(STATIC_PAGES) as RouteId[]).map((id) => href('en', id)), '/tr', '/tr/hizmetler/web-siteleri', '/en/work/sailing-club', '/en/notes/how-our-cursors-move', '/tr/yok-boyle-bir-sayfa'];
  for (const width of [320, 600, 834, 1180, 2560]) {
    test(`no sideways scroll at ${width} px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      const wide: string[] = [];
      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const over = await horizontalOverflow(page);
        if (over > 0) wide.push(`${path} +${over}px`);
      }
      expect(wide).toEqual([]);
    });
  }
});

test.describe('nothing jumps while a page loads', () => {
  for (const path of ['/en/services/websites', '/tr/hizmetler/web-siteleri', '/en', '/en/process']) {
    test(path, async ({ page }) => {
      await instrument(page);
      await page.goto(path);
      // Before the hero scenes start (the websites frame reflows on purpose once code drags it).
      await page.waitForTimeout(2200);
      expect(await shifts(page)).toBeLessThan(0.02);
    });
  }

  test('a scaled down frame keeps its tools at a size a thumb can use', async ({ page }) => {
    await page.goto('/en');
    const b = await page.locator('[data-inspb]').boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(24);
    const fs = await page.locator('[data-inspb]').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return parseFloat(getComputedStyle(el).fontSize) * (r.height / (el as HTMLElement).offsetHeight);
    });
    expect(fs).toBeGreaterThanOrEqual(10.5);
  });
});
