/**
 * 03 · Services: Lodos and Pocket answer the visitor. A pointer over the frame (or a tap) takes over:
 * the story stops where it is and the product works from that very spot. Lodos scrolls (wheel or
 * trackpad on pointer devices · its own links on touch) · its cards lift · a day and a time book a
 * sail. Pocket sends money: pick someone · type an amount (the keypad or the keyboard's digits) ·
 * send · the receipt · Done puts the row on the list and takes it off the balance.
 *
 * Left alone for IDLE the frame fades and the story plays again from its start (the markup the
 * server sent is put back). No animation frames: CSS transitions and native scrolling do the moving.
 */
import { $, $$ } from './shared';

const IDLE = 10_000;
const STORY = 20_000;
const NAV = 56;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('still');

interface Mock {
  click(el: Element): void;
  key?(e: KeyboardEvent): boolean;
  stop?(): void;
}

/** How far the story got (0–1) · read from one of its animations. */
function progress(el: Element | null): number {
  const a = el?.getAnimations().find((x) => (x.effect?.getTiming().duration ?? 0) === STORY);
  const t = Number(a?.currentTime ?? 0);
  return Number.isFinite(t) ? (t % STORY) / STORY : 0;
}

const press = (el: Element) => {
  el.classList.add('dn');
  window.setTimeout(() => el.classList.remove('dn'), 160);
};

/* ---------------- Lodos ---------------- */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Which chip shows which card (J/70 · Laser · Beneteau). */
const KINDS: Record<string, number[]> = { All: [0, 1, 2], Keelboats: [0], Dinghies: [1], Cruisers: [2] };

function lodos(fc: HTMLElement): Mock | null {
  const web = $('.fc-web', fc);
  const wv = web && $('.wv', web);
  const page = web && $('.wpage', web);
  if (!web || !wv || !page) return null;
  const p = progress(page);
  const tf = getComputedStyle(page).transform;
  const y = tf && tf !== 'none' ? -new DOMMatrixReadOnly(tf).m42 : 0;

  fc.classList.add('live');
  wv.scrollTop = y;
  // Solid once the hero has gone under the nav (its height differs in the full screen phone layout).
  const nav = () => web.classList.toggle('solid', wv.scrollTop > ($('.wh', web)?.offsetHeight ?? 452) - NAV);
  nav();
  wv.addEventListener('scroll', nav, { passive: true });

  // The booking widget carries on from where the story was.
  const during = (a: number) => p >= a && p < 0.865;
  let day = during(0.484) ? 22 : 0;
  let slot = during(0.539) ? '10:00' : '';
  let booked = during(0.604);
  let boat = { name: 'J/70', price: '₺1 800', crew: '4 crew' };

  const text = (sel: string, s: string) => {
    const el = $(sel, web);
    if (el) el.textContent = s;
  };
  const render = () => {
    for (const d of $$('.wgrid i', web)) d.classList.toggle('sel', !!d.className && Number(d.textContent) === day);
    for (const s of $$('.wslots i', web)) s.classList.toggle('sel', s.textContent === slot);
    $('.wsum', web)?.classList.toggle('has', day > 0);
    const end = slot ? `${String(Number(slot.slice(0, 2)) + 2).padStart(2, '0')}${slot.slice(2)}` : '';
    text('.wsum .s1 b', day ? `${DAYS[(day - 1) % 7]} ${day} Nov · ${slot ? `${slot} to ${end}` : 'choose a time'}` : '');
    text('.wsum .s1 small', `${boat.name} · ${boat.crew} · skipper included`);
    text('.wmon small', `${boat.name} · two hour sail`);
    text('.wtot', boat.price);
    const res = $('.wres', web);
    res?.classList.toggle('off', !(day && slot));
    res?.classList.toggle('booked', booked);
  };
  render();

  const go = (sel: string) => {
    const el = sel ? $(sel, page) : null;
    const top = el ? Math.max(0, el.offsetTop - NAV - 16) : 0;
    wv.scrollTo({ top: Math.min(top, wv.scrollHeight - wv.clientHeight), behavior: still() ? 'auto' : 'smooth' });
  };
  const LINKS: Record<string, string> = { Fleet: '.wfl', Lessons: '.wfl', Races: '.wbk', Club: '.wft', Journal: '.wft' };

  return {
    click(el) {
      const hit = (s: string) => el.closest(s);
      let x: Element | null;
      if (hit('.wlogo')) go('');
      else if ((x = hit('.wl > span'))) go(LINKS[x.textContent ?? ''] ?? '');
      else if (hit('.wnb') || hit('.wgo') || hit('.wf')) go('.wbk');
      else if ((x = hit('.wbtn'))) {
        const card = x.closest('article');
        if (card) {
          boat = {
            name: $('.wtop b', card)?.textContent ?? boat.name,
            price: $('.wprice b', card)?.textContent ?? boat.price,
            crew: $('.wspec span', card)?.textContent ?? boat.crew,
          };
          booked = false;
          render();
        }
        go('.wbk');
      } else if ((x = hit('.wchips i'))) {
        const chips = $$('.wchips i', web);
        chips.forEach((c) => c.classList.toggle('on', c === x));
        const show = KINDS[x.firstChild?.textContent ?? 'All'] ?? [0, 1, 2];
        $$('.wcards article', web).forEach((a, i) => a.classList.toggle('dim', !show.includes(i)));
      } else if ((x = hit('.wfav'))) x.classList.toggle('faved');
      else if ((x = hit('.wnews')) && !x.classList.contains('done')) {
        x.classList.add('done');
        const btn = $('b', x);
        const field = $('i', x);
        if (btn) btn.textContent = 'You are in ✓';
        if (field) field.textContent = 'See you at the start line';
      }
      else if ((x = hit('.wgrid .free, .wgrid .pick'))) {
        day = Number(x.textContent);
        booked = false;
        render();
      } else if ((x = hit('.wslots i:not(.full)'))) {
        slot = x.textContent ?? '';
        booked = false;
        render();
      } else if (hit('.wres') && day && slot && !booked) {
        booked = true;
        render();
      }
    },
    stop() {
      wv.removeEventListener('scroll', nav);
    },
  };
}

