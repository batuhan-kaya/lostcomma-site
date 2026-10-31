/** Dates on Notes: "24 Ekim 2026" · "24 October 2026" and "2 hafta önce" · "2 weeks ago". Istanbul time. */
type Lang = 'tr' | 'en';

const LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB' };

export function longDate(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(d);
}

/** yyyy-mm-dd for datetime="" (Istanbul day). */
export function isoDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Istanbul' }).format(d);
}

export function ago(d: Date, now: Date, lang: Lang): string {
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' });
  const days = Math.round((Date.parse(isoDay(now)) - Date.parse(isoDay(d))) / 864e5);
  if (days < 1) return rtf.format(0, 'day');
  if (days < 14) return rtf.format(-days, 'day');
  if (days < 60) return rtf.format(-Math.round(days / 7), 'week');
  if (days < 365) return rtf.format(-Math.round(days / 30), 'month');
  return rtf.format(-Math.round(days / 365), 'year');
}
