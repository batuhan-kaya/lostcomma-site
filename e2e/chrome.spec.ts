import { expect, test } from '@playwright/test';
import { watchErrors } from './checks';

test.describe('language switch', () => {
  test('rolls the labels and lands on the same page in the other language', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'header nav is hidden on phones');
    const errors = watchErrors(page);
    await page.goto('/tr/isler');
    await page.locator('.lang a[data-lang="en"]').click();
    await expect(page.locator('html')).toHaveClass(/rolling/);
    await page.waitForURL('**/en/work');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.lk.act')).toContainText('Work');
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'lang')?.value).toBe('en');
    expect(errors).toEqual([]);
  });

  test('the cookie decides where / goes next time', async ({ page }) => {
    await page.goto('/en/work');
    await page.locator('.lang a[data-lang="tr"]').click();
    await page.waitForURL('**/tr/isler');
    await page.goto('/');
    await expect(page).toHaveURL(/\/tr$/);
  });

  test('navigates at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/studio');
    await page.locator('.lang a[data-lang="tr"]').click();
    await page.waitForURL('**/tr/studyo', { timeout: 400 });
  });
});

test.describe('mobile menu', () => {
  test('opens · closes with Escape · links work', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'desktop shows the full nav');
    await page.goto('/en/notes');
    await expect(page.locator('.links')).toBeHidden();
    const button = page.locator('summary.mb');
    await button.click();
    const sheet = page.locator('.menu .sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('a[aria-current]')).toHaveText('Notes');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await button.click();
    await sheet.getByText('Lab', { exact: true }).click();
    await expect(page).toHaveURL(/\/en\/lab$/);
  });
});

test('skip link jumps to the main content', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard check once is enough');
  await page.goto('/en/process');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('next band takes you to the next page', async ({ page }) => {
  await page.goto('/en/now');
  await page.locator('a.nx').click();
  await expect(page).toHaveURL(/\/en\/uses$/);
});
