import { expect, test } from '@playwright/test';
import { SERVICE_KEYS, SERVICE_SLUGS } from '../src/server/content/services';
import { STATIC_PAGES } from '../src/server/pages';
import { href, type RouteId } from '../src/server/routes';

/**
 * The keyboard focus ring must stand out from the ground it sits on (WCAG 1.4.11 · 3:1).
 * The ring follows the theme (--ring in themes.css) and dark blocks on light pages set their own:
 * every focus stop on every page is focused and its outline colour is measured against the
 * colour under it (the middle of each side of the ring). Grounds drawn with an image or a linear gradient are
 * skipped (no single colour).
 */
const paths = [
  ...(Object.keys(STATIC_PAGES) as RouteId[]).flatMap((id) => (['tr', 'en'] as const).map((lang) => href(lang, id))),
  ...SERVICE_KEYS.flatMap((k) => (['tr', 'en'] as const).map((lang) => href(lang, 'service', { slug: SERVICE_SLUGS[k][lang] }))),
  '/en/work/sailing-club',
  '/en/work/ferry-timetable',
  '/en/notes/how-our-cursors-move',
  '/en/no-such-page',
];

test.describe('focus ring contrast', () => {
  // Rings do not change with the width: one project is enough.
  test.skip(({ isMobile, hasTouch }) => isMobile || hasTouch, 'measured once on desktop');

  for (const path of paths) {
    test(`focus ring ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const low = await page.evaluate(() => {
        // No transitions: the ring is measured in its final colour.
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('*,*::before,*::after{transition:none!important}');
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        const parse = (c: string): number[] | null => {
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number);
          return [r, g, b, a];
        };
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
        };
        const ratio = (a: number[], b: number[]) => {
          const x = lum(a);
          const y = lum(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        /** Colours under one point (the element and its own children left out): blended down to the first opaque layer · null on an image. */
        const under = (el: Element, x: number, y: number): number[] | null => {
          const layers: number[][] = [];
          for (const e of document.elementsFromPoint(x, y)) {
            if (e === el || el.contains(e) || e.closest('.crew')) continue;
            const cs = getComputedStyle(e);
            if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('radial-gradient')) return null;
            const c = parse(cs.backgroundColor);
            if (c && c[3]! > 0) {
              layers.push(c);
              if (c[3]! >= 0.99) break;
            }
          }
          let base = (layers.pop() ?? parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]).slice(0, 3);
          while (layers.length) {
            const l = layers.pop()!;
            base = base.map((v, i) => v * (1 - l[3]!) + l[i]! * l[3]!);
          }
          return base;
        };
        /** The grounds the ring is drawn on: the middle of each of its four sides. */
        const grounds = (el: Element, cs: CSSStyleDeclaration): number[][] => {
          const r = el.getBoundingClientRect();
          const d = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth) / 2;
          const pts = [
            [r.left - d, r.top + r.height / 2],
            [r.right + d, r.top + r.height / 2],
            [r.left + r.width / 2, r.top - d],
            [r.left + r.width / 2, r.bottom + d],
          ].filter(([x, y]) => x! >= 0 && y! >= 0 && x! < innerWidth && y! < innerHeight);
          return pts.map(([x, y]) => under(el, x!, y!)).filter((g): g is number[] => !!g);
        };
        const out: string[] = [];
        const sel = 'a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          if (el.closest('[inert],.crew,[aria-hidden="true"]') || !el.getClientRects().length) continue;
          if (el.closest('details:not([open])') && !el.closest('summary')) continue;
          el.focus({ focusVisible: true } as FocusOptions);
          if (document.activeElement !== el || !el.matches(':focus-visible')) continue;
          // In the middle of the screen: sticky bars at the edges are not the ground.
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          const cs = getComputedStyle(el);
          if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0) continue;
          const ring = parse(cs.outlineColor);
          if (!ring) continue;
          // A negative offset draws the ring on the element itself (its own colour or a ::before that fills it).
          const fill = [parse(cs.backgroundColor), parse(getComputedStyle(el, '::before').backgroundColor)].find((c) => c && c[3]! > 0.5);
          const behind = parseFloat(cs.outlineOffset) < 0 && fill ? [fill] : grounds(el, cs);
          // A two-tone ring: a solid band (box-shadow 0 0 0 Npx) inside the outline counts where it stands out.
          const band = cs.boxShadow.match(/(rgba?\([^)]+\)) 0px 0px 0px ([2-9]|\d\d)px/);
          const bandColour = band ? parse(band[1]!) : null;
          const low = behind.map((g) => ({ g, r: Math.max(ratio(ring, g), bandColour ? ratio(bandColour, g) : 0) })).filter((x) => x.r < 3);
          // Segmented controls sit side by side: one side of the ring may cross the selected neighbour.
          // Three clear sides of four still read as a ring · two or more lost sides do not.
          if (low.length > (behind.length >= 4 ? 1 : 0)) {
            const sec = el.closest('[data-sec]')?.getAttribute('data-sec') ?? '';
            const { g, r } = low[0]!;
            out.push(`[${sec}] ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${cs.outlineColor} on rgb(${g.map(Math.round).join(', ')}) = ${r.toFixed(2)} (${low.length}/${behind.length} sides)`);
          }
        }
        (document.activeElement as HTMLElement | null)?.blur();
        return [...new Set(out)];
      });
      expect(low, 'focus rings under 3:1').toEqual([]);
    });
  }
});
