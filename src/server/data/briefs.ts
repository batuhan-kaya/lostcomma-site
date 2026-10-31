import { desc } from 'drizzle-orm';
import type { Db } from '../db';
import { briefs } from '../db/schema';

export type Brief = typeof briefs.$inferInsert;
export type StoredBrief = typeof briefs.$inferSelect;

export async function addBrief(db: Db, brief: Brief): Promise<void> {
  await db.insert(briefs).values(brief);
}

/** Newest first. The panel (phase 11) lists them · tests read them back. */
export function recentBriefs(db: Db, limit = 50): Promise<StoredBrief[]> {
  return db.select().from(briefs).orderBy(desc(briefs.createdAt)).limit(limit);
}
