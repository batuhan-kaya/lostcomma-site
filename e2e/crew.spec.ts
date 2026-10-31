import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

/** Names of the team cursors that are actually visible. */
function visible(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur ?? ''),
  );
}

/** Where each visible cursor's arrow tip is in page coordinates. */
function positions(page: Page): Promise<Record<string, { x: number; y: number }>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('[data-cur]')]
        .filter((e) => Number(getComputedStyle(e).opacity) > 0.5)
        .map((e) => {
          const r = e.getBoundingClientRect();
          return [e.dataset.cur, { x: r.left + scrollX, y: r.top + scrollY }];
        }),
    ),
  );
}

function band(page: Page, sec: string) {
  return page.evaluate((s) => {
    const r = document.querySelector(`[data-sec="${s}"]`)!.getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  }, sec);
}

async function scrollTo(page: Page, sec: string) {
  await page.evaluate((s) => {
    const el = document.querySelector(`[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 120);
  }, sec);
}

test.describe('team cursors · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices only');

  test('the whole team is in the hero · one host below it · team again on the way back', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/lab');
    await expect.poll(() => visible(page), { timeout: 5000 }).toEqual(['design', 'code', 'motion']);
    const hero = await band(page, 'hero');
    for (const p of Object.values(await positions(page))) expect(p.y).toBeLessThan(hero.bottom);
    await expect(page.locator('[data-cur] .tag')).toHaveText(['design', 'code', 'motion']);

    await scrollTo(page, 'plan');
    // Lab is hosted by motion.
    await expect.poll(() => visible(page), { timeout: 5000 }).toEqual(['motion']);
    const plan = await band(page, 'plan');
    await expect
      .poll(async () => {
        const p = (await positions(page)).motion;
        return !!p && p.y > plan.top && p.y < plan.bottom;
      }, { timeout: 5000 })
      .toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => visible(page), { timeout: 5000 }).toEqual(['design', 'code', 'motion']);
    expect(errors).toEqual([]);
  });

  test('cursors are born from the header avatars', async ({ page }) => {
    // Record where the design cursor is on the frame it first becomes visible.
    await page.addInitScript(() => {
      const w = window as unknown as { __born?: { x: number; y: number } };
      new MutationObserver((list, obs) => {
        for (const m of list) {
          const el = m.target as HTMLElement;
          if (el.dataset?.cur === 'design' && !el.classList.contains('zz')) {
            const r = el.getBoundingClientRect();
            w.__born = { x: r.left, y: r.top };
            obs.disconnect();
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    await page.goto('/en/uses');
    const av = await page.locator('[data-av="design"]').boundingBox();
    const born = await page.waitForFunction(() => (window as unknown as { __born?: { x: number; y: number } }).__born, null, { timeout: 4000 });
    const p = (await born.jsonValue()) as { x: number; y: number };
    expect(Math.hypot(p.x - (av!.x + av!.width / 2), p.y - (av!.y + av!.height / 2))).toBeLessThan(8);
  });

  test('cursors settle next to their anchors', async ({ page }) => {
    await page.goto('/en/uses');
    await page.waitForTimeout(4500);
    const h1 = await page.locator('h1').boundingBox();
    const p = (await positions(page)).design!;
    expect(p.y).toBeGreaterThan(h1!.y);
    expect(p.y).toBeLessThan(h1!.y + h1!.height + 20);
  });

  test('the host says one line in the hero of a stub', async ({ page }) => {
    await page.goto('/en/uses');
    await expect(page.locator('.cur.say .bub')).toHaveText('Still under construction', { timeout: 6000 });
  });

  test('the "you" tag follows the mouse in the hero only', async ({ page }) => {
    await page.goto('/tr/araclar');
    await page.mouse.move(900, 300);
    await page.mouse.move(920, 320);
    const you = page.locator('[data-you]');
    await expect(you).toHaveClass(/on/);
    await expect(you).toHaveText('sen');
    await scrollTo(page, 'plan');
    await page.mouse.move(900, 400);
    await expect(you).not.toHaveClass(/on/, { timeout: 4000 });
  });

  test('reduced motion: no flying · no drift · no scenes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/uses');
    await expect.poll(() => visible(page), { timeout: 3000 }).toEqual(['design', 'code', 'motion']);
    const a = await positions(page);
    await page.waitForTimeout(1200);
    expect(await positions(page)).toEqual(a);
    await page.waitForTimeout(3000);
    await expect(page.locator('.cur.say')).toHaveCount(0);
  });

  test('cursors are decoration: hidden from assistive tech and never focusable', async ({ page }) => {
    await page.goto('/en/notes');
    await expect(page.locator('.crew')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.crew :is(a,button,input,[tabindex])')).toHaveCount(0);
    await expect(page.locator('.crew')).toHaveCSS('pointer-events', 'none');
  });
});

test.describe('team cursors · touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch devices only');

  test('team in the hero · nobody below it · no "you" tag', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/lab');
    await expect.poll(() => visible(page), { timeout: 5000 }).toEqual(['design', 'code', 'motion']);
    await expect(page.locator('.crew')).toHaveClass(/touch/);
    await scrollTo(page, 'plan');
    await expect.poll(() => visible(page), { timeout: 5000 }).toEqual([]);
    await expect(page.locator('[data-you]')).not.toHaveClass(/on/);
    expect(errors).toEqual([]);
  });

  test('the open menu hides the cursors', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone' && info.project.name !== 'tablet', 'menu exists below 1100 px');
    await page.goto('/en/now');
    await page.locator('summary.mb').click();
    await expect(page.locator('.crew')).toHaveCSS('opacity', '0');
  });
});
