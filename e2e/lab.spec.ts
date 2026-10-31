import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const tile = (page: Page, key: string) => page.locator(`[data-exp="${key}"]`);
const toTiles = (page: Page) => page.evaluate(() => document.querySelector('[data-tiles]')!.scrollIntoView());

test.describe('Lab', () => {
  test('specimens only run on screen · each one shows what a frame costs', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/lab');
    await expect(page.locator('[data-runt]')).toHaveText(/ms per frame$/);
    await toTiles(page);
    await expect(tile(page, 'breathe')).toHaveAttribute('data-run', 'on');
    await expect(tile(page, 'breathe').locator('[data-st]')).toHaveText('running');
    await expect(tile(page, 'rain').locator('[data-cost]')).toHaveText(/ · \d+\.\d ms/);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(tile(page, 'breathe')).toHaveAttribute('data-run', 'off');
    await expect(tile(page, 'breathe').locator('[data-st]')).toHaveText('off screen');
    expect(errors).toEqual([]);
  });

  test('pause all stops everything · play all starts it again', async ({ page }) => {
    await page.goto('/en/lab');
    const pause = page.locator('[data-pause]');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(pause).toHaveText('Play all');
    await expect(page.locator('[data-runt]')).toHaveText('Everything paused');
    await toTiles(page);
    await expect(tile(page, 'breathe')).toHaveAttribute('data-run', 'paused');
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause.click();
    await expect(page.locator('[data-runt]')).toHaveText(/ms per frame$/);
  });

  test('reduced motion starts paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tr/lab');
    await expect(page.locator('[data-pause]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-runt]')).toHaveText('Hepsi durdu');
  });

  test('filters · open one big · the word keeps the comma rule', async ({ page }) => {
    await page.goto('/en/lab');
    await toTiles(page);
    await page.locator('[data-filt="pixels"]').click();
    await expect(page.locator('[data-exp]:not([hidden])')).toHaveCount(1);
    await expect(page.locator('[data-exp]:not([hidden]) h3')).toHaveText('Dither sun');
    await page.locator('[data-filt="all"]').click();
    await expect(page.locator('[data-exp]:not([hidden])')).toHaveCount(6);
    const open = tile(page, 'rain').locator('[data-open]');
    await open.click();
    await expect(tile(page, 'rain')).toHaveClass(/\bbig\b/);
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await expect(open).toHaveText('Close');
    const word = page.locator('[data-word]');
    await word.fill('a,b,c');
    await expect(word).toHaveValue('abc');
    await expect(page.locator('[data-br]')).toHaveText('abc');
  });

  test('the script stays inside its budget', async ({ page }) => {
    const sizes: number[] = [];
    page.on('response', async (r) => {
      if (r.url().endsWith('.js')) sizes.push((await r.body()).length);
    });
    await page.goto('/en/lab');
    await page.waitForLoadState('networkidle');
    // Shared app code plus the Lab: comfortably under 64 kb before compression.
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan(64_000);
  });
});

test.describe('loops (SEED=demo gives one motion project a loop)', () => {
  test('a loop plays on screen · pauses away from it · a tap pauses it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/motion');
    const video = page.locator('video[data-loopv]').first();
    await expect(video).toHaveJSProperty('paused', true);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0), { timeout: 8000 }).toBe(true);
    await page.locator('[data-loop]').filter({ has: video }).click();
    await expect(video).toHaveJSProperty('paused', true);
    await page.locator('[data-loop]').filter({ has: video }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(video).toHaveJSProperty('paused', true);
    expect(errors).toEqual([]);
  });

  test('reduced motion: the poster waits until you ask', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/services/motion');
    const video = page.locator('video[data-loopv]').first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await expect(video).toHaveJSProperty('paused', true);
    await page.locator('[data-loop]').filter({ has: video }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  });

  test('the homepage motion frame plays the loop only while motion is picked', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');
    const video = page.locator('.fc-vid video');
    await page.locator('section.svc').scrollIntoViewIfNeeded();
    await expect(video).toHaveJSProperty('paused', true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/en');
    await page.locator('section.svc').scrollIntoViewIfNeeded();
    await page.locator('[data-opt="3"]').click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 8000 }).toBe(true);
    await page.locator('[data-opt="0"]').click();
    await expect(video).toHaveJSProperty('paused', true);
  });
});
