/** 01 · Hero: the word box · the bouncing period · publish · the header popovers. */
import type { Crew } from '../lib/crew';
import { t } from '../lib/t';
import { $, $$, doing, type HomeData, isAbort, replay } from './shared';

export class Hero {
  readonly box = $('[data-wbox]');
  readonly word = $('[data-word]');
  readonly dot = $('[data-dot]');
  readonly pub = $('[data-pub]');
  /** The headline around the word box. */
  private readonly hl = this.box?.closest<HTMLElement>('h1') ?? null;
  private wi = 0;
  private ver = 214;
  private live = true;
  typing = false;
  userWordAt = 0;

  constructor(
    private readonly data: HomeData,
    private readonly crew: Crew | null,
  ) {
    this.box?.addEventListener('click', () => this.userWord());
    this.dot?.addEventListener('click', () => {
      this.bounce();
      if (this.crew?.current === 'hero') this.crew.say('motion', t('o benim işim'), 1600);
    });
    this.pub?.addEventListener('click', () => {
      if (this.live) {
        this.crew?.say('code', t('zaten yayında'), 1400);
        return;
      }
      this.publish();
      this.crew?.say('code', t('yayınladın. süper'), 1800);
    });
    this.frameLabel();
    let width = innerWidth;
    addEventListener('resize', () => {
      this.frameLabel();
      // New width · new line breaks: let the headline find its own height again.
      // (A phone's toolbar sliding away changes only the height: keep it then.)
      if (this.hl && innerWidth !== width) this.hl.style.minHeight = '';
      width = innerWidth;
    }, { passive: true });
    this.popovers();
  }

  /** "Home · 1440 × 900": the label shows the visitor's actual frame. */
  private frameLabel(): void {
    const el = $('[data-flab]');
    if (el) el.textContent = `${t('Ana sayfa')} · ${innerWidth} × ${innerHeight}`;
  }

  /**
   * Words have different lengths. On a phone a shorter word can take a line away from the
   * headline and everything below would jump up and back. The headline keeps the tallest
   * height it has had at this width instead.
   */
  private hold(): void {
    if (!this.hl) return;
    const h = this.hl.offsetHeight;
    if (h > (parseFloat(this.hl.style.minHeight) || 0)) this.hl.style.minHeight = `${h}px`;
  }

  private userWord(): void {
    if (this.typing || !this.word || !this.box) return;
    this.hold();
    this.wi = (this.wi + 1) % this.data.words.length;
    this.word.textContent = this.data.words[this.wi] ?? '';
    replay(this.box, 'flash');
    this.userWordAt = Date.now();
    this.setLive(false);
  }

  bounce(): void {
    if (this.dot) replay(this.dot, 'bn');
  }

  setLive(on: boolean): void {
    this.live = on;
    $('[data-pubdot]')?.classList.toggle('live', on);
    const txt = $('[data-pubtxt]');
    if (txt) txt.textContent = on ? t('Yayında · v{n}', { n: this.ver }) : t('Taslak · 1 değişiklik');
  }

  publish(): number {
    this.ver++;
    this.setLive(true);
    return this.ver;
  }

  /** Delete the word letter by letter and type the next one. Finishes the word if interrupted. */
  async typeNext(signal: AbortSignal): Promise<void> {
    const el = this.word;
    if (!el || !this.box || !this.crew) return;
    this.wi = (this.wi + 1) % this.data.words.length;
    const next = this.data.words[this.wi] ?? '';
    this.hold();
    this.typing = true;
    this.box.classList.add('typing');
    try {
      let s = el.textContent ?? '';
      while (s.length) {
        s = s.slice(0, -1);
        el.textContent = s;
        await this.crew.sleep(24, signal);
      }
      await this.crew.sleep(220, signal);
      for (let i = 1; i <= next.length; i++) {
        el.textContent = next.slice(0, i);
        await this.crew.sleep(70 + Math.random() * 70, signal);
      }
    } catch (e) {
      if (isAbort(e)) el.textContent = next;
      throw e;
    } finally {
      this.box.classList.remove('typing', 'sel');
      this.typing = false;
      this.hold();
    }
  }

  /** Clicking an avatar in the header tells you what that teammate is up to. */
  private popovers(): void {
    const box = $('[data-popv]');
    if (!box) return;
    let open = '';
    let timer = 0;
    const close = () => {
      box.hidden = true;
      open = '';
    };
    const texts: Record<string, () => [string, string]> = {
      design: () => ['design', (doing.design ?? this.data.doing.design) + '.'],
      code: () => ['code', (doing.code ?? this.data.doing.code) + '.'],
      motion: () => ['motion', (doing.motion ?? this.data.doing.motion) + '.'],
      comma: () => ['comma', t('Ait olduğu yere döndü. Bulduğun için teşekkürler.')],
      ghost: () => [t('biri'), t('Küçük biri dosyadan çıkıp duruyor. Mercan rengi. Çok utangaç.')],
      you: () => [t('sen'), t('Bu sensin. Dosyaya hoş geldin.')],
    };
    for (const b of $$<HTMLButtonElement>('[data-pop]')) {
      b.addEventListener('click', () => {
        const who = b.dataset.pop ?? '';
        if (open === who) return close();
        const [name, txt] = texts[who]?.() ?? ['', ''];
        box.querySelector('b')!.textContent = name;
        box.querySelector('span')!.textContent = txt;
        box.hidden = false;
        open = who;
        clearTimeout(timer);
        timer = window.setTimeout(close, 4800);
      });
    }
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  }

  /** The hero scene: design rewrites the word · motion bounces the period · code ships. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    await c.sleep(1200, signal);
    for (;;) {
      if (!this.box || !this.dot || !this.pub) return;
      doing.design = t('Başlığı yeniden yazıyor');
      await c.go('design', { el: this.box, fx: 1, fy: 0.78, dx: 2 }, signal);
      c.press('design');
      await c.sleep(150, signal);
      c.press('design');
      if (this.userWordAt && Date.now() - this.userWordAt < 20_000) {
        this.userWordAt = 0;
        c.say('design', t('güzel kelime'), 1800);
        await c.sleep(1600, signal);
      }
      if (!this.typing) {
        this.box.classList.add('sel');
        await c.sleep(650, signal);
        await this.typeNext(signal);
        this.setLive(false);
      }
      await c.sleep(500, signal);
      c.home('design');
      doing.motion = t('Noktayı zıplatıyor');
      await c.go('motion', { el: this.dot, fx: 0.45, fy: 0.82 }, signal);
      c.press('motion');
      this.bounce();
      c.say('motion', 'boing', 1300);
      await c.sleep(1100, signal);
      c.home('motion');
      doing.code = t('En yeni sürümü yayınlıyor');
      await c.go('code', { el: this.pub, fx: 0.45, fy: 0.62 }, signal);
      c.press('code');
      const v = this.publish();
      c.say('code', t('v{n} yayında', { n: v }), 1500);
      await c.sleep(900, signal);
      c.home('code');
      doing.design = t('Daha iyi bir kelime arıyor');
      doing.code = t('Derlemeyi izliyor');
      await c.sleep(3400, signal);
    }
  };
}
