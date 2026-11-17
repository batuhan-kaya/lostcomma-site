/**
 * 03 · Services on a narrow screen: the stage scales the mocks down until their words are a few
 * pixels tall. A tap on Lodos or Pocket (or the button under the frame) opens it full screen in a
 * modal dialog: Pocket at the size of a phone · Lodos as its own mobile site (a container query in
 * _frames.css) · or the desktop site fitted to a wider screen. The frame element itself moves into
 * the dialog and back, so the product keeps its state and its listeners (live.ts).
 */
import type { LiveMocks } from './live';
import { $ } from './shared';

const BAR = 52;
const HINT = 44;

export class Viewer {
  private readonly dlg = $<HTMLDialogElement>('[data-fv]');
  private readonly box = $('[data-fvbox]');
  private fc: HTMLElement | null = null;
  private home: { parent: Node; next: Node | null } | null = null;

  constructor(
    private readonly live: LiveMocks,
    private readonly title: (fc: HTMLElement) => string,
  ) {
    $('[data-fvx]')?.addEventListener('click', () => this.dlg?.close());
    // Escape and the close button both end here.
    this.dlg?.addEventListener('close', () => this.restore());
    addEventListener('resize', () => this.size(), { passive: true });
  }

  get ok(): boolean {
    return !!this.dlg && !!this.box && typeof this.dlg.showModal === 'function';
  }

  open(fc: HTMLElement): void {
    if (!this.ok || this.fc || !fc.parentNode) return;
    const app = !!$('.ap', fc);
    this.fc = fc;
    this.home = { parent: fc.parentNode, next: fc.nextSibling };
    this.dlg!.classList.toggle('app', app);
    const t = $('[data-fvt]', this.dlg!);
    if (t) t.textContent = this.title(fc);
    // The product is a picture to a screen reader · the dialog's name says what it is.
    fc.setAttribute('aria-hidden', 'true');
    this.box!.append(fc);
    document.documentElement.classList.add('fv-open');
    this.dlg!.showModal();
    this.size();
    this.live.hold(fc, true);
    if (!app) $('.wv', fc)?.scrollTo(0, 0);
  }

  private restore(): void {
    const fc = this.fc;
    if (!fc || !this.home) return;
    this.home.parent.insertBefore(fc, this.home.next);
    fc.removeAttribute('aria-hidden');
    for (const p of ['width', 'height', '--vk', '--wk']) this.box?.style.removeProperty(p);
    document.documentElement.classList.remove('fv-open');
    this.fc = null;
    this.home = null;
    this.live.hold(fc, false);
  }

  /** Pocket fits the screen like a phone (either one) · Lodos takes the whole width (its desktop layout scaled from 700 px up). */
  private size(): void {
    const fc = this.fc;
    const box = this.box;
    if (!fc || !box) return;
    const w = document.documentElement.clientWidth;
    const h = innerHeight - BAR - HINT;
    const ap = $('.ap', fc);
    if (ap) {
      // The phone's own size: 390 × 844 (iPhone) or 412 × 915 (Android).
      const pw = ap.offsetWidth;
      const ph = ap.offsetHeight;
      const k = Math.min((w - 32) / pw, (h - 12) / ph, 1.15);
      box.style.setProperty('--vk', k.toFixed(4));
      box.style.width = `${Math.round(pw * k)}px`;
      box.style.height = `${Math.round(ph * k)}px`;
    } else {
      box.style.setProperty('--wk', w > 700 ? Math.min(1, w / 780).toFixed(4) : '1');
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    }
  }
}
