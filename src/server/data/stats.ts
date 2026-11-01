/**
 * Questions the panel asks the statistics (docs/ISTATISTIK.md). Days are Istanbul days
 * (UTC+3 all year). Numbers come back as plain integers.
 */
import { and, asc, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Db } from '../db';
import { bookings, briefs, statsEvents, statsViews, statsVisits } from '../db/schema';
import { IST_OFFSET, istDay } from '../../shared/booking';
import { sourceName } from '../stats/source';

export const PERIODS = [
  { key: 'today', label: 'Bugün', days: 1 },
  { key: '7d', label: '7 gün', days: 7 },
  { key: '30d', label: '30 gün', days: 30 },
  { key: '90d', label: '90 gün', days: 90 },
  { key: '12m', label: '12 ay', days: 364 },
] as const;
export type PeriodKey = (typeof PERIODS)[number]['key'];

export interface Range {
  key: PeriodKey;
  label: string;
  from: Date;
  to: Date;
  /** The same length just before (for the change arrows). */
  prev: { from: Date; to: Date };
  bucket: 'hour' | 'day' | 'week';
}

const DAY = 86_400_000;
const istMidnight = (d: Date) => new Date(Date.parse(`${istDay(d)}T00:00:00Z`) - IST_OFFSET * 60_000);

export function rangeOf(key: string | undefined, now: Date): Range {
  const p = PERIODS.find((x) => x.key === key) ?? PERIODS[1];
  const from = new Date(istMidnight(now).getTime() - (p.days - 1) * DAY);
  const span = now.getTime() - from.getTime();
  return { key: p.key, label: p.label, from, to: new Date(now.getTime() + 1), prev: { from: new Date(from.getTime() - Math.max(span, DAY)), to: from }, bucket: p.key === 'today' ? 'hour' : p.key === '12m' ? 'week' : 'day' };
}

/** "SQL expression in Istanbul time" for grouping. */
const local = (col: SQL | unknown) => sql`((${col} at time zone 'UTC') + interval '${sql.raw(String(IST_OFFSET))} minutes')`;
const keyOf = (bucket: Range['bucket'], col: unknown) =>
  bucket === 'hour'
    ? sql<string>`to_char(${local(col)}, 'YYYY-MM-DD HH24')`
    : bucket === 'week'
      ? sql<string>`to_char(date_trunc('week', ${local(col)}), 'YYYY-MM-DD')`
      : sql<string>`to_char(${local(col)}, 'YYYY-MM-DD')`;

const n = sql<number>`count(*)::int`;
const inRange = (col: Parameters<typeof gte>[0], r: { from: Date; to: Date }) => and(gte(col, r.from), lt(col, r.to));

export interface Summary {
  visits: number;
  visitors: number;
  views: number;
  avgMs: number;
  /** Visits that saw one page only (%). */
  single: number;
  briefs: number;
  calls: number;
}

export async function summary(db: Db, r: { from: Date; to: Date }): Promise<Summary> {
  const [v] = await db
    .select({
      visits: n,
      visitors: sql<number>`count(distinct ${statsVisits.visitor})::int`,
      views: sql<number>`coalesce(sum(${statsVisits.views}), 0)::int`,
      avgMs: sql<number>`coalesce(avg(${statsVisits.engagedMs}), 0)::int`,
      single: sql<number>`count(*) filter (where ${statsVisits.views} <= 1)::int`,
    })
    .from(statsVisits)
    .where(inRange(statsVisits.startedAt, r));
  const [b] = await db.select({ n }).from(briefs).where(inRange(briefs.createdAt, r));
  const [c] = await db.select({ n }).from(bookings).where(inRange(bookings.createdAt, r));
  return {
    visits: v?.visits ?? 0,
    visitors: v?.visitors ?? 0,
    views: v?.views ?? 0,
    avgMs: v?.avgMs ?? 0,
    single: v?.visits ? Math.round(((v.single ?? 0) / v.visits) * 100) : 0,
    briefs: b?.n ?? 0,
    calls: c?.n ?? 0,
  };
}

export interface Point {
  key: string;
  visits: number;
  views: number;
}

