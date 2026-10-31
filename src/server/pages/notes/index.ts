import { isTag, TABS, TAGS } from '../../content/notes';
import { listNotes, noteBySlug, type NoteCard } from '../../data/content';
import { html, raw, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { msg } from '../../msg';
import { renderNote, type Bar } from '../../notes/render';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { ago, isoDay } from '../../../shared/dates';

/**
 * Notes · find in file. The list reads like an editor: line numbers you click to save a note for
 * later · a blame bar in the author's colour · a find box that marks what it finds.
 * The newest note opens as a file with its own minimap. Without JS it is a plain list of links.
 */
export interface NotesData {
  notes: NoteCard[];
  feature: { note: NoteCard; outline: Bar[]; sections: number } | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const LANG_NAME: Record<Lang, string> = { tr: 'TR', en: 'EN' };

/** A note written only in the other language links to its own page (hreflang). */
export function noteLink(lang: Lang, n: NoteCard): Safe {
  const other = n.textLang !== lang;
  return html` href="${href(n.textLang, 'note', { slug: n.slug })}"${other ? html` hreflang="${n.textLang}"` : ''}`;
}

/**
 * lang="" on the note's own words only: tags and labels around them are in the page language
 * (an upper-case English tag inside lang="tr" would turn i into İ).
 */
export function inLang(lang: Lang, n: NoteCard): Safe {
  return n.textLang !== lang ? html` lang="${n.textLang}"` : html``;
}

/** Display titles end with a full stop like every big title on the site. */
export function stop(title: string): string {
  return /[.!?…:]$/.test(title) ? title : `${title}.`;
}

/** "i18n" is an English word in both languages: upper case must not turn it into İ18N. */
export function latin(ctx: Ctx, tag: string): Safe {
  return tag === 'i18n' && ctx.lang === 'tr' ? html` lang="en"` : html``;
}

export function tagLabel(ctx: Ctx, tag: string): string {
  return isTag(tag) ? ctx.t(TAGS[tag]) : tag;
}

function badges(ctx: Ctx, n: NoteCard): Safe {
  const only = n.langs.length === 1;
  const langs = [...n.langs].sort((a) => (a === ctx.lang ? -1 : 1));
  return html`<span class="lb">${langs.map(
    (l) => html`<span class="${only ? 'only' : ''}">${only ? ctx.t('Sadece {l}', { l: LANG_NAME[l] }) : LANG_NAME[l]}</span>`,
  )}</span>`;
}

const SEARCH = raw('<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="13" cy="13" r="8.5"></circle><path d="M19.5 19.5L26 26"></path></svg>');

function hero(ctx: Ctx, d: NotesData): Safe {
  const { t, lang } = ctx;
  const count = (k: string) => d.notes.filter((n) => n.tags.includes(k)).length;
  return html`<section class="nhero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>Notes</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<div class="nh">
<h1 class="ttl" data-rest="design" data-rest-at="end 14 -12">${t('Notes.')}</h1>
<p class="lede" data-rest="motion" data-rest-at="end 12 -4">${t('Kod ve tasarım ve hareket üzerine öğrendiklerimiz. İki kez öğrenmemek için ekip tarafından yazıldı. Bazıları Türkçe bazıları İngilizce ve çoğu ikisinde de.')}</p>
</div>
<div class="find" role="search" data-find>
${SEARCH}
<label class="sr" for="nq">${t('Notlarda bul')}</label>
<input id="nq" class="fin" type="search" placeholder="${t('Notlarda bul')}" autocomplete="off" spellcheck="false" data-q data-rest="code" data-rest-at="0.3 0.62">
<span class="fcount mono" data-count aria-live="polite">${t('{n} not', { n: d.notes.length })}</span>
<button type="button" class="ftog" aria-pressed="false" data-case><span>Aa</span><span class="sr"> · ${t('büyük küçük harf duyarlı')}</span></button>
<i class="fsep" aria-hidden="true"></i>
<span class="lseg mono" role="group" aria-label="${t('Not dili')}"><button type="button" class="lsg on" aria-pressed="true" data-nl="all">${t('Tümü')}</button><button type="button" class="lsg" aria-pressed="false" data-nl="en">EN</button><button type="button" class="lsg" aria-pressed="false" data-nl="tr">TR</button></span>
</div>
<div class="tabs mono" role="group" aria-label="${t('Konular')}" data-tabs>
<button type="button" class="tab on" aria-pressed="true" data-tab="all">${t('Tümü')}<b>${d.notes.length}</b></button>
${TABS.map((k) => html`<button type="button" class="tab" aria-pressed="false" data-tab="${k}"><span${latin(ctx, k)}>${t(TAGS[k])}</span><b>${count(k)}</b></button>`)}
<button type="button" class="tab saved" aria-pressed="false" data-tab="saved"><i aria-hidden="true"></i>${t('Kaydedilenler')}<b data-savedn>0</b></button>
</div>
<div class="hfoot mono"><span class="hint">${t('Bir notu sonraya kaydetmek için satır numarasına tıkla')}</span><span><a href="${href('tr', 'rss')}" type="application/rss+xml" hreflang="tr">RSS · TR</a> · <a href="${href('en', 'rss')}" type="application/rss+xml" hreflang="en">RSS · EN</a></span></div>
</div></section>`;
}

/** The newest note's shape drawn small: headings · lines of prose · code · the playground. */
function minimap(outline: Bar[]): Safe {
  let line = 0;
  const parts = outline.map((b) => {
    if (b.k === 'h') return html`<i class="mh"></i>`;
    if (b.k === 'p' || b.k === 'list') {
      const lines = Array.from({ length: Math.min(b.n, 6) }, () => html`<i class="ml w${line++ % 5}"></i>`);
      return html`<span class="mp${b.k === 'list' ? ' li' : ''}">${lines}</span>`;
    }
    if (b.k === 'code') return html`<span class="mc">${Array.from({ length: Math.min(b.n, 16) }, () => html`<i class="w${line++ % 5}"></i>`)}</span>`;
    if (b.k === 'play') return html`<span class="mg"><i></i></span>`;
    return html`<span class="mf"><i></i><i></i><i></i></span>`;
  });
  return html`<span class="mm">${parts}</span>`;
}

function feature(ctx: Ctx, d: NotesData): Safe {
  if (!d.feature) return html``;
  const { t, lang } = ctx;
  const { note: n, outline, sections } = d.feature;
  const tags = n.tags.map((k) => html` · <span${latin(ctx, k)}>${tagLabel(ctx, k)}</span>`);
  return html`<section class="feat" data-sec="feat" data-host="${n.author.crew}"><div class="wrap">
<a class="file"${noteLink(lang, n)}>
<span class="ftabs" aria-hidden="true"><span class="ftab on"><i class="c-${n.author.crew}"></i><b>${n.slug}.md</b></span><span class="ftab">notes.json</span></span>
<span class="fbody">
<span class="lnos" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => html`<span>${i + 1}</span>`)}</span>
<span class="fcopy">
<span class="mono fk"><b>${t('Son not')}</b>${tags} · ${t('{n} dk okuma', { n: n.minutes })}</span>
<span class="ftl" data-rest="host" data-rest-at="end 14 -10"${inLang(lang, n)}>${stop(n.title)}</span>
<span class="fex"${inLang(lang, n)}>${n.excerpt}</span>
<span class="fmeta mono"><span class="av c-${n.author.crew}" aria-hidden="true">${n.author.crew[0]!.toUpperCase()}</span><span><span lang="en">${n.author.crew}</span> · <time datetime="${isoDay(n.publishedAt)}">${ago(n.publishedAt, ctx.now, lang)}</time></span>${badges(ctx, n)}<span class="fgo">${t('Notu oku')} <span aria-hidden="true">→</span></span></span>
</span>
<span class="ffig" aria-hidden="true">${minimap(outline)}<span class="vp"></span><span class="cap mono">${t('{n} bölüm · {m} dk', { n: sections, m: n.minutes })}</span></span>
</span>
</a>
</div></section>`;
}

function list(ctx: Ctx, d: NotesData): Safe {
  const { t, lang } = ctx;
  const all = Object.keys(TAGS) as (keyof typeof TAGS)[];
  const count = (k: string) => d.notes.filter((n) => n.tags.includes(k)).length;
  return html`<section class="nlist" data-sec="list" data-host="code"><div class="wrap">
<div class="lmain">
<div class="lhd"><h2 data-ltitle>${t('Bütün notlar')}</h2><span class="mono" data-lmeta>${t('{n} not', { n: d.notes.length })} · ${t('iki dil')}</span></div>
<ol class="rows" data-rows>${d.notes.map(
    (n, i) => html`<li class="nr c-${n.author.crew}" data-i="${i}" data-id="${n.id}">
<button type="button" class="bp" aria-pressed="false" data-save disabled><span class="no">${pad(i + 1)}</span><span class="sr"> · ${t('Sonraya kaydet')}: ${n.title}</span><i aria-hidden="true"></i></button>
<span class="blm" aria-hidden="true"></span>
<span class="who mono"><b lang="en">${n.author.crew}</b><time datetime="${isoDay(n.publishedAt)}">${ago(n.publishedAt, ctx.now, lang)}</time></span>
<a class="nb"${noteLink(lang, n)}${i === 0 ? html` data-rest="host" data-rest-at="0.62 0.5"` : ''}><span class="nt" data-f${inLang(lang, n)}>${n.title}</span><span class="nx2" data-f${inLang(lang, n)}>${n.excerpt}</span><span class="ntags mono">${n.tags.map((k) => html`<span${latin(ctx, k)}>${tagLabel(ctx, k)}</span>`)}</span></a>
<span class="nmeta mono">${badges(ctx, n)}<span>${t('{n} dk', { n: n.minutes })}</span></span>
</li>`,
  )}</ol>
<div class="none" data-none hidden><b>${t('Hiçbir şey bulunamadı.')}</b><span>${t('{q} ya da Türkçe dene ya da', { q: t('yay') })} <button type="button" data-reset>${t('bütün filtreleri temizle')}</button></span></div>
</div>
<aside class="side" aria-label="${t('Takip et ve konular')}">
<div class="box"><span class="mono">RSS</span><h3>${t('Yeni notlar okuyucuna gelsin.')}</h3><p>${t('Her dil için bir besleme. Notun tamamı içinde. Takip pikseli yok.')}</p>
<div class="rss mono"><a href="${href('tr', 'rss')}" type="application/rss+xml" hreflang="tr"><i aria-hidden="true"></i>RSS · TR</a><a href="${href('en', 'rss')}" type="application/rss+xml" hreflang="en"><i aria-hidden="true"></i>RSS · EN</a></div></div>
<div class="box topics"><span class="mono">${t('Konular')}</span><div class="tagc mono" role="group" aria-label="${t('Konular')}">${all
    .filter((k) => count(k) > 0)
    .map((k) => html`<button type="button" aria-pressed="false" data-tab="${k}"><span${latin(ctx, k)}>${t(TAGS[k])}</span><b>${count(k)}</b></button>`)}</div></div>
</aside>
</div></section>`;
}

export const notesPage: Page<NotesData> = {
  id: 'notes',
  theme: 'milk',
  host: 'code',
  section: 'notes',
  scripts: ['notes'],
  styles: ['notes'],
  title: (t) => t('Notes'),
  description: (t) => t('Tasarım ve kod üzerine yazdıklarımız.'),
  load: async (ctx) => {
    const notes = await listNotes(ctx.db, ctx.lang, ctx.now);
    const top = notes.find((n) => n.textLang === ctx.lang) ?? notes[0];
    const page = top ? await noteBySlug(ctx.db, top.textLang, top.slug, ctx.now) : null;
    const r = page ? renderNote(page.body, { lang: page.textLang, t: ctx.t, author: page.author.crew }) : null;
    return { notes, feature: top && r ? { note: top, outline: r.outline, sections: r.toc.length } : null };
  },
  data: (ctx, d) => ({
    notes: d.notes.map((n) => ({ id: n.id, title: n.title, excerpt: n.excerpt, tags: n.tags, langs: n.langs, who: n.author.crew, more: n.tags.map((k) => tagLabel(ctx, k)).join(' ') })),
    tags: Object.fromEntries((Object.keys(TAGS) as (keyof typeof TAGS)[]).map((k) => [k, ctx.t(TAGS[k])])),
  }),
  body: (ctx, d) => html`${hero(ctx, d)}
${feature(ctx, d)}
${list(ctx, d)}`,
  next: { to: 'lab', kick: msg('Sonraki sayfa'), big: msg('Lab'), tone: 'lab' },
};
