/**
 * Metinler: the site's copy without opening the code (src/server/data/texts.ts). Two kinds:
 * the homepage's structured content (headline · words · manifesto · services · steps · brief) and
 * every sentence the server renders through t() · listed by the part of the site that says it.
 * A field shows what the site says now · saving the default again (or an empty field) takes a
 * rewrite away. The comma rule and the {placeholders} are checked.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { homeLeaves, leafError, leafValue, linesOf, placeholders, TEXT_GROUPS, WHERE, type Leaf } from '../../data/texts';
import { html, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { back, bodyOf, COMMA, hasComma, log, send, str, type Kit } from '../kit';
import { csrfField, empty, errorSummary, pair, saveBar, section, type Errors } from '../ui';

const HOME_GROUP = 'ana-sayfa';
const LANGS: Lang[] = ['tr', 'en'];
const idOf = (source: string) => 'l_' + createHash('sha1').update(source).digest('hex').slice(0, 12);
const leafName = (path: string) => 'h_' + path.replace(/\./g, '-');
const fold = (s: string) => s.toLocaleLowerCase('tr');

/** The address of the page a group's lines show on (the "Sitede gör" link). */
const SEE: Record<string, string> = { home: '/tr', chrome: '/tr', work: '/tr/isler', services: '/tr/hizmetler', process: '/tr/surec', studio: '/tr/studyo', notes: '/tr/notes', lab: '/tr/lab', start: '/tr/basla', legal: '/tr/gizlilik' };

