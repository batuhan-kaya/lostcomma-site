import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const visibleCursors = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.crew [data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur));

const toSection = (page: Page, sec: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(`[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY);
  }, sec);

const firstRow = (page: Page) => page.locator('.row:not(.off) .rn > span:first-child').first();

test.describe('Work · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('the eye hides a group · the count follows · all hidden shows the empty state', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/work');
    await page.locator('[data-gr="web"]').click();
    await expect(page.locator('[data-gr="web"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-count]')).toHaveText('9');
    await expect(page.locator('[data-vis]')).toHaveText('9 visible');
    await expect(page.locator('.row[data-g="web"]').first()).toHaveClass(/off/);
    await expect(firstRow(page)).toHaveText('Museum audio guide');
    for (const g of ['app', 'identity', 'motion']) await page.locator(`[data-gr="${g}"]`).click();
    await expect(page.locator('[data-empty]')).toBeVisible();
    await expect(page.locator('[data-rows]')).toBeHidden();
    await page.getByRole('button', { name: 'Show all layers' }).click();
    await expect(page.locator('[data-count]')).toHaveText('14');
    await expect(page.locator('[data-rows]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('canvas view and A–Z sort', async ({ page }) => {
    await page.goto('/en/work');
    await page.locator('[data-view="canvas"]').click();
    await expect(page.locator('[data-grid]')).toBeVisible();
    await expect(page.locator('[data-rows]')).toBeHidden();
    await expect(page.locator('.cell').first().locator('.cn')).toHaveText('Climate data platform');
    await page.locator('[data-sort="az"]').click();
    await expect(page.locator('[data-sort="az"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.cell').first().locator('.cn')).toHaveText('Architecture office');
    await page.locator('[data-view="layers"]').click();
    await expect(firstRow(page)).toHaveText('Architecture office');
    await page.locator('[data-sort="new"]').click();
    await expect(firstRow(page)).toHaveText('Climate data platform');
  });

  test('hovering a layer pulls its frame along', async ({ page }) => {
    await page.goto('/en/work');
    await toSection(page, 'list');
    const row = page.locator('.row[data-i="2"] .rw');
    await row.hover();
    await expect(page.locator('[data-pv]')).toHaveClass(/on/);
    await expect(page.locator('[data-pvname]')).toHaveText('Sailing club');
    await expect(page.locator('[data-pvsize]')).toHaveText('1440 × 900');
    await expect(page.locator('[data-pa="2"]')).toHaveClass(/on/);
    await page.mouse.move(5, 5);
    await expect(page.locator('[data-pv]')).not.toHaveClass(/on/);
  });

  test('a locked layer only answers in person', async ({ page }) => {
    await page.goto('/tr/isler');
    const lock = page.locator('[data-knock]').first();
    await lock.click();
    await expect(lock).toHaveClass(/kn/);
    await expect(lock.locator('.msg > span').last()).toHaveText('Kahvede sor');
  });

  test('a layer opens its case study', async ({ page }) => {
    await page.goto('/tr/isler');
    await page.locator('.row[data-i="2"] .rw').click();
    await expect(page).toHaveURL(/\/tr\/isler\/yelken-kulubu$/);
    await expect(page.locator('h1')).toHaveText('Yelken kulübü');
  });

  test('below the hero there is never more than one team cursor', async ({ page }) => {
    await page.goto('/en/work');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toHaveLength(3);
    for (const sec of ['list', 'lock', 'ask']) {
      await toSection(page, sec);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 5; i++) {
        expect((await visibleCursors(page)).length, sec).toBeLessThanOrEqual(1);
        await page.waitForTimeout(400);
      }
    }
  });
});

test.describe('Work · touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch devices');

  test('the groups still filter and no frame follows a finger', async ({ page }) => {
    await page.goto('/en/work');
    await page.locator('[data-gr="motion"]').tap();
    await expect(page.locator('[data-count]')).toHaveText('11');
    await expect(page.locator('[data-pv]')).toBeHidden();
  });
});
