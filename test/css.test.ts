import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every stylesheet under src/styles. */
function sheets(dir = 'src/styles'): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sheets(p) : p.endsWith('.css') ? [p] : [];
  });
}

describe('stylesheets', () => {
  // A stray brace closes a media block early: everything after it applies at every width
  // without a warning (phase 16: the services stage shrank to 70 px on phones).
  it.each(sheets())('%s keeps its braces balanced', (file) => {
    const css = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    let depth = 0;
    let line = 1;
    for (const ch of css) {
      if (ch === '\n') line++;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      expect(depth, `closes more than it opens near line ${line}`).toBeGreaterThanOrEqual(0);
    }
    expect(depth, 'left open at the end').toBe(0);
  });
});
