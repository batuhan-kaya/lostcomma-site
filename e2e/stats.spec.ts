import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './checks';

/**
 * Statistics end to end (docs/ISTATISTIK.md): a visitor's pages and clicks reach the panel ·
 * the privacy page shows and deletes today's record · "do not count me" really stops the beacon ·
 * the cookie page and the KVKK letter work. Headless Chromium calls itself HeadlessChrome and
 * bots are never counted · so these tests browse as an ordinary Chrome.
 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
test.use({ userAgent: UA });
// One browser string per test: the same address and browser within thirty minutes is one visit.
test.beforeEach(async ({ context }, info) => {
  await context.setExtraHTTPHeaders({ 'user-agent': `${UA} E2E/${info.project.name}/${info.title.length}` });
});

const PASSWORD = 'e2e-panel-password';

async function signIn(page: Page, next: string) {
  await page.goto(next);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, '\\?')}$`));
}

/** Waits for the page's beacon to be accepted. */
const beacon = (page: Page) => page.waitForResponse((r) => r.url().endsWith('/api/stats') && r.request().method() === 'POST');

test.describe('statistics', () => {
  test.skip(({ isMobile }) => isMobile, 'one browser is enough for the round trip');

  test('a visit reaches the panel with its pages and clicks', async ({ page, context }, info) => {
    const errors = watchErrors(page);
    const tag = `e2e-${info.project.name}`;
    await page.goto(`/en/services?utm_source=${tag}&utm_campaign=round-trip`);
    expect((await beacon(page)).status()).toBe(204);
    await page.locator('a[href="/en/process"]').first().click();
    await expect(page).toHaveURL(/\/en\/process$/);
    expect((await beacon(page)).status()).toBe(204);
    expect(errors).toEqual([]);

    const panel = await context.newPage();
    await signIn(panel, '/panel/stats?p=today');
    await expect(panel.locator('body')).toContainText(tag);
    await panel.goto('/panel/stats/visits?p=today');
    await panel.locator('tr', { hasText: tag }).first().locator('a.p-rowlink').click();
    await expect(panel.locator('.p-timeline')).toContainText('/en/services');
    await expect(panel.locator('.p-timeline')).toContainText('/en/process');
  });

  test('the privacy page shows today\'s record and deletes it', async ({ page }) => {
    await page.goto('/en/privacy');
    const box = page.locator('[data-rcpt]');
    await expect(box.locator('.rpages')).toContainText('/en/privacy', { timeout: 8000 });
    await box.locator('[data-forget]').click();
    await expect(box).toContainText('Deleted');
  });

  test('"do not count me" stops the beacon', async ({ page }) => {
    await page.goto('/en/privacy');
    await page.locator('[data-nocount]').click();
    await expect(page.locator('[data-nocount]')).toHaveAttribute('aria-pressed', 'true');
    let sent = 0;
    page.on('request', (r) => r.url().endsWith('/api/stats') && sent++);
    await page.goto('/en/studio');
    await page.waitForTimeout(2500);
    expect(sent).toBe(0);
    // And back on.
    await page.goto('/en/privacy');
    await page.locator('[data-nocount]').click();
    await expect(page.locator('[data-nocount]')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('legal pages', () => {
  test('the cookie page lists what is stored and deletes it', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'lang', value: 'en', url: baseURL! }]);
    await page.goto('/en/cookies');
    const lang = page.locator('[data-item="lang"]');
    await expect(lang.locator('[data-state]')).toHaveText('stored');
    await lang.locator('[data-del]').click();
    await expect(lang.locator('[data-state]')).toHaveText('not stored');
    expect((await context.cookies()).some((c) => c.name === 'lang')).toBe(false);
  });

  test('the KVKK letter writes itself', async ({ page }) => {
    await page.goto('/tr/kvkk');
    const mail = page.locator('[data-mail]');
    await page.getByLabel('Verilerimin silinmesini istiyorum').check();
    await page.locator('[data-lname]').fill('Deniz Deniz');
    const href = decodeURIComponent((await mail.getAttribute('href')) ?? '');
    expect(href).toMatch(/^mailto:/);
    expect(href).toContain('KVKK başvurusu');
    expect(href).toContain('Kişisel verilerimin silinmesini istiyorum.');
    expect(href).toContain('Deniz Deniz');
    await expect(mail).toHaveClass(/ready/);
  });

  test('forms point to the KVKK notice', async ({ page }) => {
    await page.goto('/tr');
    await expect(page.locator('form .lnote a')).toHaveAttribute('href', '/tr/kvkk');
    await page.goto('/en/start');
    await expect(page.locator('.lnote a')).toHaveAttribute('href', '/en/kvkk');
  });
});
