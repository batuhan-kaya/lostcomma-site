/**
 * Start · office hours. Reads the visitor's time zone · shows their clock beside ours · draws their
 * working day on the ruler · keeps only the slots that fit both days and labels each in their time.
 * Days switch without a reload · the booking posts JSON and the ticket replaces the panel.
 * Without JS the same form posts and the server answers with the ticket page.
 */
import { cityOf, fittingSlots, hm, istInstant, localHm, offsetMinutes, overlap } from '../shared/booking';
import { getCrew } from './lib/crew';
import { t } from './lib/t';
import { studioOpen } from '../shared/istanbul';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const crew = getCrew();
let tz = 'Europe/Istanbul';
try {
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
} catch {
  /* keep Istanbul */
}
const same = offsetMinutes(tz, new Date()) === 180;
const city = cityOf(tz);

/* ---------------- clocks ---------------- */

const istEl = $('[data-ist]');
const openEl = $('[data-open]');
const youEl = $('[data-yclk]');
const youT = $('[data-yout]');

function clocks(): void {
  const now = new Date();
  if (istEl) istEl.textContent = localHm(now, 'Europe/Istanbul');
  if (youT) youT.textContent = localHm(now, tz);
  if (openEl) {
    const open = studioOpen(now);
    openEl.classList.toggle('on', open);
    const label = openEl.querySelector('span');
    if (label) label.textContent = open ? t('Şu an açığız') : t('Şu an kapalıyız');
  }
}

function hoursText(mins: number): string {
  const h = Math.round((Math.abs(mins) / 60) * 2) / 2;
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return h === 1 ? t('1 saat') : t('{n} saat', { n });
}

if (youEl) {
  youEl.hidden = false;
  const zone = $('[data-zone]', youEl);
  if (zone) zone.textContent = tz.replace(/_/g, ' ');
  const c = $('[data-city]', youEl);
  if (c) c.textContent = same ? t('Aynı saatteyiz') : city;
  const diff = $('[data-diff]');
  const d = 180 - offsetMinutes(tz, new Date());
  if (diff) {
    diff.hidden = false;
    const dt = $('[data-difft]', diff);
    if (dt) dt.textContent = d === 0 ? t('Aynı saat dilimi') : d > 0 ? t('İstanbul {h} ileride', { h: hoursText(d) }) : t('İstanbul {h} geride', { h: hoursText(d) });
  }
}
clocks();
window.setInterval(clocks, 20_000);

/* ---------------- days · ruler · slots ---------------- */

const form = $<HTMLFormElement>('[data-book]');
const taken = new Set<number>((JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as { taken?: number[] }).taken ?? []);
const yband = $('[data-yband]');
const hit = $('[data-hit]');
const yrow = $('[data-yrow]');
const overTexts = [$('[data-overt]'), $('[data-overt2]')];
const noslots = $('[data-noslots]');
const sum = $('[data-sum]');
const go = $<HTMLButtonElement>('[data-go]');
let day = $('.day.on')?.dataset.day ?? $('[data-day]')?.dataset.day ?? '';

const pct = (m: number) => `${((Math.max(0, Math.min(1440, m)) / 1440) * 100).toFixed(3)}%`;

function place(el: HTMLElement | null, from: number, to: number): void {
  if (!el) return;
  el.style.left = pct(from);
  el.style.width = `calc(${pct(to)} - ${pct(from)})`;
}

function pickDay(next: string, fromUser = false): void {
  day = next;
  for (const a of $$('[data-day]')) {
    const on = a.dataset.day === day;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'date');
    else a.removeAttribute('aria-current');
  }
  for (const g of $$('[data-sday]')) g.hidden = g.dataset.sday !== day;

  const { yours, both } = overlap(day, tz);
  if (yrow) {
    yrow.hidden = false;
    const yc = $('[data-ycity]', yrow);
    if (yc) yc.textContent = same ? t('Sen') : city;
  }
  if (yband) {
    place(yband, yours.from, yours.to);
    yband.textContent = t('Senin günün {from} ile {to}', { from: '09:00', to: '18:00' });
  }
  if (hit) {
    hit.hidden = !both;
    if (both) place(hit, both.from, both.to);
  }
  for (const o of overTexts) if (o) o.textContent = both ? t('{h} ortak', { h: hoursText(both.to - both.from) }) : t('Ortak saat yok');

  const fits = new Set(fittingSlots(day, tz));
  let shown = 0;
  for (const label of $$(`[data-sday="${day}"] .slot`)) {
    const m = Number(label.dataset.m);
    const at = istInstant(day, m);
    const input = $<HTMLInputElement>('input', label)!;
    const isTaken = taken.has(at.getTime()) || input.disabled;
    label.hidden = !fits.has(m);
    if (!label.hidden) shown++;
    const yt = $('[data-yt]', label);
    if (yt) yt.textContent = isTaken ? t('dolu') : same ? t('İstanbul') : t('{time} senin saatinle', { time: localHm(at, tz) });
    if (label.hidden && input.checked) input.checked = false;
  }
  if (noslots) noslots.hidden = shown > 0;
  if (fromUser) history.replaceState(null, '', `?day=${day}#book`);
  summary();
}

