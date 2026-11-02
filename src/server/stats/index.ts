/**
 * Statistics without cookies (docs/ISTATISTIK.md).
 *
 * A visitor is sha256(today's salt · address · browser · host). The salt lives one day and is then
 * deleted: after midnight nobody · not even us · can say which rows belonged to whom. Thirty quiet
 * minutes end a visit. The browser sends page views · time on screen · scroll · clicks in one
 * beacon (src/client/lib/stats.ts) · nothing is written on the visitor's device.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, isNotNull, lt, ne, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db';
import { bookings, briefs, statsEvents, statsSalts, statsViews, statsVisits } from '../db/schema';
import { istDay, IST_OFFSET } from '../../shared/booking';
import { deviceOf, parseAgent } from './agent';
import { placeOf, type GeoLookup } from './geo';
import { parseReferrer, utmOf } from './source';

/** Thirty minutes without a sign of life end a visit. */
export const VISIT_GAP_MS = 30 * 60_000;
/** Time on one page counts up to half an hour (a tab left open all day says nothing). */
export const MAX_VIEW_MS = 30 * 60_000;

const Event = z.object({
  k: z.enum(['click', 'out', 'contact', 'event']),
  n: z.string().trim().max(200).transform((s) => s.replace(/\s+/g, ' ').slice(0, 80)),
  g: z.string().max(400).optional().transform((s) => (s ?? '').slice(0, 200)),
  x: z.number().int().min(0).max(1000).optional(),
  y: z.number().int().min(0).max(500_000).optional(),
  /** Milliseconds after the page opened. */
  t: z.number().int().min(0).max(24 * 3600_000).optional(),
});

/** One beacon from a page: the view (sent whole every time · values only grow) and new events. */
export const BeaconSchema = z.object({
  id: z.uuid(),
  path: z
    .string()
    .max(300)
    .refine((p) => p.startsWith('/') && !p.startsWith('//') && !/^\/(panel|api)(\/|$)/.test(p)),
  page: z.string().max(40).regex(/^[a-zA-Z-]*$/).catch(''),
  lang: z.enum(['tr', 'en']).optional().catch(undefined),
  ref: z.string().max(1000).optional().catch(undefined),
  q: z.string().max(500).optional().catch(undefined),
  w: z.number().int().min(0).max(20_000).catch(0),
  tz: z.string().max(64).catch(''),
  bl: z.string().max(35).catch(''),
  /** Time on screen so far (ms) · how far down so far (%) · how long ago the page opened (ms). */
  ms: z.number().int().min(0).catch(0).transform((n) => Math.min(n, MAX_VIEW_MS)),
  sc: z.number().int().min(0).max(100).catch(0),
  age: z.number().int().min(0).catch(0),
  ev: z.array(Event).max(60).catch([]),
});

export type Beacon = z.infer<typeof BeaconSchema>;

export interface Client {
  ip: string;
  ua: string;
}

export interface StatsOptions {
  db: Db;
  /** The site's own host (a referrer from it is not a source · part of the visitor hash). */
  host: string;
  now?: () => Date;
  geo?: GeoLookup | null;
  /** How long visits are kept (days) · ones linked to a brief or a call stay with it. */
  days?: number;
}

/** Midnight in Istanbul for a day (YYYY-MM-DD). */
const istMidnight = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET * 60_000);

export class Stats {
  readonly db: Db;
  private readonly host: string;
  private readonly now: () => Date;
  private readonly geo: GeoLookup | null;
  private readonly days: number;
  private salt: { day: string; value: string } | null = null;

  constructor(o: StatsOptions) {
    this.db = o.db;
    this.host = o.host;
    this.now = o.now ?? (() => new Date());
    this.geo = o.geo ?? null;
    this.days = o.days ?? 395;
  }

  /** Today's salt: made on first use · yesterday's is deleted at the same moment. */
  private async saltFor(day: string): Promise<string> {
    if (this.salt?.day === day) return this.salt.value;
    await this.db.insert(statsSalts).values({ day, salt: randomBytes(32).toString('hex') }).onConflictDoNothing();
    const [row] = await this.db.select().from(statsSalts).where(eq(statsSalts.day, day));
    await this.db.delete(statsSalts).where(ne(statsSalts.day, day));
    this.salt = { day, value: row!.salt };
    return row!.salt;
  }

  /** The visitor hash for today. */
  async visitor(c: Client): Promise<string> {
    const salt = await this.saltFor(istDay(this.now()));
    return createHash('sha256').update(`${salt}|${c.ip}|${c.ua}|${this.host}`).digest('hex').slice(0, 16);
  }

  /** The visit this client is in right now (thirty minutes) · null when there is none. */
  async currentVisit(c: Client): Promise<string | null> {
    if (parseAgent(c.ua).bot) return null;
    const visitor = await this.visitor(c);
    const since = new Date(this.now().getTime() - VISIT_GAP_MS);
    const [v] = await this.db
      .select({ id: statsVisits.id })
      .from(statsVisits)
      .where(and(eq(statsVisits.visitor, visitor), gte(statsVisits.lastAt, since)))
      .orderBy(desc(statsVisits.lastAt))
      .limit(1);
    return v?.id ?? null;
  }

  /** Something that happened on the server inside a visit (a brief · a booking). */
  async event(visitId: string, name: string, target = ''): Promise<void> {
    const at = this.now();
    await this.db.insert(statsEvents).values({ visitId, at, kind: 'event', name, target });
    await this.db.update(statsVisits).set({ lastAt: at }).where(eq(statsVisits.id, visitId));
  }

