import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { START } from '../src/server/content/start';
import { addBooking, takenBetween, ticketNo, type Booking } from '../src/server/data/bookings';
import { bookings, briefs, outbox } from '../src/server/db/schema';
import { MemoryMailer, enqueue, Postman } from '../src/server/mail';
import { ics } from '../src/server/mail/ics';
import { bookingMails, briefMail, firstName, meetUrl, when } from '../src/server/mail/messages';
import {
  bookingDays,
  cityOf,
  fittingSlots,
  istDay,
  istInstant,
  localHm,
  offsetMinutes,
  overlap,
  parseSlot,
  slotKey,
  slotMinutes,
  STUDIO_DAY,
  validZone,
} from '../src/shared/booking';
import { dayLabel, dayParts } from '../src/shared/dates';

const SITE = 'https://lostcomma.co';
// Saturday 31 October 2026 · 15:00 in Istanbul. The bookable days are 2 to 13 November.
const NOW = new Date('2026-10-31T12:00:00Z');
const DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];

const mailer = new MemoryMailer();
const app = await buildApp({
  config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, SEED: 'none', BOOK_LIMIT: '3', MAIL_TO: 'studio@lostcomma.co', MEET_URL: 'https://meet.jit.si/lostcomma-{ticket}' }),
  now: () => NOW,
  mailer,
});
// No mail settings: messages wait in the outbox.
const quiet = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, SEED: 'none' }), now: () => NOW, mailer: null });
afterAll(async () => {
  await app.close();
  await quiet.close();
});

let ip = 0;
const post = (payload: Record<string, unknown>, o: { form?: boolean; headers?: Record<string, string>; ip?: string; to?: typeof app } = {}) =>
  (o.to ?? app).inject({
    method: 'POST',
    url: '/api/booking',
    remoteAddress: o.ip ?? `10.1.0.${++ip}`,
    headers: { 'content-type': o.form ? 'application/x-www-form-urlencoded' : 'application/json', ...o.headers },
    payload: o.form
      ? new URLSearchParams(Object.entries(payload).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, String(x)]) : [[k, String(v)]]))).toString()
      : JSON.stringify(payload),
  });

const valid = (o: Record<string, unknown> = {}) => ({ lang: 'tr', slot: '2026-11-03T11:00', tz: 'Europe/Berlin', name: 'Ada Yılmaz', email: 'ada@example.com', about: ['website', 'motion'], note: 'Yeni bir site', ...o });

