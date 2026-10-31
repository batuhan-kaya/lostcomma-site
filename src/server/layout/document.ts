import { html, raw, type Safe } from '../html';
import { LANGS, type Lang } from '../i18n';
import type { Ctx, Page } from '../page';
import { THEMES } from '../themes';
import { footer, header, nextBand } from './chrome';

const OG_LOCALE: Record<Lang, string> = { tr: 'tr_TR', en: 'en_US' };
const PRELOAD_FONTS = ['anybody-latin', 'geist-latin', 'martian-latin'];

/** A JSON data block for the page script. Not executed, so CSP allows it. `<` is escaped so it can never close the tag. */
export function jsonData(value: unknown): Safe {
  return raw(`<script type="application/json" id="page-data">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`);
}

export function documentHtml<D>(page: Page<D>, ctx: Ctx, data: D): Safe {
  const { t, lang, site, assets } = ctx;
  const name = page.title(t, data);
  const theme = typeof page.theme === 'function' ? page.theme(data) : page.theme;
  const title = page.id === 'home' ? `Lost Comma · ${name}` : `${name} · Lost Comma`;
  const description = page.description(t, data);
  const url = site + ctx.path;

  const alternates = LANGS.flatMap((l) => {
    const p = ctx.alt[l];
    return p ? [html`<link rel="alternate" hreflang="${l}" href="${site + p}">`] : [];
  });
  const xDefault = ctx.alt.en ?? ctx.alt.tr;

  const fonts = PRELOAD_FONTS.map((f) => assets.font(f)).filter((u): u is string => !!u);
  const css = ['app', ...(page.styles ?? [])].map((n) => assets.css(n)).filter((u): u is string => !!u);
  const js = ['app', ...(page.scripts ?? [])].map((n) => assets.js(n, lang)).filter((u): u is string => !!u);

  return html`<!doctype html>
<html lang="${lang}" class="th-${theme}" data-page="${page.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
${page.noindex
    ? html`<meta name="robots" content="noindex">`
    : html`<link rel="canonical" href="${url}">
${alternates}
${xDefault ? html`<link rel="alternate" hreflang="x-default" href="${site + xDefault}">` : ''}`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lost Comma">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${THEMES[theme]}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${fonts.map((f) => html`<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`)}
${css.map((c) => html`<link rel="stylesheet" href="${c}">`)}
${js.map((s) => html`<script type="module" src="${s}"></script>`)}
</head>
<body>
<a class="skip" href="#main">${t('İçeriğe geç')}</a>
<div class="pg" data-root data-host="${page.host ?? 'design'}">
${header(ctx, page.section, { home: page.home })}
<main id="main">
${page.body(ctx, data)}
</main>
${!page.bare && page.next ? nextBand(ctx, page.next) : ''}
${!page.bare ? (page.footer ? page.footer(ctx, data) : footer(ctx)) : ''}
${page.data ? jsonData(page.data(ctx, data)) : ''}
</div>
</body>
</html>`;
}
