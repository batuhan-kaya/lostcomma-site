/**
 * The footer's sign-off ends on a comma (layout/chrome.ts · chrome.css: .ft[data-draw]). The
 * first time the line shows the comma is typed: the host cursor comes to the end of the line ·
 * clicks (the caret appears) · moves out of the way · the comma drops in. Without a host on the
 * page (touch screens · the cursor is elsewhere) the caret and the comma come by themselves.
 * With reduced motion or no IntersectionObserver everything is simply there. One observer · gone
 * after the first time.
 */
import { getCrew } from './crew';
import { reducedMotion } from './motion';

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function signOff(): void {
  const ft = document.querySelector<HTMLElement>('[data-ft]');
  const line = ft?.querySelector<HTMLElement>('[data-ft-line]');
  if (!ft || !line || reducedMotion() || !('IntersectionObserver' in window)) return;
  ft.dataset.draw = 'wait';
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      void type(ft, line);
    },
    { threshold: 0.6 },
  );
  io.observe(line);
}

async function type(ft: HTMLElement, line: HTMLElement): Promise<void> {
  const crew = getCrew();
  const host = crew?.hostOf('ft');
  let led = false;
  try {
    // The team may need a moment to notice the footer (a section change settles first).
    for (let i = 0; i < 8 && crew?.animates('ft') && crew.current !== 'ft'; i++) await wait(100);
    if (crew && host && crew.current === 'ft' && crew.animates('ft') && crew.visible(host)) {
      led = true;
      await crew.go(host, { el: line.querySelector('.ft-say'), end: true, dx: 3, dy: 10 }, new AbortController().signal, 1800);
      await wait(160);
      crew.press(host);
      await wait(110);
    } else await wait(300);
    ft.dataset.draw = 'set';
    // Hands on the keyboard: the mouse goes out of the text's way (its resting spot is after the line).
    if (led && host && crew?.current === 'ft') crew.home(host);
    await wait(760);
  } finally {
    ft.dataset.draw = 'go';
  }
}
