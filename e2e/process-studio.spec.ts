import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const visibleCursors = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.crew [data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur));

const toSection = (page: Page, sec: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(`section[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 80);
  }, sec);

const setRange = (page: Page, sel: string, v: number) =>
  page.locator(sel).evaluate((el, value) => {
    (el as HTMLInputElement).value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

test.describe('Process · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('the ruler is a slider: Home · End · page keys · arrows', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/process');
    const tc = page.locator('[data-tc]');
    await expect(tc).toHaveText('W05 · D3 · Design');
    const rul = page.locator('[data-rul]');
    await rul.focus();
    await page.keyboard.press('Home');
    await expect(tc).toHaveText('W01 · D1 · Kickoff');
    await expect(page.locator('[data-in]')).toHaveText('Kickoff');
    await expect(page.locator('[data-ph="0"]')).toHaveClass(/\bon\b/);
    await expect(page.locator('[data-iwho] .av')).toHaveText(['D', 'C', 'Y']);
    await page.keyboard.press('PageUp');
    await page.keyboard.press('ArrowRight');
    await expect(tc).toHaveText('W02 · D2 · Shape');
    await page.keyboard.press('End');
    await expect(tc).toHaveText('W10 · D5 · Launch');
    await expect(rul).toHaveAttribute('aria-valuetext', 'W10 · D5 · Launch');
    // Launch week: you · motion · code are still on their last clip (design wrapped up in week 9).
    await expect(page.locator('.clip.on')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('a clip jumps · the week buttons step · dragging scrubs', async ({ page }) => {
    await page.goto('/en/process');
    await page.getByRole('button', { name: 'Code · Build' }).click();
    await expect(page.locator('[data-tc]')).toHaveText('W06 · D1 · Build');
    await expect(page.locator('[data-ihap]')).toHaveText('We build it for real. The preview link updates every evening.');
    await page.locator('[data-next]').click();
    await expect(page.locator('[data-tc]')).toHaveText('W07 · D1 · Build');
    await page.locator('[data-prev]').click();
    await page.locator('[data-prev]').click();
    await expect(page.locator('[data-tc]')).toHaveText('W05 · D1 · Design');

    const rul = (await page.locator('[data-rul]').boundingBox())!;
    await page.mouse.move(rul.x + rul.width * 0.05, rul.y + rul.height / 2);
    await page.mouse.down();
    await page.mouse.move(rul.x + rul.width * 0.55, rul.y + rul.height / 2, { steps: 6 });
    await page.mouse.move(rul.x + rul.width * 0.925, rul.y + rul.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('[data-tc]')).toHaveText(/^W10 · D\d · Launch$/);
  });

  test('play runs the weeks · pause stops them', async ({ page }) => {
    await page.goto('/en/process');
    await page.locator('[data-rul]').focus();
    await page.keyboard.press('Home');
    const play = page.locator('[data-play]');
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tc]')).toHaveText(/^W0[2-9]/, { timeout: 6000 });
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    const at = await page.locator('[data-tc]').textContent();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-tc]')).toHaveText(at!);
  });

  test('below the hero there is never more than one team cursor', async ({ page }) => {
    await page.goto('/en/process');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toHaveLength(3);
    for (const sec of ['week', 'rules', 'after']) {
      await toSection(page, sec);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 4; i++) {
        expect((await visibleCursors(page)).length, sec).toBeLessThanOrEqual(1);
        await page.waitForTimeout(400);
      }
    }
  });
});

test.describe('Process · reduced motion', () => {
  test('play steps to the next phase instead of rolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/process');
    await page.locator('[data-play]').click();
    await expect(page.locator('[data-tc]')).toHaveText('W06 · D1 · Build');
    await expect(page.locator('[data-play]')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Studio · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('the settings window: tabs · switches that bounce · locks · display', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/studio');
    const toast = page.locator('[data-toast]');

    const open = page.locator('[data-sw="open"]');
    await open.click();
    await expect(open).toHaveAttribute('aria-checked', 'false');
    await expect(toast).toHaveText('We tried closed doors once. Never again.');
    await expect(open).toHaveAttribute('aria-checked', 'true');

    // Locked switches are aria-disabled on purpose · they still answer a click with a shake.
    await page.locator('[data-sw="comma"]').click({ force: true });
    await expect(toast).toHaveText('We lost it. That is the whole point.');
    await expect(page.locator('[data-row="comma"]')).toHaveClass(/shake/);
    await expect(page.locator('[data-sw="comma"]')).toHaveAttribute('aria-checked', 'false');

    await page.locator('#tab-v').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tab-d')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tab-d')).toBeFocused();
    await expect(page.locator('#pane-d')).toBeVisible();
    await expect(page.locator('#pane-v')).toBeHidden();

    await page.locator('[data-sw="big"]').click();
    await expect(page.locator('html')).toHaveClass(/\bst-big\b/);
    await page.locator('[data-sw="hc"]').click();
    await expect(page.locator('html')).toHaveClass(/\bst-hc\b/);
    await expect(toast).toHaveText('High contrast on.');
    await page.locator('[data-sw="still"]').click();
    await expect(page.locator('html')).toHaveClass(/\bstill\b/);
    await page.locator('[data-sw="still"]').click();
    await expect(page.locator('html')).not.toHaveClass(/\bstill\b/);

    await page.locator('#tab-o').click();
    await setRange(page, '[data-meet]', 8);
    await expect(page.locator('[data-meetv]')).toHaveText('Quite a lot');
    await expect(toast).toHaveText('Are you sure? We will be slower.');
    await page.locator('[data-drink]').selectOption('kahve');
    await expect(toast).toHaveText('We will read your cup after.');
    expect(errors).toEqual([]);
  });

  test('a card hands the page to its teammate · say hi', async ({ page }) => {
    await page.goto('/en/studio');
    await toSection(page, 'team');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toEqual(['design']);
    await page.locator('.card[data-who="code"]').hover();
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toEqual(['code']);
    await page.locator('[data-hi="motion"]').click();
    await expect(page.locator('.card[data-who="motion"] [data-hello]')).toHaveText('heyyy');
    await expect(page.locator('.cur.c-motion.say .bub')).toHaveText('heyyy', { timeout: 4000 });
  });

  test('the comma you found counts', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lc-comma', '1'));
    await page.goto('/en/studio');
    await expect(page.locator('[data-commas]')).toHaveText('1');
    await expect(page.locator('[data-yfound]')).toBeVisible();
  });

  test('the ferry sits on the map', async ({ page }) => {
    await page.goto('/tr/studyo');
    await expect(page.locator('[data-boat]')).toHaveAttribute('transform', /^translate\(/);
    await expect(page.locator('[data-fery]')).toHaveText(/Karaköy’den sonraki vapur · \d\d:\d\d|Vapurlar uyuyor/);
  });
});

test.describe('Studio · touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch devices');

  test('settings and hello work with a finger', async ({ page }) => {
    await page.goto('/en/studio');
    await page.locator('#tab-d').tap();
    await page.locator('[data-sw="big"]').tap();
    await expect(page.locator('html')).toHaveClass(/\bst-big\b/);
    await page.locator('[data-hi="design"]').tap();
    await expect(page.locator('.card[data-who="design"] [data-hello]')).toHaveText('hi there. nice cursor');
    await expect(page.locator('.card[data-who="design"] [data-hello]')).toBeVisible();
  });
});
