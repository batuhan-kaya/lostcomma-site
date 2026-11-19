import { esc } from './html';
import { LANGS, type Lang } from './i18n';
import { href, type RouteId } from './routes';

export function robotsTxt(site: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /panel', 'Disallow: /api/', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n');
}

/** One page in each language it exists in. */
export type Alternates = Partial<Record<Lang, string>>;

/** A page from the database: its addresses · when it last changed (a case saved · a note edited). */
export interface SitemapPage {
  paths: Alternates;
  lastmod?: Date;
}

export function sitemapXml(site: string, ids: RouteId[], more: SitemapPage[] = []): string {
  const pages: SitemapPage[] = [...ids.map((id) => ({ paths: Object.fromEntries(LANGS.map((l) => [l, href(l, id)])) as Alternates })), ...more];
  const urls = pages.flatMap(({ paths: alt, lastmod }) =>
    LANGS.flatMap((lang) => {
      const path = alt[lang];
      if (!path) return [];
      const links = LANGS.flatMap((l) => (alt[l] ? [`<xhtml:link rel="alternate" hreflang="${l}" href="${esc(site + alt[l])}"/>`] : [])).join('');
      const xDefault = alt.en ?? alt.tr;
      const def = xDefault ? `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(site + xDefault)}"/>` : '';
      return [`<url><loc>${esc(site + path)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}${links}${def}</url>`];
    }),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}
