import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
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
    await expect(dialog.locator('[data-ovlink]')).toHaveAttribute('href', '/tr/isler/seramik-atolyesi');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-bf="1"]')).toBeFocused();
  });

  test('board: a project with a cover shows the image from the pipeline · opening it keeps the image', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'work');
    const img = page.locator('[data-bf="0"] picture img');
    await expect(img).toHaveAttribute('alt', '');
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth)).toBeGreaterThan(0);
    expect(await img.evaluate((e: HTMLImageElement) => e.currentSrc)).toMatch(/\/media\/[0-9a-f]{16}\/\d+\.avif$/);
    await page.locator('[data-bf="0"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-ovart] picture img')).toBeVisible();
    await expect(page.getByRole('dialog').locator('h3')).toHaveText('Sailing club');
    expect(errors).toEqual([]);
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

test.describe('homepage · contact sentence', () => {
  test('the sentence is the form: blanks grow · needs an email · sends and thanks you by name', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'ctc');
    const blank = (k: string) => page.locator(`[data-in="${k}"]`);
    const wrap = (k: string) => page.locator(`[data-bw="${k}"]`);
    // The selection invites to the first blank · the topic suggests one of our ideas.
    await expect(wrap('name')).toHaveClass(/\bon\b/);
    await expect(blank('what')).toHaveAttribute('placeholder', /^(a new website|a mobile app|our brand identity|a launch film)$/);
    const w0 = (await blank('name').boundingBox())!.width;
    await blank('name').fill('Batuhan Kaya');
    await expect.poll(async () => (await blank('name').boundingBox())!.width).toBeGreaterThan(w0 * 1.15);
    await blank('what').fill('our new website');
    await expect(wrap('what')).toHaveClass(/\bon\b/);
    await expect(wrap('name')).not.toHaveClass(/\bon\b/);
    // No address: the sentence says so where the address goes.
    await page.locator('[data-go]').click();
    await expect(wrap('mail')).toHaveClass(/\bbad\b/);
    await expect(wrap('mail').locator('[data-btag]')).toHaveText('This address looks incomplete');
    await expect(blank('mail')).toBeFocused();
    const tag = (await wrap('mail').locator('[data-btag]').boundingBox())!;
    expect(tag.x + tag.width, 'the label stays on the page').toBeLessThanOrEqual(page.viewportSize()!.width);
    const mail = `e2e-${Date.now()}@example.com`;
    await blank('mail').fill(mail);
    await expect(wrap('mail')).not.toHaveClass(/\bbad\b/);
    await page.locator('[data-go]').click();
    await expect(page.locator('[data-sdone]')).toBeVisible();
    await expect(page.locator('[data-sf]')).toBeHidden();
    await expect(page.locator('[data-dthanks]')).toHaveText('Thank you Batuhan Kaya.');
    await expect(page.locator('[data-dwill]')).toHaveText(`We’ll write to ${mail} within a day.`);
    // Against a real Postgres (CI) the row is checked too · the in-memory database lives inside the server.
    if (process.env.E2E_DATABASE_URL) {
      const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
      await client.connect();
      const { rows } = await client.query('select name, message, types, time, budget from briefs where email = $1', [mail]);
      await client.end();
      expect(rows).toEqual([{ name: 'Batuhan Kaya', message: 'our new website', types: [], time: null, budget: null }]);
    }
    await page.locator('[data-again]').click();
    await expect(page.locator('[data-sf]')).toBeVisible();
    await expect(blank('name')).toHaveValue('');
    await expect(blank('name')).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('Turkish reads Turkish · the page never scrolls sideways', async ({ page }) => {
    await page.goto('/tr');
    await toSection(page, 'ctc');
    await page.locator('[data-in="name"]').fill('Ayşe');
    await page.locator('[data-in="mail"]').fill('ayse@');
    await page.locator('[data-go]').click();
    await expect(page.locator('[data-bw="mail"] [data-btag]')).toHaveText('Bu adres eksik gibi');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // The label stays on the page (it hangs from the blank's right edge when it would run off).
    const tag = (await page.locator('[data-bw="mail"] [data-btag]').boundingBox())!;
    expect(tag.x).toBeGreaterThanOrEqual(0);
    expect(tag.x + tag.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const mail = `tr-${Date.now()}@example.com`;
    await page.locator('[data-in="mail"]').fill(mail);
    await page.locator('[data-go]').click();
    await expect(page.locator('[data-dthanks]')).toHaveText('Teşekkürler Ayşe.');
    await expect(page.locator('[data-dwill]')).toHaveText(`Bir gün içinde ${mail} adresine yazıyoruz.`);
  });

  test('topics take turns in the empty blank without moving the line', async ({ page }) => {
    await page.goto('/tr');
    await toSection(page, 'ctc');
    const what = page.locator('[data-in="what"]');
    const first = await what.getAttribute('placeholder');
    const w = (await what.boundingBox())!.width;
    await expect.poll(() => what.getAttribute('placeholder'), { timeout: 4000 }).not.toBe(first);
    expect(Math.abs((await what.boundingBox())!.width - w)).toBeLessThan(1);
  });

  test('reduced motion: the topic stays put', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');
    await toSection(page, 'ctc');
    const what = page.locator('[data-in="what"]');
    await expect(what).toHaveAttribute('placeholder', 'a new website');
    await page.waitForTimeout(3000);
    await expect(what).toHaveAttribute('placeholder', 'a new website');
  });
});

test.describe('homepage · without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sentence still posts and thanks you', async ({ page }) => {
    await page.goto('/tr');
    await page.locator('[data-in="name"]').fill('Deniz');
    await page.locator('[data-in="what"]').fill('yeni bir web sitesi');
    await page.locator('[data-in="mail"]').fill(`nojs-${Date.now()}@example.com`);
    await page.locator('[data-go]').click();
    await expect(page).toHaveURL(/\/tr\?brief=sent#contact$/);
    await expect(page.locator('[data-sdone]')).toBeVisible();
    await expect(page.locator('[data-dwill]')).toHaveText('İletin bize ulaştı. Bir gün içinde yazıyoruz.');
    await expect(page.locator('[data-sf]')).toBeHidden();
  });

  test('the manifesto is readable as finished text', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('[data-ch="1"] ins')).toHaveText('make websites and apps and identities');
  });
});