const text = (doc: string) =>
  (doc.split('<body>')[1] ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

beforeEach(async () => {
  for (const a of [app, quiet]) {
    await a.db.delete(bookings);
    await a.db.delete(outbox);
    await a.db.delete(briefs);
  }
  mailer.sent.length = 0;
  mailer.fail = false;
});

/* ================= office hours ================= */

describe('office hours (src/shared/booking)', () => {
  it('offers the next ten working days starting tomorrow in Istanbul', () => {
    expect(bookingDays(NOW)).toEqual(DAYS);
    // Friday 23:30 in Istanbul (still Friday 20:30 UTC): Monday is next.
    expect(bookingDays(new Date('2026-11-06T20:30:00Z'))[0]).toBe('2026-11-09');
    // Thursday 22:30 UTC is already Friday 01:30 in Istanbul.
    expect(bookingDays(new Date('2026-11-05T22:30:00Z'))[0]).toBe('2026-11-09');
    // A weekday morning: tomorrow and never today.
    expect(bookingDays(new Date('2026-11-03T06:00:00Z'))[0]).toBe('2026-11-04');
  });

  it('has fourteen half hour slots from 10:30 to 17:00', () => {
    const s = slotMinutes();
    expect(s).toHaveLength(14);
    expect([s[0], s.at(-1)]).toEqual([630, 1020]);
    expect(slotKey('2026-11-03', 630)).toBe('2026-11-03T10:30');
  });

  it('turns Istanbul times into instants (UTC+3 all year)', () => {
    expect(istInstant('2026-11-03', 630).toISOString()).toBe('2026-11-03T07:30:00.000Z');
    expect(istInstant('2026-07-01', 600).toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(istDay(new Date('2026-11-02T21:30:00Z'))).toBe('2026-11-03');
  });

  it('only accepts slots on the grid of a bookable day', () => {
    expect(parseSlot('2026-11-03T11:00', NOW)?.toISOString()).toBe('2026-11-03T08:00:00.000Z');
    expect(parseSlot('2026-11-13T17:00', NOW)).not.toBeNull();
    for (const bad of ['2026-11-03T11:15', '2026-11-03T10:00', '2026-11-03T17:30', '2026-11-07T11:00', '2026-10-31T11:00', '2026-11-16T11:00', '2026-11-3T11:00', 'soon', '']) {
      expect(parseSlot(bad, NOW), bad).toBeNull();
    }
  });

  it('reads time zone offsets with summer time', () => {
    const nov = new Date('2026-11-03T12:00:00Z');
    const jul = new Date('2026-07-01T12:00:00Z');
    expect(offsetMinutes('Europe/Istanbul', nov)).toBe(180);
    expect(offsetMinutes('Europe/Istanbul', jul)).toBe(180);
    expect(offsetMinutes('Europe/Berlin', nov)).toBe(60);
    expect(offsetMinutes('Europe/Berlin', jul)).toBe(120);
    expect(offsetMinutes('America/New_York', nov)).toBe(-300);
    expect(offsetMinutes('Asia/Kolkata', nov)).toBe(330);
    expect(offsetMinutes('Nowhere/Atlantis', nov)).toBe(0);
    expect(validZone('Europe/Berlin')).toBe(true);
    expect(validZone('Nowhere/Atlantis')).toBe(false);
    expect(cityOf('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(localHm(new Date('2026-11-03T08:00:00Z'), 'America/New_York')).toBe('03:00');
    expect(localHm(new Date('2026-11-03T23:30:00Z'), 'Asia/Tokyo')).toBe('08:30');
  });

  it('keeps only the slots inside both working days', () => {
    const day = '2026-11-03';
    expect(fittingSlots(day, 'Europe/Istanbul')).toHaveLength(14);
    expect(overlap(day, 'Europe/Berlin')).toEqual({ yours: { from: 660, to: 1200 }, both: { from: 660, to: 1080 } });
    expect(fittingSlots(day, 'Europe/Berlin')).toHaveLength(13);
    expect(fittingSlots(day, 'America/New_York')).toEqual([1020]);
    expect(overlap(day, 'America/Los_Angeles').both).toBeNull();
    expect(fittingSlots(day, 'America/Los_Angeles')).toEqual([]);
    expect(fittingSlots(day, 'Asia/Tokyo')).toEqual([630, 660, 690]);
    expect(fittingSlots(day, 'Asia/Kolkata')).toHaveLength(10);
  });

  it('writes day labels without commas', () => {
    expect(dayLabel('2026-11-03', 'tr', true)).toBe('3 Kasım 2026 Salı');
    expect(dayLabel('2026-11-03', 'en', true)).not.toContain(',');
    expect(dayParts('2026-11-03', 'en')).toMatchObject({ d: 3, dow: 'Tuesday' });
  });
});

/* ================= mail ================= */

const booking = (o: Partial<Booking> = {}): Booking => ({
  id: '00000000-0000-4000-8000-000000000001',
  no: 17,
  token: 'tok_abcdefghijkl',
  startsAt: new Date('2026-11-03T08:00:00Z'),
  minutes: 20,
  lang: 'en',
  tz: 'Europe/Berlin',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  about: ['website'],
  note: 'A new site',
  status: 'booked',
  staffNote: '',
  cancelledAt: null,
  visitId: null,
  createdAt: NOW,
  ...o,
});

describe('calendar files', () => {
  const file = ics({ uid: 'x@lostcomma.co', start: new Date('2026-11-03T08:00:00Z'), minutes: 20, title: 'Görüşme; Lost Comma, İstanbul', description: 'Satır bir\nSatır iki ' + 'ğüşıöç'.repeat(20), url: 'https://meet.jit.si/lc-1', now: NOW });
  const lines = file.split('\r\n');

  it('is a CRLF calendar with one twenty minute event', () => {
    expect(file.endsWith('\r\n')).toBe(true);
    expect(file.replace(/\r\n/g, '')).not.toContain('\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(file).toContain('DTSTART:20261103T080000Z');
    expect(file).toContain('DTEND:20261103T082000Z');
    expect(file).toContain('DTSTAMP:20261031T120000Z');
    expect(file).toContain('URL:https://meet.jit.si/lc-1');
    expect(file).toContain('TRIGGER:-PT10M');
  });

  it('escapes text and folds long lines without breaking letters', () => {
    expect(file).toContain('SUMMARY:Görüşme\\; Lost Comma\\, İstanbul');
    expect(file).toContain('Satır bir\\nSatır iki');
    for (const l of lines) expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75);
    const unfolded = file.replace(/\r\n /g, '');
    expect(unfolded).toContain('ğüşıöç'.repeat(20));
    expect(unfolded).not.toContain('�');
  });
});

describe('messages', () => {
  it('sends the studio a Turkish note and the visitor one in their language with the invitation', () => {
    const [studio, guest] = bookingMails(booking(), { studio: 'studio@lostcomma.co', meet: 'https://meet.jit.si/lc-x', now: NOW });
    expect(studio).toMatchObject({ kind: 'booking', to: 'studio@lostcomma.co', replyTo: 'ada@example.com' });
    expect(studio!.subject).toBe('Yeni görüşme: Ada Lovelace · 3 Kasım 2026 Salı · 11:00');
    expect(studio!.text).toContain('Onun saatiyle: 09:00 (Berlin)');
    expect(studio!.text).toContain('Konu: Web sitesi');
    expect(studio!.text).toContain(`Bilet: ${ticketNo(17)}`);
    expect(studio!.ics).toBeUndefined();
    expect(guest).toMatchObject({ kind: 'booking-guest', to: 'ada@example.com', replyTo: 'studio@lostcomma.co' });
    expect(guest!.subject).toBe(`Our call: ${when(booking().startsAt, 'en')} Istanbul`);
    expect(guest!.text).toContain('Hello Ada');
    expect(guest!.text).toContain('Your time: 09:00 (Berlin)');
    expect(guest!.text).toContain('The call: https://meet.jit.si/lc-x');
    expect(guest!.ics).toContain('DTSTART:20261103T080000Z');
  });

  it('promises the link later when there is no video address', () => {
    const [studio, guest] = bookingMails(booking({ lang: 'tr', tz: 'Europe/Istanbul' }), { studio: 's@x.co', meet: null, now: NOW });
    expect(guest!.text).toContain(START.tr.mail.noLink);
    expect(guest!.text).not.toContain('Senin saatinle');
    expect(studio!.text).toContain('Görüşme bağlantısını bir gün önce göndermeyi unutma.');
    expect(meetUrl('https://meet.jit.si/lc-{ticket}', 'abc')).toBe('https://meet.jit.si/lc-abc');
    expect(meetUrl(undefined, 'abc')).toBeNull();
    expect(firstName('  Ada, Lovelace ')).toBe('Ada');
  });

  it('keeps the comma rule in every message and in the Start copy', () => {
    expect(strings(START).filter((s) => s.includes(','))).toEqual([]);
    for (const lang of ['tr', 'en'] as const) {
      for (const m of bookingMails(booking({ lang, tz: 'Asia/Tokyo', about: ['app', 'unsure'] }), { studio: 's@x.co', meet: null, now: NOW })) {
        expect(m.subject + m.text).not.toContain(',');
      }
    }
    const brief = briefMail({ name: 'Ada', email: 'ada@example.com', types: ['website', 'app'], time: '1m', budget: 'b15', message: 'Merhaba', lang: 'tr' }, 's@x.co');
    expect(brief.text).toContain('Ne: Web sitesi · Uygulama');
    expect(brief.subject + brief.text).not.toContain(',');
  });
});

describe('the postman', () => {
  it('sends what waits in the outbox and marks it sent', async () => {
    await enqueue(app.db, [{ kind: 'test', to: 'a@b.co', subject: 'Hi', text: 'Hello' }], NOW);
    await app.postman.kick();
    expect(mailer.sent).toMatchObject([{ to: 'a@b.co', from: 'Lost Comma <hello@lostcomma.co>' }]);
    const [row] = await app.db.select().from(outbox);
    expect(row).toMatchObject({ status: 'sent', tries: 1, lastError: null });
  });

  it('retries failures on the timer and gives up after five tries', async () => {
    mailer.fail = true;
    await enqueue(app.db, [{ kind: 'test', to: 'a@b.co', subject: 'Hi', text: 'Hello' }], NOW);
    await app.postman.kick();
    let [row] = await app.db.select().from(outbox);
    expect(row).toMatchObject({ status: 'pending', tries: 1, lastError: 'mail server said no' });
    // A new message does not resend the failed one · only the timer (retry) does.
    await app.postman.kick();
    [row] = await app.db.select().from(outbox);
    expect(row?.tries).toBe(1);
    for (let i = 0; i < 4; i++) await app.postman.kick(true);
    [row] = await app.db.select().from(outbox);
    expect(row).toMatchObject({ status: 'failed', tries: 5 });
    expect(mailer.sent).toHaveLength(0);
  });

  it('sends a failed message once the server answers again', async () => {
    mailer.fail = true;
    await enqueue(app.db, [{ kind: 'test', to: 'a@b.co', subject: 'Hi', text: 'Hello' }], NOW);
    await app.postman.kick();
    mailer.fail = false;
    await app.postman.kick(true);
    expect(mailer.sent).toHaveLength(1);
    expect((await app.db.select().from(outbox))[0]).toMatchObject({ status: 'sent', tries: 2 });
  });

  it('skips news older than two days', async () => {
    await enqueue(app.db, [{ kind: 'test', to: 'old@b.co', subject: 'Old', text: 'Old' }], new Date(NOW.getTime() - 3 * 86_400_000));
    await app.postman.kick(true);
    expect(mailer.sent).toHaveLength(0);
    expect((await app.db.select().from(outbox))[0]).toMatchObject({ status: 'skipped' });
  });

  it('keeps everything in the outbox without mail settings', async () => {
    const p = new Postman(quiet.db, null, 'x');
    expect(p.on).toBe(false);
    await enqueue(quiet.db, [{ kind: 'test', to: 'a@b.co', subject: 'Hi', text: 'Hello' }], NOW);
    await p.kick(true);
    expect((await quiet.db.select().from(outbox))[0]?.status).toBe('pending');
  });

  it('tells the studio about a new brief', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/brief', remoteAddress: '10.9.9.9', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ lang: 'en', email: 'b@example.com', name: 'Bea', types: ['identity'], message: 'Hello' }) });
    expect(res.statusCode).toBe(200);
    await app.postman.drain();
    expect(mailer.sent).toMatchObject([{ kind: 'brief', to: 'studio@lostcomma.co', replyTo: 'b@example.com', subject: 'Yeni brief: Bea' }]);
  });
});

/* ================= the booking API ================= */

describe('POST /api/booking (fetch)', () => {
  it('books a slot · stores it · answers with the ticket · sends two messages', async () => {
    const res = await post(valid({ about: ['website', 'motion', 'website'] }));
    expect(res.statusCode).toBe(200);
    const out = res.json() as { ok: boolean; ticket: { token: string; html: string } };
    expect(out.ok).toBe(true);
    expect(out.ticket.token).toMatch(/^[\w-]{16}$/);
    expect(out.ticket.html).toContain('data-ticket');
    expect(out.ticket.html).toContain('Ayrıldı · görüşürüz Ada');
    expect(out.ticket.html).toContain(`/api/booking/${out.ticket.token}.ics`);
    const rows = await app.db.select().from(bookings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ lang: 'tr', tz: 'Europe/Berlin', name: 'Ada Yılmaz', about: ['website', 'motion'], status: 'booked', minutes: 20 });
    expect(rows[0]?.startsAt.toISOString()).toBe('2026-11-03T08:00:00.000Z');
    expect(rows[0]?.createdAt.toISOString()).toBe(NOW.toISOString());
    await app.postman.drain();
    expect(mailer.sent.map((m) => [m.kind, m.to])).toEqual([
      ['booking', 'studio@lostcomma.co'],
      ['booking-guest', 'ada@example.com'],
    ]);
    expect(mailer.sent[1]?.text).toContain(`https://meet.jit.si/lostcomma-${out.ticket.token}`);
  });

  it('refuses a slot someone already has', async () => {
    expect((await post(valid())).statusCode).toBe(200);
    const res = await post(valid({ email: 'other@example.com' }));
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ ok: false, error: 'taken' });
    expect(await app.db.select().from(bookings)).toHaveLength(1);
  });

  it('frees a slot again once a call is cancelled', async () => {
    await post(valid());
    await app.db.update(bookings).set({ status: 'cancelled' });
    expect((await post(valid({ email: 'next@example.com' }))).statusCode).toBe(200);
  });

  it('says which fields are wrong', async () => {
    let res = await post(valid({ email: 'nope', name: '' }));
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ ok: false, error: 'invalid', fields: ['name', 'email'] });
    for (const slot of ['2026-11-07T11:00', '2026-11-03T11:15', 'later']) {
      res = await post(valid({ slot }));
      expect(res.statusCode, slot).toBe(422);
      expect(res.json()).toMatchObject({ fields: ['slot'] });
    }
    expect((await post(valid({ about: ['spaceship'] }))).statusCode).toBe(422);
    expect(await app.db.select().from(bookings)).toHaveLength(0);
  });

  it('falls back to Istanbul for an unknown time zone and caps the note', async () => {
    await post(valid({ tz: 'Nowhere/Atlantis', note: 'x'.repeat(900) }));
    const [row] = await app.db.select().from(bookings);
    expect(row).toMatchObject({ tz: 'Europe/Istanbul', note: '' });
  });

  it('keeps bots out quietly', async () => {
    const res = await post(valid({ company: 'Spam Inc' }));
    expect(res.json()).toEqual({ ok: true, ticket: null });
    expect(await app.db.select().from(bookings)).toHaveLength(0);
    expect(await app.db.select().from(outbox)).toHaveLength(0);
  });

  it('only takes posts from our own pages', async () => {
    const res = await post(valid(), { headers: { origin: 'https://evil.example' } });
    expect(res.statusCode).toBe(403);
    expect((await post(valid(), { headers: { origin: SITE } })).statusCode).toBe(200);
  });

  it('slows down one address after BOOK_LIMIT tries an hour', async () => {
    const codes: number[] = [];
    for (const slot of ['2026-11-04T11:00', '2026-11-04T11:30', '2026-11-04T12:00', '2026-11-04T12:30']) codes.push((await post(valid({ slot }), { ip: '10.7.7.7' })).statusCode);
    expect(codes).toEqual([200, 200, 200, 429]);
    expect((await post(valid({ slot: '2026-11-05T11:00' }), { ip: '10.7.7.8' })).statusCode).toBe(200);
  });

  it('works without mail settings: the messages wait in the outbox', async () => {
    expect((await post(valid(), { to: quiet })).statusCode).toBe(200);
    const waiting = await quiet.db.select().from(outbox);
    expect(waiting.map((m) => [m.kind, m.status])).toEqual([
      ['booking', 'pending'],
      ['booking-guest', 'pending'],
    ]);
    expect(waiting[1]?.text).toContain(START.tr.mail.noLink);
  });
});

