/**
 * What the studio and the visitor read. Plain text · the comma rule holds here too.
 * The studio's copies are always in Turkish.
 */
import { BRIEF_BUDGETS, BRIEF_TIMES, BRIEF_TYPES, HOME } from '../content/home';
import { START, type About } from '../content/start';
import type { Booking } from '../data/bookings';
import { ticketNo } from '../data/bookings';
import type { Lang } from '../i18n';
import { cityOf, hm, istDay, IST_OFFSET, localHm } from '../../shared/booking';
import { dayLabel } from '../../shared/dates';
import { ics } from './ics';
import type { Mail } from './index';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

export function istTime(at: Date): string {
  return hm(((Math.floor(at.getTime() / 60_000) + IST_OFFSET) % 1440 + 1440) % 1440);
}

/** "3 Kasım 2026 Salı · 11:00" */
export function when(at: Date, lang: Lang): string {
  return `${dayLabel(istDay(at), lang, true)} · ${istTime(at)}`;
}

export function meetUrl(template: string | undefined, token: string): string | null {
  return template ? template.replace('{ticket}', token) : null;
}

export const firstName = (name: string) => (name.trim().split(/\s+/)[0] ?? '').replace(/,/g, '');

export function callIcs(b: Booking, lang: Lang, meet: string | null, now: Date): string {
  const c = START[lang].mail;
  return ics({
    uid: `${b.token}@lostcomma.co`,
    start: b.startsAt,
    minutes: b.minutes,
    title: lang === 'tr' ? 'Lost Comma ile görüşme' : 'Call with Lost Comma',
    description: [c.ready, meet ? fill(c.link, { url: meet }) : c.noLink, 'hello@lostcomma.co'].join('\n'),
    url: meet,
    now,
  });
}

export function bookingMails(b: Booking, o: { studio: string; meet: string | null; now: Date }): Mail[] {
  const lang = b.lang;
  const c = START[lang].mail;
  const about = (b.about as About[]).map((k) => START.tr.about[k] ?? k);
  const studio: Mail = {
    kind: 'booking',
    to: o.studio,
    replyTo: b.email,
    subject: `Yeni görüşme: ${b.name} · ${when(b.startsAt, 'tr')}`,
    text: [
      `${b.name} <${b.email}> yirmi dakikalık bir görüşme ayırdı.`,
      '',
      `Zaman: ${when(b.startsAt, 'tr')} İstanbul`,
      `Onun saatiyle: ${localHm(b.startsAt, b.tz)} (${cityOf(b.tz)})`,
      `Konu: ${about.join(' · ') || '-'}`,
      `Not: ${b.note || '-'}`,
      '',
      `Bilet: ${ticketNo(b.no)} · dil: ${lang}`,
      o.meet ? `Görüşme: ${o.meet}` : 'Görüşme bağlantısını bir gün önce göndermeyi unutma.',
    ].join('\n'),
  };
  const guest: Mail = {
    kind: 'booking-guest',
    to: b.email,
    replyTo: o.studio,
    subject: fill(c.guestSubject, { when: when(b.startsAt, lang) }),
    text: [
      fill(c.hello, { name: firstName(b.name) }),
      '',
      c.ready,
      '',
      fill(c.ist, { when: when(b.startsAt, lang) }),
      ...(b.tz !== 'Europe/Istanbul' ? [fill(c.yours, { time: localHm(b.startsAt, b.tz), city: cityOf(b.tz) })] : []),
      '',
      o.meet ? fill(c.link, { url: o.meet }) : c.noLink,
      c.calendar,
      '',
      c.before,
      c.change,
      '',
      'Lost Comma',
      'hello@lostcomma.co',
    ].join('\n'),
    ics: callIcs(b, lang, o.meet, o.now),
  };
  return [studio, guest];
}

/** The visitor hears that their call is off (their language) · the calendar file removes the event. */
export function cancelMail(b: Booking, o: { studio: string; startUrl: string; message?: string; now: Date }): Mail {
  const lang = b.lang;
  const c = START[lang].mail;
  return {
    kind: 'booking-cancel',
    to: b.email,
    replyTo: o.studio,
    subject: fill(c.cancelSubject, { when: when(b.startsAt, lang) }),
    text: [
      fill(c.hello, { name: firstName(b.name) }),
      '',
      fill(c.cancelled, { when: when(b.startsAt, lang) }),
      ...(o.message?.trim() ? ['', o.message.trim()] : []),
      '',
      fill(c.rebook, { url: o.startUrl }),
      '',
      'Lost Comma',
      'hello@lostcomma.co',
    ].join('\n'),
    ics: ics({ uid: `${b.token}@lostcomma.co`, start: b.startsAt, minutes: b.minutes, title: lang === 'tr' ? 'Lost Comma ile görüşme' : 'Call with Lost Comma', description: fill(c.cancelled, { when: when(b.startsAt, lang) }), now: o.now, cancel: true }),
  };
}

const TYPE_TR: Record<(typeof BRIEF_TYPES)[number], string> = { website: 'Web sitesi', app: 'Uygulama', identity: 'Kimlik', motion: 'Hareket' };
/** The labels the visitor saw on the homepage brief (Turkish). */
const TIME_TR = (k: (typeof BRIEF_TIMES)[number]) => HOME.tr.times[BRIEF_TIMES.indexOf(k)]?.n ?? k;
const BUDGET_TR = (k: (typeof BRIEF_BUDGETS)[number]) => HOME.tr.budgets[BRIEF_BUDGETS.indexOf(k)]?.n ?? k;

export interface BriefMailInput {
  name: string;
  email: string;
  types: (typeof BRIEF_TYPES)[number][];
  time?: (typeof BRIEF_TIMES)[number] | null;
  budget?: (typeof BRIEF_BUDGETS)[number] | null;
  message: string;
  lang: Lang;
}

export function briefMail(b: BriefMailInput, studio: string): Mail {
  return {
    kind: 'brief',
    to: studio,
    replyTo: b.email,
    subject: `Yeni brief: ${b.name || b.email}`,
    text: [
      `${b.name || 'İsimsiz'} <${b.email}> ana sayfadan bir brief gönderdi.`,
      '',
      `Ne: ${b.types.map((x) => TYPE_TR[x]).join(' · ') || '-'}`,
      `Ne zaman: ${b.time ? TIME_TR(b.time) : '-'}`,
      `Bütçe: ${b.budget ? BUDGET_TR(b.budget) : '-'}`,
      `Dil: ${b.lang}`,
      '',
      b.message || '(mesaj yok)',
    ].join('\n'),
  };
}
