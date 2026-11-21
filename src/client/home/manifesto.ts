/**
 * 02 · Manifesto: tracked changes typed by the team · Show suggestions / Accept all / Reject all in
 * the document's own bar. Where the team does not come below the hero (touch screens) the edit
 * types itself once the document is on screen and waits while it is off screen. Reduced motion
 * and a still page keep the finished edit.
 */
import type { Crew, Name } from '../lib/crew';
import { reducedMotion } from '../lib/motion';
import { t } from '../lib/t';
import { $, $$, doing } from './shared';

type Mode = 'track' | 'final' | 'orig';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export class Manifesto {
  private readonly sec = $('[data-sec="mf"]');
  private readonly doc = $('[data-doc]');
  private readonly cmts = $('[data-cmts]');
  private readonly changes = $$<HTMLElement>('[data-ch]');
  private mode: Mode = 'track';
  /** How many changes are finished. */
  private step = 0;
  /** The visitor pressed Show suggestions · Accept all · Reject all: the edit is theirs and nobody types any more. */
  private picked = false;
  /** The document is on screen (the edit that plays by itself waits for it). */
  private shown = false;
  private wake: (() => void) | null = null;

  constructor(private readonly crew: Crew | null) {
    const team = !!crew?.animates('mf');
    const alone = !team && !reducedMotion() && !document.documentElement.classList.contains('still');
    // The server sends the finished edit. If someone is going to type it, rewind first.
    if (team || alone) this.rewind();
    else this.step = this.changes.length;
    for (const b of $$<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => this.setMode(b.dataset.mode as Mode));
    if (alone) this.watch();
    this.strip();
  }

  private rewind(): void {
    for (const ch of this.changes) {
      ch.classList.remove('on');
      const ins = ch.querySelector('ins');
      if (ins) ins.textContent = '';
    }
    for (const cm of $$('[data-cmt]')) cm.classList.remove('show');
    this.status(t('3 kişi düzenliyor'));
  }

  private status(txt: string): void {
    const el = $('[data-docstat]');
    if (el) el.textContent = txt;
  }

  /** "● design is typing" in the document's bar (the name keeps its own spelling in upper case). */
  private typist(who: Name): void {
    const el = $('[data-docstat]');
    if (!el) return;
    const dot = document.createElement('i');
    dot.className = `mdot c-${who}`;
    const name = document.createElement('span');
    name.lang = 'en';
    name.textContent = who;
    el.replaceChildren(dot, name, ` ${t('yazıyor')}`);
  }

  private caption(txt: string): void {
    const el = $('[data-doccap]');
    if (el) el.textContent = txt;
  }

  private comment(i: number, bring = false): void {
    const cm = $<HTMLElement>(`[data-cmt="${i}"]`);
    if (!cm) return;
    cm.classList.add('show');
    // Under the document a comment takes room once it is written: the strip may scroll now.
    this.fitStrip?.();
    // A phone's comments are a strip: bring the new one in (the strip scrolls · never the page).
    const s = this.cmts;
    if (bring && s && s.scrollWidth > s.clientWidth + 1) {
      const pad = parseFloat(getComputedStyle(s).paddingLeft) || 0;
      s.scrollTo({ left: cm.offsetLeft - s.offsetLeft - pad, behavior: 'smooth' });
    }
  }

  private fitStrip: (() => void) | null = null;

  /** The comments become a strip on a phone: then it is a region the keyboard can scroll too. */
  private strip(): void {
    const s = this.cmts;
    if (!s) return;
    const fit = () => {
      const scrolls = s.scrollWidth > s.clientWidth + 1;
      if (scrolls) {
        s.setAttribute('role', 'region');
        s.setAttribute('aria-label', t('Yorumlar'));
        s.tabIndex = 0;
      } else {
        s.removeAttribute('role');
        s.removeAttribute('aria-label');
        s.removeAttribute('tabindex');
      }
    };
    this.fitStrip = fit;
    fit();
    addEventListener('resize', fit, { passive: true });
  }

  /** Complete every change that was started (a scene was interrupted mid-word). */
  private fix(): void {
    this.changes.forEach((ch, i) => {
      if (!ch.classList.contains('on')) return;
      const ins = ch.querySelector<HTMLElement>('ins');
      if (ins) ins.textContent = ins.dataset.ins ?? '';
      ch.classList.remove('typing');
      this.comment(i);
      if (i >= this.step) this.step = i + 1;
    });
  }

  private finish(): void {
    for (const ch of this.changes) ch.classList.add('on');
    this.fix();
    this.step = this.changes.length;
  }

  setMode(m: Mode): void {
    this.picked = true;
    this.wake?.();
    this.finish();
    this.mode = m;
    this.doc?.classList.remove('m-track', 'm-final', 'm-orig');
    this.doc?.classList.add('m-' + m);
    this.sec?.classList.remove('mf-track', 'mf-final', 'mf-orig');
    this.sec?.classList.add('mf-' + m);
    for (const b of $$<HTMLButtonElement>('[data-mode]')) {
      const on = b.dataset.mode === m;
      b.classList.toggle('act', on);
      b.setAttribute('aria-pressed', String(on));
    }
    this.status(m === 'final' ? t('Tüm değişiklikler kabul edildi') : m === 'orig' ? t('Tüm değişiklikler reddedildi') : t('5 öneri · 3 kişi'));
    this.caption(m === 'final' ? t('Kabul edildi. Biz buyuz.') : m === 'orig' ? t('Çoğu ajans sitesi böyle başlar. Biz düzenlemeye devam ettik.') : t('Öneriler ekip yazdıkça beliriyor. Tümünü reddet’i dene.'));
    const c = this.crew;
    if (c?.current === 'mf' && c.animates('mf')) {
      const who: Name = m === 'orig' ? 'code' : 'design';
      c.cast(who);
      window.setTimeout(() => c.say(who, m === 'orig' ? t('lütfen yapma') : m === 'final' ? t('evet. bu') : t('işte değişiklikler'), 1600), 400);
    }
  }

  /** The edit that plays by itself starts once the document comes up the screen. */
  private watch(): void {
    const paper = this.doc?.closest('.paper');
    if (!paper) return;
    let started = false;
    new IntersectionObserver(
      (es) => {
        this.shown = es.some((e) => e.isIntersecting);
        if (!this.shown) return;
        this.wake?.();
        if (!started) {
          started = true;
          void this.play();
        }
      },
      // Its top a third of the way up from the bottom of the screen.
      { rootMargin: '0px 0px -33% 0px' },
    ).observe(paper);
  }

  /** Waits while the document is off screen. */
  private async onScreen(): Promise<void> {
    while (!this.shown && !this.picked) await new Promise<void>((r) => (this.wake = r));
    this.wake = null;
  }

  /** Each change in turn: struck through · typed in its author's colour · its comment. */
  private async play(): Promise<void> {
    try {
      await sleep(450);
      while (this.step < this.changes.length && !this.picked) {
        await this.onScreen();
        if (this.picked) break;
        const i = this.step;
        const ch = this.changes[i]!;
        const ins = ch.querySelector<HTMLElement>('ins')!;
        this.typist((ch.dataset.who ?? 'design') as Name);
        ch.classList.add('on');
        await sleep(760);
        if (this.picked) break;
        ch.classList.add('typing');
        const txt = ins.dataset.ins ?? '';
        for (let j = 1; j <= txt.length && !this.picked; j++) {
          ins.textContent = txt.slice(0, j);
          await sleep(30 + Math.random() * 34);
        }
        if (this.picked) break;
        ch.classList.remove('typing');
        this.comment(i, true);
        this.step = i + 1;
        await sleep(620);
      }
    } finally {
      this.fix();
      if (!this.picked) this.status(t('5 öneri · 3 kişi'));
    }
  }

  /** One cursor at a time: each change is typed by its author. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    try {
      await c.sleep(700, signal);
      while (this.step < this.changes.length && !this.picked) {
        const i = this.step;
        const ch = this.changes[i]!;
        const who = (ch.dataset.who ?? 'design') as Name;
        const del = ch.querySelector('del')!;
        const ins = ch.querySelector<HTMLElement>('ins')!;
        doing[who] = t('Manifestoyu düzenliyor');
        c.cast(who);
        await c.go(who, { el: del, fx: 0, fy: 0.66, dx: -2 }, signal);
        if (this.picked) break;
        c.press(who);
        this.typist(who);
        ch.classList.add('on');
        await c.go(who, { el: del, fx: 1, fy: 0.66 }, signal, 1100);
        ch.classList.add('typing');
        const txt = ins.dataset.ins ?? '';
        for (let j = 1; j <= txt.length && !this.picked; j++) {
          ins.textContent = txt.slice(0, j);
          c.aim(who, { el: ins, end: true, dx: 3, dy: 0 });
          await c.sleep(20 + Math.random() * 30, signal);
        }
        // A choice made mid-word already finished every change (setMode): never write over it.
        if (this.picked) break;
        ch.classList.remove('typing');
        this.comment(i);
        this.step = Math.max(this.step, i + 1);
        c.home(who);
        await c.sleep(420, signal);
      }
      // Accept all or Reject all in the middle of the typing: their line stays.
      if (this.picked) return;
      this.status(t('5 öneri · 3 kişi'));
      c.cast(c.hostOf('mf'));
      await c.sleep(1600, signal);
      c.once('mf-ship', c.hostOf('mf'), t('Yayınla.'), 2400);
    } finally {
      this.fix();
      // Left mid-way (the visitor scrolled on): nobody is typing now.
      if (!this.picked) this.status(this.step >= this.changes.length ? t('5 öneri · 3 kişi') : t('3 kişi düzenliyor'));
    }
  };
}
