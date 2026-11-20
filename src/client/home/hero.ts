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
    // The size label is placed when the box is selected (the scene) · again while it shows if the
    // window or the letters change (late fonts change the words' boxes).
    const relabel = () => this.box?.classList.contains('sel') && this.label();
    document.fonts?.addEventListener('loadingdone', () => {
      this.widths.clear();
      relabel();
    });
    let width = innerWidth;
    addEventListener('resize', () => {
      this.frameLabel();
      // New width · new line breaks: let the headline find its own height again.
      // (A phone's toolbar sliding away changes only the height: keep it then.)
      if (this.hl && innerWidth !== width) {
        this.hl.style.minHeight = '';
        this.widths.clear();
      }
      width = innerWidth;
      relabel();
    }, { passive: true });
    this.popovers();
  }

  /** "Home · 1440 × 900": the label shows the visitor's actual frame. */
  private frameLabel(): void {
    const el = $('[data-flab]');
    if (el) el.textContent = `${t('Ana sayfa')} · ${innerWidth} × ${innerHeight}`;
  }

  /** Widths of the words in the headline's own letters (a hidden probe beside the box) · per screen width. */
  private readonly widths = new Map<string, number>();
  private probe: HTMLElement | null = null;

  private widthOf(word: string): number {
    const have = this.widths.get(word);
    if (have !== undefined) return have;
    if (!this.hl) return 0;
    if (!this.probe) {
      this.probe = document.createElement('span');
      this.probe.className = 'wprobe';
      this.probe.setAttribute('aria-hidden', 'true');
      this.hl.append(this.probe);
    }
    this.probe.textContent = word;
    const w = this.probe.getBoundingClientRect().width;
    this.widths.set(word, w);
    return w;
  }

  /** How much wider the box will be with the widest word than it is now. */
  private room(): number {
    const now = this.word?.getBoundingClientRect().width ?? 0;
    return Math.max(0, ...this.data.words.map((w) => this.widthOf(w) - now));
  }

  /** Lines of words in the hero outside the box (and the shown chrome around it: label · lead · buttons). */
  private wordsAround(): DOMRect[] {
    const S = this.hl?.closest('[data-sec]');
    if (!S || !this.box) return [];
    const out: DOMRect[] = [];
    const walk = document.createTreeWalker(S, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.nodeValue?.trim() || this.box.contains(host) || host.closest('[aria-hidden="true"],.wprobe')) continue;
      // Not opacity: the headline's lines fade in when the page opens and are words all the same.
      if (!(host.checkVisibility?.({ visibilityProperty: true }) ?? true)) continue;
      range.selectNodeContents(n);
      out.push(...range.getClientRects());
    }
    return out;
  }

  /**
   * The size label says the headline's real size and goes where it covers no words: under the box
   * (a word on the last line) · beside it (a word with its line to itself · room for the widest
   * word counted in: the label rides on the box's edge) · else nowhere. Phones hide it (home.css).
   */
  private label(): void {
    const sz = this.box?.querySelector<HTMLElement>('.sz');
    if (!sz || !this.hl) return;
    sz.textContent = `${t('Metin')} · ${Math.round(parseFloat(getComputedStyle(this.hl).fontSize))}`;
    sz.classList.remove('side', 'off');
    if (!sz.getClientRects().length) return;
    const words = this.wordsAround();
    const vw = document.documentElement.clientWidth;
    // `grow`: the label rides on the box's edge from where it is to where the widest word ends.
    const hits = (r: DOMRect, list: DOMRect[], grow = 0) =>
      r.right + grow > vw - 8 || list.some((w) => r.left < w.right + 6 && w.left - 6 < r.right + grow && r.top < w.bottom + 4 && w.top - 4 < r.bottom);
    // Under the box only the lines under it count (a line's box reaches into its neighbours').
    const end = this.box!.getBoundingClientRect().bottom;
    if (!hits(sz.getBoundingClientRect(), words.filter((w) => (w.top + w.bottom) / 2 > end))) return;
    sz.classList.add('side');
    if (!hits(sz.getBoundingClientRect(), words, this.room())) return;
    sz.classList.replace('side', 'off');
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
        this.label();
        this.box.classList.add('sel');
        // Hands on the keyboard: the mouse slides off the word (past where the next one will end) and
        // stays where its tag covers no words (a phone's headline: beside the word on its own line).
        const next = this.data.words[(this.wi + 1) % this.data.words.length] ?? '';
        const grow = Math.max(0, this.widthOf(next) - (this.word?.getBoundingClientRect().width ?? 0));
        c.stay('design', grow + 10 + Math.random() * 10, 8 + Math.random() * 8, true);
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
