/**
 * The footer's sign-off is drawn with a pen the first time it comes into view (CSS in chrome.css:
 * .ft[data-draw]). Waits only when the footer starts off screen · with reduced motion or no
 * IntersectionObserver the mark is simply there. One observer · gone after the first draw.
 */
import { reducedMotion } from './motion';

export function drawFooter(): void {
  const ft = document.querySelector<HTMLElement>('[data-ft]');
  if (!ft || reducedMotion() || !('IntersectionObserver' in window)) return;
  const sign = ft.querySelector<HTMLElement>('.ft-lock') ?? ft;
  const r = sign.getBoundingClientRect();
  // Already on screen (a short page): draw now.
  if (r.top < window.innerHeight && r.bottom > 0) {
    ft.dataset.draw = 'go';
    return;
  }
  ft.dataset.draw = 'wait';
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      ft.dataset.draw = 'go';
      io.disconnect();
    },
    { threshold: 0.35 },
  );
  io.observe(sign);
}
