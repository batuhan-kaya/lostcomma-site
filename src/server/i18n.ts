import catalog from '../../i18n/en.json' with { type: 'json' };

export const LANGS = ['tr', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(s: unknown): s is Lang {
  return s === 'tr' || s === 'en';
}

export type Vars = Record<string, string | number>;
/** Source strings are Turkish. English comes from i18n/en.json keyed by the Turkish text. */
export type T = (source: string, vars?: Vars) => string;

const EN: Record<string, string> = catalog;
const warned = new Set<string>();

export function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translator(lang: Lang, en: Record<string, string> = EN): T {
  if (lang === 'tr') return (source, vars) => fill(source, vars);
  return (source, vars) => {
    const hit = en[source];
    if (!hit) {
      if (!warned.has(source) && process.env.NODE_ENV !== 'production') {
        warned.add(source);
        console.warn('[i18n] missing en for: ' + source);
      }
      return fill(source, vars);
    }
    return fill(hit, vars);
  };
}

/** Pick the best language from a cookie value and an Accept-Language header. */
export function negotiate(cookie: string | undefined, acceptLanguage: string | undefined): Lang {
  if (isLang(cookie)) return cookie;
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(',')
      .map((part) => {
        const [tag = '', ...params] = part.trim().split(';');
        const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
        return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1 };
      })
      .sort((a, b) => b.q - a.q);
    for (const { tag, q } of ranked) {
      if (q <= 0) continue;
      const base = tag.split('-')[0];
      if (isLang(base)) return base;
    }
  }
  return DEFAULT_LANG;
}
