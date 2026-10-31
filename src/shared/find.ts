/**
 * Find in notes. Without "match case" the search forgives Turkish letters both ways
 * (ı İ i I · ş s · ğ g · ü u · ö o · ç c) so "turkce" finds "Türkçe" and "isik" finds "Işık".
 * Folding keeps one character per character so a hit maps straight back onto the original text.
 */
const PLAIN: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };

function foldChar(c: string): string {
  let l = c.toLocaleLowerCase('tr');
  if (l.length !== 1) l = c.toLowerCase();
  if (l.length !== 1) l = c;
  return PLAIN[l] ?? l;
}

/** The text as the search sees it. Same length as the input. */
export function fold(s: string, matchCase = false): string {
  if (matchCase) return s;
  let out = '';
  for (const c of s) out += c.length === 1 ? foldChar(c) : c;
  return out;
}

export interface Seg {
  t: string;
  hit: boolean;
}

/** The text cut into plain and found pieces (found pieces get a <mark>). */
export function segments(text: string, query: string, matchCase = false): Seg[] {
  const q = query.trim();
  if (!q) return [{ t: text, hit: false }];
  const hay = fold(text, matchCase);
  const needle = fold(q, matchCase);
  const out: Seg[] = [];
  let i = 0;
  while (i < text.length) {
    const j = hay.indexOf(needle, i);
    if (j < 0) {
      out.push({ t: text.slice(i), hit: false });
      break;
    }
    if (j > i) out.push({ t: text.slice(i, j), hit: false });
    out.push({ t: text.slice(j, j + needle.length), hit: true });
    i = j + needle.length;
  }
  return out;
}

export function contains(text: string, query: string, matchCase = false): boolean {
  const q = query.trim();
  return !q || fold(text, matchCase).includes(fold(q, matchCase));
}

/** How many separate hits a query has in a text. */
export function hits(text: string, query: string, matchCase = false): number {
  return segments(text, query, matchCase).filter((s) => s.hit).length;
}
