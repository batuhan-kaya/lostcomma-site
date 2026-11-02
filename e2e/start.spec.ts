import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { watchErrors } from './checks';

/*
 * Every project books on its own days so parallel runs never want the same slot:
 * with JS on day base · without JS on base + 3 · the race on base + 6. Day 0 stays free.
 */
const BASE: Record<string, number> = { desktop: 1, tablet: 2, phone: 3 };
const dayOf = (info: TestInfo, plus = 0) => (BASE[info.project.name] ?? 1) + plus;

async function pickDay(page: Page, n: number): Promise<string> {
  const day = page.locator('[data-day]').nth(n);
  const key = (await day.getAttribute('data-day'))!;
  await day.click();
  await expect(day).toHaveAttribute('aria-current', 'date');
  return key;
}

async function fill(page: Page): Promise<void> {
  await page.fill('input[name="name"]', 'Ada Test');
  await page.fill('input[name="email"]', 'ada@example.com');
}

test.describe('Start', () => {
  test.use({ timezoneId: 'Europe/Istanbul' });

  test('books a call: the ticket replaces the panel and the slot is gone for the next visitor', async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto('/en/start');
    await expect(page.locator('[data-yclk] [data-city]')).toHaveText('Same time as us');
    const key = await pickDay(page, dayOf(info));
    await expect(page).toHaveURL(new RegExp(`\\?day=${key}#book$`));
    const group = page.locator(`[data-sday="${key}"]`);
    await expect(group).toBeVisible();
    await expect(group.locator('.slot:not([hidden])')).toHaveCount(14);
    const slot = group.locator('.slot:not(.taken)').first();
    const value = await slot.locator('input').getAttribute('value');
    await expect(page.locator('[data-go]')).toBeDisabled();
    await slot.click();
    await fill(page);
    await page.locator('.chip', { hasText: 'Website' }).click();
    await expect(page.locator('[data-sum]')).toHaveText(/ · \d\d:\d\d Istanbul$/);
    await page.locator('[data-go]').click();

    const ticket = page.locator('[data-ticket]');
    await expect(ticket).toContainText('Booked · see you Ada');
    await expect(ticket).toContainText('Website');
    await expect(ticket).toBeFocused();
    await expect(page.locator('[data-book]')).toHaveCount(0);
    const cal = await page.request.get((await ticket.locator('.ics').getAttribute('href'))!);
    expect(cal.status()).toBe(200);
    expect(await cal.text()).toContain('BEGIN:VEVENT');
    expect(errors).toEqual([]);

    await page.goto(`/en/start?day=${key}`);
    const gone = page.locator(`[data-sday="${key}"] input[value="${value}"]`);
    await expect(gone).toBeDisabled();
    await expect(page.locator(`[data-sday="${key}"] .slot.taken [data-yt]`).first()).toHaveText('taken');
  });

  test('someone takes the slot first: we say so and mark it', async ({ page }, info) => {
    await page.goto('/en/start');
    const key = await pickDay(page, dayOf(info, 6));
    const slot = page.locator(`[data-sday="${key}"] .slot:not(.taken)`).first();
    const value = (await slot.locator('input').getAttribute('value'))!;
    await slot.click();
    await fill(page);
    const other = await page.request.post('/api/booking', { data: { lang: 'en', slot: value, tz: 'Europe/Istanbul', name: 'Someone', email: 'someone@example.com' } });
    expect(other.status()).toBe(200);
    await page.locator('[data-go]').click();
    await expect(page.locator('[data-bmsg]')).toHaveText('Someone took that time just before you. Pick another one.');
    await expect(page.locator(`input[value="${value}"]`)).toBeDisabled();
    await expect(page.locator('[data-go]')).toBeDisabled();
  });

  test('the team points at a slot that fits', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'scenes below the hero need a mouse');
    await page.goto('/en/start');
    await page.locator('#book').scrollIntoViewIfNeeded();
    await expect(page.locator('.cur.c-design.say .bub')).toHaveText('this one works for both of us', { timeout: 8000 });
  });
});

test.describe('Start in other time zones', () => {
  test.describe('Tokyo', () => {
    test.use({ timezoneId: 'Asia/Tokyo' });
    test('only the slots inside both working days show · in their time', async ({ page }) => {
      await page.goto('/en/start');
      await expect(page.locator('[data-yclk] [data-city]')).toHaveText('Tokyo');
      await expect(page.locator('[data-difft]')).toHaveText('Istanbul is 6 hours behind');
      const shown = page.locator('.sday:not([hidden]) .slot:not([hidden])');
      await expect(shown).toHaveCount(3);
      await expect(shown.first().locator('b')).toHaveText('10:30');
      await expect(shown.first().locator('[data-yt]')).toHaveText('16:30 your time');
      await expect(page.locator('[data-overt2]')).toHaveText('2 hours in common');
      await expect(page.locator('[data-hit]')).toBeVisible();
      await shown.first().click();
      await expect(page.locator('[data-sum]')).toHaveText(/ · 10:30 Istanbul · 16:30 your time$/);
    });
  });

  test.describe('Los Angeles', () => {
    test.use({ timezoneId: 'America/Los_Angeles' });
    test('no hours in common: we say so and offer the other ways', async ({ page }) => {
      await page.goto('/tr/basla');
      await expect(page.locator('.sday:not([hidden]) .slot:not([hidden])')).toHaveCount(0);
      await expect(page.locator('[data-noslots]')).toBeVisible();
      await expect(page.locator('[data-hit]')).toBeHidden();
      await expect(page.locator('[data-overt2]')).toHaveText('Ortak saat yok');
    });
  });
});

test.describe('Start without JS', () => {
  test.use({ javaScriptEnabled: false });

  test('days are links · every slot is a radio · the form posts and the ticket page answers', async ({ page }, info) => {
    await page.goto('/tr/basla');
    await expect(page.locator('[data-yclk]')).toBeHidden();
    const day = page.locator('[data-day]').nth(dayOf(info, 3));
    const key = (await day.getAttribute('data-day'))!;
    await day.click();
    await expect(page).toHaveURL(new RegExp(`\\?day=${key}#book$`));
    const group = page.locator(`[data-sday="${key}"]`);
    await expect(group).toBeVisible();
    await expect(group.locator('.slot')).toHaveCount(14);
    await expect(group.locator('[data-yt]').first()).toHaveText(/İstanbul|dolu/);
    await group.locator('.slot:not(.taken)').first().click();
    await fill(page);
    await page.locator('[data-go]').click();
    await expect(page).toHaveURL(/\?ticket=[\w-]+#book$/);
    await expect(page.locator('[data-ticket]')).toContainText('Ayrıldı · görüşürüz Ada');
  });
});