describe('POST /api/booking (form · no JS)', () => {
  it('redirects to the ticket page', async () => {
    const res = await post(valid({ lang: 'en', about: ['app'] }), { form: true });
    expect(res.statusCode).toBe(303);
    const [row] = await app.db.select().from(bookings);
    expect(row?.about).toEqual(['app']);
    expect(res.headers.location).toBe(`/en/start?ticket=${row!.token}#book`);
    const page = await app.inject({ method: 'GET', url: `/en/start?ticket=${row!.token}` });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Booked · see you Ada');
    expect(page.body).toContain(ticketNo(row!.no));
    expect(page.body).not.toContain('data-book');
  });

  it('sends people back to the right day with a reason', async () => {
    await post(valid());
    let res = await post(valid({ email: 'b@example.com' }), { form: true });
    expect(res.headers.location).toBe('/tr/basla?booking=taken&day=2026-11-03#book');
    res = await post(valid({ email: 'nope' }), { form: true });
    expect(res.headers.location).toBe('/tr/basla?booking=error&day=2026-11-03#book');
    const page = await app.inject({ method: 'GET', url: '/tr/basla?booking=taken&day=2026-11-03' });
    expect(page.body).toContain('Biri o saati senden hemen önce aldı.');
    expect(page.body).toMatch(/class="day on[^"]*" href="\?day=2026-11-03#book"/);
  });
});

