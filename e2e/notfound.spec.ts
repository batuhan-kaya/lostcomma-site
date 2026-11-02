import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

test.describe('404 map', () => {
  test('points at the closest page · a star shows its own distance · leaving goes back', async ({ page }, info) => {
    const errors = watchErrors(page);
    const res = await page.goto('/en/servces');
    expect(res?.status()).toBe(404);
    const label = page.locator('[data-rlabel]');
    const dist = page.locator('[data-rd]');
    await expect(label).toHaveText('Services');
    await expect(dist).toHaveText('1 letter away');
    await expect(page.locator('.me')).toBeVisible();

    const lab = page.locator('[data-node][href="/en/lab"]');
    if (info.project.name === 'desktop') {
      await lab.hover();
    } else {
      await lab.focus();
    }
    await expect(page.locator('[data-rk]')).toHaveText('This page');
    await expect(label).toHaveText('Lab');
    await expect(dist).toHaveText(/^\d+ letters away$/);
    await expect(page.locator('[data-rname]')).toHaveAttribute('href', '/en/lab');
    await expect(page.locator('[data-route]')).toHaveAttribute('d', /L-?\d/);

    if (info.project.name === 'desktop') await page.mouse.move(10, 880);
    else await lab.blur();
    await expect(label).toHaveText('Services');
    await expect(page.locator('[data-rname]')).toHaveAttribute('href', '/en/services');
    expect(errors).toEqual([]);
  });

  test('every star is a link you can reach with the keyboard', async ({ page }) => {
    await page.goto('/tr/hizmetlr');
    const stars = page.locator('[data-node]');
    expect(await stars.count()).toBeGreaterThanOrEqual(8);
    await page.locator('[data-node][href="/tr/hizmetler"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tr\/hizmetler$/);
  });

  test('undo does not bring it back', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'a keyboard shortcut');
    await page.goto('/en/nowhere');
    await page.keyboard.press('Control+z');
    await expect(page.locator('.cur.c-code.say .bub')).toHaveText('cannot undo · it never existed');
  });
});
