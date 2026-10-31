/**
 * A small syntax highlighter for code in notes. Server side · no dependencies · a handful of
 * token classes the note CSS colours: k (keyword · operator) · n (number) · c (comment) ·
 * f (function · property) · s (string). Unknown languages stay plain.
 */
import { esc } from '../html';

type Rule = [cls: string | null, re: RegExp];

const JS_KEYWORDS =
  'as async await break case catch class const continue default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null of private protected public readonly return satisfies static super switch this throw true try type typeof undefined var void while yield';

const OPS = /=>|\*\*=?|===?|!==?|<=|>=|&&=?|\|\|=?|\?\?=?|[+\-*/%&|^]=?|[=<>!?:~]/y;

const RULES: Record<string, Rule[]> = {
  js: [
    ['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ['s', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/y],
    ['n', /\b(?:0x[\da-f]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b|\.\d+\b/iy],
    ['k', new RegExp(`\\b(?:${JS_KEYWORDS.split(' ').join('|')})\\b`, 'y')],
    ['f', /\b[A-Za-z_$][\w$]*(?=\s*\()/y],
    [null, /[A-Za-z_$][\w$]*/y],
    ['k', OPS],
  ],
  css: [
    ['c', /\/\*[\s\S]*?\*\//y],
    ['s', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/y],
    ['k', /@[\w-]+|!important/y],
    ['f', /[\w-]+(?=\s*:(?!:))/y],
    ['n', /-?(?:\d+\.?\d*|\.\d+)(?:%|[a-z]+)?|#[\da-f]{3,8}\b/iy],
    [null, /[\w-]+/y],
  ],
  sh: [
    ['c', /#[^\n]*/y],
    ['s', /'[^'\n]*'|"(?:\\.|[^"\\\n])*"/y],
    ['n', /\$\{?[\w]+\}?/y],
    ['k', /(?:^|(?<=\s))--?[\w-]+/my],
    ['f', /(?:^|(?<=[\n|;&]\s*))[\w./-]+/y],
    [null, /[\w./-]+/y],
  ],
  json: [
    ['k', /"(?:\\.|[^"\\\n])*"(?=\s*:)/y],
    ['s', /"(?:\\.|[^"\\\n])*"/y],
    ['n', /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/iy],
    ['k', /\b(?:true|false|null)\b/y],
  ],
  html: [
    ['c', /<!--[\s\S]*?-->/y],
    ['k', /<\/?[A-Za-z][\w-]*|\/?>/y],
    ['s', /"[^"]*"|'[^']*'/y],
    ['f', /[\w-]+(?==)/y],
  ],
};

const ALIAS: Record<string, string> = { ts: 'js', tsx: 'js', jsx: 'js', javascript: 'js', typescript: 'js', mjs: 'js', bash: 'sh', shell: 'sh', console: 'sh', xml: 'html', svg: 'html' };

export function languageOf(lang: string): string | null {
  const l = lang.toLowerCase();
  const key = ALIAS[l] ?? l;
  return RULES[key] ? key : null;
}

interface Token {
  cls: string | null;
  text: string;
}

export function tokenize(code: string, lang: string): Token[] {
  const rules = RULES[languageOf(lang) ?? ''] ?? [];
  const out: Token[] = [];
  let plain = '';
  let i = 0;
  outer: while (i < code.length) {
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length) {
        if (cls === null) plain += m[0];
        else {
          if (plain) out.push({ cls: null, text: plain });
          plain = '';
          out.push({ cls, text: m[0] });
        }
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i];
    i++;
  }
  if (plain) out.push({ cls: null, text: plain });
  return out;
}

/** Highlighted code as one escaped HTML string per line (tokens that span lines are split). */
export function highlightLines(code: string, lang: string): string[] {
  const lines: string[] = [''];
  for (const tok of tokenize(code, lang)) {
    tok.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push('');
      if (!part) return;
      const piece = tok.cls ? `<span class="${tok.cls}">${esc(part)}</span>` : esc(part);
      lines[lines.length - 1] += piece;
    });
  }
  return lines;
}

/** "2" · "2-4" · "2-4 7" · "2,7" → the set of line numbers to mark. */
export function parseLines(spec: string | undefined): Set<number> {
  const out = new Set<number>();
  for (const part of (spec ?? '').split(/[\s;,]+/)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n - a < 500; n++) out.add(n);
  }
  return out;
}