/** One point per hour · day or week (empty ones included). */
export async function series(db: Db, r: Range): Promise<Point[]> {
  const vk = keyOf(r.bucket, statsVisits.startedAt);
  const wk = keyOf(r.bucket, statsViews.at);
  const visits = await db.select({ k: vk, n }).from(statsVisits).where(inRange(statsVisits.startedAt, r)).groupBy(sql`1`);
  const views = await db.select({ k: wk, n }).from(statsViews).where(inRange(statsViews.at, r)).groupBy(sql`1`);
  const keys: string[] = [];
  const step = r.bucket === 'hour' ? 3_600_000 : r.bucket === 'week' ? 7 * DAY : DAY;
  const local = (d: Date) => new Date(d.getTime() + IST_OFFSET * 60_000).toISOString();
  let t = r.from.getTime();
  if (r.bucket === 'week') {
    // Weeks start on Monday (date_trunc('week')).
    const d = new Date(t + IST_OFFSET * 60_000);
    t -= ((d.getUTCDay() + 6) % 7) * DAY;
  }
  for (; t < r.to.getTime(); t += step) {
    const s = local(new Date(t));
    keys.push(r.bucket === 'hour' ? `${s.slice(0, 10)} ${s.slice(11, 13)}` : s.slice(0, 10));
  }
  const get = (rows: { k: string; n: number }[], k: string) => rows.find((x) => x.k === k)?.n ?? 0;
  return keys.map((k) => ({ key: k, visits: get(visits, k), views: get(views, k) }));
}

export interface Row {
  label: string;
  n: number;
  /** A second number (visitors · average seconds · …) when the table has one. */
  m?: number;
  extra?: string;
  href?: string;
}

export async function pages(db: Db, r: { from: Date; to: Date }, limit = 30) {
  const rows = await db
    .select({
      path: statsViews.path,
      views: n,
      visits: sql<number>`count(distinct ${statsViews.visitId})::int`,
      avgMs: sql<number>`coalesce(avg(${statsViews.engagedMs}), 0)::int`,
      scroll: sql<number>`coalesce(avg(${statsViews.scroll}), 0)::int`,
    })
    .from(statsViews)
    .where(inRange(statsViews.at, r))
    .groupBy(statsViews.path)
    .orderBy(desc(n))
    .limit(limit);
  const exits = await db.select({ path: statsVisits.exit, n }).from(statsVisits).where(inRange(statsVisits.startedAt, r)).groupBy(statsVisits.exit);
  return rows.map((x) => ({ ...x, exits: exits.find((e) => e.path === x.path)?.n ?? 0 }));
}

async function group(db: Db, col: PgColumn, r: { from: Date; to: Date }, limit = 20): Promise<{ k: string; n: number }[]> {
  return db
    .select({ k: sql<string>`${col}`, n })
    .from(statsVisits)
    .where(inRange(statsVisits.startedAt, r))
    .groupBy(col)
    .orderBy(desc(n))
    .limit(limit);
}

export const entries = (db: Db, r: { from: Date; to: Date }) => group(db, statsVisits.entry, r);

/** Where people came from · several hosts of one place are summed (google.com.tr · google.com). */
export async function sources(db: Db, r: { from: Date; to: Date }): Promise<Row[]> {
  const rows = await group(db, statsVisits.refHost, r, 200);
  const by = new Map<string, { n: number; hosts: string[] }>();
  for (const x of rows) {
    const name = sourceName(x.k);
    const cur = by.get(name) ?? { n: 0, hosts: [] };
    cur.n += x.n;
    if (x.k) cur.hosts.push(x.k);
    by.set(name, cur);
  }
  return [...by.entries()].map(([label, v]) => ({ label, n: v.n, extra: v.hosts.length > 1 || (v.hosts[0] && v.hosts[0] !== label) ? v.hosts.join(' · ') : '' })).sort((a, b) => b.n - a.n).slice(0, 20);
}

