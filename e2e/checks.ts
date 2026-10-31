import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Collects console errors and uncaught exceptions from the moment it is called.
 * The browser also logs the 404 status of a 404 page itself: that one is expected and skipped.
 */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().startsWith('Failed to load resource') && m.location().url === page.url()) return;
    errors.push(`${m.text()} (${m.location().url})`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/**
 * Brand rule: no comma in visible copy. Graphic commas are allowed inside
 * .egg or aria-hidden elements · code blocks are skipped.
 */
export function visibleCommas(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const text = n.nodeValue ?? '';
      if (!text.includes(',')) continue;
      const el = n.parentElement;
      if (!el || el.closest('script,style,code,pre,svg,[aria-hidden="true"],.egg')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      out.push(`${el.tagName.toLowerCase()}: ${text.trim().slice(0, 80)}`);
    }
    return out;
  });
}

/** Pixels the page sticks out sideways. Should be 0. */
export function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Serious and critical axe violations only. */
export async function axeProblems(page: Page): Promise<string[]> {
  // axe ships its own playwright-core types · the runtime object is the same.
  // The cursor layer is decoration (aria-hidden) and fades in and out: contrast checks
  // would catch tags mid-transition, so it is left out.
  const r = await new AxeBuilder({ page: page as never }).exclude('.crew').analyze();
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

/** Every @font-face the page uses actually loaded from our own origin. */
export function fontsReady(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return ['Anybody', 'Geist', 'Martian Mono'].every((f) => document.fonts.check(`16px "${f}"`));
  });
}
