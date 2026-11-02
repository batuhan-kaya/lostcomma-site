import { and, asc, eq, gte, lt } from 'drizzle-orm';
import type { Db } from '../db';
import { bookings } from '../db/schema';

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = Omit<typeof bookings.$inferInsert, 'no'>;

/** Instants (ms) of the booked calls between two instants. */
export async function takenBetween(db: Db, from: Date, to: Date): Promise<Set<number>> {
  const rows = await db
    .select({ at: bookings.startsAt })
    .from(bookings)
    .where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, from), lt(bookings.startsAt, to)));
  return new Set(rows.map((r) => r.at.getTime()));
}

/** Stores a booking · null when someone took the slot first. */
export async function addBooking(db: Db, b: NewBooking): Promise<Booking | null> {
  try {
    const [row] = await db.insert(bookings).values(b).returning();
    return row ?? null;
  } catch (err) {
    const taken = await db.query.bookings.findFirst({ where: and(eq(bookings.startsAt, b.startsAt), eq(bookings.status, 'booked')) });
    if (taken) return null;
    throw err;
  }
}

export function bookingByToken(db: Db, token: string): Promise<Booking | undefined> {
  return db.query.bookings.findFirst({ where: eq(bookings.token, token) });
}

/** The next calls first (the CLI and later the panel). */
export function upcomingBookings(db: Db, now: Date, limit = 50): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, new Date(now.getTime() - 3_600_000))))
    .orderBy(asc(bookings.startsAt))
    .limit(limit);
}

export const ticketNo = (no: number) => `No. ${String(no).padStart(4, '0')}`;
