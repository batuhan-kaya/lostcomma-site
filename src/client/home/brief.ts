/**
 * 06 · The brief file. The form works on its own (real inputs · posts to /api/brief).
 * Here it gets the knob drag · the live sentence · the team's reactions · a fetch post and
 * the little thread that answers you.
 */
import type { Crew, Name } from '../lib/crew';
import { reducedMotion } from '../lib/motion';
import { t } from '../lib/t';
import { $, $$, doing, type HomeData, isAbort, lang } from './shared';

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class Brief {
  private readonly form = $<HTMLFormElement>('[data-fb]');
  private readonly thread = $('[data-thread]');
  private readonly tl = $('[data-tl]');
  private readonly reduce = reducedMotion();
  private readonly marks: Partial<Record<Name, HTMLElement>> = {};
  private reacting: AbortController | null = null;
  private dragging = false;
  private sent = false;
  private msgSaid = false;
  private timers: Record<string, number> = {};

  constructor(
    private readonly data: HomeData,
    private readonly crew: Crew | null,
  ) {
    const f = this.form;
    if (!f) return;
    // With JS we validate ourselves (and let the team react). Without JS the browser does it.
    f.noValidate = true;
    f.addEventListener('change', (e) => this.changed(e.target as HTMLInputElement));
    f.addEventListener('input', (e) => this.typed(e.target as HTMLInputElement));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.send();
    });
    this.timeline();
    $('[data-copy]')?.addEventListener('click', () => this.copy());
    $('[data-again]')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.again();
    });
    this.refresh();
  }

  private later(key: string, ms: number, fn: () => void): void {
    clearTimeout(this.timers[key]);
    this.timers[key] = window.setTimeout(fn, ms);
  }

  /* ---------------- reading the form ---------------- */

  private get types(): number[] {
    return $$<HTMLInputElement>('input[name="types"]', this.form!).flatMap((i, n) => (i.checked ? [n] : []));
  }
  private radio(name: string): number {
    return $$<HTMLInputElement>(`input[name="${name}"]`, this.form!).findIndex((i) => i.checked);
  }
  private val(name: string): string {
    return ($<HTMLInputElement>(`[name="${name}"]`, this.form!)?.value ?? '').trim();
  }

  /** "Batu needs a website and an app within a month." · Turkish reads differently. */
  sentence(): string {
    const name = this.val('name');
    const picks = this.types.map((i) => this.data.types[i]?.p ?? '');
    const ti = this.radio('time');
    const time = ti >= 0 ? (this.data.times[ti]?.p ?? '') : '';
    if (!picks.length && !time) return '';
    if (lang() === 'tr') {
      let s = (name ? `${name} için ` : '') + (picks.length ? picks.join(' ve ') : 'yeni bir şey');
      s = s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
      if (time) s += ' · ' + time;
      return s + '.';
    }
    let s = (name || 'You') + (name ? ' needs ' : ' need ') + (picks.length ? picks.join(' and ') : 'something new');
    if (time) s += ' ' + time;
    return s + '.';
  }

  /** Repaint everything that depends on the inputs. */
  private refresh(): void {
    const f = this.form!;
    const types = this.types;
    $$('[data-tile]', f).forEach((el, i) => el.classList.toggle('on', types.includes(i)));
    const th = $('[data-typehint]');
    if (th) {
      th.textContent = types.length ? t('{n} seçili', { n: types.length }) : t('İstediğin kadar seç');
      th.classList.toggle('on', types.length > 0);
    }
    const ti = this.radio('time');
    if (this.tl) {
      this.tl.className = 'tl p' + Math.max(0, ti) + (ti < 0 ? ' none' : '') + (this.dragging ? ' drag' : '');
    }
    const tm = $('[data-timehint]');
    if (tm) {
      tm.textContent = ti >= 0 ? (this.data.times[ti]?.p ?? '') : t('Sürükle ya da dokun');
      tm.classList.toggle('on', ti >= 0);
    }
    const s = this.sentence();
    const sum = $('[data-sum]');
    if (sum) {
      sum.textContent = s || t('Dosyayı doldurmaya başla. Brief’i sen yazdıkça biz yazacağız.');
      sum.classList.toggle('empty', !s);
    }
    const name = this.val('name');
    const fname = $('[data-fname]');
    if (fname) fname.textContent = name ? t('{name} için brief', { name }) : t('İsimsiz brief');
    const filled = types.length > 0 || ti >= 0 || this.radio('budget') >= 0 || !!name || !!this.val('email');
    const st = $('[data-st]');
    if (st && !this.sent) st.textContent = filled ? t('Taslak · otomatik kaydedildi') : t('Taslak');
    const you = $('[data-youinit]');
    if (you) you.textContent = name ? name.charAt(0).toLocaleUpperCase(lang()) : t('S');
    for (const b of $$('[data-blk]', f)) b.dataset.yn = name || t('sen');
  }

  /* ---------------- reactions ---------------- */

  private mark(el: Element | null, who: Name): void {
    this.unmark(who);
    const blk = el?.closest<HTMLElement>('[data-blk]');
    if (!blk) return;
    blk.dataset.tm = who;
    this.marks[who] = blk;
  }

  private unmark(who: Name): void {
    const b = this.marks[who];
    if (b && b.dataset.tm === who) b.dataset.tm = '';
    delete this.marks[who];
  }

  /** The teammate who cares most walks over · says something · goes back. One at a time. */
  private react(who: Name, el: Element | null, txt: string): void {
    const c = this.crew;
    if (!el || this.sent || !c || c.current !== 'ctc' || !c.animates('ctc')) return;
    this.reacting?.abort(new DOMException('next', 'AbortError'));
    const ctrl = new AbortController();
    this.reacting = ctrl;
    const s = ctrl.signal;
    (async () => {
      c.cast(who);
      this.mark(el, who);
      await c.go(who, { el, fx: 0.6, fy: 0.62 }, s, 1600);
      c.press(who);
      c.say(who, txt, 2400);
      await c.sleep(2500, s);
      this.unmark(who);
      c.cast(c.hostOf('ctc'));
      c.home(c.hostOf('ctc'));
    })().catch((e) => {
      this.unmark(who);
      if (!isAbort(e)) console.error(e);
    });
  }

  private changed(el: HTMLInputElement): void {
    this.refresh();
    if (!el?.name) return;
    if (el.name === 'types' && el.checked) {
      const i = Number(el.closest<HTMLElement>('[data-tile]')?.dataset.tile ?? 0);
      const tile = el.closest('[data-tile]');
      if (this.types.length === 4) this.react('design', tile, t('hepsi. en sevdiğimiz'));
      else this.react(this.data.types[i]?.who ?? 'design', tile, this.data.types[i]?.say ?? '');
    }
    if (el.name === 'time' && !this.dragging) {
      const i = this.radio('time');
      this.react(this.data.times[i]?.who ?? 'motion', $('[data-knob]'), this.data.times[i]?.say ?? '');
    }
    if (el.name === 'budget') {
      const i = this.radio('budget');
      this.react(i === 4 ? 'design' : 'code', el.closest('[data-chip]'), this.data.budgets[i]?.say ?? '');
    }
  }

  private typed(el: HTMLInputElement): void {
    this.refresh();
    const name = this.val('name');
    if (el.name === 'name' && name) this.later('nm', 900, () => this.react('design', el, t('selam {name}', { name })));
    if (el.name === 'email') {
      el.classList.remove('err');
      this.note('');
      if (MAIL.test(this.val('email'))) this.later('ml', 900, () => this.react('code', el, t('aldım')));
    }
    if (el.name === 'message' && !this.msgSaid) this.later('ms', 1200, () => {
      this.msgSaid = true;
      this.react('motion', el, t('hepsini okuyoruz'));
    });
  }

  private note(txt: string, err = false): void {
    const n = $('[data-note]');
    if (!n) return;
    n.textContent = txt || t('Genelde bir gün içinde döneriz');
    n.classList.toggle('err', err);
  }

  /* ---------------- the timeline knob ---------------- */

  private timeline(): void {
    const tl = this.tl;
    if (!tl) return;
    const radios = $$<HTMLInputElement>('input[name="time"]', tl);
    const at = (x: number) => {
      const r = tl.getBoundingClientRect();
      const i = Math.round(Math.max(0, Math.min(1, (x - r.left) / r.width)) * 4);
      const input = radios[i];
      if (input && !input.checked) {
        input.checked = true;
        this.refresh();
      }
    };
    tl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target as Element).closest('input')) return;
      this.dragging = true;
      tl.setPointerCapture(e.pointerId);
      at(e.clientX);
      this.refresh();
      e.preventDefault();
    });
    tl.addEventListener('pointermove', (e) => this.dragging && at(e.clientX));
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.refresh();
      const i = this.radio('time');
      if (i >= 0) this.react(this.data.times[i]?.who ?? 'motion', $('[data-knob]'), this.data.times[i]?.say ?? '');
    };
    tl.addEventListener('pointerup', end);
    tl.addEventListener('pointercancel', end);
  }

  /* ---------------- sending ---------------- */

  private copy(): void {
    navigator.clipboard?.writeText('hello@lostcomma.co').catch(() => undefined);
    const b = $('[data-copy]');
    if (!b) return;
    b.textContent = t('Kopyalandı ✓');
    this.later('cp', 1800, () => (b.textContent = t('Kopyala')));
    this.react('code', b, t('kopyalandı'));
  }

  async send(): Promise<void> {
    if (this.sent) return;
    const mail = $<HTMLInputElement>('[name="email"]', this.form!);
    if (!MAIL.test(this.val('email'))) {
      mail?.classList.add('err');
      mail?.focus();
      this.note(t('Sana dönebilmemiz için bir e-posta adresi lazım'), true);
      this.react('code', mail, t('cevap için bir e-posta lazım'));
      return;
    }
    const btn = $('[data-send]');
    const label = $('[data-sendtxt]');
    btn?.classList.add('busy');
    if (label) label.textContent = t('Gönderiliyor');
    const fd = new FormData(this.form!);
    const body = {
      lang: lang(),
      types: fd.getAll('types'),
      time: fd.get('time') ?? undefined,
      budget: fd.get('budget') ?? undefined,
      name: this.val('name'),
      email: this.val('email'),
      message: this.val('message'),
      company: fd.get('company') ?? '',
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
      this.note(t('Gönderemedik. E-posta adresini kontrol edip tekrar dene.'), true);
      return;
    }
    this.sent = true;
    void this.showThread();
  }

  private async showThread(): Promise<void> {
    const f = this.form!;
    const th = this.thread!;
    const name = this.val('name');
    const pin = $('[data-pinsum]');
    if (pin) pin.textContent = this.sentence() || t('Brief’in bize ulaştı.');
    const tags = $('[data-ptags]');
    const picked = [
      ...this.types.map((i) => this.data.types[i]?.n ?? ''),
      ...(this.radio('time') >= 0 ? [this.data.times[this.radio('time')]?.n ?? ''] : []),
      ...(this.radio('budget') >= 0 ? [this.data.budgets[this.radio('budget')]?.n ?? ''] : []),
    ];
    tags?.replaceChildren(...picked.map((p) => Object.assign(document.createElement('span'), { textContent: p })));
    const hi = $('[data-hi]');
    if (hi) hi.textContent = name ? t('Selam {name}. Brief için teşekkürler.', { name }) : t('Selam. Brief için teşekkürler.');
    const st = $('[data-st]');
    if (st) {
      st.textContent = t('Gönderildi · az önce');
      st.classList.add('sent');
    }
    for (const who of Object.keys(this.marks) as Name[]) this.unmark(who);
    f.hidden = true;
    th.hidden = false;
    const msgs = $$('[data-msg]', th);
    const typing = $('[data-typing]', th);
    const av = $('[data-typav]', th);
    const order: Name[] = ['design', 'code', 'motion'];
    const c = this.crew;
    const host = c?.hostOf('ctc') ?? 'design';
    if (c) c.cast(host);
    for (let i = 0; i < msgs.length; i++) {
      if (!this.reduce && typing && av) {
        const who = order[i] ?? 'design';
        av.className = `av c-${who}`;
        av.textContent = who.charAt(0).toUpperCase();
        typing.hidden = false;
        c?.aim(host, { el: typing.querySelector('.mbub')!, fx: 1, fy: 0.5, dx: 12 });
        await wait(1100);
        typing.hidden = true;
      }
      msgs[i]!.hidden = false;
      if (!this.reduce) {
        c?.aim(host, { el: msgs[i]!.querySelector('.mbub')!, fx: 1, fy: 0.4, dx: 12 });
        await wait(420);
      }
    }
    $('[data-nextup]')?.classList.add('on');
    await wait(this.reduce ? 0 : 900);
    if (c?.current === 'ctc') {
      c.home(host);
      c.say(host, t('dosyada görüşürüz'), 2600);
    }
  }

  private again(): void {
    const f = this.form!;
    f.reset();
    this.sent = false;
    this.msgSaid = false;
    $$('[data-msg]').forEach((m) => (m.hidden = true));
    $('[data-nextup]')?.classList.remove('on');
    $('[data-st]')?.classList.remove('sent');
    this.thread!.hidden = true;
    f.hidden = false;
    this.note('');
    this.refresh();
    $<HTMLInputElement>('input[name="types"]', f)?.focus();
  }

  /** Quiet hints from the host: what to fill in next. Pauses while someone else reacts. */
  scene = async (c: Crew, signal: AbortSignal): Promise<void> => {
    const host = c.hostOf('ctc');
    const steps: (() => [string, string] | null)[] = [
      () => (!this.types.length ? ['[data-tile="0"]', t('istediğin kadar seç')] : null),
      () => (this.radio('time') < 0 ? ['[data-knob]', t('beni sürükle')] : null),
      () => (this.radio('budget') < 0 ? ['[data-chip="4"]', t('kabaca yeter')] : null),
      () => (!this.val('name') ? ['[data-in="name"]', t('adınla başla')] : null),
      () => ['[data-send]', t('bas. hadi')],
    ];
    doing[host] = t('Brief’ini bekliyor');
    await c.sleep(2400, signal);
    for (let i = 0; ; i++) {
      if (this.sent || this.reacting?.signal.aborted === false) {
        await c.sleep(1500, signal);
        continue;
      }
      const st = steps[i % steps.length]!();
      if (!st) {
        await c.sleep(200, signal);
        continue;
      }
      const el = $(st[0]);
      if (el && c.visible(host)) {
        this.mark(el, host);
        await c.go(host, { el, fx: 0.62, fy: 0.62 }, signal, 2200);
        c.say(host, st[1], 2600);
        await c.sleep(2800, signal);
        this.unmark(host);
        c.home(host);
      }
      await c.sleep(4200, signal);
    }
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
