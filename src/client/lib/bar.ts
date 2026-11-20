/**
 * The header rides along (phase 17 · chrome.css `.hd`). At the top of the page it sits where it
 * always sat and scrolls away with the page. Once it is out of sight it becomes the bar (`.stk`)
 * and waits above the screen: a scroll up brings it back (`.up`) on the ground of the section under
 * it · a scroll down sends it away again. At the very top it is the page's header again. Keyboard
 * focus and the open menu always show it (CSS). No animation frames: the scroll event only toggles
 * classes and CSS slides it.
 */

/** Pixels a scroll travels the other way before the bar turns round (a trackpad's tremble is not a turn). */
const TURN = 8;

/** r g b of a computed colour · its alpha (rgb() · rgba() · color(srgb …)). */
function rgba(c: string): [number, number, number, number] | null {
  const n = c.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  const k = c.startsWith('color(') ? 255 : 1;
  return [n[0]! * k, n[1]! * k, n[2]! * k, n[3] ?? 1];
}

/** Relative luminance (WCAG) of an sRGB colour. */
function luminance([r, g, b]: [number, number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function headerBar(): void {
  const hd = document.querySelector<HTMLElement>('.hd');
  if (!hd) return;
  const root = document.documentElement;
  // The header's height (--head): read on the first scroll that needs it · not at load (a style
  // recalculation of the whole page before anything moved).
  let head = -1;
  let last = scrollY;
  let from = scrollY;
  let dir = 0;
  let stuck = false;
  let up = false;

  const measure = () => {
    head = parseFloat(getComputedStyle(root).getPropertyValue('--head')) || 92;
  };

  /** The ground of the section under the bar: its own colour or the first one around it that is solid. */
  const ground = (): string => {
    // Just under the bar's edge (its height · the slide does not count): the section its hairline meets.
    const y = hd.offsetHeight + 1;
    for (const el of document.elementsFromPoint(innerWidth / 2, y)) {
      if (hd.contains(el) || el.closest('.crew')) continue;
      for (let e: Element | null = el.closest('[data-sec]') ?? el; e && e !== root; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        const c = rgba(bg);
        if (c && c[3] > 0.9) return bg;
      }
      return '';
    }
    return '';
  };

  /** The bar takes the section's ground · its words turn light or dark when that is not the page's. */
  const tone = () => {
    const bg = ground();
    const own = getComputedStyle(root).backgroundColor;
    const c = bg && bg !== own ? rgba(bg) : null;
    if (!c) {
      hd.classList.remove('hd-d', 'hd-l');
      hd.style.removeProperty('--pbg');
      return;
    }
    const dark = luminance(c) < 0.36;
    hd.style.setProperty('--pbg', bg);
    hd.classList.toggle('hd-d', dark);
    hd.classList.toggle('hd-l', !dark);
  };

  /** Switch without a slide (the header is out of sight · or on its own place at the top). */
  const quiet = (fn: () => void) => {
    hd.classList.add('nt');
    fn();
    void hd.offsetHeight;
    hd.classList.remove('nt');
  };

  const show = (on: boolean) => {
    if (on === up) return;
    up = on;
    if (on) tone();
    hd.classList.toggle('up', on);
    root.classList.toggle('hd-up', on);
  };

  const update = () => {
    const y = scrollY;
    const d = y - last;
    last = y;
    if (d > 0 && dir <= 0) [dir, from] = [1, y - d];
    else if (d < 0 && dir >= 0) [dir, from] = [-1, y - d];
    if (y <= 0) {
      if (stuck) {
        stuck = false;
        show(false);
        hd.classList.remove('stk', 'hd-d', 'hd-l');
        hd.style.removeProperty('--pbg');
      }
      return;
    }
    if (!stuck) {
      if (head < 0) measure();
      if (y <= head) return;
      stuck = true;
      quiet(() => hd.classList.add('stk'));
    }
    if (dir > 0 && y - from > TURN) show(false);
    else if (dir < 0 && from - y > TURN) show(true);
    else if (up) tone();
  };

  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener(
    'resize',
    () => {
      head = -1;
      update();
    },
    { passive: true },
  );
  // Keyboard focus shows the bar (CSS) · it takes the ground it lands on.
  hd.addEventListener('focusin', () => {
    if (stuck) tone();
  });
}
