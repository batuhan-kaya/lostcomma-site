import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as acorn from 'acorn';
import { simple } from 'acorn-walk';
import { transformSync } from 'esbuild';

/** Call names that mark a Turkish source string: t('…') · ctx.t('…') · msg('…'). */
const MARKERS = new Set(['t', 'msg']);

export interface Found {
  text: string;
  file: string;
}

interface Hit {
  text: string;
  start: number;
  end: number;
}

type AnyNode = acorn.Node & Record<string, any>;

function literal(node: AnyNode | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked as string;
  return null;
}

function calleeName(callee: AnyNode): string | null {
  if (callee.type === 'Identifier') return callee.name as string;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') return callee.property.name as string;
  return null;
}

/** TypeScript to plain JS so acorn can read it. Names and literals are kept as written. */
export function toJs(source: string, file: string): string {
  if (!file.endsWith('.ts')) return source;
  return transformSync(source, { loader: 'ts', format: 'esm', target: 'es2022', sourcefile: file }).code;
}

function hits(js: string): Hit[] {
  const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
  const out: Hit[] = [];
  simple(ast, {
    CallExpression(node) {
      const n = node as AnyNode;
      const name = calleeName(n.callee);
      if (!name || !MARKERS.has(name)) return;
      const arg = n.arguments[0] as AnyNode | undefined;
      const text = literal(arg);
      if (text !== null && arg) out.push({ text, start: arg.start, end: arg.end });
    },
  });
  return out;
}

export function extract(js: string, file: string): Found[] {
  return hits(js).map((h) => ({ text: h.text, file }));
}

/**
 * Client bundles are built once per language. For English every t('Türkçe') literal
 * is swapped for its translation at build time so the browser never ships a catalog.
 */
export function inlineTranslations(js: string, en: Record<string, string>): { code: string; missing: string[] } {
  const missing: string[] = [];
  const list = hits(js).sort((a, b) => b.start - a.start);
  let code = js;
  for (const h of list) {
    const tr = en[h.text];
    if (!tr) missing.push(h.text);
    code = code.slice(0, h.start) + JSON.stringify(tr || h.text) + code.slice(h.end);
  }
  return { code, missing };
}

export function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
    }
  };
  walk(join(root, 'src'));
  return out.sort();
}

export function extractAll(root: string): Found[] {
  return sourceFiles(root).flatMap((f) => extract(toJs(readFileSync(f, 'utf8'), f), relative(root, f)));
}

export interface Report {
  missing: Found[];
  empty: string[];
  unused: string[];
  commas: string[];
}

export function audit(found: Found[], en: Record<string, string>): Report {
  const keys = new Set(found.map((f) => f.text));
  const seen = new Set<string>();
  const missing = found.filter((f) => !(f.text in en) && !seen.has(f.text) && seen.add(f.text));
  const empty = Object.keys(en).filter((k) => keys.has(k) && !en[k]);
  const unused = Object.keys(en).filter((k) => !keys.has(k));
  const commas = [...keys, ...Object.values(en)].filter((s) => s.includes(','));
  return { missing, empty, unused, commas };
}
