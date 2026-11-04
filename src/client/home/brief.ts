/**
 * 06 · The contact sentence. The form works on its own (three real inputs · posts to
 * /api/brief). Here the blanks grow with what is typed · the topic suggests ideas in turn (while
 * the section is on screen) · the selection and the host follow the blank in use · it posts with
 * fetch and the sentence turns into the thanks with the visitor's name and address in it.
 */
import type { Crew } from '../lib/crew';
import { reducedMotion } from '../lib/motion';
import { t } from '../lib/t';
import { $, $$, doing, type HomeData, lang } from './shared';

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KEYS = ['name', 'what', 'mail'] as const;
type Key = (typeof KEYS)[number];
/** A topic stays this long before the next one (the cursors' bubble time). */
const IDEA_MS = 2618;

export class Brief {
  private readonly form = $<HTMLFormElement>('[data-sf]');
  private readonly done = $('[data-sdone]');
  private readonly reduce = reducedMotion();
  private readonly longest: string;
  /** Measures text in the sentence's own letters (the blanks are sized to their words). */
  private probe: HTMLSpanElement | null = null;
  private sent = false;
  private idea = 0;
  private cycle = 0;
  private onScreen = false;
  /** Restarts the topic cycle (set once suggest() has wired it). */
  private rerun: (() => void) | null = null;
  private greeted = '';
  private timers: Record<string, number> = {};

