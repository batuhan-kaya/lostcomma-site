/**
 * Office hours for the Start page. Calls are twenty minutes · they start every half hour from
 * 10:30 to 17:00 Istanbul time · on the next ten working days. Istanbul has stayed on UTC+3 all
 * year since 2016. Visitors see each slot in their own time zone and only the slots that fall
 * inside their own working day (09:00 to 18:00 where they are). Same code in Node and the browser.
 */
export const CALL_MINUTES = 20;
export const STEP = 30;
/** Minutes after midnight in Istanbul. */
export const FIRST = 10 * 60 + 30;
export const LAST = 17 * 60;
export const WINDOW = 10;
export const IST_OFFSET = 180;
/** The visitor's working day in their own time (minutes after midnight). */
export const YOUR_DAY = { from: 9 * 60, to: 18 * 60 } as const;
export const STUDIO_DAY = { from: 10 * 60, to: 18 * 60 } as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** The Istanbul calendar day of an instant · "2026-11-03". */
export function istDay(d: Date): string {
  const t = new Date(d.getTime() + IST_OFFSET * 60_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 Sunday … 6 Saturday for an Istanbul day. */
export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** The instant of a time on an Istanbul day (minutes after midnight there). */
export function istInstant(day: string, minutes: number): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) + (minutes - IST_OFFSET) * 60_000);
}

function addDays(day: string, n: number): string {
  const t = new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** The next ten working days, starting tomorrow (a call today would be too soon to prepare). */
export function bookingDays(now: Date): string[] {
  const out: string[] = [];
  for (let day = addDays(istDay(now), 1); out.length < WINDOW; day = addDays(day, 1)) {
    const w = weekdayOf(day);
    if (w >= 1 && w <= 5) out.push(day);
  }
  return out;
}

/** Every slot on one Istanbul day as minutes after midnight there. */
export function slotMinutes(): number[] {
  const out: number[] = [];
  for (let m = FIRST; m <= LAST; m += STEP) out.push(m);
  return out;
}

export const hm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(((minutes % 60) + 60) % 60)}`;

/** "2026-11-03T10:30" (Istanbul) · the value a slot carries in the form. */
export const slotKey = (day: string, minutes: number) => `${day}T${hm(minutes)}`;

/** A slot key back to its instant · null unless it is on the grid of a bookable day. */
export function parseSlot(key: string, now: Date): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(key);
  if (!m) return null;
  const [, day, h, min] = m;
  const minutes = Number(h) * 60 + Number(min);
  if (!bookingDays(now).includes(day!) || !slotMinutes().includes(minutes)) return null;
  return istInstant(day!, minutes);
}

/* ---------------- time zones ---------------- */

const offsets = new Map<string, Intl.DateTimeFormat>();

/** Minutes the zone is ahead of UTC at that instant (DST included). Unknown zones count as UTC. */
export function offsetMinutes(tz: string, at: Date): number {
  let f = offsets.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 0;
    }
    offsets.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute));
  return Math.round((asUtc - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

export function validZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz.length <= 64;
  } catch {
    return false;
  }
}

/** "Europe/Berlin" → "Berlin" · "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function cityOf(tz: string): string {
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ');
}

/** The local clock time of an instant in a zone · "16:30". */
export function localHm(at: Date, tz: string): string {
  return hm(Math.floor(at.getTime() / 60_000) % 1440 + offsetMinutes(tz, at) + 1440 * 2);
}

/**
 * The visitor's working day on an Istanbul day · in Istanbul minutes (can run below 0 or past
 * 1440) · and where it meets the studio's day. null when they do not meet.
 */
export function overlap(day: string, tz: string): { yours: { from: number; to: number }; both: { from: number; to: number } | null } {
  const shift = IST_OFFSET - offsetMinutes(tz, istInstant(day, 12 * 60));
  const yours = { from: YOUR_DAY.from + shift, to: YOUR_DAY.to + shift };
  const from = Math.max(yours.from, STUDIO_DAY.from);
  const to = Math.min(yours.to, STUDIO_DAY.to);
  return { yours, both: to - from >= CALL_MINUTES ? { from, to } : null };
}

/** Slots on that day that fit inside both working days. */
export function fittingSlots(day: string, tz: string): number[] {
  const { both } = overlap(day, tz);
  if (!both) return [];
  return slotMinutes().filter((m) => m >= both.from && m + CALL_MINUTES <= both.to);
}
