/** 02 · Manifesto: tracked changes typed by the team · Show changes / Accept all / Reject all. */
import type { Crew, Name } from '../lib/crew';
import { t } from '../lib/t';
import { $, $$, doing } from './shared';

type Mode = 'track' | 'final' | 'orig';

export class Manifesto {
  private readonly sec = $('[data-sec="mf"]');
  private readonly doc = $('[data-doc]');
  private readonly changes = $$<HTMLElement>('[data-ch]');
  private mode: Mode = 'track';
  /** How many changes are finished. */
  private step = 0;

  constructor(private readonly crew: Crew | null) {
    // The server sends the finished edit. If the team is going to type it, rewind first.
    if (crew?.animates('mf')) {
      for (const ch of this.changes) {
        ch.classList.remove('on');
        const ins = ch.querySelector('ins');
        if (ins) ins.textContent = '';
      }
      for (const cm of $$('[data-cmt]')) cm.classList.remove('show');
      this.status(t('3 kişi düzenliyor'));
    } else {
      this.step = this.changes.length;
    }
    for (const b of $$<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => this.setMode(b.dataset.mode as Mode));
  }

  private status(txt: string): void {
    const el = $('[data-docstat]');
    if (el) el.textContent = txt;
  }

  private caption(txt: string): void {
    const el = $('[data-doccap]');
    if (el) el.textContent = txt;
  }

  private comment(i: number): void {
    $(`[data-cmt="${i}"]`)?.classList.add('show');
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

  /** One cursor at a time: each change is typed by its author. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    try {
      await c.sleep(700, signal);
      while (this.step < this.changes.length && this.mode === 'track') {
        const i = this.step;
        const ch = this.changes[i]!;
        const who = (ch.dataset.who ?? 'design') as Name;
        const del = ch.querySelector('del')!;
        const ins = ch.querySelector<HTMLElement>('ins')!;
        doing[who] = t('Manifestoyu düzenliyor');
        c.cast(who);
        await c.go(who, { el: del, fx: 0, fy: 0.66, dx: -2 }, signal);
        c.press(who);
        ch.classList.add('on');
        await c.go(who, { el: del, fx: 1, fy: 0.66 }, signal, 1100);
        ch.classList.add('typing');
        const txt = ins.dataset.ins ?? '';
        for (let j = 1; j <= txt.length; j++) {
          ins.textContent = txt.slice(0, j);
          c.aim(who, { el: ins, end: true, dx: 3, dy: 0 });
          await c.sleep(20 + Math.random() * 30, signal);
        }
        ch.classList.remove('typing');
        this.comment(i);
        this.step = i + 1;
        c.home(who);
        await c.sleep(420, signal);
      }
      this.status(t('5 öneri · 3 kişi'));
      c.cast(c.hostOf('mf'));
      await c.sleep(1600, signal);
      c.once('mf-ship', c.hostOf('mf'), t('Yayınla.'), 2400);
    } finally {
      this.fix();
    }
  };
}
