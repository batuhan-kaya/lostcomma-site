/**
 * Notes are markdown. Raw HTML is off · everything that is not plain prose is a fenced block:
 *
 *   ```ts title=calm.ts hl=2 note="runs once per frame"     code · numbered lines · line 2 marked
 *   ```playground spring                                     the spring playground (src/shared/spring.ts)
 *   ```figure host                                           a figure: "Label | text" per line
 *
 * Footnotes ([^1] in the text · "[^1]: …" on a line of its own) become side notes beside the text.
 * h2 headings get ids and make the table of contents. The first paragraph is the lead.
 */
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { feel, graphPoints, PRESETS, PULL_RANGE, DAMPING_RANGE, response, SPRING } from '../../shared/spring';
import { slugify } from '../../shared/slug';
import { esc, raw, type Safe } from '../html';
import type { Lang, T } from '../i18n';
import { msg } from '../msg';
import { highlightLines, languageOf, parseLines } from './highlight';

type Crew = 'design' | 'code' | 'motion';

export interface RenderOptions {
  lang: Lang;
  t: T;
  /** The note's author: the playground cursor and figures use their colour. */
  author?: Crew;
  /** RSS: interactive blocks become a link back to the note at this address. */
  feed?: { url: string };
}

export interface TocEntry {
  id: string;
  text: string;
}

export interface SideNote {
  n: number;
  html: string;
}

/** The note's shape for the minimap on the Notes page: one bar per block. */
export interface Bar {
  k: 'h' | 'p' | 'code' | 'play' | 'fig' | 'list';
  /** Lines (rough for prose). */
  n: number;
}

export interface Rendered {
  html: Safe;
  toc: TocEntry[];
  notes: SideNote[];
  outline: Bar[];
}

interface Env extends RenderOptions {
  defs: Map<string, string>;
  order: Map<string, number>;
  seen: Set<number>;
  ids: Set<string>;
  toc: TocEntry[];
}

const CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z"></path></svg>';

export const PRESET_NAME: Record<(typeof PRESETS)[number]['key'], string> = {
  first: msg('Ana sayfa · ilk deneme'),
  calm: msg('Sakin · şimdi'),
  jelly: msg('Jöle'),
  sleepy: msg('Uykulu'),
};

export const FEEL_NAME = {
  none: msg('Aşmıyor · sürüklenmiş gibi'),
  little: msg('Biraz aşıyor'),
  wobbly: msg('Titriyor'),
} as const;

/** Words per minute for prose · code lines per minute · a minute for each playground. */
const WPM = 200;
const CODE_LPM = 25;

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
md.disable(['image']);

/* ---------------- footnotes ---------------- */

md.inline.ruler.before('link', 'fnref', (state, silent) => {
  if (state.src.charCodeAt(state.pos) !== 0x5b || state.src.charCodeAt(state.pos + 1) !== 0x5e) return false;
  const m = /^\[\^([\w-]+)\]/.exec(state.src.slice(state.pos));
  const env = state.env as Env;
  if (!m || !env.defs?.has(m[1]!)) return false;
  if (!silent) {
    const id = m[1]!;
    if (!env.order.has(id)) env.order.set(id, env.order.size + 1);
    const tok = state.push('fnref', '', 0);
    tok.meta = { n: env.order.get(id) };
  }
  state.pos += m[0].length;
  return true;
});

md.renderer.rules.fnref = (tokens, idx, _o, env: Env) => {
  const n = tokens[idx]!.meta.n as number;
  if (env.feed) return `<sup>${n}</sup>`;
  const first = !env.seen.has(n);
  env.seen.add(n);
  return `<a class="fn" href="#fn-${n}"${first ? ` id="fnr-${n}"` : ''} data-fn="${n}"><span class="sr">${esc(env.t('Dipnot'))} </span>${n}</a>`;
};

/** Footnote definitions live on their own lines outside code fences. */
function takeDefinitions(src: string): { body: string; defs: Map<string, string> } {
  const defs = new Map<string, string>();
  let fence: string | null = null;
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const keep: string[] = [];
  for (const line of lines) {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1]![0]!;
      else if (f[1]![0] === fence) fence = null;
    }
    const d = !fence && /^\[\^([\w-]+)\]:[ \t]*(.+)$/.exec(line);
    if (d) defs.set(d[1]!, d[2]!.trim());
    else keep.push(line);
  }
  return { body: keep.join('\n'), defs };
}

/* ---------------- headings · lead ---------------- */

function inlineText(tok: Token | undefined): string {
  return (tok?.children ?? [])
    .filter((c) => c.type === 'text' || c.type === 'code_inline')
    .map((c) => c.content)
    .join('')
    .trim();
}