export async function campaigns(db: Db, r: { from: Date; to: Date }): Promise<Row[]> {
  const rows = await db
    .select({ s: statsVisits.utmSource, m: statsVisits.utmMedium, c: statsVisits.utmCampaign, n })
    .from(statsVisits)
    .where(and(inRange(statsVisits.startedAt, r), sql`${statsVisits.utmSource} <> '' or ${statsVisits.utmCampaign} <> ''`))
    .groupBy(statsVisits.utmSource, statsVisits.utmMedium, statsVisits.utmCampaign)
    .orderBy(desc(n))
    .limit(20);
  return rows.map((x) => ({ label: [x.s, x.m, x.c].filter(Boolean).join(' · '), n: x.n }));
}

const REGION = new Intl.DisplayNames(['tr'], { type: 'region' });
export const countryName = (cc: string) => {
  if (!cc) return 'Bilinmiyor';
  try {
    return REGION.of(cc) ?? cc;
  } catch {
    return cc;
  }
};

export async function places(db: Db, r: { from: Date; to: Date }): Promise<Row[]> {
  const rows = await db
    .select({ c: statsVisits.country, city: statsVisits.city, n })
    .from(statsVisits)
    .where(inRange(statsVisits.startedAt, r))
    .groupBy(statsVisits.country, statsVisits.city)
    .orderBy(desc(n));
  const by = new Map<string, { n: number; cities: { city: string; n: number }[] }>();
  for (const x of rows) {
    const cur = by.get(x.c) ?? { n: 0, cities: [] };
    cur.n += x.n;
    if (x.city) cur.cities.push({ city: x.city, n: x.n });
    by.set(x.c, cur);
  }
  return [...by.entries()]
    .map(([cc, v]) => ({ label: countryName(cc), n: v.n, extra: v.cities.slice(0, 4).map((c) => `${c.city} ${c.n}`).join(' · ') }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 20);
}

const DEVICE: Record<string, string> = { phone: 'Telefon', tablet: 'Tablet', desktop: 'Masaüstü' };
export const deviceName = (d: string) => DEVICE[d] ?? d;

export async function devices(db: Db, r: { from: Date; to: Date }) {
  const [dev, os, browser, langs] = await Promise.all([
    group(db, statsVisits.device, r),
    group(db, statsVisits.os, r),
    group(db, statsVisits.browser, r),
    db
      .select({ k: sql<string>`lower(split_part(${statsVisits.browserLang}, '-', 1))`, n })
      .from(statsVisits)
      .where(inRange(statsVisits.startedAt, r))
      .groupBy(sql`1`)
      .orderBy(desc(n))
      .limit(12),
  ]);
  const LANG = new Intl.DisplayNames(['tr'], { type: 'language' });
  const langName = (k: string) => {
    try {
      return k ? (LANG.of(k) ?? k) : 'Bilinmiyor';
    } catch {
      return k;
    }
  };
  return {
    device: dev.map((x) => ({ label: deviceName(x.k), n: x.n })),
    os: os.map((x) => ({ label: x.k || 'Diğer', n: x.n })),
    browser: browser.map((x) => ({ label: x.k || 'Diğer', n: x.n })),
    lang: langs.map((x) => ({ label: langName(x.k), n: x.n })),
  };
}

/** What people clicked · grouped by label and where it went. */
export async function clicks(db: Db, r: { from: Date; to: Date }, kinds: string[] = ['click', 'contact'], path?: string, limit = 25): Promise<Row[]> {
  const rows = await db
    .select({ name: statsEvents.name, target: statsEvents.target, kind: statsEvents.kind, n })
    .from(statsEvents)
    .leftJoin(statsViews, eq(statsViews.id, statsEvents.viewId))
    .where(and(inRange(statsEvents.at, r), inArray(statsEvents.kind, kinds), path ? eq(statsViews.path, path) : undefined))
    .groupBy(statsEvents.name, statsEvents.target, statsEvents.kind)
    .orderBy(desc(n))
    .limit(limit);
  return rows.map((x) => ({ label: x.name, n: x.n, extra: x.kind === 'contact' ? (x.target === 'tel' ? 'telefon' : 'e-posta') : x.target }));
}

export async function outbound(db: Db, r: { from: Date; to: Date }): Promise<Row[]> {
  const rows = await db
    .select({ target: statsEvents.target, n })
    .from(statsEvents)
    .where(and(inRange(statsEvents.at, r), eq(statsEvents.kind, 'out')))
    .groupBy(statsEvents.target)
    .orderBy(desc(n))
    .limit(20);
  return rows.map((x) => ({ label: x.target, n: x.n }));
}

const EVENTS: Record<string, string> = { brief: 'Brief gönderildi', booking: 'Görüşme alındı', lang: 'Dil değiştirildi', comma: 'Virgül bulundu' };
export const eventName = (k: string) => EVENTS[k] ?? k;

export async function events(db: Db, r: { from: Date; to: Date }): Promise<Row[]> {
  const rows = await db
    .select({ name: statsEvents.name, n })
    .from(statsEvents)
    .where(and(inRange(statsEvents.at, r), eq(statsEvents.kind, 'event')))
    .groupBy(statsEvents.name)
    .orderBy(desc(n));
  return rows.map((x) => ({ label: eventName(x.name), n: x.n }));
}

/** Home → Start → a call · and any page → a brief. Counted in visits. */
export async function funnels(db: Db, r: { from: Date; to: Date }) {
  const visits = await db.select({ n }).from(statsVisits).where(inRange(statsVisits.startedAt, r));
  const saw = (paths: string[]) =>
    db
      .select({ n: sql<number>`count(distinct ${statsViews.visitId})::int` })
      .from(statsViews)
      .innerJoin(statsVisits, eq(statsVisits.id, statsViews.visitId))
      .where(and(inRange(statsVisits.startedAt, r), inArray(statsViews.path, paths)));
  const did = (name: string) =>
    db
      .select({ n: sql<number>`count(distinct ${statsEvents.visitId})::int` })
      .from(statsEvents)
      .innerJoin(statsVisits, eq(statsVisits.id, statsEvents.visitId))
      .where(and(inRange(statsVisits.startedAt, r), eq(statsEvents.kind, 'event'), eq(statsEvents.name, name)));
  const [all, home, start, call, brief] = await Promise.all([visits, saw(['/tr', '/en']), saw(['/tr/basla', '/en/start']), did('booking'), did('brief')]);
  const v = (x: { n: number }[]) => x[0]?.n ?? 0;
  return {
    call: [
      { label: 'Ziyaret', n: v(all) },
      { label: 'Ana sayfayı gördü', n: v(home) },
      { label: 'Başla sayfasına geldi', n: v(start) },
      { label: 'Görüşme aldı', n: v(call) },
    ],
    brief: [
      { label: 'Ziyaret', n: v(all) },
      { label: 'Brief gönderdi', n: v(brief) },
    ],
  };
}

export interface LiveVisit {
  id: string;
  path: string;
  since: Date;
  lastAt: Date;
  country: string;
  city: string;
  device: string;
  source: string;
  views: number;
}

/** Visits with a sign of life in the last five minutes. */
export async function live(db: Db, now: Date): Promise<LiveVisit[]> {
  const rows = await db
    .select()
    .from(statsVisits)
    .where(gte(statsVisits.lastAt, new Date(now.getTime() - 5 * 60_000)))
    .orderBy(desc(statsVisits.lastAt))
    .limit(50);
  return rows.map((v) => ({
    id: v.id,
    path: v.exit,
    since: v.startedAt,
    lastAt: v.lastAt,
    country: v.country,
    city: v.city,
    device: v.device,
    source: sourceName(v.refHost) + (v.utmSource ? ` · ${v.utmSource}` : ''),
    views: v.views,
  }));
}

export type VisitRow = typeof statsVisits.$inferSelect;

export async function visitList(db: Db, r: { from: Date; to: Date }, page = 0, size = 50, filter: { path?: string; source?: string } = {}) {
  const conds = [inRange(statsVisits.startedAt, r)];
  if (filter.path) conds.push(sql`exists (select 1 from ${statsViews} where ${statsViews.visitId} = ${statsVisits.id} and ${statsViews.path} = ${filter.path})`);
  const rows = await db
    .select()
    .from(statsVisits)
    .where(and(...conds))
    .orderBy(desc(statsVisits.startedAt))
    .limit(size + 1)
    .offset(page * size);
  const ids = rows.map((x) => x.id);
  const linked = ids.length
    ? [
        ...(await db.select({ visitId: briefs.visitId }).from(briefs).where(inArray(briefs.visitId, ids))).map((x) => ({ id: x.visitId!, kind: 'brief' as const })),
        ...(await db.select({ visitId: bookings.visitId }).from(bookings).where(inArray(bookings.visitId, ids))).map((x) => ({ id: x.visitId!, kind: 'booking' as const })),
      ]
    : [];
  return { rows: rows.slice(0, size), more: rows.length > size, linked };
}

export async function visitDetail(db: Db, id: string) {
  const [visit] = await db.select().from(statsVisits).where(eq(statsVisits.id, id));
  if (!visit) return null;
  const views = await db.select().from(statsViews).where(eq(statsViews.visitId, id)).orderBy(asc(statsViews.at));
  const evs = await db.select().from(statsEvents).where(eq(statsEvents.visitId, id)).orderBy(asc(statsEvents.at), asc(statsEvents.id));
  const [brief] = await db.select({ id: briefs.id, name: briefs.name, email: briefs.email }).from(briefs).where(eq(briefs.visitId, id));
  const [call] = await db.select({ id: bookings.id, name: bookings.name, no: bookings.no }).from(bookings).where(eq(bookings.visitId, id));
  return { visit, views, events: evs, brief: brief ?? null, call: call ?? null };
}

export type VisitDetail = NonNullable<Awaited<ReturnType<typeof visitDetail>>>;

/** The click map shows one width band at a time: what a phone saw is not what a desktop saw. */
export const BANDS = {
  phone: { label: 'Telefon', min: 0, max: 700, frame: 390 },
  tablet: { label: 'Tablet', min: 700, max: 1100, frame: 834 },
  desktop: { label: 'Masaüstü', min: 1100, max: 32_000, frame: 1440 },
} as const;
export type Band = keyof typeof BANDS;

/** Click positions on one page for the map (one width band). */
export async function clickMap(db: Db, r: { from: Date; to: Date }, path: string, band: { min: number; max: number }) {
  return db
    .select({ x: statsEvents.x, y: statsEvents.y, name: statsEvents.name })
    .from(statsEvents)
    .innerJoin(statsViews, eq(statsViews.id, statsEvents.viewId))
    .where(
      and(
        inRange(statsEvents.at, r),
        eq(statsViews.path, path),
        sql`${statsEvents.x} is not null`,
        gte(statsEvents.width, band.min),
        lt(statsEvents.width, band.max),
      ),
    )
    .limit(5000);
}

export async function pageSummary(db: Db, r: { from: Date; to: Date }, path: string) {
  const [s] = await db
    .select({
      views: n,
      visits: sql<number>`count(distinct ${statsViews.visitId})::int`,
      avgMs: sql<number>`coalesce(avg(${statsViews.engagedMs}), 0)::int`,
      scroll: sql<number>`coalesce(avg(${statsViews.scroll}), 0)::int`,
      deep: sql<number>`count(*) filter (where ${statsViews.scroll} >= 90)::int`,
    })
    .from(statsViews)
    .where(and(inRange(statsViews.at, r), eq(statsViews.path, path)));
  const from = await db
    .select({ k: statsVisits.refHost, n })
    .from(statsVisits)
    .where(and(inRange(statsVisits.startedAt, r), eq(statsVisits.entry, path)))
    .groupBy(statsVisits.refHost)
    .orderBy(desc(n))
    .limit(10);
  return { ...(s ?? { views: 0, visits: 0, avgMs: 0, scroll: 0, deep: 0 }), sources: from.map((x) => ({ label: sourceName(x.k), n: x.n })) };
}

/** Today in numbers (the Pano card). */
export async function today(db: Db, now: Date) {
  const r = rangeOf('today', now);
  const s = await summary(db, r);
  const l = await db.select({ n }).from(statsVisits).where(gte(statsVisits.lastAt, new Date(now.getTime() - 5 * 60_000)));
  return { visits: s.visits, views: s.views, live: l[0]?.n ?? 0 };
}