  /** Records one beacon. Returns false when it was not counted (a bot). */
  async record(c: Client, b: Beacon): Promise<boolean> {
    const agent = parseAgent(c.ua);
    if (agent.bot) return false;
    const now = this.now();
    const start = new Date(now.getTime() - Math.min(b.age, 24 * 3600_000));
    const [known] = await this.db.select().from(statsViews).where(eq(statsViews.id, b.id));
    let visitId: string;
    if (known) {
      visitId = known.visitId;
      const delta = Math.max(0, b.ms - known.engagedMs);
      await this.db
        .update(statsViews)
        .set({ engagedMs: Math.max(known.engagedMs, b.ms), scroll: Math.max(known.scroll, b.sc) })
        .where(eq(statsViews.id, b.id));
      await this.db
        .update(statsVisits)
        .set({ lastAt: now, engagedMs: sql`${statsVisits.engagedMs} + ${delta}` })
        .where(eq(statsVisits.id, visitId));
    } else {
      const visitor = await this.visitor(c);
      const [open] = await this.db
        .select({ id: statsVisits.id })
        .from(statsVisits)
        .where(and(eq(statsVisits.visitor, visitor), gte(statsVisits.lastAt, new Date(now.getTime() - VISIT_GAP_MS))))
        .orderBy(desc(statsVisits.lastAt))
        .limit(1);
      if (open) visitId = open.id;
      else {
        visitId = randomUUID();
        const ref = parseReferrer(b.ref ?? '', this.host);
        const utm = utmOf(b.q ?? '');
        const place = placeOf(this.geo, c.ip, b.tz);
        await this.db.insert(statsVisits).values({
          id: visitId,
          visitor,
          startedAt: start,
          lastAt: now,
          entry: b.path,
          exit: b.path,
          refHost: ref?.host ?? '',
          refPath: ref?.path ?? '',
          utmSource: utm.source,
          utmMedium: utm.medium,
          utmCampaign: utm.campaign,
          country: place.country,
          city: place.city,
          device: deviceOf(agent, b.w),
          os: agent.os,
          browser: agent.browser,
          lang: b.lang ?? null,
          browserLang: b.bl,
          tz: b.tz,
        });
      }
      const added = await this.db
        .insert(statsViews)
        .values({ id: b.id, visitId, at: start, path: b.path, page: b.page, lang: b.lang ?? null, engagedMs: b.ms, scroll: b.sc, width: Math.min(b.w, 32_000) })
        .onConflictDoNothing()
        .returning({ id: statsViews.id });
      if (added.length) {
        await this.db
          .update(statsVisits)
          .set({ views: sql`${statsVisits.views} + 1`, exit: b.path, lastAt: now, engagedMs: sql`${statsVisits.engagedMs} + ${b.ms}` })
          .where(eq(statsVisits.id, visitId));
      }
    }
    if (b.ev.length) {
      await this.db.insert(statsEvents).values(
        b.ev.map((e) => ({
          visitId,
          viewId: b.id,
          at: e.t !== undefined ? new Date(Math.min(start.getTime() + e.t, now.getTime())) : now,
          kind: e.k,
          name: e.n,
          target: e.g ?? '',
          x: e.x ?? null,
          y: e.y ?? null,
          width: e.x !== undefined ? Math.min(b.w, 32_000) : null,
        })),
      );
    }
    return true;
  }

  /** What we hold about this client today (the privacy page shows it). */
  async mine(c: Client): Promise<{ visits: { id: string; startedAt: Date; country: string; device: string; source: string; views: { path: string; at: Date; ms: number; scroll: number }[]; events: number }[] }> {
    const visitor = await this.visitor(c);
    const day = istDay(this.now());
    const visits = await this.db
      .select()
      .from(statsVisits)
      .where(and(eq(statsVisits.visitor, visitor), gte(statsVisits.startedAt, istMidnight(day))))
      .orderBy(statsVisits.startedAt);
    if (!visits.length) return { visits: [] };
    const ids = visits.map((v) => v.id);
    const views = await this.db.select().from(statsViews).where(inArray(statsViews.visitId, ids)).orderBy(statsViews.at);
    const events = await this.db.select({ visitId: statsEvents.visitId }).from(statsEvents).where(inArray(statsEvents.visitId, ids));
    return {
      visits: visits.map((v) => ({
        id: v.id,
        startedAt: v.startedAt,
        country: v.country,
        device: v.device,
        source: v.refHost || v.utmSource,
        views: views.filter((w) => w.visitId === v.id).map((w) => ({ path: w.path, at: w.at, ms: w.engagedMs, scroll: w.scroll })),
        events: events.filter((e) => e.visitId === v.id).length,
      })),
    };
  }

  /** Deletes everything held about this client today. Returns how many visits went. */
  async forget(c: Client): Promise<number> {
    const visitor = await this.visitor(c);
    const gone = await this.db.delete(statsVisits).where(eq(statsVisits.visitor, visitor)).returning({ id: statsVisits.id });
    return gone.length;
  }

  /** Old visits go (the ones linked to a brief or a call stay with it) · old salts go. */
  async prune(): Promise<number> {
    const now = this.now();
    await this.saltFor(istDay(now));
    const before = new Date(now.getTime() - this.days * 86_400_000);
    const keep = [
      ...(await this.db.select({ id: briefs.visitId }).from(briefs).where(isNotNull(briefs.visitId))),
      ...(await this.db.select({ id: bookings.visitId }).from(bookings).where(isNotNull(bookings.visitId))),
    ]
      .map((r) => r.id)
      .filter((id): id is string => !!id);
    const gone = await this.db
      .delete(statsVisits)
      .where(keep.length ? and(lt(statsVisits.startedAt, before), notInArray(statsVisits.id, keep)) : lt(statsVisits.startedAt, before))
      .returning({ id: statsVisits.id });
    return gone.length;
  }
}
