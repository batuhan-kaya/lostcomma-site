import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { axeProblems, horizontalOverflow, watchErrors } from './checks';

const PASSWORD = 'e2e-panel-password';
/** Every project gets its own numbers and names so parallel runs never collide. */
const tag = (info: TestInfo) => ({ desktop: 1, tablet: 2, phone: 3 })[info.project.name] ?? 4;

async function signIn(page: Page, next = '/panel') {
  await page.goto(next);
  await expect(page).toHaveURL(/\/panel\/login/);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, '\\?')}$`));
}

/** A tiny PNG made in the browser (no fixture file needed). */
async function png(page: Page, color: string): Promise<Buffer> {
  const data = await page.evaluate((c) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 300;
    const g = canvas.getContext('2d')!;
    g.fillStyle = c;
    g.fillRect(0, 0, 480, 300);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, color);
  return Buffer.from(data, 'base64');
}

test.describe('panel', () => {
  test('a wrong password stays out · the right one gets in', async ({ page }) => {
    await page.goto('/panel');
    await page.fill('input[name="password"]', 'not the password at all');
    await page.click('button[type="submit"]');
    await expect(page.locator('.p-errors')).toHaveText('Şifre doğru değil.');
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toHaveText('Pano');
  });

  test('every section loads clean: no console errors · axe · no sideways scroll', async ({ page }) => {
    const errors = watchErrors(page);
    await signIn(page);
    for (const url of ['/panel', '/panel/projects', '/panel/projects/new', '/panel/projects/1', '/panel/notes', '/panel/notes/1', '/panel/media', '/panel/people', '/panel/people/design', '/panel/briefs', '/panel/bookings', '/panel/mail', '/panel/settings', '/panel/redirects', '/panel/log', '/panel/account']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page), `${url} overflow`).toBeLessThanOrEqual(0);
      expect(await axeProblems(page), `${url} axe`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });

  test('a new project: the address follows the name · saves · previews as the real page', async ({ page }, info) => {
    const n = tag(info);
    await signIn(page, '/panel/projects/new');
    await page.fill('input[name="no"]', String(200 + n));
    await page.fill('input[name="name_tr"]', `Deneme işi ${n}`);
    await page.fill('input[name="name_en"]', `Test project ${n}`);
    await expect(page.locator('input[name="slug_tr"]')).toHaveValue(`deneme-isi-${n}`);
    await expect(page.locator('input[name="slug_en"]')).toHaveValue(`test-project-${n}`);
    await page.fill('input[name="kind_tr"]', 'Web sitesi');
    await page.fill('input[name="kind_en"]', 'Website');
    await expect(page.locator('[data-dirty]')).toBeVisible();
    // The case study editor: switch Results on and give it a number.
    const results = page.locator('details.st-sec', { hasText: 'Sonuçlar' });
    await results.locator('summary').click();
    await results.getByLabel('Bu bölüm sayfada olsun').check();
    await results.locator('input[lang="tr"]').first().fill('Hızlı');
    await expect(page.locator('textarea[name="story"]')).toHaveValue(/"results"/);
    await page.locator('textarea[name="summary_tr"]').fill('Bir deneme, virgüllü.');
    await expect(page.locator('textarea[name="summary_tr"]')).toHaveClass(/p-lintbad/);
    await page.locator('textarea[name="summary_tr"]').fill('Bir deneme.');
    await page.click('.p-savebar button[type="submit"]');
    // Results needs three filled fields · the server says what is missing.
    await expect(page.locator('.p-errors')).toContainText('Vaka hikâyesinde');
    await page.locator('button', { hasText: 'JSON' }).click();
    await page.locator('textarea[name="story"]').fill('');
    await page.click('.p-savebar button[type="submit"]');
    await expect(page.locator('[data-flash]')).toHaveText('Oluşturuldu.');
    await expect(page.locator('h1')).toHaveText(`${200 + n} · Deneme işi ${n}`);
    const [preview] = await Promise.all([page.waitForEvent('popup'), page.locator('a', { hasText: 'Önizle EN' }).click()]);
    await expect(preview.locator('h1')).toContainText(`Test project ${n}`);
  });

  test('images: upload by picking files · write the alt text · see it in the library', async ({ page }, info) => {
    const n = tag(info);
    await signIn(page, '/panel/media');
    const file = await png(page, ['#3b35ff', '#3ee0a8', '#ff9bd2', '#cdf23a'][n - 1] ?? '#0e0e0f');
    await page.locator('#f-files').setInputFiles({ name: `kare-${n}.png`, mimeType: 'image/png', buffer: file });
    await expect(page.locator('[data-uploads] .ok')).toHaveText('tamam', { timeout: 20_000 });
    await page.goto('/panel/media?filter=noalt');
    await page.locator('.p-library a', { hasText: `kare-${n}.png` }).first().click();
    await page.fill('textarea[name="alt_tr"]', 'Düz renkli bir kare');
    await page.fill('textarea[name="alt_en"]', 'A flat coloured square');
    await page.keyboard.press('Control+s');
    await expect(page.locator('[data-flash]')).toHaveText('Kaydedildi.');
  });

  test('a note: the preview follows the text · scheduled for later', async ({ page }, info) => {
    const n = tag(info);
    await signIn(page, '/panel/notes/new');
    await page.getByLabel('İngilizce').uncheck();
    await page.fill('input[name="title_tr"]', `Deneme notu ${n}`);
    await expect(page.locator('input[name="slug_tr"]')).toHaveValue(`deneme-notu-${n}`);
    await page.locator('textarea[name="body_tr"]').fill('Giriş paragrafı.\n\n## Bir ara başlık\n\nMetin.');
    await expect(page.locator('[data-md-preview="tr"] h2')).toHaveText('Bir ara başlık');
    await page.selectOption('select[name="state"]', 'publish');
    await page.fill('input[name="at"]', '2031-01-01T09:00');
    await page.click('.p-savebar button[type="submit"]');
    await expect(page.locator('[data-flash]')).toHaveText('Oluşturuldu.');
    await page.goto('/panel/notes?state=scheduled');
    await expect(page.locator('#notes')).toContainText(`Deneme notu ${n}`);
  });

  test('a delete asks first', async ({ page }, info) => {
    const n = tag(info);
    await signIn(page, '/panel/redirects');
    await page.fill('input[name="from"]', `/tr/eski-${n}`);
    await page.fill('input[name="to"]', '/tr/studyo');
    await page.click('form[action="/panel/redirects"] button[type="submit"]');
    await expect(page.locator('[data-flash]')).toHaveText('Yönlendirme eklendi.');
    const row = page.locator('tr', { hasText: `/tr/eski-${n}` });
    await row.locator('button', { hasText: 'Kaldır' }).click();
    const ask = page.locator('dialog.p-dialog');
    await expect(ask).toContainText('Eski adres 404 verir.');
    await ask.locator('button', { hasText: 'Vazgeç' }).click();
    await expect(ask).toHaveCount(0);
    await expect(row).toBeVisible();
    const res = await page.request.get(`/tr/eski-${n}`, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    await row.locator('button', { hasText: 'Kaldır' }).click();
    await page.locator('dialog.p-dialog button', { hasText: 'Kaldır' }).click();
    await expect(page.locator('[data-flash]')).toHaveText('Yönlendirme kaldırıldı.');
    expect((await page.request.get(`/tr/eski-${n}`, { maxRedirects: 0 })).status()).toBe(404);
  });

  test('on a phone the menu folds up', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone layout');
    await signIn(page);
    await expect(page.locator('.p-navd')).toBeHidden();
    await page.locator('.p-menu summary').click();
    await page.locator('.p-menu a', { hasText: 'Görüşmeler' }).click();
    await expect(page.locator('h1')).toHaveText('Görüşmeler');
  });
});
