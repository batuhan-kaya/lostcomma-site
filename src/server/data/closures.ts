/**
 * Days and hours we do not take calls (panel · Görüşmeler). A closed whole day drops out of the
 * Start page and the next working day takes its place · closed hours block the slots they touch.
 */
import { and, asc, gte, lte } from 'drizzle-orm';
import type { Db } from '../db';
import { closures } from '../db/schema';
import { bookingDays, CALL_MINUTES, istDay, slotMinutes, WINDOW } from '../../shared/booking';

export type Closure = typeof closures.$inferSelect;

export async function closuresBetween(db: Db, from: string, to: string): Promise<Closure[]> {
  return db.select().from(closures).where(and(gte(closures.day, from), lte(closures.day, to))).orderBy(asc(closures.day), asc(closures.fromMin));
}

/** Upcoming closures (the panel list). */
export async function upcomingClosures(db: Db, now: Date): Promise<Closure[]> {
  return db.select().from(closures).where(gte(closures.day, istDay(now))).orderBy(asc(closures.day), asc(closures.fromMin));
}

const wholeDay = (c: Closure) => c.fromMin === null || c.toMin === null || (c.fromMin <= slotMinutes()[0]! && c.toMin >= slotMinutes().at(-1)! + CALL_MINUTES);

/** Minutes (Istanbul) of the slots a day's closures block. */
export function blockedOn(list: Closure[], day: string): Set<number> {
  const out = new Set<number>();
  for (const c of list) {
    if (c.day !== day) continue;
    for (const m of slotMinutes()) if (wholeDay(c) || (m < c.toMin! && m + CALL_MINUTES > c.fromMin!)) out.add(m);
  }
  return out;
}

/** The next ten working days we are open · whole closed days skipped. Also returns the closures in that range. */
export async function openDays(db: Db, now: Date): Promise<{ days: string[]; closures: Closure[] }> {
  // Look far enough ahead to find ten open days even around a long holiday.
  const candidates = bookingDays(now, WINDOW * 5);
  const list = await closuresBetween(db, candidates[0]!, candidates.at(-1)!);
  const days = candidates.filter((d) => blockedOn(list, d).size < slotMinutes().length).slice(0, WINDOW);
  return { days, closures: list.filter((c) => c.day <= days.at(-1)!) };
}
