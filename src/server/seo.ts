import { esc } from './html';
import { LANGS } from './i18n';
import { href, type RouteId } from './routes';

export function robotsTxt(site: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /panel', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n');
}

export function sitemapXml(site: string, ids: RouteId[]): string {
  const urls = ids.flatMap((id) =>
    LANGS.map((lang) => {
      const links = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(site + href(l, id))}"/>`).join('');
      return `<url><loc>${esc(site + href(lang, id))}</loc>${links}</url>`;
    }),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}