md.core.ruler.push('lc_structure', (state) => {
  const env = state.env as Env;
  const tokens = state.tokens;
  let sawHeading = false;
  let leadDone = false;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.type === 'heading_open' || tok.type === 'heading_close') {
      // One h1 per page (the note title): headings in the body start at h2.
      if (tok.tag === 'h1') tok.tag = 'h2';
    }
    if (tok.type === 'heading_open') {
      sawHeading = true;
      if (tok.tag !== 'h2' && tok.tag !== 'h3') continue;
      const text = inlineText(tokens[i + 1]);
      let id = slugify(text) || 'bolum';
      for (let k = 2; env.ids.has(id); k++) id = `${slugify(text) || 'bolum'}-${k}`;
      env.ids.add(id);
      tok.attrSet('id', id);
      if (tok.tag === 'h2') {
        tok.attrSet('data-h', String(env.toc.length));
        env.toc.push({ id, text });
      }
    }
    if (!leadDone && tok.type === 'paragraph_open' && tok.level === 0) {
      leadDone = true;
      if (!sawHeading) tok.attrJoin('class', 'lead');
    }
  }
});

md.renderer.rules.code_inline = (tokens, idx) => `<code class="ic">${esc(tokens[idx]!.content)}</code>`;

const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const tok = tokens[idx]!;
  if (/^https?:\/\//.test(tok.attrGet('href') ?? '')) tok.attrSet('rel', 'noopener');
  return defaultLink(tokens, idx, options, env, self);
};

/* ---------------- fenced blocks ---------------- */

export function parseInfo(info: string): { kind: string; arg: string; attrs: Record<string, string> } {
  const attrs: Record<string, string> = {};
  const rest = info.replace(/(\w+)=(?:"([^"]*)"|(\S+))/g, (_, k: string, q?: string, v?: string) => {
    attrs[k] = q ?? v ?? '';
    return '';
  });
  const [kind = '', arg = ''] = rest.trim().split(/\s+/);
  return { kind: kind.toLowerCase(), arg: arg.toLowerCase(), attrs };
}

function codeBlock(content: string, kind: string, attrs: Record<string, string>, env: Env): string {
  const code = content.replace(/\n$/, '');
  if (env.feed) return `<pre><code>${esc(code)}</code></pre>\n`;
  const marked = parseLines(attrs.hl);
  const lines = highlightLines(code, kind);
  const label = attrs.title ?? (languageOf(kind) ? kind.toUpperCase() : env.t('Kod'));
  const body = lines.map((l, i) => `<span class="ln${marked.has(i + 1) ? ' hl' : ''}" data-n="${i + 1}">${l}</span>`).join('\n');
  return `<figure class="code"><figcaption class="cbar mono"><span><b>${esc(label)}</b>${attrs.note ? ` · ${esc(attrs.note)}` : ''}</span><button type="button" class="copy mono" data-copy hidden>${esc(env.t('Kopyala'))}</button></figcaption><pre tabindex="0" aria-label="${esc(label)}"><code>${body}</code></pre></figure>\n`;
}

function playground(env: Env): string {
  const { t } = env;
  if (env.feed) return `<p><a href="${esc(env.feed.url)}#oyun-alani">${esc(t('Yay oyun alanı notun kendisinde çalışıyor →'))}</a></p>\n`;
  const crew = env.author ?? 'code';
  const pull = SPRING.pull;
  const damping = SPRING.damping;
  const presets = PRESETS.map(
    (p) =>
      `<button type="button" class="pr" data-pgp="${p.key}" aria-pressed="${p.key === 'calm'}">${esc(t(PRESET_NAME[p.key]))}</button>`,
  ).join('');
  const range = (key: 'pull' | 'damping', name: string, r: { min: number; max: number; step: number }, v: string) =>
    `<label class="ctl"><span class="mono">${esc(name)} <b data-pgv="${key}">${v}</b></span><input type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${key === 'pull' ? pull : damping}" data-pgin="${key}"></label>`;
  return `<figure class="play" id="oyun-alani" data-play>
<div class="ph"><b>${esc(t('Yay oyun alanı'))}</b><span class="mono" data-pgfeel aria-live="polite">${esc(t(FEEL_NAME[feel(pull, damping)]))}</span></div>
<div class="pbox" data-pg><i class="tgt" data-pgt aria-hidden="true"></i><span class="pcur c-${crew}" data-pgc aria-hidden="true">${CURSOR}<span>${crew}</span></span><span class="bhint mono" data-pghint>${esc(t('Kutunun içinde bir yeri göster'))}</span><span class="bhint nojs mono">${esc(t('Oyun alanı JavaScript ile çalışıyor'))}</span></div>
<div class="graph" aria-hidden="true"><svg viewBox="0 0 640 110" preserveAspectRatio="none"><path class="zero" d="M0 76H640"></path><polyline class="pl" data-pgl points="${graphPoints(response(pull, damping))}"></polyline></svg><span class="gl g1 mono">${esc(t('Hedefe uzaklık'))}</span><span class="gl g2 mono">${esc(t('Hedef'))}</span></div>
<div class="ctrls">${range('pull', t('Sertlik'), PULL_RANGE, pull.toFixed(3))}${range('damping', t('Sönüm'), DAMPING_RANGE, damping.toFixed(2))}<div class="pres2" role="group" aria-label="${esc(t('Hazır ayarlar'))}"><span class="mono" aria-hidden="true">${esc(t('Hazır ayarlar'))}</span>${presets}</div></div>
</figure>\n`;
}

