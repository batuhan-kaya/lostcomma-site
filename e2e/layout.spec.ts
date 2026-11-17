import { expect, test, type Page } from '@playwright/test';
import { HOME } from '../src/server/content/home';

/**
 * Layout at the edges of each breakpoint: things that only break at one width or with one word.
 * Every test sets its own viewport, so one project runs them.
 */
test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'sets its own widths');

/** How far the text of every match pokes out of its box (0 = inside). */
const pokesOut = (page: Page, sel: string, box: string) =>
  page.evaluate(
    ([s, b]) =>
      [...document.querySelectorAll<HTMLElement>(s!)].map((el) => {
        // Words must fit whole: a word broken in the middle (overflow-wrap) does not count as fitting.
        el.style.overflowWrap = 'normal';
        const c = el.closest(b!)!.getBoundingClientRect();
        const r = document.createRange();
        r.selectNodeContents(el);
        const t = r.getBoundingClientRect();
        el.style.overflowWrap = '';
        return Math.max(0, Math.round(t.right - c.right), Math.round(c.left - t.left));
      }),
    [sel, box],
  );

test('the header fits a 320 and a 360 px phone with its gutter', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ['/tr', '/en/work']) {
      await page.goto(path);
      const right = await page.locator('.hd .mb').evaluate((e) => e.getBoundingClientRect().right);
      expect(right, `${path} at ${width}`).toBeLessThanOrEqual(width - 12);
      const logo = await page.locator('.hd .logo').evaluate((e) => e.getBoundingClientRect().right);
      const lang = await page.locator('.hd .lang').evaluate((e) => e.getBoundingClientRect().left);
      expect(logo, 'logo and language switch do not touch').toBeLessThan(lang);
    }
  }
});

test('the hero headline fits at every width with every word', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const lang of ['tr', 'en'] as const) {
    for (const width of [761, 820, 1024, 1100, 1101, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${lang}`);
      await page.evaluate(() => document.fonts.ready);
      for (const word of HOME[lang].words) {
        const over = await page.evaluate((w) => {
          document.querySelector('[data-word]')!.textContent = w;
          const vw = document.documentElement.clientWidth;
          return Math.max(
            ...[...document.querySelectorAll('.hl .ln')].map((l) => {
              const r = document.createRange();
              r.selectNodeContents(l);
              return r.getBoundingClientRect().right - vw;
            }),
          );
        }, word);
        expect(over, `${lang} "${word}" at ${width}`).toBeLessThanOrEqual(0);
      }
    }
  }
});

test('the checklist summary rides along the list and never over the heading', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 860 });
    await page.goto('/en/services/apps');
    // The section coming up from below: its heading sits low on the screen.
    await page.evaluate(() => {
      const s = document.querySelector('[data-sec="get"]')!;
      scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.55);
    });
    const hit = await page.evaluate(() => {
      const a = document.querySelector('.ghd .h2')!.getBoundingClientRect();
      const b = document.querySelector('.sumbar')!.getBoundingClientRect();
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
    expect(hit, `summary bar over the heading at ${width}`).toBe(false);
  }
});

test('layer names take a second line instead of being cut', async ({ page }) => {
  for (const width of [768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/en/work', '/tr/isler']) {
      await page.goto(path);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.rw .rn > span:first-child')]
          .filter((s) => s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 2)
          .map((s) => s.textContent),
      );
      expect(cut, `${path} at ${width}`).toEqual([]);
    }
  }
});

test('nothing is cut on a 320 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const cases: [string, string, string][] = [
    ['/tr', '.fname b', '.fname'],
    ['/tr/isler/yelken-kulubu', '.swb b', '.swb'],
    ['/tr/isler/yelken-kulubu', '.t-tide .pct', '.t-tide'],
    ['/tr/isler/yelken-kulubu', '.stp b', '.t-steps'],
    ['/tr/isler/yelken-kulubu', '.vi .top > .mono', '.vi'],
    ['/en/work/ferry-timetable', '.nxl b', '.nx'],
    ['/tr/hizmetler', '.tname', '.tile'],
  ];
  for (const [path, sel, box] of cases) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(Math.max(...(await pokesOut(page, sel, box))), `${sel} on ${path}`).toBe(0);
    // A truncated name (ellipsis) is cut too.
    const trunc = await page.locator(sel).evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').length);
    expect(trunc, `${sel} truncated on ${path}`).toBe(0);
  }
  // The badge of the popular price sits above its size line, not on it.
  await page.goto('/tr/hizmetler/web-siteleri');
  const overlap = await page.evaluate(() => {
    const a = document.querySelector('.pc.hot .badge')!.getBoundingClientRect();
    const b = document.querySelector('.pc.hot > .mono:not(.badge)')!.getBoundingClientRect();
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  });
  expect(overlap, 'badge over the size line').toBe(false);
});

test('a word and its arrow never touch (flex drops the space between them)', async ({ page }) => {
  const paths = ['/tr', '/en/services/websites', '/tr/hizmetler/hareket', '/en/process', '/tr/studyo', '/en/start', '/tr/isler/yelken-kulubu', '/en/notes'];
  for (const path of paths) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const glued = await page.evaluate(() => {
      const out: string[] = [];
      for (const icon of document.querySelectorAll<HTMLElement>('a > span[aria-hidden="true"]:last-child, button > span[aria-hidden="true"]:last-child')) {
        if (!/^[→↗↑←↺↓]$/.test(icon.textContent!.trim()) || !icon.getClientRects().length) continue;
        const before = icon.previousSibling;
        if (!before || before.nodeType !== Node.TEXT_NODE || !before.nodeValue!.trim()) continue;
        const r = document.createRange();
        r.selectNodeContents(before);
        const text = [...r.getClientRects()].pop();
        const arrow = icon.getBoundingClientRect();
        // Same line only: a wrapped arrow is fine.
        if (text && Math.abs(text.top - arrow.top) < arrow.height && arrow.left - text.right < 2) out.push(icon.parentElement!.textContent!.trim());
      }
      return out;
    });
    expect(glued, path).toEqual([]);
  }
});

test('the milestone flags on the process ruler never collide', async ({ page }) => {
  for (const path of ['/tr/surec', '/en/process']) {
    for (const width of [821, 900, 1024, 1100, 1180, 1252, 1301, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const hits = await page.evaluate(() => {
        const ms = [...document.querySelectorAll('.ms')].filter((e) => e.getClientRects().length).map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() }));
        const out: string[] = [];
        for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (ms[i]!.r.left < ms[j]!.r.right - 1 && ms[j]!.r.left < ms[i]!.r.right - 1) out.push(`${ms[i]!.t} ✕ ${ms[j]!.t}`);
        return out;
      });
      expect(hits, `${path} at ${width}`).toEqual([]);
    }
  }
});
