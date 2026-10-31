/**
 * Istanbul time for the Studio and Process pages: is the studio open · which weekday it is ·
 * where the Karaköy–Kadıköy ferry is. Works the same in Node and in the browser.
 */
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface IstanbulTime {
  /** 0 Sunday … 6 Saturday */
  day: number;
  h: number;
  m: number;
  /** "14:05" */
  hm: string;
}

export function istanbul(d: Date): IstanbulTime {
  const parts = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const h = Number(parts.hour) % 24;
  const m = Number(parts.minute);
  return { day: DAYS.indexOf(parts.weekday ?? 'Sun'), h, m, hm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}

export const OPEN_FROM = 10;
export const OPEN_TO = 18;

/** Monday to Friday · 10:00 to 18:00 Istanbul time. */
export function studioOpen(d: Date): boolean {
  const t = istanbul(d);
  return t.day >= 1 && t.day <= 5 && t.h >= OPEN_FROM && t.h < OPEN_TO;
}

/** Monday 0 … Friday 4 · null at the weekend. */
export function workday(d: Date): number | null {
  const t = istanbul(d);
  return t.day >= 1 && t.day <= 5 ? t.day - 1 : null;
}

export const FERRY_EVERY = 20;
export const FERRY_FIRST = 7;
export const FERRY_LAST = 23;

export interface Ferry {
  /** Running between the first and the last crossing. */
  running: boolean;
  /** 0 at Karaköy · 1 at Kadıköy. */
  at: number;
  /** Heading to Kadıköy (true) or back to Karaköy. */
  east: boolean;
  /** The next departure from Karaköy · "14:20". */
  next: string;
}

/**
 * One boat in the drawing: it crosses in twenty minutes and turns around. Crossings start on the
 * hour and every twenty minutes after · the even ones leave Karaköy. Roughly the real timetable.
 */
export function ferry(d: Date, seconds = d.getUTCSeconds()): Ferry {
  const t = istanbul(d);
  const mins = t.h * 60 + t.m + seconds / 60;
  const first = FERRY_FIRST * 60;
  const last = FERRY_LAST * 60;
  const hm = (x: number) => `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  if (mins < first || mins >= last) return { running: false, at: 1, east: true, next: hm(first) };
  const slot = Math.floor((mins - first) / FERRY_EVERY);
  const q = (mins - first - slot * FERRY_EVERY) / FERRY_EVERY;
  const east = slot % 2 === 0;
  // Next even slot start (a departure from Karaköy).
  const nextSlot = slot % 2 === 0 ? slot + 2 : slot + 1;
  const nextAt = first + nextSlot * FERRY_EVERY;
  return { running: true, at: east ? q : 1 - q, east, next: nextAt < last ? hm(nextAt) : hm(first) };
}