export function registerTexts(p: FastifyInstance, k: Kit): void {
  /** The lines a view shows: a group · or a search over every group. */
  const pick = (g: string, q: string): string[] => {
    if (q) {
      const needle = fold(q);
      return Object.keys(WHERE)
        .filter((s) => fold(s).includes(needle) || LANGS.some((l) => fold(k.texts.line(l, s)).includes(needle)))
        .sort((a, b) => a.localeCompare(b, 'tr'))
        .slice(0, 120);
    }
    return g === HOME_GROUP ? [] : linesOf(g);
  };

  const page = async (req: FastifyRequest, reply: FastifyReply, o: { g: string; q: string; values?: Record<string, string>; errors?: Errors; status?: number }) => {
    const { g, q } = o;
    const e = o.errors ?? {};
    const val = (name: string, now: string) => (o.values && name in o.values ? o.values[name]! : now);
    const n = k.texts.count();
    const changedBadge = html` <span class="p-badge acc">değişti</span>`;

    const tabs = html`<nav class="p-tabs" aria-label="Metin grupları"><a href="/panel/texts"${!q && g === HOME_GROUP ? html` aria-current="page"` : ''}>Ana sayfa · bölümler</a>${TEXT_GROUPS.filter(([id]) => linesOf(id).length).map(
      ([id, label]) => html`<a href="/panel/texts?g=${id}"${!q && g === id ? html` aria-current="page"` : ''}>${label} <small>${linesOf(id).length}</small></a>`,
    )}</nav>`;

    const search = html`<form method="get" action="/panel/texts" class="p-row" role="search"><label class="sr" for="f-q">Metinlerde ara</label><input class="p-in p-search" id="f-q" name="q" type="search" value="${q}" placeholder="Bir cümle ya da kelime ara" data-search><button class="p-btn ghost" type="submit">Ara</button>${q ? html`<a class="p-btn ghost" href="/panel/texts">Temizle</a>` : ''}</form>`;

    const lineField = (source: string): Safe => {
      const name = idOf(source);
      const ph = placeholders(source);
      const changed = LANGS.filter((l) => k.texts.changedLine(l, source));
      const hint = [ph.length ? `Şunlar aynen kalmalı: ${ph.join(' ')}` : '', changed.length ? `Koddaki hâli: ${changed.map((l) => `${l.toUpperCase()} “${k.texts.lineDefault(l, source)}”`).join(' · ')}` : ''].filter(Boolean).join(' · ');
      return pair(name, html`<span class="p-src">${source.length > 90 ? source.slice(0, 88) + '…' : source}</span>${changed.length ? changedBadge : ''}` as never, { tr: val(`${name}_tr`, k.texts.line('tr', source)), en: val(`${name}_en`, k.texts.line('en', source)) }, e, { copy: true, hint: hint || undefined, area: source.length > 70, rows: 2 });
    };

    const leafField = (leaf: Leaf): Safe => {
      const name = leafName(leaf.path);
      const changed = LANGS.some((l) => k.texts.changedLeaf(l, leaf.path));
      const now = (l: Lang) => leafValue(k.texts.home(l), leaf.path);
      const long = leaf.lines || now('tr').length > 60;
      return pair(name, html`${leaf.label}${changed ? changedBadge : ''}` as never, { tr: val(`${name}_tr`, now('tr')), en: val(`${name}_en`, now('en')) }, e, { copy: true, hint: leaf.hint, area: long, rows: leaf.lines ? Math.max(3, now('tr').split('\n').length + 1) : 2 });
    };

    const lines = pick(g, q);
    const leaves = !q && g === HOME_GROUP ? homeLeaves() : [];
    const groups = [...new Set(leaves.map((l) => l.group))];
    const title = q ? `“${q}” için ${lines.length} satır` : g === HOME_GROUP ? '' : (TEXT_GROUPS.find(([id]) => id === g)?.[1] ?? g);
    const see = SEE[g === HOME_GROUP ? 'home' : g];

    return send(k, req, reply, {
      title: 'Metinler',
      section: 'texts',
      status: o.status,
      actions: !q && see ? html`<a class="p-btn ghost" href="${see}" target="_blank" rel="noopener">Sitede gör ↗</a>` : undefined,
      body: html`<p class="p-hint">Sitedeki cümleleri buradan değiştir. Alan sitenin şu an söylediğini gösterir. Alanı boşaltıp kaydedersen koddaki hâline döner. Virgül kullanılamaz (marka kuralı). ${n.lines + n.home ? `Şu an ${n.lines + n.home} satır koddakinden farklı.` : 'Şu an her satır koddaki hâlinde.'}</p>
${search}
${tabs}
${errorSummary(e)}
${
  !lines.length && !leaves.length
    ? empty(q ? 'Bu aramaya uyan satır yok.' : 'Bu grupta satır yok.')
    : html`<form method="post" action="/panel/texts" class="p-form" data-dirty-guard>${csrfField(req.panel!.csrf)}<input type="hidden" name="g" value="${g}"><input type="hidden" name="q" value="${q}">
${groups.map((name) => section(name, html`${leaves.filter((l) => l.group === name).map(leafField)}`))}
${lines.length ? section(title, html`${lines.map(lineField)}`, { hint: 'Soldaki Türkçe · sağdaki İngilizce. İmleç baloncukları gibi sadece tarayıcının söylediği cümleler burada yok: onlar kodda.' }) : ''}
${saveBar()}
</form>`
}`,
    });
  };

  const view = (req: FastifyRequest) => {
    const src = req.method === 'POST' ? bodyOf(req) : ((req.query ?? {}) as Record<string, string>);
    const q = String(src.q ?? '').trim().slice(0, 80);
    const g0 = String(src.g ?? '');
    const g = TEXT_GROUPS.some(([id]) => id === g0) ? g0 : HOME_GROUP;
    return { g, q };
  };

  p.get('/texts', (req, reply) => page(req, reply, view(req)));

  p.post('/texts', async (req, reply) => {
    const b = bodyOf(req);
    const { g, q } = view(req);
    const e: Errors = {};
    const values: Record<string, string> = {};
    const lineChanges: { lang: Lang; source: string; value: string }[] = [];
    const homeChanges: { lang: Lang; path: string; value: string }[] = [];

    for (const source of pick(g, q)) {
      const need = placeholders(source).join(' ');
      for (const lang of LANGS) {
        const name = `${idOf(source)}_${lang}`;
        if (b[name] === undefined) continue;
        const value = str(b, name).replace(/\s*\r?\n\s*/g, ' ').trim();
        values[name] = value;
        if (!value) {
          lineChanges.push({ lang, source, value: '' });
          continue;
        }
        if (hasComma(value)) e[name] = COMMA;
        else if (value.length > 600) e[name] = 'En fazla 600 karakter.';
        else if (placeholders(value).join(' ') !== need) e[name] = need ? `Şunlar aynen kalmalı: ${need}` : 'Bu cümlede süslü parantezli yer tutucu olamaz.';
        else lineChanges.push({ lang, source, value });
      }
    }
    if (!q && g === HOME_GROUP) {
      for (const leaf of homeLeaves()) {
        for (const lang of LANGS) {
          const name = `${leafName(leaf.path)}_${lang}`;
          if (b[name] === undefined) continue;
          const sent = str(b, name).replace(/\r/g, '');
          const value = leaf.raw ? sent : leaf.lines ? sent.split('\n').map((s) => s.trim()).filter(Boolean).join('\n') : sent.replace(/\s*\n\s*/g, ' ').trim();
          values[name] = value;
          if (!value.trim()) {
            homeChanges.push({ lang, path: leaf.path, value: '' });
            continue;
          }
          const err = hasComma(value) ? COMMA : leafError(leaf, value);
          if (err) e[name] = err;
          else if (!leaf.lines && leaf.path !== 'headline' && /\{w\}/.test(value)) e[name] = '{w} sadece başlık satırlarında kullanılır.';
          else homeChanges.push({ lang, path: leaf.path, value });
        }
      }
    }
    if (Object.keys(e).length) return page(req, reply, { g, q, values, errors: e, status: 422 });

    const before = k.texts.snapshot();
    const n = await k.texts.save({ lines: lineChanges, home: homeChanges });
    const to = `/panel/texts${q ? `?q=${encodeURIComponent(q)}` : g === HOME_GROUP ? '' : `?g=${g}`}`;
    if (!n) return back(reply, to, 'same');
    const where = q ? `arama “${q}”` : g === HOME_GROUP ? 'Ana sayfa · bölümler' : (TEXT_GROUPS.find(([id]) => id === g)?.[1] ?? g);
    await log(k, req, { action: 'update', entity: 'texts', summary: `Metinler: ${n} satır değişti (${where})`, before, after: k.texts.snapshot() });
    return back(reply, to, 'saved');
  });
}

/** For the tests: the field name of a line. */
export const textField = (source: string, lang: Lang) => `${idOf(source)}_${lang}`;
export const homeField = (path: string, lang: Lang) => `${leafName(path)}_${lang}`;