function figure(content: string, arg: string, env: Env): string {
  const rows = content
    .split('\n')
    .map((l) => l.split('|').map((s) => s.trim()))
    .filter(([a, b]) => a && b) as [string, string][];
  if (env.feed) return `<ul>${rows.map(([a, b]) => `<li><b>${esc(a)}</b> ${md.renderInline(b, env)}</li>`).join('')}</ul>\n`;
  const c = env.author ?? 'code';
  const map =
    arg === 'host'
      ? `<div class="pgm" aria-hidden="true"><span class="on s1"><em>${esc(env.t('İlk ekran'))}</em><i class="c-design"></i><i class="c-code"></i><i class="c-motion"></i></span><span class="s2"><em>${esc(env.t('Bölüm'))}</em><i class="c-${c}"></i></span><span class="s2"><em>${esc(env.t('Bölüm'))}</em><i class="c-${c}"></i></span><span class="s3"><em>${esc(env.t('Alt bilgi'))}</em><i class="c-${c}"></i></span></div>`
      : '';
  return `<figure class="dia${map ? '' : ' plain'}">${map}<ul>${rows.map(([a, b]) => `<li><b class="mono">${esc(a)}</b><span>${md.renderInline(b, env)}</span></li>`).join('')}</ul></figure>\n`;
}

md.renderer.rules.fence = (tokens, idx, _o, env: Env) => {
  const tok = tokens[idx]!;
  const { kind, arg, attrs } = parseInfo(tok.info);
  if (kind === 'playground') return playground(env);
  if (kind === 'figure') return figure(tok.content, arg, env);
  return codeBlock(tok.content, kind, attrs, env);
};
md.renderer.rules.code_block = (tokens, idx, _o, env: Env) => codeBlock(tokens[idx]!.content, '', {}, env);

/* ---------------- outline · reading time ---------------- */

function outlineOf(tokens: Token[]): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.level !== 0) continue;
    if (tok.type === 'heading_open') out.push({ k: 'h', n: 1 });
    else if (tok.type === 'paragraph_open') out.push({ k: 'p', n: Math.max(1, Math.ceil((tokens[i + 1]?.content.length ?? 0) / 68)) });
    else if (tok.type === 'bullet_list_open' || tok.type === 'ordered_list_open') out.push({ k: 'list', n: 2 });
    else if (tok.type === 'fence' || tok.type === 'code_block') {
      const { kind } = parseInfo(tok.info);
      if (kind === 'playground') out.push({ k: 'play', n: 8 });
      else if (kind === 'figure') out.push({ k: 'fig', n: 4 });
      else out.push({ k: 'code', n: tok.content.replace(/\n$/, '').split('\n').length });
    }
  }
  return out;
}

/** Minutes to read: prose at 200 words a minute · code at 25 lines a minute · a minute per playground. */
export function readMinutes(source: string): number {
  let words = 0;
  let code = 0;
  let play = 0;
  const parts = takeDefinitions(source).body.split(/^(?:```|~~~)/m);
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      words += part.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
      return;
    }
    const [info = '', ...lines] = part.split('\n');
    if (/^\s*playground/.test(info)) play++;
    else code += lines.filter((l) => l.trim()).length;
  });
  return Math.max(1, Math.round(words / WPM + code / CODE_LPM + play));
}

export function renderNote(source: string, opts: RenderOptions): Rendered {
  const { body, defs } = takeDefinitions(source);
  const env: Env = { ...opts, defs, order: new Map(), seen: new Set(), ids: new Set(), toc: [] };
  const tokens = md.parse(body, env);
  const html = md.renderer.render(tokens, md.options, env);
  const notes = [...env.order.entries()].map(([id, n]) => ({ n, html: md.renderInline(defs.get(id) ?? '', env) }));
  return { html: raw(html), toc: env.toc, notes, outline: outlineOf(tokens) };
}
