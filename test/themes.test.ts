import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NEXT_TONES, THEMES } from '../src/server/themes';

const css = readFileSync(resolve(import.meta.dirname, '../src/styles/themes.css'), 'utf8');

describe('themes', () => {
  it('themes.css and themes.ts agree on every background', () => {
    const fromCss = Object.fromEntries([...css.matchAll(/\.th-([a-z]+)\s*\{[^}]*--pbg:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
    expect(fromCss).toEqual(THEMES);
  });

  it('every theme defines the full set of variables', () => {
    for (const id of Object.keys(THEMES)) {
      const rule = css.match(new RegExp(`\\.th-${id}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
      for (const v of ['--pbg', '--pfg', '--pmu', '--rule', '--acc']) expect(rule, `${id} ${v}`).toContain(v + ':');
    }
  });

  it('every next band tone has its colours', () => {
    for (const tone of NEXT_TONES) expect(css).toMatch(new RegExp(`\\.nb-${tone}\\s*\\{[^}]*--nbg:[^}]*--nfg:`));
  });
});
