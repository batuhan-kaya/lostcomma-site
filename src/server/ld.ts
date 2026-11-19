/**
 * Structured data (schema.org JSON-LD) for every page · one @graph built from the page's own
 * content at render time, so it follows the panel: a renamed case · a new note · a phone number
 * filled in Site ayarları · a social account added. Search engines read it · nothing is shown.
 *
 * Every page carries the studio (#org) · the site (#website) · the page itself (#webpage) and its
 * breadcrumbs. A page adds what it is about through `page.ld` (a note's article · a case's work ·
 * a service · the list of works or notes).
 */
import { SOCIAL } from './data/settings';
import { raw, type Safe } from './html';
import { LANGS, type Lang } from './i18n';
import { NAV } from './layout/chrome';
import type { AnyPage, Ctx } from './page';
import { href, type RouteId } from './routes';

export type LdNode = Record<string, unknown>;

/** What a page tells about itself (page.ld). */
export interface PageLd {
  /** The kind of page: a plain WebPage unless it is a list · the studio · the contact page · one item. */
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage' | 'ItemPage';
  published?: Date;
  modified?: Date;
  /** What the page is about (an article · a creative work · a service · an item list). */
  nodes?: LdNode[];
}

const EMAIL = 'hello@lostcomma.co';
const IN_LANGUAGE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US' };

export const ids = (site: string) => ({ org: `${site}/#org`, website: `${site}/#website` });

/** The studio: name · logo · how to reach it · its accounts (Site ayarları). */
function organization(ctx: Ctx): LdNode {
  const { site, lang, settings } = ctx;
  const phone = settings.text('studio.phone', lang);
  const address = settings.text('studio.address', lang);
  const sameAs = SOCIAL.map((s) => settings.text(s.key, lang)).filter((u): u is string => !!u);
  return {
    '@type': 'Organization',
    '@id': ids(site).org,
    name: 'Lost Comma',
    url: `${site}${href(lang, 'home')}`,
    logo: { '@type': 'ImageObject', url: `${site}/icon-512.png`, width: 512, height: 512 },
    image: `${site}/icon-512.png`,
    email: EMAIL,
    ...(phone ? { telephone: phone } : {}),
    address: { '@type': 'PostalAddress', ...(address ? { streetAddress: address } : {}), addressLocality: 'İstanbul', addressCountry: 'TR' },
    areaServed: 'Worldwide',
    knowsLanguage: ['tr', 'en'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: EMAIL, ...(phone ? { telephone: phone } : {}), availableLanguage: ['Turkish', 'English'], url: `${site}${href(lang, 'start')}` },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** The site: both languages · searching the notes. */
function website(ctx: Ctx): LdNode {
  const { site, lang } = ctx;
  return {
    '@type': 'WebSite',
    '@id': ids(site).website,
    url: `${site}${href(lang, 'home')}`,
    name: 'Lost Comma',
    inLanguage: LANGS.map((l) => IN_LANGUAGE[l]),
    publisher: { '@id': ids(site).org },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${site}${href(lang, 'notes')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

/** Home › the section (when the page lives under one) › the page. */
function breadcrumbs(ctx: Ctx, page: AnyPage, name: string): LdNode | null {
  if (page.id === 'home' || page.id === 'notFound') return null;
  const { site, lang, t } = ctx;
  const items: { name: string; url: string }[] = [{ name: 'Lost Comma', url: `${site}${href(lang, 'home')}` }];
  const section = page.section && page.section !== page.id ? NAV.find(([id]) => id === page.section) : undefined;
  if (section) items.push({ name: t(section[1]), url: `${site}${href(lang, section[0] as RouteId)}` });
  items.push({ name, url: site + ctx.path });
  return {
    '@type': 'BreadcrumbList',
    '@id': `${site}${ctx.path}#breadcrumb`,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

/** The whole graph of a page as a JSON data block (CSP runs no inline script · a data block is not run). */
export function ldGraph(ctx: Ctx, page: AnyPage, data: unknown, o: { name: string; title: string; description: string; image: string | null }): Safe {
  const { site } = ctx;
  const own = page.ld?.(ctx, data, o.image) ?? {};
  const url = site + ctx.path;
  const crumbs = breadcrumbs(ctx, page, o.name);
  const webpage: LdNode = {
    '@type': own.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: o.title,
    description: o.description,
    inLanguage: IN_LANGUAGE[ctx.lang],
    isPartOf: { '@id': ids(site).website },
    ...(page.id === 'home' ? { about: { '@id': ids(site).org } } : {}),
    ...(o.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: o.image, width: 1200, height: 630 } } : {}),
    ...(crumbs ? { breadcrumb: { '@id': crumbs['@id'] } } : {}),
    ...(own.published ? { datePublished: own.published.toISOString() } : {}),
    ...(own.modified ? { dateModified: own.modified.toISOString() } : {}),
  };
  const graph = [organization(ctx), website(ctx), webpage, ...(crumbs ? [crumbs] : []), ...(own.nodes ?? [])];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return raw(`<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`);
}

/** An item list of links (the Work page's cases · the Notes page's notes). */
export function itemList(ctx: Ctx, items: { name: string; url: string }[]): LdNode {
  return {
    '@type': 'ItemList',
    '@id': `${ctx.site}${ctx.path}#list`,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: ctx.site + it.url })),
  };
}

/** The page node this content belongs to (an article's mainEntityOfPage). */
export const pageRef = (ctx: Ctx) => ({ '@id': `${ctx.site}${ctx.path}#webpage` });
export const orgRef = (ctx: Ctx) => ({ '@id': ids(ctx.site).org });
