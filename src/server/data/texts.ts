/**
 * Copy rewritten in the panel (Metinler). Two kinds:
 *
 *   lines     every sentence the server renders through t() · keyed by its Turkish source · one
 *             override per language (Turkish replaces the source · English replaces i18n/en.json)
 *   home      the homepage's structured content (src/server/content/home.ts): headline · words ·
 *             manifesto · services · steps · brief choices · one override per leaf
 *
 * Everything lives in four rows of the `settings` table (texts.t.tr · texts.t.en · texts.home.tr ·
 * texts.home.en). An override equal to the default is not kept. Pages read through ctx.t and
 * ctx.texts.home(lang) · the defaults in the code stay what they are.
 *
 * Not covered: sentences only the browser says (cursor bubbles in src/client are compiled into the
 * bundles) · the other pages' structured content · legal text · mails.
 */
import { eq, inArray } from 'drizzle-orm';
import where from '../../../i18n/where.json' with { type: 'json' };
import { HOME, type HomeContent } from '../content/home';
import type { Db } from '../db';
import { settings } from '../db/schema';
import { EN, type Lang } from '../i18n';

export type Over = Record<string, string>;

/** Which part of the site says a line (from `npm run i18n`: the folder its t() call lives in). */
export const WHERE: Record<string, string[]> = where;

export const TEXT_GROUPS: [string, string][] = [
  ['home', 'Ana sayfa'],
  ['chrome', 'Header ve footer'],
  ['work', 'İşler'],
  ['case', 'Vaka'],
  ['services', 'Hizmetler'],
  ['service', 'Hizmet detayı'],
  ['process', 'Süreç'],
  ['studio', 'Stüdyo'],
  ['notes', 'Notes'],
  ['note', 'Not'],
  ['lab', 'Lab'],
  ['start', 'Başla'],
  ['notFound', '404'],
  ['legal', 'Yasal sayfalar'],
  ['other', 'Diğer'],
];

/** The lines of a group · Turkish order. */
export function linesOf(group: string): string[] {
  return Object.keys(WHERE)
    .filter((s) => WHERE[s]!.includes(group))
    .sort((a, b) => a.localeCompare(b, 'tr'));
}

const KEYS = { t: { tr: 'texts.t.tr', en: 'texts.t.en' }, home: { tr: 'texts.home.tr', en: 'texts.home.en' } } as const;
const LANGS: Lang[] = ['tr', 'en'];

/* ---------------- the homepage's leaves ---------------- */

export interface Leaf {
  path: string;
  label: string;
  group: string;
  /** One entry per line (words · headline lines). */
  lines?: boolean;
  /** Spaces at either end matter (the plain text between two manifesto edits). */
  raw?: boolean;
  hint?: string;
}