  constructor(
    private readonly data: HomeData,
    private readonly crew: Crew | null,
  ) {
    this.longest = (data.sentence?.ideas ?? []).reduce((a, b) => (b.length > a.length ? b : a), '');
    const f = this.form;
    if (!f) return;
    // With JS we check the address ourselves (and say so in the sentence). Without JS the browser does.
    f.noValidate = true;
    for (const k of KEYS) {
      const el = this.input(k);
      if (!el) continue;
      el.addEventListener('input', () => this.typed(k));
      el.addEventListener('focus', () => this.focused(k));
      el.addEventListener('blur', () => this.later('blur', 0, () => this.blurred()));
    }
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.send();
    });
    $('[data-copy]')?.addEventListener('click', () => this.copy());
    $('[data-again]')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.again();
    });
    for (const k of KEYS) this.size(k);
    // The display face and the sentence's size (it follows the window) change the widths.
    void document.fonts?.ready.then(() => this.sizeAll());
    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => this.sizeAll(), 120);
    });
    this.select();
    this.suggest();
  }

  private sizeAll(): void {
    for (const k of KEYS) this.size(k);
  }

  private later(key: string, ms: number, fn: () => void): void {
    clearTimeout(this.timers[key]);
    this.timers[key] = window.setTimeout(fn, ms);
  }

  private input(k: Key): HTMLInputElement | null {
    return this.form ? $<HTMLInputElement>(`[data-in="${k}"]`, this.form) : null;
  }
  private wrap(k: Key): HTMLElement | null {
    return this.form ? $(`[data-bw="${k}"]`, this.form) : null;
  }
  private val(k: Key): string {
    return (this.input(k)?.value ?? '').trim();
  }
  private get active(): Key | null {
    return KEYS.find((k) => this.input(k) === document.activeElement) ?? null;
  }

  /* ---------------- the blanks ---------------- */

  /** Width of a text set like the sentence (px). */
  private measure(text: string): number {
    const sen = $('.sen', this.form ?? document);
    if (!sen) return 0;
    if (!this.probe || !this.probe.isConnected) {
      this.probe = document.createElement('span');
      this.probe.className = 'bprobe';
      this.probe.setAttribute('aria-hidden', 'true');
      sen.append(this.probe);
    }
    this.probe.textContent = text;
    return this.probe.getBoundingClientRect().width;
  }

  /**
   * A blank is exactly as wide as what is in it (or its placeholder) · the topic never narrower
   * than its longest idea (so the line does not jump while the ideas change). Without JS the
   * browser sizes it (field-sizing · else the size attribute).
   */
  private size(k: Key): void {
    const el = this.input(k);
    if (!el) return;
    const w = Math.max(this.measure(el.value || el.placeholder), k === 'what' ? this.measure(this.longest) : 0);
    if (w > 0) el.style.width = `${Math.ceil(w) + 2}px`;
  }

  /** The selection sits on the blank in use · else on the first empty one (an invitation) · else nowhere. */
  private select(): void {
    const on = this.active ?? KEYS.find((k) => !this.val(k)) ?? null;
    for (const k of KEYS) this.wrap(k)?.classList.toggle('on', k === on);
  }

  private bad(on: boolean): void {
    const w = this.wrap('mail');
    if (!w) return;
    w.classList.toggle('bad', on);
    const tag = $('[data-btag]', w);
    if (tag) tag.textContent = on ? t('Bu adres eksik gibi') : `${t('Metin')} · ${t('e-posta')}`;
  }

  private typed(k: Key): void {
    this.size(k);
    this.select();
    if (k === 'mail') {
      this.bad(false);
      this.note('');
    }
    const name = this.val('name');
    if (k === 'name' && name && name !== this.greeted) {
      this.later('hi', 900, () => {
        const c = this.crew;
        if (!c || c.current !== 'ctc' || !c.animates('ctc') || this.val('name') !== name) return;
        this.greeted = name;
        c.say(c.hostOf('ctc'), t('selam {name}', { name }), 2618);
      });
    }
  }

  /** The host walks to the blank in use and waits beside it. */
  private focused(k: Key): void {
    clearTimeout(this.timers.blur);
    this.select();
    const c = this.crew;
    const el = this.wrap(k)?.closest('.sl');
    if (!c || !el || c.current !== 'ctc' || !c.animates('ctc')) return;
    const host = c.hostOf('ctc');
    c.cast(host);
    // After the words of that line: it watches without standing on what you type.
    c.aim(host, { el, end: true, dx: 20, dy: -8 });
  }

  private blurred(): void {
    this.select();
    const c = this.crew;
    if (!this.active && c && c.current === 'ctc') c.home(c.hostOf('ctc'));
  }

  /** Topics in turn in the empty topic blank: only while the section is on screen · never with reduced motion. */
  private suggest(): void {
    if (this.rerun) return this.rerun();
    const ideas = this.data.sentence?.ideas ?? [];
    const el = this.input('what');
    const sec = $('[data-sec="ctc"]');
    if (this.reduce || ideas.length < 2 || !el || !sec) return;
    const run = () => {
      clearInterval(this.cycle);
      this.cycle = 0;
      if (!this.onScreen || document.hidden || this.sent) return;
      this.cycle = window.setInterval(() => {
        if (el.value || document.activeElement === el) return;
        this.idea = (this.idea + 1) % ideas.length;
        el.placeholder = ideas[this.idea] ?? '';
      }, IDEA_MS);
    };
    this.rerun = run;
    new IntersectionObserver((es) => {
      this.onScreen = es.some((e) => e.isIntersecting);
      run();
    }).observe(sec);
    document.addEventListener('visibilitychange', run);
  }

  /* ---------------- sending ---------------- */

  private note(txt: string): void {
    const n = $('[data-note]');
    if (n) n.textContent = txt;
  }

  private copy(): void {
    navigator.clipboard?.writeText('hello@lostcomma.co').catch(() => undefined);
    const b = $('[data-copy]');
    if (!b) return;
    b.textContent = t('Kopyalandı');
    this.later('cp', 1800, () => (b.textContent = t('Adresi kopyala')));
  }

  async send(): Promise<void> {
    if (this.sent || !this.form) return;
    const mail = this.val('mail');
    if (!MAIL.test(mail)) {
      this.bad(true);
      this.input('mail')?.focus();
      const c = this.crew;
      if (c?.current === 'ctc' && c.animates('ctc')) c.say(c.hostOf('ctc'), t('cevap için bir e-posta lazım'), 2618);
      return;
    }
    const btn = $('[data-go]');
    const label = $('[data-gotxt]');
    btn?.classList.add('busy');
    if (label) label.textContent = t('Gönderiliyor');
    const body = {
      lang: lang(),
      name: this.val('name'),
      email: mail,
      message: this.val('what'),
      company: $<HTMLInputElement>('[name="company"]', this.form)?.value ?? '',
    };
    let ok = false;
    try {
      const res = await fetch('/api/brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      ok = res.ok;
    } catch {
      ok = false;
    }
    btn?.classList.remove('busy');
    if (label) label.textContent = t('Gönder');
    if (!ok) {
      this.note(t('Gönderemedik. E-posta adresini kontrol edip tekrar dene.'));
      return;
    }
    this.sent = true;
    clearInterval(this.cycle);
    this.showDone(body.name, mail);
  }

  /** "Thank you Ayşe. We’ll write to ayse@… within a day." */
  private showDone(name: string, mail: string): void {
    const s = this.data.sentence;
    const thanks = $('[data-dthanks]');
    const will = $('[data-dwill]');
    if (thanks && s) thanks.replaceChildren(name ? `${s.thanks} ${name}` : s.thanks, Object.assign(document.createElement('em'), { textContent: '.' }));
    if (will && s) will.textContent = `${s.will[0]}${mail}${s.will[1]}`;
    this.form!.hidden = true;
    if (this.done) this.done.hidden = false;
    const c = this.crew;
    if (c?.current === 'ctc') {
      const host = c.hostOf('ctc');
      c.home(host);
      if (c.animates('ctc')) this.later('bye', 900, () => c.say(host, t('dosyada görüşürüz'), 2618));
    }
  }

  private again(): void {
    const f = this.form;
    if (!f) return;
    f.reset();
    this.sent = false;
    this.greeted = '';
    this.bad(false);
    this.note('');
    for (const k of KEYS) this.size(k);
    if (this.done) this.done.hidden = true;
    f.hidden = false;
    this.input('name')?.focus();
    this.select();
    this.suggest();
  }

  /** A quiet start: the host already rests by the first blank · it says where to begin once. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('ctc');
    doing[host] = t('İletini bekliyor');
    await c.sleep(2400, signal);
    if (!this.sent && !this.active && !$$('[data-in]', this.form ?? document).some((el) => (el as HTMLInputElement).value)) {
      c.once('ctc-start', host, t('adınla başla'), 2618);
    }
  };
}
