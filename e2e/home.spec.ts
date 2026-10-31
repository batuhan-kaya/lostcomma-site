import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const visibleCursors = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.crew [data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur));

const toSection = (page: Page, sec: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(`[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY);
  }, sec);

test.describe('homepage · desktop interactions', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('word box · publish · popovers', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    const word = page.locator('[data-word]');
    const before = await word.textContent();
    await page.locator('[data-wbox]').click();
    await expect(word).not.toHaveText(before ?? '');
    await expect(page.locator('[data-pubtxt]')).toHaveText('Draft · 1 change');
    await page.locator('[data-pub]').click();
    await expect(page.locator('[data-pubtxt]')).toHaveText(/^Live · v\d+$/);
    await page.locator('[data-pop="design"]').click();
    await expect(page.locator('[data-popv]')).toBeVisible();
    await expect(page.locator('[data-popv] b')).toHaveText('design');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-popv]')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('below the hero there is never more than one team cursor', async ({ page }) => {
    await page.goto('/en');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toHaveLength(3);
    for (const sec of ['mf', 'svc', 'work', 'prc', 'ctc']) {
      await toSection(page, sec);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 6; i++) {
        expect((await visibleCursors(page)).length, sec).toBeLessThanOrEqual(1);
        await page.waitForTimeout(400);
      }
    }
  });

  test('manifesto: the team types · reject all and accept all', async ({ page }) => {
    await page.goto('/en');
    await toSection(page, 'mf');
    // Typing starts from an empty suggestion.
    await expect(page.locator('[data-ch="0"] ins')).toHaveText('small design and engineering studio', { timeout: 12_000 });
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.locator('[data-doc]')).toHaveClass(/m-orig/);
    await expect(page.locator('[data-docstat]')).toHaveText('All changes rejected');
    await expect(page.getByRole('button', { name: 'Reject all' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(page.locator('[data-doc]')).toHaveClass(/m-final/);
    await expect(page.locator('[data-ch="4"] ins')).toHaveText('Live and in the open.');
  });

  test('services: pick a shape · arrows · inspect', async ({ page }) => {
    await page.goto('/en');
    await toSection(page, 'svc');
    await page.getByRole('radio', { name: /Identity/ }).click();
    await expect(page.locator('[data-frm]')).toHaveClass(/v2/);
    await expect(page.locator('[data-frmlab]')).toHaveText('Identity');
    await expect(page.locator('[data-frmsize]')).toHaveText('1080 × 1080');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: /Motion/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: /Motion/ })).toBeFocused();
    await page.locator('[data-inspb]').click();
    await expect(page.locator('[data-code]')).toBeVisible();
    await expect(page.locator('[data-code]')).toContainText('width: 1920px');
  });

  test('board: drag pans · Enter opens a frame · Escape closes and returns focus', async ({ page }) => {
    await page.goto('/tr');
    await toSection(page, 'work');
    const frame = page.locator('[data-bf="0"]');
    const before = await frame.evaluate((e) => e.style.transform);
    const box = (await page.locator('[data-board]').boundingBox())!;
    await page.mouse.move(box.x + 200, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 420, box.y + 360, { steps: 8 });
    await page.mouse.up();
    expect(await frame.evaluate((e) => e.style.transform)).not.toBe(before);
    await page.locator('[data-bf="1"]').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h3')).toHaveText('Seramik atölyesi');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-bf="1"]')).toBeFocused();
  });

  test('process: Next moves the prototype on', async ({ page }) => {
    await page.goto('/en');
    await toSection(page, 'prc');
    await page.locator('[data-hot="0"]').click();
    await expect(page.locator('[data-pd="1"]')).toHaveClass(/act/);
    await expect(page.locator('[data-pf="1"]')).toHaveClass(/act/);
    await expect(page.locator('[data-pd="1"] .pn')).toHaveText('Sketch');
    await page.locator('[data-hot="4"]').click();
    await expect(page.locator('[data-pd="0"]')).toHaveClass(/act/);
  });
});

test.describe('homepage · brief', () => {
  test('writes the brief as you go · needs an email · sends and answers', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'ctc');
    await page.locator('[data-tile="0"]').click();
    await page.locator('[data-tile="1"]').click();
    await expect(page.locator('[data-typehint]')).toHaveText('2 selected');
    await page.locator('[data-stp="1"]').click();
    await page.locator('[data-chip="1"]').click();
    await page.locator('[data-in="name"]').fill('Batu');
    await expect(page.locator('[data-sum]')).toHaveText('Batu needs a website and an app within a month.');
    await expect(page.locator('[data-fname]')).toHaveText('Batu’s brief');
    await page.locator('[data-send]').click();
    await expect(page.locator('[data-note]')).toHaveText('We need an email address to write back');
    await expect(page.locator('[data-in="mail"]')).toHaveClass(/err/);
    const mail = `e2e-${Date.now()}@example.com`;
    await page.locator('[data-in="mail"]').fill(mail);
    await page.locator('[data-send]').click();
    await expect(page.locator('[data-thread]')).toBeVisible();
    await expect(page.locator('[data-pinsum]')).toHaveText('Batu needs a website and an app within a month.');
    await expect(page.locator('[data-ptags] span')).toHaveText(['Website', 'App', '1 month', '€15–40k']);
    await expect(page.locator('[data-msg="2"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-hi]')).toHaveText('Hi Batu. Thanks for the brief.');
    const stored = readFileSync('test-results/data/briefs.jsonl', 'utf8');
    expect(stored).toContain(mail);
    await page.locator('[data-again]').click();
    await expect(page.locator('[data-fb]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Turkish sentence reads Turkish', async ({ page }) => {
    await page.goto('/tr');
    await toSection(page, 'ctc');
    await page.locator('[data-tile="3"]').click();
    await page.locator('[data-stp="4"]').click();
    await page.locator('[data-in="name"]').fill('Ayşe');
    await expect(page.locator('[data-sum]')).toHaveText('Ayşe için biraz hareket · hazır olduğunda.');
  });
});

test.describe('homepage · without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the brief still posts and thanks you', async ({ page }) => {
    await page.goto('/tr');
    await page.locator('[data-tile="0"]').click();
    await page.locator('[data-in="mail"]').fill(`nojs-${Date.now()}@example.com`);
    await page.locator('[data-send]').click();
    await expect(page).toHaveURL(/\/tr\?brief=sent#contact$/);
    await expect(page.locator('[data-thread]')).toBeVisible();
    await expect(page.locator('[data-fb]')).toBeHidden();
  });

  test('the manifesto is readable as finished text', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('[data-ch="1"] ins')).toHaveText('make websites and apps and identities');
  });
});
