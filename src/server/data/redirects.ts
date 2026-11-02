/**
 * Old addresses that moved. Written by the panel when a slug changes (and by hand). Looked at
 * before the 404 page: a hit answers 301. Chains are flattened so every old address goes
 * straight to the current one.
 */
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { redirects } from '../db/schema';

export async function findRedirect(db: Db, path: string): Promise<string | null> {
  const [row] = await db.update(redirects).set({ hits: sql`${redirects.hits} + 1` }).where(eq(redirects.from, path)).returning({ to: redirects.to });
  return row?.to ?? null;
}

export async function addRedirect(db: Db, from: string, to: string): Promise<void> {
  if (from === to) return;
  // Anything that pointed at the old address now points at the new one.
  await db.update(redirects).set({ to }).where(eq(redirects.to, from));
  // The new address is a real page again.
  await db.delete(redirects).where(eq(redirects.from, to));
  await db.insert(redirects).values({ from, to }).onConflictDoUpdate({ target: redirects.from, set: { to } });
}

export async function removeRedirect(db: Db, from: string): Promise<void> {
  await db.delete(redirects).where(eq(redirects.from, from));
}

export const validPath = (p: string) => /^\/(tr|en)(\/[a-z0-9-]+)*$/.test(p) && p.length <= 200;