/* ---------------- Pocket ---------------- */

type Screen = 'home' | 'send' | 'amt' | 'ok';

const money = (n: number, cents = true) => {
  const [i, d] = n.toFixed(2).split('.');
  const int = (i ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return cents ? [int, d ?? '00'] : [int, ''];
};
/** What the visitor typed · shown as typed (₺25. stays ₺25.). */
const typed = (s: string) => {
  if (!s) return '₺0';
  const [i, d] = s.split('.');
  return '₺' + (i || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d !== undefined ? '.' + d : '');
};

function pocket(fc: HTMLElement): Mock | null {
  const ap = $('.ap', fc);
  if (!ap) return null;
  const p = progress($('.ahome', ap));
  fc.classList.add('live');

  // Where the story was: home · picking someone · typing · the receipt · or home with Ece's row.
  const added = p >= 0.61 && p < 0.95;
  let screen: Screen = p < 0.13 || p >= 0.595 ? 'home' : p < 0.215 ? 'send' : p < 0.445 ? 'amt' : 'ok';
  let amount = screen === 'ok' ? '250' : screen === 'amt' ? (p < 0.262 ? '' : p < 0.292 ? '2' : p < 0.322 ? '25' : '250') : '';
  let balance = added ? 47_960.5 : 48_210.5;
  let busy = false;

  const ece = $('.arec .ece .fce', ap);
  let who = { face: ece?.outerHTML ?? '', name: 'Ece Yılmaz', tag: '@ece · on Pocket' };

  const first = $('.arow.rnew', ap);
  if (added) first?.classList.remove('rnew');
  else first?.remove();

  const set = (s: Screen) => {
    screen = s;
    ap.classList.remove('s-home', 's-send', 's-amt', 's-ok');
    ap.classList.add('s-' + s);
  };
  const html = (sel: string, s: string) => {
    const el = $(sel, ap);
    if (el) el.innerHTML = s;
  };
  const text = (sel: string, s: string) => {
    const el = $(sel, ap);
    if (el) el.textContent = s;
  };

  const value = () => Number(amount || '0');
  const renderAmount = () => {
    const v = value();
    const over = v > balance;
    text('.aval .v0', typed(amount));
    $('.aval', ap)?.classList.toggle('long', amount.length > 6);
    $('.aleft', ap)?.classList.toggle('over', over);
    const [bi, bd] = money(balance);
    text('.aleft', over ? `Not enough · balance ₺${bi}.${bd}` : `Balance ₺${bi}.${bd}`);
    for (const c of $$('.achips i', ap)) c.classList.toggle('on', Number((c.textContent ?? '').replace(/[^\d]/g, '')) === v && v > 0);
    const b = $('.asendb', ap);
    b?.classList.toggle('has', v > 0 && !over);
    text('.asendb .l2', 'Send ' + typed(amount).replace(/\.$/, ''));
  };
  const renderWho = () => {
    html('.ato', `${who.face}<span><b></b><small></small></span>`);
    text('.ato b', who.name);
    text('.ato small', who.tag);
  };
  const renderBalance = () => {
    const [i, d] = money(balance);
    html('.abal .bal1', `₺${i}<em>.${d}</em>`);
  };
  renderWho();
  renderAmount();
  renderBalance();
  set(screen);

  const type = (k: string) => {
    if (k === '⌫' || k === 'Backspace') amount = amount.slice(0, -1);
    else if (k === '.') {
      if (!amount.includes('.')) amount = (amount || '0') + '.';
    } else if (/^\d$/.test(k)) {
      const [i, d] = amount.split('.');
      if (d !== undefined) {
        if (d.length < 2) amount += k;
      } else if ((i ?? '').length < 5) amount = amount === '0' ? k : amount + k;
    }
    renderAmount();
  };

  const send = () => {
    const v = value();
    if (busy || v <= 0 || v > balance) return;
    busy = true;
    $('.asendb', ap)?.classList.add('busy');
    window.setTimeout(
      () => {
        busy = false;
        $('.asendb', ap)?.classList.remove('busy');
        const [i, d] = money(v);
        const shown = d === '00' ? `₺${i}` : `₺${i}.${d}`;
        text('.aokt', `${shown} sent`);
        text('.aoks', `to ${who.name} · arrived instantly`);
        const to = $('.aokr > span:first-child b', ap);
        if (to) {
          to.innerHTML = who.face;
          to.append(who.name);
        }
        text('.aokr > span:nth-child(3) b', `PCK 2611 ${String(1000 + Math.floor(Math.random() * 9000))}`);
        set('ok');
      },
      still() ? 300 : 1200,
    );
  };

  /** Done: the sheet goes down · the row lands at the top of Recent · the balance drops. */
  const done = () => {
    const v = value();
    ap.classList.add('closing');
    window.setTimeout(
      () => {
        ap.classList.add('instant');
        set('home');
        ap.classList.remove('closing');
        void ap.offsetWidth;
        ap.classList.remove('instant');
        balance = Math.round((balance - v) * 100) / 100;
        renderBalance();
        addRow(v);
        amount = '';
        renderAmount();
      },
      still() ? 0 : 480,
    );
  };

  const addRow = (v: number) => {
    const list = $('.arows', ap);
    const tpl = $('.arow', ap);
    if (!list || !tpl) return;
    const rows = $$('.arow', list);
    const before = rows.map((r) => r.getBoundingClientRect().top);
    const row = tpl.cloneNode(true) as HTMLElement;
    row.className = 'arow fresh';
    const [i, d] = money(v);
    row.innerHTML = `${who.face}<span class="atx"><b></b><small>Transfer · just now</small></span><em></em>`;
    $('.atx b', row)!.textContent = who.name;
    $('em', row)!.textContent = `−₺${i}${d === '00' ? '' : '.' + d}`;
    list.prepend(row);
    // The rows below glide down to make room (first · last · invert · play).
    rows.forEach((r, n) => {
      const dy = (before[n] ?? 0) - r.getBoundingClientRect().top;
      if (!dy) return;
      r.style.transition = 'none';
      r.style.transform = `translateY(${dy}px)`;
      void r.offsetWidth;
      r.style.transition = '';
      r.style.transform = '';
    });
    $$('.arow', list).slice(6).forEach((r) => r.remove());
  };

  return {
    click(el) {
      const hit = (s: string) => el.closest(s);
      let x: Element | null;
      if (busy) return;
      if (screen === 'home') {
        if (hit('.aacts .send')) set('send');
      } else if (screen === 'send') {
        if (hit('.anav > i:first-child')) set('home');
        else if ((x = hit('.arec > span, .acr'))) {
          const f = $('.fce', x);
          const name = x.matches('.acr') ? ($('b', x)?.textContent ?? '') : (x.lastChild?.textContent ?? '').trim();
          const tag = x.matches('.acr') ? ($('small', x)?.textContent ?? '') : '';
          who = {
            face: f?.outerHTML ?? '',
            name: name === 'Ece' ? 'Ece Yılmaz' : name === 'Mert' ? 'Mert Aksoy' : name === 'Zeynep' ? 'Zeynep Koç' : name === 'Can' ? 'Can Demir' : name,
            tag: (tag || '@' + name.toLowerCase().split(' ')[0]) + ' · on Pocket',
          };
          amount = '';
          renderWho();
          renderAmount();
          set('amt');
        }
      } else if (screen === 'amt') {
        if (hit('.anav > i:first-child')) set('send');
        else if ((x = hit('.akeys i'))) type(x.textContent ?? '');
        else if ((x = hit('.achips i'))) {
          amount = (x.textContent ?? '').replace(/[^\d]/g, '');
          renderAmount();
        } else if (hit('.asendb')) send();
      } else if (screen === 'ok') {
        if (hit('.adone')) done();
      }
    },
    key(e) {
      if (screen !== 'amt' || busy || e.metaKey || e.ctrlKey || e.altKey) return false;
      if (/^\d$/.test(e.key) || e.key === '.' || e.key === ',' || e.key === 'Backspace') {
        type(e.key === ',' ? '.' : e.key);
        const k = $$('.akeys i', ap).find((i) => i.textContent === (e.key === 'Backspace' ? '⌫' : e.key === ',' ? '.' : e.key));
        if (k) press(k);
        return true;
      }
      if (e.key === 'Enter') {
        send();
        return true;
      }
      return false;
    },
  };
}

/* ---------------- the two frames ---------------- */

const MAKE: Record<string, (fc: HTMLElement) => Mock | null> = { '0': lodos, '1': pocket };

export class LiveMocks {
  private readonly frames = new Map<
    HTMLElement,
    { html: string; make: (fc: HTMLElement) => Mock | null; mock: Mock | null; over: boolean; held: boolean; last: number; timer: number }
  >();

  constructor(private readonly touched: () => void) {
    // Pocket on Android (data-fca) is the second artboard of the Apps frame: it answers like the iPhone.
    for (const fc of [...$$('[data-fc]'), ...$$('[data-fca]')]) {
      const make = MAKE[fc.dataset.fc ?? '1'];
      if (!make) continue;
      const st = { html: fc.innerHTML, make, mock: null as Mock | null, over: false, held: false, last: 0, timer: 0 };
      this.frames.set(fc, st);
      const take = () => {
        if (!fc.classList.contains('on')) return;
        st.last = Date.now();
        this.touched();
        // Back while the frame was fading to its story: it stays with the visitor (later() drops the reset).
        fc.classList.remove('swap');
        if (!st.mock) st.mock = make(fc);
        this.later(fc);
      };
      // The wheel scrolls Lodos only once the pointer has rested on it: a visitor scrolling the page
      // whose pointer crosses the frame keeps scrolling the page.
      let arm = 0;
      const rest = () => {
        window.clearTimeout(arm);
        fc.classList.remove('can-scroll');
        arm = window.setTimeout(() => fc.classList.add('can-scroll'), 700);
      };
      fc.addEventListener('pointerenter', (e) => {
        st.over = e.pointerType === 'mouse' || e.pointerType === 'pen';
        if (st.over) {
          take();
          rest();
        }
      });
      fc.addEventListener('pointerleave', () => {
        st.over = false;
        window.clearTimeout(arm);
        fc.classList.remove('can-scroll');
        this.later(fc);
      });
      fc.addEventListener(
        'wheel',
        () => {
          if (!fc.classList.contains('can-scroll')) rest();
        },
        { passive: true },
      );
      fc.addEventListener('pointerdown', (e) => {
        take();
        const k = (e.target as Element).closest('.akeys i, .aacts > span, .aic, .anav > i, .acr, .arec > span, .aiban, .achips i, .asendb, .ashare, .adone');
        if (k && st.mock) press(k.matches('.aacts > span') ? ($('i', k) ?? k) : k);
      });
      fc.addEventListener('pointermove', () => {
        if (Date.now() - st.last > 500) take();
      });
      fc.addEventListener('wheel', take, { passive: true });
      fc.addEventListener('click', (e) => {
        if (!st.mock) take();
        if (st.over) fc.classList.add('can-scroll');
        st.mock?.click(e.target as Element);
      });
    }
    addEventListener('keydown', (e) => {
      for (const [fc, st] of this.frames) {
        if (st.over && st.mock?.key?.(e)) {
          e.preventDefault();
          st.last = Date.now();
          this.touched();
          this.later(fc);
        }
      }
    });
  }

  /** A frame in the visitor's hands: the team leaves it alone. */
  get holding(): boolean {
    return [...this.frames.values()].some((s) => s.mock);
  }

  /** Full screen (viewer.ts): the frame is the visitor's for as long as it is open · no idle reset. */
  hold(fc: HTMLElement, on: boolean): void {
    const st = this.frames.get(fc);
    if (!st) return;
    st.held = on;
    st.last = Date.now();
    window.clearTimeout(st.timer);
    fc.classList.remove('swap');
    if (on && !st.mock) st.mock = st.make(fc);
    if (!on) this.later(fc);
  }

  /** The frame on show changed: the others go back to their stories once they have faded out. */
  shown(i: number): void {
    for (const [fc, st] of this.frames) if ((fc.dataset.fc ?? '1') !== String(i) && st.mock) this.reset(fc, 450);
  }

  private later(fc: HTMLElement): void {
    const st = this.frames.get(fc);
    if (!st) return;
    window.clearTimeout(st.timer);
    if (!st.mock || st.over || st.held) return;
    st.timer = window.setTimeout(() => (st.over ? undefined : this.reset(fc, 0, true)), Math.max(0, st.last + IDLE - Date.now()));
  }

  /** Put the server's markup back · the story plays from its start (after a short fade when on show). */
  private reset(fc: HTMLElement, wait: number, fade = false): void {
    const st = this.frames.get(fc);
    if (!st) return;
    window.clearTimeout(st.timer);
    const put = () => {
      st.mock?.stop?.();
      st.mock = null;
      fc.innerHTML = st.html;
      fc.classList.remove('live', 'swap');
    };
    if (fade && !still()) {
      fc.classList.add('swap');
      st.timer = window.setTimeout(put, 320);
    } else if (wait) st.timer = window.setTimeout(put, wait);
    else put();
  }
}
