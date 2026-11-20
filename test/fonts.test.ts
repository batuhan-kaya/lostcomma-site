/**
 * The site's own cut of its fonts (scripts/fonts.ts · npm run fonts · phase 17g): every letter the
 * site writes is in the small files every page preloads · the variable axes survived the cut · the
 * faces in fonts.css say exactly what each file holds · fontsource's files keep the rest of their
 * range and no two faces of a family share a letter (document.fonts.check stays true).
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { create } from 'fontkit';
import { describe, expect, it } from 'vitest';
import decompress from 'wawoff2/decompress.js';
import { FONT_CUTS, FONT_FAMILIES, FONT_TEXT, parseRange, unicodeRange } from '../src/shared/fonts';

const root = resolve(import.meta.dirname, '..');
const open = async (file: string) => {
  const font = create(Buffer.from(await decompress(readFileSync(join(root, 'src/fonts', file)))));
  if (!('characterSet' in font)) throw new Error('a collection');
  return font;
};
const css = readFileSync(join(root, 'src/styles/fonts.css'), 'utf8');

describe('the font cuts', () => {
  it('hold the letters the site writes (the ones each font has) and keep their axes', async () => {
    for (const fam of FONT_FAMILIES) {
      const core = await open(`${fam.key}-core.woff2`);
      const tr = await open(`${fam.key}-tr.woff2`);
      const held = new Set([...core.characterSet, ...tr.characterSet]);
      // Every family writes ASCII · Turkish · the middle dot of every label.
      for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.·çÇğĞıİöÖşŞüÜ’') expect(held.has(ch.codePointAt(0)!), `${fam.key} ${ch}`).toBe(true);
      const axes = Object.keys(core.variationAxes);
      expect(axes, fam.key).toContain('wght');
      if (fam.stretch) expect(axes, fam.key).toContain('wdth');
      // Small: the reason they exist.
      expect(readFileSync(join(root, 'src/fonts', `${fam.key}-core.woff2`)).length, fam.key).toBeLessThan(45_000);
    }
  });

  it('are declared with the exact range each file holds · fontsource keeps the rest · no letter twice', async () => {
    for (const fam of FONT_FAMILIES) {
      for (const cut of FONT_CUTS) {
        const font = await open(`${fam.key}-${cut.name}.woff2`);
        const range = unicodeRange([...font.characterSet].filter((p) => p < 0xfffe).sort((a, b) => a - b));
        expect(css, `${fam.key}-${cut.name}`).toContain(`src:url('../fonts/${fam.key}-${cut.name}.woff2') format('woff2');unicode-range:${range}}`);
      }
      // A letter a cut holds is in no other face of the family (the browser would ask for that file
      // too · document.fonts.check would wait for it). fontsource's two files overlap on their own.
      const faces = css.split('\n').filter((l) => l.includes(`font-family:'${fam.family}'`));
      expect(faces, fam.key).toHaveLength(4);
      const range = (f: string) => parseRange(/unicode-range:([^}]+)\}/.exec(f)![1]!);
      const cutFaces = faces.filter((f) => f.includes("url('../fonts/"));
      const held = new Set(cutFaces.flatMap(range));
      expect(held.size, fam.key).toBe(cutFaces.reduce((n, f) => n + range(f).length, 0));
      for (const f of faces.filter((x) => !cutFaces.includes(x))) for (const p of range(f)) expect(held.has(p), `${fam.key} U+${p.toString(16)}`).toBe(false);
      const seen = new Set(faces.flatMap(range));
      // Nothing fontsource covered is lost: Basic Latin · Turkish · the euro.
      for (const p of [0x41, 0x7a, 0xe9, 0x11f, 0x130, 0x15f, 0x20ac, 0x1e9e]) expect(seen.has(p), `${fam.key} U+${p.toString(16)}`).toBe(true);
    }
    const app = readFileSync(join(root, 'src/styles/app.css'), 'utf8');
    expect(app).toContain("@import './fonts.css'");
    expect(FONT_TEXT.tr).toContain('ş');
  });

  it('writes a range as runs', () => {
    expect(unicodeRange([0x20, 0x21, 0x22, 0xa9, 0x131])).toBe('U+20-22,U+A9,U+131');
  });
});
