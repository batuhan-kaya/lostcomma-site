/**
 * npm run i18n            add missing keys to i18n/en.json (empty) and report
 * npm run i18n -- --check fail on missing · empty · unused keys or any comma in copy
 * npm run i18n -- --prune also remove unused keys
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { audit, extractAll } from './lib/i18n';

const root = resolve(import.meta.dirname, '..');
const file = resolve(root, 'i18n/en.json');
const args = new Set(process.argv.slice(2));
const en = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
const found = extractAll(root);
const report = audit(found, en);

const lines: string[] = [];
for (const m of report.missing) lines.push(`missing  ${m.file}  ${m.text}`);
for (const k of report.empty) lines.push(`empty    ${k}`);
for (const k of report.unused) lines.push(`unused   ${k}`);
for (const k of report.commas) lines.push(`comma    ${k}`);

if (args.has('--check')) {
  if (lines.length) {
    console.error(lines.join('\n'));
    console.error(`\ni18n check failed (${lines.length})`);
    process.exit(1);
  }
  console.log(`i18n ok · ${new Set(found.map((f) => f.text)).size} strings`);
} else {
  for (const m of report.missing) en[m.text] = '';
  if (args.has('--prune')) for (const k of report.unused) delete en[k];
  const sorted = Object.fromEntries(Object.entries(en).sort(([a], [b]) => a.localeCompare(b, 'tr')));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
  console.log(lines.join('\n') || 'nothing to do');
}
