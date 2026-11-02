import { noteBySlug, type NotePage } from '../../data/content';
import { html, raw, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { msg } from '../../msg';
import { renderNote, type Rendered } from '../../notes/render';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { isoDay, longDate } from '../../../shared/dates';
import { inLang, latin, noteLink, stop, tagLabel } from '../notes';

/**
 * A note. The text in the middle · a table of contents that knows how far you have read ·
 * footnotes as side notes beside the line they belong to · code you can copy · select a
 * sentence to copy it as a quote or as a link that opens on that sentence.
 * The author hosts every section below the title.
 */
export interface NoteData {
  note: NotePage;
  r: Rendered;
}

function head(ctx: Ctx, d: NoteData): Safe {
  const { t, lang } = ctx;
  const n = d.note;
  const other: Lang = lang === 'tr' ? 'en' : 'tr';
  const otherSlug = n.slugs[other];
  return html`<section class="ahead" data-sec="hero" id="top"><div class="wrap">
<p class="crumb mono"><a href="${href(lang, 'notes')}"><span aria-hidden="true">←</span> Notes</a><span aria-hidden="true">/</span><span>${n.tags.map((k, i) => html`${i ? ' · ' : ''}<span${latin(ctx, k)}>${tagLabel(ctx, k)}</span>`)}</span><span aria-hidden="true">/</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="atl" data-rest="design" data-rest-at="end 16 -14">${stop(n.title)}</h1>
<p class="adek" data-rest="motion" data-rest-at="end 12 -4">${n.excerpt}</p>
<div class="ameta mono"><span class="av c-${n.author.crew}" aria-hidden="true">${n.author.crew[0]!.toUpperCase()}</span><span><b>${n.author.name}</b> · <span lang="en">${n.author.crew}</span></span><time datetime="${isoDay(n.publishedAt)}">${longDate(n.publishedAt, lang)}</time><span>${t('{n} dk okuma', { n: n.minutes })}</span><span class="rd" data-read aria-hidden="true"></span>${
    otherSlug
      ? html`<a class="also" href="${href(other, 'note', { slug: otherSlug })}" hreflang="${other}" data-rest="code" data-rest-at="0.5 1.2">${other === 'tr' ? t('Türkçesi de var') : t('İngilizcesi de var')} <span aria-hidden="true">→</span></a>`
      : ''
  }</div>
</div></section>`;
}

function toc(ctx: Ctx, d: NoteData): Safe {
  const { t } = ctx;
  if (d.r.toc.length < 2) return html`<div class="toc none"></div>`;
  return html`<nav class="toc" aria-label="${t('Bu sayfada')}">
<span class="mono">${t('Bu sayfada')}</span>
<ol class="tl" data-toc><i class="tbar" data-bar aria-hidden="true"></i>${d.r.toc.map((e, i) => html`<li${i === 0 ? html` class="on"` : ''}><a href="#${e.id}">${e.text}</a></li>`)}</ol>
<span class="tpct mono" data-pct aria-hidden="true"></span>
</nav>`;
}

function side(ctx: Ctx, d: NoteData): Safe {
  const { t } = ctx;
  if (!d.r.notes.length) return html`<div class="side none"></div>`;
  return html`<aside class="side" aria-label="${t('Dipnotlar')}"><ol class="snotes" data-snotes>${d.r.notes.map(
    (s) => html`<li class="snote" id="fn-${s.n}" data-sn="${s.n}"><b aria-hidden="true">${s.n}</b><span>${raw(s.html)} <a class="back" href="#fnr-${s.n}"><span aria-hidden="true">↩</span><span class="sr">${t('Metne dön')}</span></a></span></li>`,
  )}</ol></aside>`;
}

function end(ctx: Ctx, d: NoteData): Safe {
  const { t, lang } = ctx;
  const n = d.note;
  return html`<section class="nend" data-sec="end" data-host="${n.author.crew}"><div class="wrap">
<div class="endc">
<div class="author c-${n.author.crew}"><span class="av" aria-hidden="true">${n.author.crew[0]!.toUpperCase()}</span><div><b>${n.author.name} · <span lang="en">${n.author.crew}</span></b>${n.about ? html`<p>${n.about.role}. ${n.about.usually}</p>` : ''}</div><a class="mono" href="${href(lang, 'studio')}" data-rest="host" data-rest-at="1 0.5 14 0">${t('Ekip')} <span aria-hidden="true">→</span></a></div>
<nav class="pn" aria-label="${t('Diğer notlar')}">
${n.older ? html`<a${noteLink(lang, n.older)}><span class="mono">← ${t('Daha eski')}</span><b${inLang(lang, n.older)}>${n.older.title}</b></a>` : html`<a href="${href(lang, 'notes')}"><span class="mono">← ${t('İlk not')}</span><b>${t('Buradan başladık')}</b></a>`}
<a href="${href(lang, 'notes')}"><span class="mono">${t('Bütün notlar')}</span><b>${t('Her nota dön')} <span aria-hidden="true">→</span></b></a>
</nav>
</div>
</div></section>`;
}

export const notePage: Page<NoteData> = {
  id: 'note',
  theme: 'milk',
  host: 'code',
  section: 'notes',
  scripts: ['note'],
  styles: ['note'],
  ogType: 'article',
  title: (_t, d) => d.note.title,
  description: (_t, d) => d.note.excerpt,
  load: async (ctx, params) => {
    const note = await noteBySlug(ctx.db, ctx.lang, params.slug ?? '', ctx.now);
    if (!note) return null;
    return { note, r: renderNote(note.body, { lang: ctx.lang, t: ctx.t, author: note.author.crew }) };
  },
  paths: (d) => ({
    tr: d.note.slugs.tr ? href('tr', 'note', { slug: d.note.slugs.tr }) : null,
    en: d.note.slugs.en ? href('en', 'note', { slug: d.note.slugs.en }) : null,
  }),
  og: (ctx, d) => ({ kick: `Notes · ${longDate(d.note.publishedAt, ctx.lang)} · ${ctx.t('{n} dk', { n: d.note.minutes })}`, title: d.note.title, who: d.note.author.crew }),
  head: (ctx, d) => {
    const n = d.note;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: n.title,
      description: n.excerpt,
      datePublished: n.publishedAt.toISOString(),
      inLanguage: ctx.lang,
      url: ctx.site + ctx.path,
      author: { '@type': 'Person', name: n.author.name },
      publisher: { '@type': 'Organization', name: 'Lost Comma', logo: { '@type': 'ImageObject', url: `${ctx.site}/icon-512.png`, width: 512, height: 512 } },
    };
    return html`<meta property="article:published_time" content="${n.publishedAt.toISOString()}">
${n.tags.map((k) => html`<meta property="article:tag" content="${tagLabel(ctx, k)}">`)}
${raw(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`)}`;
  },
  data: (ctx, d) => ({ minutes: d.note.minutes, url: ctx.site + ctx.path, title: d.note.title, who: d.note.author.crew }),
  body: (ctx, d) => html`${head(ctx, d)}
<section class="art" data-sec="art" data-host="${d.note.author.crew}"><div class="wrap">
${toc(ctx, d)}
<article class="body" data-body>${d.r.html}</article>
${side(ctx, d)}
</div></section>
${end(ctx, d)}`,
  next: { to: 'lab', kick: msg('Okumak yetmezse'), big: msg('Lab'), tone: 'lab' },
};

