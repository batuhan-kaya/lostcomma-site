import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit, extract, extractAll, inlineTranslations, toJs } from '../scripts/lib/i18n';
import { fill, negotiate, translator } from '../src/server/i18n';

const root = resolve(import.meta.dirname, '..');
const en = JSON.parse(readFileSync(resolve(root, 'i18n/en.json'), 'utf8')) as Record<string, string>;

describe('translator', () => {
  it('returns Turkish source as is', () => {
    expect(translator('tr')('İşler')).toBe('İşler');
  });
  it('looks English up in the catalog', () => {
    expect(translator('en')('İşler')).toBe('Work');
  });
  it('fills placeholders in both languages', () => {
    expect(translator('tr')('Bu sayfa {n}. aşamada kodlanacak.', { n: 4 })).toBe('Bu sayfa 4. aşamada kodlanacak.');
    expect(translator('en')('Bu sayfa {n}. aşamada kodlanacak.', { n: 4 })).toBe('This page gets built in phase 4.');
  });
  it('leaves unknown placeholders alone', () => {
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('negotiate', () => {
  it('prefers the cookie', () => {
    expect(negotiate('tr', 'en-US,en;q=0.9')).toBe('tr');
  });
  it('reads Accept-Language by quality', () => {
    expect(negotiate(undefined, 'de-DE;q=0.9,tr-TR;q=0.8,en;q=0.5')).toBe('tr');
    expect(negotiate(undefined, 'tr;q=0.2,en-GB;q=0.8')).toBe('en');
  });
  it('ignores q=0 and unknown languages', () => {
    expect(negotiate(undefined, 'tr;q=0,fr')).toBe('en');
  });
  it('falls back to English', () => {
    expect(negotiate('xx', undefined)).toBe('en');
  });
});

describe('extraction', () => {
  it('finds t() · ctx.t() · msg() literals and skips dynamic ones', () => {
    const js = toJs("const a: string = t('Bir'); ctx.t(`İki`); msg('Üç'); t(x); t(`a${'$'}{b}`); foo('Dört');", 'x.ts');
    expect(extract(js, 'x.ts').map((f) => f.text)).toEqual(['Bir', 'İki', 'Üç']);
  });

  it('inlines English into client code and reports gaps', () => {
    const r = inlineTranslations("t('İşler'); t('Yok böyle'); other('İşler');", { İşler: 'Work' });
    expect(r.code).toBe('t("Work"); t("Yok böyle"); other(\'İşler\');');
    expect(r.missing).toEqual(['Yok böyle']);
  });
});

describe('catalog', () => {
  it('has an English entry for every Turkish string and nothing extra', () => {
    const r = audit(extractAll(root), en);
    expect(r.missing.map((m) => `${m.file}: ${m.text}`)).toEqual([]);
    expect(r.empty).toEqual([]);
    expect(r.unused).toEqual([]);
  });

  it('never uses a comma in copy (brand rule)', () => {
    expect(audit(extractAll(root), en).commas).toEqual([]);
  });
});
