import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

const setRange = (page: Page, sel: string, v: number) =>
  page.locator(sel).evaluate((el, value) => {
    (el as HTMLInputElement).value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

const rows = (page: Page) => page.locator('.nr:not([hidden])');

test.describe('Notes · find in file', () => {
  // The team's own typing scene stays out of the way of these checks.
  test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: 'reduce' }));

  test('find marks what it finds · forgives Turkish letters · Aa matches case', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en/notes');
    await expect(rows(page)).toHaveCount(12);
    const q = page.locator('[data-q]');
    await q.fill('turkce');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).locator('mark')).toHaveText(['Türkçe']);
    await expect(page.locator('[data-count]')).toHaveText('1 of 12');
    await q.fill('spring');
    await expect(rows(page).first().locator('.nx2 mark')).toHaveText('spring');
    await page.locator('[data-case]').click();
    await expect(page.locator('[data-case]')).toHaveAttribute('aria-pressed', 'true');
    await q.fill('Spring');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('[data-none]')).toBeVisible();
    await expect(page.locator('[data-count]')).toHaveText('No results');
    await page.locator('[data-reset]').click();
    await expect(rows(page)).toHaveCount(12);
    await expect(q).toHaveValue('');
    await expect(page.locator('[data-case]')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });

  test('language and topic filters · the list says what it shows', async ({ page }) => {
    await page.goto('/en/notes');
    await page.locator('[data-nl="tr"]').click();
    await expect(rows(page)).toHaveCount(8);
    await expect(page.locator('[data-lmeta]')).toHaveText('8 notes · Türkçe');
    await page.locator('.tabs [data-tab="studio"]').click();
    await expect(page.locator('[data-ltitle]')).toHaveText('Studio');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.locator('[data-lmeta]')).toHaveText('1 note · Türkçe');
    await page.locator('[data-nl="all"]').click();
    await expect(rows(page)).toHaveCount(2);
    // The Topics box and the tabs are one control.
    await expect(page.locator('.tagc [data-tab="studio"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.tagc [data-tab="studio"]').click();
    await expect(rows(page)).toHaveCount(12);
    await expect(page.locator('.tabs [data-tab="all"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a line number saves a note for later · it is still saved after a reload', async ({ page }) => {
    await page.goto('/en/notes');
    const save = page.locator('.nr').nth(2).locator('[data-save]');
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-savedn]')).toHaveText('1');
    await page.reload();
    await expect(page.locator('[data-savedn]')).toHaveText('1');
    await page.locator('[data-tab="saved"]').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).locator('.nt')).toHaveText('Türkçe büyük harf sorunu');
    await rows(page).locator('[data-save]').click();
    await expect(rows(page)).toHaveCount(0);
  });

  test('the search lives in the address · "/" jumps to the find box', async ({ page }) => {
    await page.goto('/tr/notes?q=yay');
    await expect(page.locator('[data-q]')).toHaveValue('yay');
    await expect(rows(page)).toHaveCount(1);
    await page.locator('[data-q]').fill('');
    await page.locator('[data-q]').blur();
    await page.keyboard.press('/');
    await expect(page.locator('[data-q]')).toBeFocused();
    await page.keyboard.type('font');
    await expect(page).toHaveURL(/\?q=font$/);
  });

  test('without JS: a plain list of links', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/en/notes');
    await expect(page.locator('.find')).toBeHidden();
    await expect(page.locator('.nr')).toHaveCount(12);
    await expect(page.locator('.nr a.nb').first()).toHaveAttribute('href', '/en/notes/how-our-cursors-move');
    await ctx.close();
  });
});

test.describe('a note', () => {
  test('contents follow the reading · footnotes sit beside their line', async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto('/en/notes/how-our-cursors-move');
    await expect(page.locator('[data-read]')).toHaveText('Not started');
    await page.evaluate(() => {
      const h = document.getElementById('fewer-cursors')!;
      window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 100);
    });
    if (info.project.name === 'desktop') {
      await expect(page.locator('[data-toc] li.on a')).toHaveText('Fewer cursors');
      await expect(page.locator('[data-pct]')).toContainText('min left');
      const ref = await page.locator('#fnr-2').boundingBox();
      const note = await page.locator('#fn-2').boundingBox();
      expect(Math.abs(ref!.y - note!.y)).toBeLessThan(30);
      expect(note!.x).toBeGreaterThan(ref!.x);
    }
    await expect(page.locator('[data-read]')).toHaveText(/% read$/);
    expect(errors).toEqual([]);
  });

  test('code copies without its line numbers', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/en/notes/how-our-cursors-move');
    const copy = page.locator('[data-copy]').first();
    await expect(copy).toBeVisible();
    await copy.click();
    await expect(copy).toHaveText('Copied');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text.startsWith('const pull = 0.026')).toBe(true);
    expect(text.split('\n')).toHaveLength(15);
  });

  test('the playground: presets · sliders · how it feels', async ({ page }) => {
    await page.goto('/en/notes/how-our-cursors-move');
    const play = page.locator('[data-play]');
    await play.scrollIntoViewIfNeeded();
    await expect(play).toHaveClass(/\blive\b/);
    await expect(play.locator('[data-pgfeel]')).toHaveText('Overshoots a little');
    await play.locator('[data-pgp="sleepy"]').click();
    await expect(play.locator('[data-pgp="sleepy"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(play.locator('[data-pgv="pull"]')).toHaveText('0.012');
    await expect(play.locator('[data-pgfeel]')).toHaveText('No overshoot · feels dragged');
    await setRange(page, '[data-pgin="damping"]', 0.93);
    await expect(play.locator('[data-pgv="damping"]')).toHaveText('0.93');
    await expect(play.locator('[data-pgp][aria-pressed="true"]')).toHaveCount(0);
    // The cursor really follows: it moves away from where it started.
    const at = () => play.locator('[data-pgc]').evaluate((el) => getComputedStyle(el).transform);
    const a = await at();
    await page.waitForTimeout(2200);
    expect(await at()).not.toBe(a);
  });

  test('select a sentence to copy it as a quote or a link to it', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'mouse selection');
    await page.goto('/en/notes/how-our-cursors-move');
    await page.evaluate(() => {
      const p = document.querySelector('[data-body] h2 + p')!;
      const r = document.createRange();
      r.setStart(p.firstChild!, 0);
      r.setEnd(p.firstChild!, 30);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(r);
    });
    const bar = page.locator('.selbar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('button')).toHaveText(['Copy quote', 'Copy link']);
    await page.evaluate(() => getSelection()!.removeAllRanges());
    await expect(bar).toHaveCount(0);
  });

  test('the other language is one click away', async ({ page }) => {
    await page.goto('/en/notes/how-our-cursors-move');
    await page.locator('.also').click();
    await expect(page).toHaveURL(/\/tr\/notes\/imleclerimiz-nasil-hareket-ediyor$/);
    await expect(page.locator('h1')).toHaveText('İmleçlerimiz nasıl hareket ediyor.');
  });

  test('without JS the playground says what it needs', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/en/notes/how-our-cursors-move');
    await expect(page.locator('.bhint.nojs')).toBeVisible();
    await expect(page.locator('.ctrls')).toBeHidden();
    await expect(page.locator('[data-copy]').first()).toBeHidden();
    await ctx.close();
  });
});

test('RSS and share images answer', async ({ request }) => {
  const rss = await request.get('/tr/notes/rss.xml');
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain('<language>tr</language>');
  const og = await request.get('/og/en/notes/how-our-cursors-move.png');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toBe('image/png');
});