describe('GET /api/booking/<token>.ics', () => {
  it('serves the invitation for a booked call', async () => {
    const { ticket } = (await post(valid())).json() as { ticket: { token: string } };
    const res = await app.inject({ method: 'GET', url: `/api/booking/${ticket.token}.ics` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toContain('DTSTART:20261103T080000Z');
    expect(res.body).toContain(`UID:${ticket.token}@lostcomma.co`);
  });

  it('knows nothing about other tokens or cancelled calls', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/booking/abcdefghijklmnop.ics' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/booking/..%2Fsecret' })).statusCode).toBe(404);
    const { ticket } = (await post(valid())).json() as { ticket: { token: string } };
    await app.db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.token, ticket.token));
    expect((await app.inject({ method: 'GET', url: `/api/booking/${ticket.token}.ics` })).statusCode).toBe(404);
  });
});

describe('bookings data', () => {
  it('never stores two calls at the same time', async () => {
    const base = { lang: 'en' as const, tz: 'Europe/Istanbul', name: 'A', email: 'a@b.co', about: [], note: '', startsAt: istInstant('2026-11-04', 660) };
    const [a, b] = await Promise.all([addBooking(app.db, { ...base, id: crypto.randomUUID(), token: 'aaaaaaaaaaaaaaaa' }), addBooking(app.db, { ...base, id: crypto.randomUUID(), token: 'bbbbbbbbbbbbbbbb' })]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const taken = await takenBetween(app.db, istInstant('2026-11-04', 0), istInstant('2026-11-05', 0));
    expect([...taken]).toEqual([istInstant('2026-11-04', 660).getTime()]);
  });
});

/* ================= the page ================= */

describe('Start page', () => {
  it('renders ten days and fourteen Istanbul slots on each', async () => {
    const res = await app.inject({ method: 'GET', url: '/tr/basla' });
    expect(res.statusCode).toBe(200);
    const doc = res.body;
    expect([...doc.matchAll(/data-day="([\d-]+)"/g)].map((m) => m[1])).toEqual(DAYS);
    expect(doc).toContain('class="day on" href="?day=2026-11-02#book" data-day="2026-11-02" aria-current="date"');
    expect(doc.match(/type="radio" name="slot"/g)).toHaveLength(140);
    expect(doc).toContain('value="2026-11-02T10:30"');
    expect(doc).toContain('<form class="panel" method="post" action="/api/booking" data-book>');
    expect(doc.match(/<div class="sday" data-sday="[\d-]+">/g)).toHaveLength(1);
    expect(doc).toContain('data-sec="hero"');
    expect(doc).toMatch(/data-sec="book" id="book" data-host="design"/);
    expect(text(doc)).not.toContain(',');
  });

  it('opens on the day in the address and ignores days outside the window', async () => {
    let doc = (await app.inject({ method: 'GET', url: '/en/start?day=2026-11-11' })).body;
    expect(doc).toMatch(/aria-current="date">(?:(?!<\/a>).)*<span class="sr">Wednesday 11 November<\/span>/);
    doc = (await app.inject({ method: 'GET', url: '/en/start?day=2026-12-25' })).body;
    expect(doc).toMatch(/data-day="2026-11-02" aria-current="date"/);
  });

  it('marks booked slots and full days', async () => {
    await post(valid());
    const doc = (await app.inject({ method: 'GET', url: '/tr/basla?day=2026-11-03' })).body;
    expect(doc).toContain('<label class="slot taken" data-m="660"><input type="radio" name="slot" value="2026-11-03T11:00" disabled>');
    const data = JSON.parse(/<script type="application\/json" id="page-data">([\s\S]*?)<\/script>/.exec(doc)![1]!) as { taken: number[] };
    expect(data.taken).toEqual([istInstant('2026-11-03', 660).getTime()]);
    const base = { lang: 'en' as const, tz: 'Europe/Istanbul', name: 'A', email: 'a@b.co', about: [], note: '' };
    for (const m of slotMinutes()) await addBooking(app.db, { ...base, id: crypto.randomUUID(), token: `full${m}abcdefghij`, startsAt: istInstant('2026-11-05', m) });
    const full = (await app.inject({ method: 'GET', url: '/tr/basla' })).body;
    expect(full).toContain('class="day full" href="?day=2026-11-05#book"');
  });

  it('shows the panel for an unknown ticket', async () => {
    const doc = (await app.inject({ method: 'GET', url: '/en/start?ticket=abcdefghijklmnop' })).body;
    expect(doc).toContain('data-book');
    expect(doc).not.toContain('data-ticket');
  });

  it('keeps the start CSS in step with the studio hours', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../src/styles/pages/start.css', import.meta.url), 'utf8');
    const pc = (m: number) => `${((m / 1440) * 100).toFixed(4)}%`;
    expect(css).toContain(`.oband.ist { left: ${pc(STUDIO_DAY.from)}; width: ${pc(STUDIO_DAY.to - STUDIO_DAY.from)};`);
  });
});
