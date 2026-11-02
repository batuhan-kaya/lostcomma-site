import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ABOUT_KEYS } from '../content/start';
import { addBooking, bookingByToken } from '../data/bookings';
import type { Db } from '../db';
import { translator } from '../i18n';
import { enqueue, type Postman } from '../mail';
import { bookingMails, callIcs, meetUrl } from '../mail/messages';
import { ticketHtml } from '../pages/start';
import { href } from '../routes';
import { IST_OFFSET, istDay, parseSlot, validZone } from '../../shared/booking';
import { blockedOn, openDays } from '../data/closures';
import type { Stats } from '../stats';
import { RateLimit } from './rate';
import { clientOf } from './stats';

const istMinutes = (d: Date) => (((Math.floor(d.getTime() / 60_000) + IST_OFFSET) % 1440) + 1440) % 1440;

/** Shared by the JSON (fetch) and the form (no JS) paths. */
export const BookingSchema = z.object({
  lang: z.enum(['tr', 'en']).catch('en'),
  slot: z.string().max(20),
  tz: z
    .string()
    .max(64)
    .catch('Europe/Istanbul')
    .transform((tz) => (validZone(tz) ? tz : 'Europe/Istanbul')),
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().max(200).pipe(z.email()),
  about: z
    .preprocess((v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(ABOUT_KEYS)).max(5))
    .transform((a) => [...new Set(a)]),
  note: z.string().trim().max(600).catch(''),
  /** Honeypot: people never see it · bots fill it. */
  company: z.string().optional(),
});

export interface BookingOptions {
  db: Db;
  siteUrl: string;
  postman: Postman;
  studio: string;
  meet?: string;
  now?: () => Date;
  limit?: RateLimit;
  /** Links the call to the visit that booked it ("how they came" in the panel). */
  stats?: Stats;
}

export function registerBooking(app: FastifyInstance, { db, siteUrl, postman, studio, meet, now = () => new Date(), limit = new RateLimit(3, 3_600_000), stats }: BookingOptions): void {
  const siteHost = new URL(siteUrl).host;

  app.post('/api/booking', async (req, reply) => {
    const wantsJson = String(req.headers['content-type'] ?? '').includes('application/json');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const lang = body.lang === 'tr' ? 'tr' : 'en';
    const slotDay = typeof body.slot === 'string' ? body.slot.slice(0, 10) : '';
    const back = (q: string) => reply.redirect(`${href(lang, 'start')}?${q}#book`, 303);
    const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
      wantsJson ? reply.status(status).send({ ok: false, error, ...extra }) : back(`booking=${error === 'slow-down' ? 'slow' : error === 'taken' ? 'taken' : 'error'}${/^\d{4}-\d{2}-\d{2}$/.test(slotDay) ? `&day=${slotDay}` : ''}`);

    // Same-site posts only. Browsers always send Origin on POST.
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try {
        host = new URL(origin).host;
      } catch {
        host = '';
      }
      if (host !== siteHost) return reply.status(403).send({ ok: false, error: 'origin' });
    }
    if (!limit.take(req.ip)) return fail(429, 'slow-down');

    const parsed = BookingSchema.safeParse(body);
    if (!parsed.success) return fail(422, 'invalid', { fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? '')))] });
    const b = parsed.data;
    // Bots get a friendly page and nothing is stored.
    if (b.company) return wantsJson ? reply.send({ ok: true, ticket: null }) : reply.redirect(`${href(lang, 'start')}#book`, 303);

    const at = now();
    const open = await openDays(db, at);
    const startsAt = parseSlot(b.slot, at, open.days);
    if (!startsAt) return fail(422, 'invalid', { fields: ['slot'] });
    // A closed hour behaves like a taken one.
    if (blockedOn(open.closures, istDay(startsAt)).has(istMinutes(startsAt))) return fail(409, 'taken');

    const visitId = stats ? await stats.currentVisit(clientOf(req)).catch(() => null) : null;
    const booking = await addBooking(db, {
      id: randomUUID(),
      visitId,
      token: randomBytes(12).toString('base64url'),
      startsAt,
      lang: b.lang,
      tz: b.tz,
      name: b.name,
      email: b.email,
      about: b.about,
      note: b.note,
      createdAt: at,
    });
    if (!booking) return fail(409, 'taken');

    await enqueue(db, bookingMails(booking, { studio, meet: meetUrl(meet, booking.token), now: at }), at);
    void postman.kick().catch((err) => req.log.error(err, 'mail'));
    if (visitId) await stats!.event(visitId, 'booking', booking.id).catch((err) => req.log.error(err, 'stats'));
    req.log.info({ booking: booking.id }, 'call booked');

    if (!wantsJson) return back(`ticket=${booking.token}`);
    return reply.send({ ok: true, ticket: { token: booking.token, html: ticketHtml(b.lang, translator(b.lang), booking).value } });
  });

  // The calendar file behind "Add to calendar".
  app.get('/api/booking/:file', async (req, reply) => {
    const m = /^([\w-]{10,40})\.ics$/.exec((req.params as { file: string }).file);
    const booking = m ? await bookingByToken(db, m[1]!) : undefined;
    if (!booking || booking.status !== 'booked') return reply.status(404).type('text/plain; charset=utf-8').send('Not found');
    return reply
      .type('text/calendar; charset=utf-8')
      .header('content-disposition', 'attachment; filename="lost-comma.ics"')
      .header('cache-control', 'private, no-store')
      .send(callIcs(booking, booking.lang, meetUrl(meet, booking.token), now()));
  });
}