/** Every editable piece of the homepage content · in page order. Ids · colours · code samples are not copy. */
export function homeLeaves(c: HomeContent = HOME.tr): Leaf[] {
  const out: Leaf[] = [
    { path: 'headline', label: 'Başlık satırları', group: 'Hero', lines: true, hint: 'Satır başına bir satır. {w} değişen kelimenin kutusu (bir kez). Nokta son satırın sonuna kendiliğinden gelir.' },
    { path: 'words', label: 'Değişen kelimeler', group: 'Hero', lines: true, hint: 'Satır başına bir kelime. İlki sayfa açılınca görünür.' },
  ];
  c.manifesto.forEach((seg, i) => {
    if (typeof seg === 'string') out.push({ path: `manifesto.${i}`, label: `Düz metin ${i + 1}`, group: 'Manifesto', raw: true, hint: 'Başındaki ve sonundaki boşluk korunur.' });
    else {
      out.push({ path: `manifesto.${i}.del`, label: `Silinen (${seg.who})`, group: 'Manifesto' });
      out.push({ path: `manifesto.${i}.ins`, label: `Yazılan (${seg.who})`, group: 'Manifesto' });
    }
  });
  c.comments.forEach((cm, i) => out.push({ path: `comments.${i}.text`, label: `Yorum ${i + 1} (${cm.who})`, group: 'Manifesto' }));
  c.services.forEach((_, i) => {
    for (const [k, l] of [['name', 'ad'], ['lab', 'çerçeve etiketi'], ['desc', 'açıklama'], ['dl', 'teslim edilenler'], ['say', 'baloncuk']] as const) out.push({ path: `services.${i}.${k}`, label: `Hizmet ${i + 1} · ${l}`, group: 'Ne yapıyoruz' });
  });
  out.push({ path: 'lab.name', label: 'Lab çerçevesi · ad', group: 'Seçili işler' }, { path: 'lab.what', label: 'Lab çerçevesi · tür', group: 'Seçili işler' }, { path: 'notes', label: 'Panodaki notlar', group: 'Seçili işler', lines: true, hint: 'Satır başına bir not.' });
  c.steps.forEach((_, i) => {
    for (const [k, l] of [['name', 'ad'], ['time', 'süre'], ['text', 'metin'], ['get', 'sana kalan']] as const) out.push({ path: `steps.${i}.${k}`, label: `Adım ${i + 1} · ${l}`, group: 'Süreç' });
  });
  out.push({ path: 'contact', label: 'Başlık satırları', group: 'Proje başlat', lines: true, hint: '{w} seçili kelimenin kutusu (bir kez).' }, { path: 'contactWord', label: 'Seçili kelime', group: 'Proje başlat' });
  for (const [key, name] of [['types', 'Tür'], ['times', 'Zaman']] as const) {
    c[key].forEach((_, i) => {
      for (const [k, l] of [['n', 'etiket'], ['p', 'cümledeki hâli'], ['say', 'baloncuk']] as const) out.push({ path: `${key}.${i}.${k}`, label: `${name} ${i + 1} · ${l}`, group: 'Proje başlat' });
    });
  }
  c.budgets.forEach((_, i) => {
    for (const [k, l] of [['n', 'etiket'], ['say', 'baloncuk']] as const) out.push({ path: `budgets.${i}.${k}`, label: `Bütçe ${i + 1} · ${l}`, group: 'Proje başlat' });
  });
  for (const who of ['design', 'code', 'motion'] as const) out.push({ path: `doing.${who}`, label: `${who} ne yapıyor`, group: 'Header' });
  return out;
}

type Node = Record<string, unknown> | unknown[];

function parent(root: unknown, path: string): [Node, string] | null {
  const parts = path.split('.');
  let at = root as Node;
  for (const p of parts.slice(0, -1)) {
    const next = (at as Record<string, unknown>)[p];
    if (!next || typeof next !== 'object') return null;
    at = next as Node;
  }
  return [at, parts[parts.length - 1]!];
}

/** A leaf's value as the panel edits it (lists: one entry per line). */
export function leafValue(c: HomeContent, path: string): string {
  const hit = parent(c, path);
  if (!hit) return '';
  const v = (hit[0] as Record<string, unknown>)[hit[1]];
  return Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '';
}

function setLeaf(c: HomeContent, path: string, value: string): void {
  const hit = parent(c, path);
  if (!hit) return;
  const [at, key] = hit;
  const was = (at as Record<string, unknown>)[key];
  if (Array.isArray(was)) (at as Record<string, unknown>)[key] = value.split('\n').map((s) => s.trim()).filter(Boolean);
  else if (typeof was === 'string') (at as Record<string, unknown>)[key] = value;
}

function isList(c: HomeContent, path: string): boolean {
  const hit = parent(c, path);
  return !!hit && Array.isArray((hit[0] as Record<string, unknown>)[hit[1]]);
}

/** What is wrong with a new value for a homepage leaf · null when it is fine. */
export function leafError(leaf: Leaf, value: string): string | null {
  const lines = value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (leaf.path === 'headline' || leaf.path === 'contact') {
    if (lines.length < 1 || lines.length > 4) return 'Bir ile dört satır arası olmalı.';
    if (value.split('{w}').length !== 2) return '{w} tam bir kez geçmeli (kelime kutusunun yeri).';
  }
  if (leaf.path === 'words' && lines.length < 2) return 'En az iki kelime gerekli (ekip birini silip diğerini yazıyor).';
  if (leaf.path === 'notes' && lines.length < 1) return 'En az bir not gerekli.';
  if (!leaf.lines && !value.trim()) return null;
  if (value.length > 600) return 'En fazla 600 karakter.';
  return null;
}

/* ---------------- the store ---------------- */

export class TextStore {
  private t: Record<Lang, Over> = { tr: {}, en: {} };
  private h: Record<Lang, Over> = { tr: {}, en: {} };
  private merged: Partial<Record<Lang, HomeContent>> = {};

  constructor(private readonly db: Db) {}

