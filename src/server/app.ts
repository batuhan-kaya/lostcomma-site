import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { Assets } from './assets';
import type { Config } from './config';
import { isLang, LANGS, negotiate, translator, type Lang } from './i18n';
import { documentHtml } from './layout/document';
import type { Ctx, Page } from './page';
import { notFound, STATIC_PAGES } from './pages';
import { href, type RouteId } from './routes';
import { securityHeaders } from './security';
import { robotsTxt, sitemapXml } from './seo';

export interface AppOptions {
  config: Config;
  /** Injected clock for tests. */
  now?: () => Date;
}

export const LANG_COOKIE = 'lang';

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export async function buildApp({ config, now = () => new Date() }: AppOptions) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: true,
  });
  const publicDir = resolve(config.PUBLIC_DIR);
  const assets = new Assets(publicDir, config.NODE_ENV === 'development');

  // One canonical form per URL: no trailing slash (except the root).
  app.addHook('onRequest', async (req, reply) => {
    const [path = '/', query] = req.url.split('?');
    if (path.length > 1 && path.endsWith('/')) {
      const clean = path.replace(/\/+$/, '') || '/';
      return reply.redirect(clean + (query ? '?' + query : ''), 301);
    }
  });

  app.addHook('onSend', async (_req, reply, payload) => {
    securityHeaders(reply, config.SITE_URL.startsWith('https://'));
    return payload;
  });

  await app.register(fastifyStatic, {
    root: resolve(publicDir, 'assets'),
    prefix: '/assets/',
    index: false,
    immutable: true,
    maxAge: '365d',
  });

  app.get('/favicon.svg', (_req, reply) => {
    reply.header('cache-control', 'public, max-age=86400');
    return reply.sendFile('favicon.svg', publicDir);
  });

  function ctxFor(lang: Lang, path: string, alt: Ctx['alt']): Ctx {
    return {
      lang,
      t: translator(lang),
      tAlt: translator(lang === 'tr' ? 'en' : 'tr'),
      site: config.SITE_URL,
      path,
      alt,
      assets,
      now: now(),
    };
  }

  function send(reply: FastifyReply, page: Page, ctx: Ctx, status = 200) {
    return reply
      .status(status)
      .type('text/html; charset=utf-8')
      .header('cache-control', 'no-cache')
      .send(documentHtml(page, ctx).value);
  }

  for (const [id, page] of Object.entries(STATIC_PAGES) as [RouteId, Page][]) {
    const alt = { tr: href('tr', id), en: href('en', id) };
    for (const lang of LANGS) {
      app.get(alt[lang], (_req, reply) => send(reply, page, ctxFor(lang, alt[lang], alt)));
    }
  }

  app.get('/', (req: FastifyRequest, reply) => {
    const lang = negotiate(readCookie(req.headers.cookie, LANG_COOKIE), req.headers['accept-language']);
    reply.header('vary', 'Accept-Language, Cookie').header('cache-control', 'no-store');
    return reply.redirect(href(lang, 'home'), 302);
  });

  app.get('/healthz', () => ({ ok: true }));

  app.get('/robots.txt', (_req, reply) => reply.type('text/plain; charset=utf-8').send(robotsTxt(config.SITE_URL)));

  app.get('/sitemap.xml', (_req, reply) =>
    reply.type('application/xml; charset=utf-8').send(sitemapXml(config.SITE_URL, Object.keys(STATIC_PAGES) as RouteId[])),
  );

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0] ?? '/';
    const prefix = path.split('/')[1];
    const lang = isLang(prefix) ? prefix : negotiate(readCookie(req.headers.cookie, LANG_COOKIE), req.headers['accept-language']);
    return send(reply, notFound, ctxFor(lang, path, { tr: null, en: null }), 404);
  });

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).type('text/plain; charset=utf-8').send(status >= 500 ? 'Internal error' : err.message);
  });

  return app;
}
