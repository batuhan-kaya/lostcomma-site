import { esc } from './html';
import { LANGS, type Lang } from './i18n';
import { href, type RouteId } from './routes';

export function robotsTxt(site: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /panel', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n');
}

/** One page in each language it exists in. */
export type Alternates = Partial<Record<Lang, string>>;

export function sitemapXml(site: string, ids: RouteId[], more: Alternates[] = []): string {
  const pages: Alternates[] = [...ids.map((id) => Object.fromEntries(LANGS.map((l) => [l, href(l, id)]))), ...more];
  const urls = pages.flatMap((alt) =>
    LANGS.flatMap((lang) => {
      const path = alt[lang];
      if (!path) return [];
      const links = LANGS.flatMap((l) => (alt[l] ? [`<xhtml:link rel="alternate" hreflang="${l}" href="${esc(site + alt[l])}"/>`] : [])).join('');
      return [`<url><loc>${esc(site + path)}</loc>${links}</url>`];
    }),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}