  async load(): Promise<void> {
    const rows = await this.db.select().from(settings).where(inArray(settings.key, [...Object.values(KEYS.t), ...Object.values(KEYS.home)]));
    const read = (key: string): Over => {
      const v = rows.find((r) => r.key === key)?.value;
      return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string')) : {};
    };
    for (const l of LANGS) {
      this.t[l] = read(KEYS.t[l]);
      this.h[l] = read(KEYS.home[l]);
    }
    this.merged = {};
  }

  /** Rewritten lines of a language (for `translator`). */
  over(lang: Lang): Over {
    return this.t[lang];
  }

  /** A line as the code has it. */
  lineDefault(lang: Lang, source: string): string {
    return lang === 'tr' ? source : (EN[source] ?? source);
  }

  /** A line as the site says it now. */
  line(lang: Lang, source: string): string {
    return this.t[lang][source] ?? this.lineDefault(lang, source);
  }

  changedLine(lang: Lang, source: string): boolean {
    return source in this.t[lang];
  }

  /** The homepage content with the panel's changes in. */
  home(lang: Lang): HomeContent {
    const have = this.merged[lang];
    if (have) return have;
    const c = structuredClone(HOME[lang]);
    for (const [path, value] of Object.entries(this.h[lang])) setLeaf(c, path, value);
    this.merged[lang] = c;
    return c;
  }

  changedLeaf(lang: Lang, path: string): boolean {
    return path in this.h[lang];
  }

  /** How many overrides there are (the dashboard and the list say so). */
  count(): { lines: number; home: number } {
    return { lines: LANGS.reduce((n, l) => n + Object.keys(this.t[l]).length, 0), home: LANGS.reduce((n, l) => n + Object.keys(this.h[l]).length, 0) };
  }

  snapshot(): { t: Record<Lang, Over>; home: Record<Lang, Over> } {
    return structuredClone({ t: this.t, home: this.h });
  }

  /** Rewrite lines and leaves in one go. An empty value or the default itself takes the override away. */
  async save(changes: { lines?: { lang: Lang; source: string; value: string }[]; home?: { lang: Lang; path: string; value: string }[] }): Promise<number> {
    let n = 0;
    const touched = new Set<string>();
    for (const c of changes.lines ?? []) {
      const value = c.value.replace(/\s*\n\s*/g, ' ').trim();
      const had = this.t[c.lang][c.source];
      if (!value || value === this.lineDefault(c.lang, c.source)) {
        if (had === undefined) continue;
        delete this.t[c.lang][c.source];
      } else {
        if (had === value) continue;
        this.t[c.lang][c.source] = value;
      }
      n++;
      touched.add(KEYS.t[c.lang]);
    }
    for (const c of changes.home ?? []) {
      const had = this.h[c.lang][c.path];
      const def = leafValue(HOME[c.lang], c.path);
      const value = c.value.replace(/\r/g, '');
      const tidy = (x: string) => x.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
      const isDefault = !value.trim() || value === def || (isList(HOME[c.lang], c.path) && tidy(value) === tidy(def));
      if (isDefault) {
        if (had === undefined) continue;
        delete this.h[c.lang][c.path];
      } else {
        if (had === value) continue;
        this.h[c.lang][c.path] = value;
      }
      n++;
      touched.add(KEYS.home[c.lang]);
    }
    for (const key of touched) {
      const [, kind, lang] = key.split('.') as [string, 't' | 'home', Lang];
      const value = kind === 't' ? this.t[lang] : this.h[lang];
      if (!Object.keys(value).length) await this.db.delete(settings).where(eq(settings.key, key));
      else await this.db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    }
    this.merged = {};
    return n;
  }

  /** Back to an earlier state (the log's "Bu hale dön"). */
  async restore(snap: { t?: Partial<Record<Lang, Over>>; home?: Partial<Record<Lang, Over>> }): Promise<void> {
    for (const l of LANGS) {
      this.t[l] = { ...(snap.t?.[l] ?? {}) };
      this.h[l] = { ...(snap.home?.[l] ?? {}) };
      for (const [key, value] of [[KEYS.t[l], this.t[l]], [KEYS.home[l], this.h[l]]] as const) {
        if (!Object.keys(value).length) await this.db.delete(settings).where(eq(settings.key, key));
        else await this.db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      }
    }
    this.merged = {};
  }
}

/** The {placeholders} of a line: a rewrite has to keep them. */
export function placeholders(s: string): string[] {
  return [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
}
