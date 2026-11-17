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

  test('services: five products · only the one on show plays · automation runs', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tr');
    await toSection(page, 'svc');
    await expect(page.locator('[data-opt]')).toHaveCount(5);
    await expect(page.locator('.svc .h2')).toHaveText('Beş biçim. Tek stüdyo.');
    await page.locator('[data-opt="4"]').click();
    await expect(page.locator('[data-frm]')).toHaveClass(/v4/);
    await expect(page.locator('[data-frmlab]')).toHaveText('Otomasyon & entegrasyon');
    await expect(page.locator('[data-frmsize]')).toHaveText('1280 × 1200');
    // The mock products are English: upper-case labels keep their dotless i on a Turkish page.
    await expect(page.locator('.fc-auto')).toHaveAttribute('lang', 'en');
    const playing = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-fc]')].map((fc) => document.getAnimations().filter((a) => fc.contains((a.effect as KeyframeEffect | null)?.target as Node)).length),
      );
    await expect.poll(async () => (await playing()).map((n) => n > 0), { timeout: 4000 }).toEqual([false, false, false, false, true]);
    // A booking runs: the first node is done within a second or two.
    await expect.poll(() => page.locator('.fc-auto .n1 .ok').evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 4000 }).toBeGreaterThan(0.9);
    await page.locator('[data-opt="1"]').click();
    await expect.poll(async () => (await playing()).map((n) => n > 0), { timeout: 4000 }).toEqual([false, true, false, false, false]);
    expect(errors).toEqual([]);
  });

  test('services: Lodos works under the pointer · the wheel scrolls it once the pointer rests · a day and a time book a sail', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'svc');
    await page.locator('[data-opt="0"]').click();
    const fc = page.locator('[data-fc="0"]');
    const box = (await page.locator('[data-frm]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(fc).toHaveClass(/live/);
    await expect(page.locator('.ftry .tl')).toBeVisible();
    await expect(fc).toHaveClass(/can-scroll/);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => fc.locator('.wv').evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
    // A card's Book takes its boat to the booking widget.
    await fc.locator('article').nth(1).locator('.wbtn').click();
    await expect(fc.locator('.wmon small')).toHaveText('Laser Standard · two hour sail');
    await expect(fc.locator('.wres')).toHaveClass(/off/);
    await fc.locator('.wgrid i', { hasText: /^26$/ }).click();
    await fc.locator('.wslots i', { hasText: '15:00' }).click();
    await expect(fc.locator('.wsum .s1 b')).toHaveText('Thu 26 Nov · 15:00 to 17:00');
    await expect(fc.locator('.wtot')).toHaveText('₺900');
    await fc.locator('.wres').click();
    await expect(fc.locator('.wres')).toHaveClass(/booked/);
    expect(errors).toEqual([]);
  });

  test('services: Pocket sends money · keypad and keyboard · the receipt · the row and the balance', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'svc');
    await page.locator('[data-opt="1"]').click();
    const ap = page.locator('[data-fc="1"] .ap');
    await ap.locator('.aacts .send').click();
    await expect(ap).toHaveClass(/s-send/);
    await ap.locator('.arec > span', { hasText: 'Mert' }).click();
    await expect(ap).toHaveClass(/s-amt/);
    await expect(ap.locator('.ato b')).toHaveText('Mert Aksoy');
    await expect(ap.locator('.asendb')).not.toHaveClass(/has/);
    for (const k of ['1', '2']) await ap.locator('.akeys i', { hasText: new RegExp(`^${k}$`) }).click();
    await page.keyboard.press('5');
    await page.keyboard.press('0');
    await expect(ap.locator('.aval .v0')).toHaveText('₺1 250');
    await expect(ap.locator('.asendb .l2')).toHaveText('Send ₺1 250');
    await ap.locator('.asendb').click();
    await expect(ap).toHaveClass(/s-ok/);
    await expect(ap.locator('.aokt')).toHaveText('₺1 250 sent');
    await ap.locator('.adone').click();
    // Home slides back in under the sheet as it goes down: it is not left waiting shifted left (-80 px) to jump later.
    const homeX = () => ap.locator('.ahome').evaluate((h) => new DOMMatrixReadOnly(getComputedStyle(h).transform).m41);
    await page.waitForTimeout(250);
    expect(await homeX()).toBeGreaterThan(-60);
    await expect.poll(homeX, { timeout: 2000 }).toBeGreaterThan(-1);
    await expect(ap).toHaveClass(/s-home/);
    await expect(ap.locator('.arow').first()).toContainText('Mert Aksoy');
    await expect(ap.locator('.arow').first()).toContainText('−₺1 250');
    await expect(ap.locator('.abal .bal1')).toHaveText('₺46 960.50');
    expect(errors).toEqual([]);
  });

  test('services: the website · identity · motion and automation frames end where the list on their left ends · in both languages', async ({ page }) => {
    for (const lang of ['tr', 'en']) {
      await page.goto(`/${lang}`);
      await toSection(page, 'svc');
      const gap = () =>
        page.evaluate(() => document.querySelector('[data-frm]')!.getBoundingClientRect().bottom - document.querySelector('.opts')!.getBoundingClientRect().bottom);
      // Measured once the fonts are in (the list's height depends on its letters).
      await page.evaluate(() => document.fonts.ready);
      const stageH = () => page.locator('[data-stage]').evaluate((e) => Math.round(e.getBoundingClientRect().height));
      let stage = 0;
      for (const i of [0, 2, 3, 4]) {
        await page.locator(`[data-opt="${i}"]`).click();
        await expect(page.locator('[data-frm]')).toHaveClass(new RegExp(`v${i}`));
        await expect.poll(async () => Math.abs(await gap()), { timeout: 4000, message: `frame ${i} · ${lang}` }).toBeLessThan(3);
        // The stage keeps one height whichever frame is on show: nothing below moves.
        if (!stage) stage = await stageH();
        expect(await stageH()).toBe(stage);
      }
      // Automation: fifteen steps in groups · a parallel row · a lane for later · the trace.
      await expect(page.locator('.fc-auto .an')).toHaveCount(15);
      await expect(page.locator('.fc-auto .tr')).toHaveCount(10);
      // Motion: a full editor · the bin · the effect controls · a timeline of layers and the sound.
      await expect(page.locator('.fc-mo .mbin')).toHaveCount(11);
      await expect(page.locator('.fc-mo .mrow')).toHaveCount(16);
      // Identity: Clay's board (the photo) with the selection going over it.
      await expect(page.locator('.fc-id.photo img')).toHaveCount(1);
    }
  });

  test('services: Pocket on Android stands beside the iPhone · plays in step · answers on its own', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tr');
    await toSection(page, 'svc');
    const and = page.locator('[data-fca]');
    await expect(page.locator('.frm2')).toBeHidden();
    await page.locator('[data-opt="1"]').click();
    await expect(page.locator('.frm2')).toBeVisible();
    // The platforms keep their own spelling (iOS · Android) · no upper case.
    expect(await page.locator('.flab3 span').first().innerText()).toBe('Android');
    await expect(and).toHaveClass(/on/);
    await expect.poll(() => and.evaluate((fc) => fc.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    // The visitor takes Android: the iPhone keeps its story.
    await and.locator('.aacts .send').click();
    await expect(and).toHaveClass(/live/);
    await expect(and.locator('.ap')).toHaveClass(/s-send/);
    await expect(page.locator('[data-fc="1"]')).not.toHaveClass(/live/);
    // Another tab: Android goes away and back to its story.
    await page.locator('[data-opt="2"]').click();
    await expect(page.locator('.frm2')).toBeHidden();
    await expect(and).not.toHaveClass(/live/);
    expect(errors).toEqual([]);
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

  test('board: Tab brings every frame into view · the board itself never scrolls', async ({ page }) => {
    await page.goto('/en');
    await toSection(page, 'work');
    // Keyboard focus (no pointer has touched the page): the first frame then Tab through the rest.
    await page.locator('[data-bf="0"]').focus();
    for (let i = 0; i < 8; i++) {
      if (i) await page.keyboard.press('Tab');
      await expect(page.locator(`[data-bf="${i}"]`)).toBeFocused();
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const f = document.activeElement!.getBoundingClientRect();
              const b = document.querySelector('[data-board]')!.getBoundingClientRect();
              return f.left >= b.left && f.right <= b.right && f.top >= b.top && f.bottom <= b.bottom;
            }),
          { message: `frame ${i} inside the board`, timeout: 3000 },
        )
        .toBe(true);
      expect(await page.locator('[data-board]').evaluate((b) => b.scrollLeft + b.scrollTop)).toBe(0);
    }
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

  test('process: a step lifts the sheets above it · its note opens · a sheet is a shortcut · launch raises the numbers', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'prc');
    const box = page.locator('[data-ly]');
    await expect(box).toHaveClass(/\bin\b/);
    await expect(page.locator('[data-lb="0"]')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('[data-lb="2"]').click();
    await expect(box).toHaveClass(/\bs2\b/);
    await expect(page.locator('[data-lp="2"]')).toHaveClass(/\bon\b/);
    await expect(page.locator('[data-lp="1"]')).toHaveClass(/\bdone\b/);
    await expect(page.locator('[data-lp="3"]')).toHaveClass(/\bfut\b/);
    await expect(page.locator('[data-lb="2"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-lb="0"]')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#ly-d2')).toBeVisible();
    await expect(page.locator('#ly-d2')).toContainText('Clickable early');
    await expect(page.locator('#ly-d0')).toBeHidden();
    // The sheets above the open one lift away: the next sheet sits far above the open one.
    await page.waitForTimeout(1200);
    const y = (i: number) => page.locator(`[data-lp="${i}"] .ly-f`).evaluate((e) => e.getBoundingClientRect().top);
    expect((await y(2)) - (await y(3))).toBeGreaterThan(150);
    expect((await y(1)) - (await y(2))).toBeLessThan(70);
    // A sheet opens its own step · launch closes the stack and the numbers rise.
    await page.locator('[data-lp="4"] .ly-f').click({ force: true });
    await expect(box).toHaveClass(/\bs4\b/);
    await expect(page.locator('#ly-d4')).toContainText('We ship it');
    await expect(page.locator('.ly-pin.p1 b')).toHaveText('Lighthouse 100');
    await expect.poll(() => page.locator('.ly-pin.p1 > span').evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    expect(errors).toEqual([]);
  });

  test('process: every note hangs on its sheet: the leader line meets the sheet’s right corner · in both languages', async ({ page }) => {
    for (const [lang, w] of [['en', 1440], ['tr', 1150]] as const) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`/${lang}`);
      await toSection(page, 'prc');
      // The sheets have risen (the arrival is over).
      await expect(page.locator('[data-ly]')).toHaveClass(/\bready\b/);
      for (const step of [0, 3]) {
        await page.locator(`[data-lb="${step}"]`).click();
        await page.waitForTimeout(1300);
        const off = await page.evaluate(() => {
          const lead = parseFloat(getComputedStyle(document.querySelector('[data-ly]')!).getPropertyValue('--lead'));
          return [...document.querySelectorAll<HTMLElement>('[data-lr]')].map((r, i) => {
            const f = document.querySelector(`[data-lp="${i}"] .ly-f`)!.getBoundingClientRect();
            // The diamond's right corner: its right edge · 121.7 / 316.4 of the way down.
            const vx = f.right;
            const vy = f.top + (f.height * 121.7) / 316.4;
            const line = r.getBoundingClientRect();
            return Math.max(Math.abs(line.left - lead - vx), Math.abs(line.top - vy));
          });
        });
        for (const o of off) expect(o, `${lang} ${w} step ${step}`).toBeLessThan(2);
      }
    }
  });

  test('process: every open note fits its room · in both languages at the edges of the side by side layout', async ({ page }) => {
    for (const lang of ['tr', 'en']) {
      for (const w of [1100, 1240, 1440]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(`/${lang}`);
        await page.evaluate(() => document.fonts.ready);
        const over = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.ly-d')].map((d) => {
            const a = d.firstElementChild!.getBoundingClientRect();
            const b = d.lastElementChild!.getBoundingClientRect();
            return Math.round(b.bottom - a.top - d.clientHeight);
          }),
        );
        for (const o of over) expect(o, `${lang} ${w}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe('homepage · phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout');

  test('process: the stack on top · the steps as a list · a tap opens one', async ({ page }) => {
    await page.goto('/en');
    await toSection(page, 'prc');
    await page.locator('[data-lb="3"]').tap();
    await expect(page.locator('[data-ly]')).toHaveClass(/\bs3\b/);
    await expect(page.locator('#ly-d3')).toBeVisible();
    await expect(page.locator('#ly-d0')).toBeHidden();
    // The list flows under the stack (no leader lines).
    const stack = await page.locator('.ly-v').boundingBox();
    const first = await page.locator('[data-lr="0"]').boundingBox();
    expect(first!.y).toBeGreaterThanOrEqual(stack!.y + stack!.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('services: on a phone a tap opens the mock full screen · Lodos is its own mobile site · Pocket works · Close puts it back', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    await toSection(page, 'svc');
    await expect(page.locator('[data-stage]')).toHaveClass(/nw/);
    await expect(page.locator('[data-fxp]')).toBeVisible();
    const dlg = page.locator('[data-fv]');
    await page.locator('[data-frm]').tap({ position: { x: 40, y: 40 } });
    await expect(dlg).toBeVisible();
    const web = dlg.locator('[data-fc="0"]');
    await expect(web).toHaveClass(/live/);
    // Its own mobile layout: one card per row · the page scrolls under a finger.
    const cards = await web.locator('.wcards article').evaluateAll((a) => a.map((e) => Math.round(e.getBoundingClientRect().left)));
    expect(new Set(cards).size).toBe(1);
    expect(await web.locator('.wv').evaluate((e) => getComputedStyle(e).overflowY)).toBe('auto');
    await web.locator('.wn-b .wnb').tap();
    await expect.poll(() => web.locator('.wv').evaluate((e) => e.scrollTop)).toBeGreaterThan(1000);
    await web.locator('.wgrid i', { hasText: /^24$/ }).tap();
    await web.locator('.wslots i', { hasText: '08:30' }).tap();
    await web.locator('.wres').tap();
    await expect(web.locator('.wres')).toHaveClass(/booked/);
    await dlg.locator('[data-fvx]').tap();
    await expect(dlg).toBeHidden();
    await expect(page.locator('.clip [data-fc="0"]')).toHaveCount(1);
    // Pocket from the button under the frame.
    await page.locator('[data-opt="1"]').tap();
    await page.locator('[data-fxp]').tap();
    const ap = dlg.locator('[data-fc="1"] .ap');
    await ap.locator('.aacts .send').tap();
    await expect(ap).toHaveClass(/s-send/);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    // The Android artboard opens too · at its own size.
    await page.locator('.clip2').tap({ position: { x: 30, y: 60 } });
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-fca] .fc-app.and')).toBeVisible();
    await expect(dlg.locator('[data-fvt]')).toContainText('Android');
    await dlg.locator('[data-fvx]').tap();
    await expect(dlg).toBeHidden();
    await expect(page.locator('.clip2 [data-fca]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.classList.contains('fv-open'))).toBe(false);
    expect(errors).toEqual([]);
  });

});

test.describe('homepage · contact sentence', () => {
  test('a blank shrinks to its words from the first letter (smoothly) · and grows at once while typing', async ({ page }) => {
    await page.goto('/tr');
    await toSection(page, 'ctc');
    const mail = page.locator('[data-in="mail"]');
    const width = async () => (await mail.boundingBox())!.width;
    const empty = await width();
    await mail.click();
    await page.keyboard.type('b');
    // Not at once: shrinking glides (a width transition · no .grow) · then it lands on the letter.
    expect(await mail.evaluate((e) => !e.classList.contains('grow') && /width/.test(getComputedStyle(e).transitionProperty) && parseFloat(getComputedStyle(e).transitionDuration.split(',')[1] ?? '0') > 0.2)).toBe(true);
    await expect.poll(width).toBeLessThan(empty * 0.3);
    await page.keyboard.type('@lc.co');
    expect(await mail.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    // Empty again: back to the placeholder's room.
    await mail.fill('');
    await expect.poll(width).toBeGreaterThan(empty * 0.95);
  });

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
