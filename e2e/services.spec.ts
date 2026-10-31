import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const visibleCursors = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.crew [data-cur]')].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => e.dataset.cur));

const toSection = (page: Page, sec: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(`section[data-sec="${s}"]`)!;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY);
  }, sec);

/** Range inputs cannot be filled: set the value and fire input like a drag would. */
const setRange = (page: Page, sel: string, v: number) =>
  page.locator(sel).evaluate((el, value) => {
    (el as HTMLInputElement).value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

/** Drag with the mouse from a to b (page coordinates) in a few steps. */
async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}

test.describe('Services · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('the team draws one website · one app · one path', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services');
    await expect(page.locator('[data-stage] .it.done')).toHaveCount(3, { timeout: 20_000 });
    await expect(page.locator('[data-stage] .k-web')).toHaveCount(1);
    await expect(page.locator('[data-stage] .k-app')).toHaveCount(1);
    await expect(page.locator('[data-stage] .k-mo .mdot')).toHaveCount(3);
    await expect(page.locator('[data-tool="identity"]')).toHaveAttribute('aria-pressed', 'true', { timeout: 6000 });
    expect(errors).toEqual([]);
  });

  test('pick a tool · draw · the inspector follows · undo and clear', async ({ page }) => {
    await page.goto('/en/services');
    await page.locator('[data-tool="app"]').click();
    await expect(page.locator('[data-ib="app"]')).toBeVisible();
    await expect(page.locator('[data-ib="web"]')).toBeHidden();
    await expect(page.locator('[data-itag]')).toHaveText('App tool');
    await expect(page.locator('[data-hint]')).toHaveText('App tool · click to place a phone');

    await page.locator('[data-tool="web"]').click();
    const box = (await page.locator('[data-stage]').boundingBox())!;
    await drag(page, { x: box.x + 80, y: box.y + 80 }, { x: box.x + 420, y: box.y + 300 });
    const web = page.locator('[data-stage] .k-web').last();
    await expect(web).toHaveClass(/done/);
    await expect(web.locator('.lab')).toHaveText(/^Website · \d+ × \d+$/);

    await page.locator('[data-tool="identity"]').click();
    await drag(page, { x: box.x + 500, y: box.y + 300 }, { x: box.x + 700, y: box.y + 120 });
    await expect(page.locator('[data-stage] .k-id.done .anc')).toHaveCount(5);
    await expect(page.locator('[data-empty]')).toHaveClass(/off/);

    // The demo stepped aside once the visitor drew.
    const count = await page.locator('[data-stage] .it').count();
    await page.locator('[data-undo]').click();
    await expect(page.locator('[data-stage] .it')).toHaveCount(count - 1);
    await page.locator('[data-clear]').click();
    await expect(page.locator('[data-stage] .it')).toHaveCount(0);
    await expect(page.locator('[data-empty]')).not.toHaveClass(/off/);
  });

  test('keyboard: picking a tool stamps one on the board', async ({ page }) => {
    await page.goto('/en/services');
    await page.locator('[data-tool="motion"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-stage] .k-mo.done')).toHaveCount(1);
    await expect(page.locator('[data-tool="motion"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('one answer open at a time', async ({ page }) => {
    await page.goto('/en/services');
    const q = page.locator('.qb');
    await expect(q.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await q.nth(2).click();
    await expect(q.nth(2)).toHaveAttribute('aria-expanded', 'true');
    await expect(q.nth(0)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#a2')).toBeVisible();
    await q.nth(2).click();
    await expect(q.nth(2)).toHaveAttribute('aria-expanded', 'false');
  });

  test('tiles lead to the detail pages', async ({ page }) => {
    await page.goto('/tr/hizmetler');
    await page.locator('.tile.t-mo').click();
    await expect(page).toHaveURL(/\/tr\/hizmetler\/hareket$/);
    await expect(page.locator('h1')).toHaveText('Hareket');
  });
});

test.describe('Service pages · desktop', () => {
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'pointer devices');

  test('Websites: the handle and the presets resize the frame', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/websites');
    const handle = page.locator('[data-handle]');
    await handle.focus();
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '340');
    await expect(page.locator('[data-wv]')).toHaveText('340');
    await expect(page.locator('[data-w="390"]')).toHaveAttribute('aria-pressed', 'true');
    // At phone width the little site shows its menu button and a basket bar.
    await expect(page.locator('.s-menu')).toBeVisible();
    await expect(page.locator('.s-links')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '360');
    await page.locator('[data-w="1024"]').click();
    await expect(handle).toHaveAttribute('aria-valuenow', '1024');
    await expect(page.locator('.s-links')).toBeVisible();

    const hb = (await handle.boundingBox())!;
    await drag(page, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }, { x: hb.x - 300, y: hb.y + hb.height / 2 });
    const w = Number(await handle.getAttribute('aria-valuenow'));
    expect(w).toBeGreaterThan(680);
    expect(w).toBeLessThan(760);
    expect(errors).toEqual([]);
  });

  test('Websites: the checklist tells the size of the project', async ({ page }) => {
    await page.goto('/en/services/websites');
    await expect(page.locator('[data-picked]')).toHaveText('7');
    await expect(page.locator('[data-verdict]')).toHaveText('sounds like a marketing site');
    for (const i of [0, 2, 3]) await page.locator(`[data-ck="${i}"]`).click();
    await expect(page.locator('[data-ck="0"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-picked]')).toHaveText('4');
    await expect(page.locator('[data-verdict]')).toHaveText('sounds like a landing page');
    await expect(page.locator('[data-weeks]')).toHaveText('About 3 to 4 weeks');
    for (const i of [0, 1, 2, 3, 6, 7, 10, 11]) await page.locator(`[data-ck="${i}"]`).click();
    await expect(page.locator('[data-picked]')).toHaveText('12');
    await expect(page.locator('[data-verdict]')).toHaveText('sounds like a full platform');
  });

  test('Websites: the editor keeps two languages and publishes', async ({ page }) => {
    await page.goto('/tr/hizmetler/web-siteleri');
    const h = page.locator('[data-edh]');
    await expect(h).toHaveValue('Yavaş sabahlar için kaseler.');
    await page.locator('[data-edl="en"]').click();
    await expect(h).toHaveValue('Bowls for slow mornings.');
    await expect(h).toHaveAttribute('lang', 'en');
    await h.fill('Cups for long evenings.');
    await expect(page.locator('[data-saved]')).toHaveText('Kaydedilmedi');
    await page.locator('[data-edl="tr"]').click();
    await expect(h).toHaveValue('Yavaş sabahlar için kaseler.');
    await page.locator('[data-edl="en"]').click();
    await expect(h).toHaveValue('Cups for long evenings.');
    await page.locator('[data-pub]').click();
    await expect(page.locator('[data-pub]')).toHaveText('Yayında ✓');
    await expect(page.locator('[data-saved]')).toHaveText('Kaydedildi');
  });

  test('Apps: after puts every action under the thumb · the thumb taps', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/apps');
    await expect(page.locator('[data-easy]')).toHaveText('0');
    await page.locator('[data-lay="a"]').click();
    await expect(page.locator('[data-easy]')).toHaveText('5');
    await expect(page.locator('[data-act="0"]')).toHaveClass(/easy/);
    await page.locator('[data-hand="l"]').click();
    await expect(page.locator('[data-phone]')).toHaveClass(/hand-l/);
    await expect(page.locator('[data-easy]')).toHaveText('5');

    // Keyboard: walk the thumb to the top of the screen · the reach card follows.
    const thumb = page.locator('[data-thumb]');
    await thumb.focus();
    for (let i = 0; i < 16; i++) await page.keyboard.press('Shift+ArrowUp');
    await expect(page.locator('[data-reach]')).toHaveClass(/hard/);
    await expect(page.locator('[data-reach] b')).toHaveText('Hard to reach');

    // Drag the thumb onto "Buy ticket" and let go: it taps.
    await page.locator('[data-hand="r"]').click();
    const buy = (await page.locator('[data-act="0"]').boundingBox())!;
    const tb = (await thumb.boundingBox())!;
    await drag(page, { x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 }, { x: buy.x + buy.width / 2, y: buy.y + buy.height / 2 });
    await expect(page.locator('[data-toast]')).toHaveText('Tapped Buy ticket · easy reach');
    expect(errors).toEqual([]);
  });

  test('Apps: the release train ships', async ({ page }) => {
    await page.goto('/en/services/apps');
    await page.locator('[data-ship]').click();
    await expect(page.locator('[data-rtwhen]')).toHaveText('On the train');
    await expect(page.locator('[data-ship]')).toHaveText('Live ✓ · again', { timeout: 10_000 });
    await expect(page.locator('.st.done')).toHaveCount(5);
    await expect(page.locator('[data-rollv]')).toHaveText('100%');
  });

  test('Identity: the scale changes the mark · the checker checks', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/identity');
    await expect(page.locator('[data-sz]')).toHaveText('85 mm');
    await page.locator('[data-stop="0"]').click();
    await expect(page.locator('[data-sz]')).toHaveText('16 px');
    await expect(page.locator('[data-stg]')).toHaveClass(/\bv1\b/);
    await expect(page.locator('[data-scn="0"]')).toHaveClass(/on/);
    await expect(page.locator('[data-stg]')).toHaveAttribute('aria-label', 'The bakery mark · Browser tab · 16 px');
    const rng = page.locator('[data-rng]');
    await rng.focus();
    await page.keyboard.press('End');
    await expect(page.locator('[data-sz]')).toHaveText('6 m');
    await expect(page.locator('[data-ver]')).toHaveText('Wordmark');
    await page.locator('[data-cs]').click();
    await expect(page.locator('[data-stg]')).toHaveClass(/\bcs\b/);

    await expect(page.locator('[data-ratio]')).toHaveText('10.68 : 1');
    await page.locator('[data-fg="2"]').click();
    await expect(page.locator('[data-ratio]')).toHaveText('1.25 : 1');
    await expect(page.locator('[data-aa]')).toHaveText('Fails AA');
    await expect(page.locator('[data-prev]')).toHaveClass(/\bf2\b/);
    expect(errors).toEqual([]);
  });

  test('Motion: presets bend the curve · the CSS follows · keys move a handle', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/motion');
    const css = page.locator('[data-css]');
    await expect(css).toHaveText('transition: transform 480ms cubic-bezier(0.7, 0, 0.2, 1);');
    await page.locator('[data-pre="1"]').click();
    await expect(page.locator('[data-cname]')).toHaveText('Pop');
    await expect(css).toHaveText('transition: transform 480ms cubic-bezier(0.2, 1.6, 0.3, 1);');
    await page.locator('[data-h="0"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await expect(css).toHaveText('transition: transform 480ms cubic-bezier(0.21, 1.61, 0.3, 1);');
    await expect(page.locator('[data-cname]')).toHaveText('Yours');
    await setRange(page, '[data-dur]', 900);
    await expect(page.locator('[data-durv]')).toHaveText('900 ms');
    await page.locator('[data-rm]').click();
    await expect(page.locator('[data-calm]')).toHaveClass(/on/);
    expect(errors).toEqual([]);
  });

  test('Motion: the timeline plays · the loops pause', async ({ page }) => {
    await page.goto('/en/services/motion');
    await setRange(page, '[data-tlr]', 0);
    await expect(page.locator('[data-tlt]')).toHaveText('0.00 s');
    await page.locator('[data-tlplay]').click();
    await expect(page.locator('[data-tlt]')).toHaveText('2.00 s', { timeout: 6000 });
    await expect(page.locator('[data-tlplay]')).toHaveText('Play');
    const loop = page.locator('[data-loop]').first();
    await loop.click();
    await expect(loop).toHaveClass(/\boff\b/);
    await expect(loop).toHaveAccessibleName('Product launch film · Paused');
    await expect(loop.locator('[data-lps]')).toHaveText('Paused');
  });

  test('below the hero there is never more than one team cursor', async ({ page }) => {
    await page.goto('/en/services/apps');
    await expect.poll(() => visibleCursors(page), { timeout: 5000 }).toHaveLength(3);
    for (const sec of ['get', 'hood', 'price', 'rel']) {
      await toSection(page, sec);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 4; i++) {
        expect((await visibleCursors(page)).length, sec).toBeLessThanOrEqual(1);
        await page.waitForTimeout(400);
      }
    }
  });

  test('the next band walks through the tools and back', async ({ page }) => {
    await page.goto('/en/services/identity');
    await expect(page.locator('a.nx')).toHaveAttribute('href', '/en/services/motion');
    await page.goto('/en/services/motion');
    await expect(page.locator('a.nx')).toHaveAttribute('href', '/en/services');
    await expect(page.locator('a.nx b')).toHaveText('All tools');
  });
});

test.describe('Services · reduced motion', () => {
  test('the board starts drawn · nobody performs', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/services');
    await expect(page.locator('[data-stage] .it.done')).toHaveCount(3);
    await expect(page.locator('[data-tool="identity"]')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(3500);
    await expect(page.locator('.cur.say')).toHaveCount(0);
  });
});

test.describe('Service pages · touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch devices');

  test('the controls work with a finger', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/services/apps');
    await page.locator('[data-lay="a"]').tap();
    await expect(page.locator('[data-easy]')).toHaveText('5');
    await page.goto('/en/services/identity');
    await page.locator('[data-stop="5"]').tap();
    await expect(page.locator('[data-sz]')).toHaveText('6 m');
    await page.goto('/en/services/websites');
    await page.locator('[data-w="390"]').tap();
    await expect(page.locator('[data-handle]')).toHaveAttribute('aria-valuenow', '390');
    expect(errors).toEqual([]);
  });
});