for (const a of $$<HTMLAnchorElement>('[data-day]')) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    touched = true;
    pickDay(a.dataset.day!, true);
  });
}

/* ---------------- the form ---------------- */

function chosen(): HTMLInputElement | null {
  return $<HTMLInputElement>('input[name="slot"]:checked');
}

function summary(): void {
  if (!form || !sum || !go) return;
  const slot = chosen();
  const name = (form.elements.namedItem('name') as HTMLInputElement | null)?.value.trim() ?? '';
  const email = form.elements.namedItem('email') as HTMLInputElement | null;
  if (!slot) {
    sum.textContent = t('Önce bir gün ve bir saat seç.');
  } else {
    const label = slot.closest('.slot') as HTMLElement;
    const at = istInstant(day, Number(label.dataset.m));
    const dayName = $(`[data-day="${day}"] .sr`)?.textContent ?? day;
    sum.textContent = same
      ? t('{day} · {time} İstanbul', { day: dayName, time: hm(Number(label.dataset.m)) })
      : t('{day} · {time} İstanbul · senin saatinle {you}', { day: dayName, time: hm(Number(label.dataset.m)), you: localHm(at, tz) });
  }
  go.disabled = !slot || !name || !email?.value || !email.checkValidity();
}

const tzInput = $<HTMLInputElement>('[data-tz]');
if (tzInput) tzInput.value = tz;
form?.addEventListener('input', summary);
form?.addEventListener('change', summary);

const bmsg = $('[data-bmsg]');
function say(text: string): void {
  if (!bmsg) return;
  bmsg.textContent = text;
  bmsg.hidden = false;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity() || !chosen()) {
    summary();
    return;
  }
  const fd = new FormData(form);
  const body: Record<string, unknown> = Object.fromEntries([...fd.entries()].filter(([k]) => k !== 'about'));
  body.about = fd.getAll('about');
  go!.disabled = true;
  go!.classList.add('busy');
  try {
    const res = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; ticket?: { html: string } | null };
    if (res.ok && out.ok && out.ticket) {
      const box = document.createElement('div');
      box.className = 'booked';
      box.innerHTML = out.ticket.html;
      form.replaceWith(box);
      const ticket = $('[data-ticket]', box);
      ticket?.focus();
      if (crew?.current === 'book') crew.say(crew.hostOf('book'), t('görüşürüz'), 2200);
      return;
    }
    if (res.status === 409) {
      const slot = chosen();
      if (slot) {
        slot.checked = false;
        slot.disabled = true;
        slot.closest('.slot')?.classList.add('taken');
        const yt = $('[data-yt]', slot.closest('.slot')!);
        if (yt) yt.textContent = t('dolu');
      }
      say(t('Biri o saati senden hemen önce aldı. Başka bir saat seç.'));
    } else if (res.status === 429) say(t('Kısa sürede çok fazla deneme oldu. Biraz sonra tekrar dene ya da bize yaz.'));
    else say(t('Bir şey eksik kaldı. Gün ve saat ve adın ve e-postan gerekli.'));
  } catch {
    say(t('Bağlantı koptu. Tekrar dene ya da bize yaz.'));
  } finally {
    go?.classList.remove('busy');
    summary();
  }
});

/* ---------------- other ways ---------------- */

async function copy(btn: HTMLElement, text: string): Promise<void> {
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = t('Kopyalandı');
  } catch {
    btn.textContent = t('Kopyalanamadı');
  }
  window.setTimeout(() => (btn.textContent = label), 1600);
}
for (const b of $$('[data-copy]')) {
  b.hidden = false;
  b.addEventListener('click', () => copy(b, b.dataset.copy ?? ''));
}
const qs = $$('[data-qs] li').map((li, i) => `${i + 1}. ${li.textContent}`);
for (const b of $$('[data-copybrief]')) {
  b.hidden = false;
  b.addEventListener('click', () => copy(b, qs.join('\n')));
}

/* ---------------- start ---------------- */

let touched = false;
form?.addEventListener('pointerdown', () => (touched = true));
form?.addEventListener('keydown', () => (touched = true));
if (form) pickDay(day);

/* ---------------- the team ---------------- */

crew?.addScenes({
  hero: async (c, signal) => {
    await c.sleep(3000, signal);
    c.once('h1', 'code', same ? t('aynı saatteyiz') : t('{city} için ayarladık', { city }), 2400);
  },
  // Design points at the first slot that fits both days.
  book: async (c, signal) => {
    await c.sleep(1200, signal);
    if (touched || !form) return;
    const first = $(`[data-sday="${day}"] .slot:not([hidden]):not(.taken)`);
    if (!first) return;
    const host = c.hostOf('book');
    await c.go(host, { el: first, fx: 0.8, fy: 0.3 }, signal);
    if (touched) return c.home(host);
    c.once('b1', host, t('bu saat ikimize de uyar'), 2400);
    await c.sleep(2800, signal);
    c.home(host);
  },
});
