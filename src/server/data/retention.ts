/**
 * Records we promise to delete (the privacy and KVKK pages): briefs and calls after two years ·
 * the mail log and the panel's change log after the same time. Runs with the statistics prune.
 */
import { lt } from 'drizzle-orm';
import type { Db } from '../db';
import { audit, bookings, briefs, outbox } from '../db/schema';

export async function pruneRecords(db: Db, now: Date, days: number): Promise<{ briefs: number; bookings: number; outbox: number; audit: number }> {
  const before = new Date(now.getTime() - days * 86_400_000);
  const b = await db.delete(briefs).where(lt(briefs.createdAt, before)).returning({ id: briefs.id });
  const c = await db.delete(bookings).where(lt(bookings.startsAt, before)).returning({ id: bookings.id });
  const o = await db.delete(outbox).where(lt(outbox.createdAt, before)).returning({ id: outbox.id });
  const a = await db.delete(audit).where(lt(audit.at, before)).returning({ id: audit.id });
  return { briefs: b.length, bookings: c.length, outbox: o.length, audit: a.length };
}
