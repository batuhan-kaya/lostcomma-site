import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { registerBrief } from './api/brief';
import { RateLimit } from './api/rate';
import { Assets } from './assets';
import type { Config } from './config';
import { openDatabase, safeUrl, type Database, type Db } from './db';
import { seedIfEmpty } from './db/seed';
import { isLang, LANGS, negotiate, translator, type Lang } from './i18n';
import { documentHtml } from './layout/document';
import { addDemoCover } from './media/demo';
import { mediaDirs } from './media/ingest';
import type { AnyPage, Ctx } from './page';
import { homePage, notFound, STATIC_PAGES } from './pages';
import { href, type RouteId } from './routes';
import { securityHeaders } from './security';
import { robotsTxt, sitemapXml } from './seo';

export interface AppOptions {
  config: Config;
  /** Injected clock for tests. */
  now?: () => Date;
  /** An open database (tests share one). Defaults to opening config.DATABASE_URL · closed with the app. */
  database?: Database;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

/**
 * Brings the database up to date and fills an empty one (SEED). Runs on every boot:
 * migrations that already ran are skipped · seeding never touches existing content.
 */
export async function prepareDatabase(database: Database, config: Config): Promise<void> {
  await database.migrate();
  if (config.SEED === 'none') return;
  await seedIfEmpty(database.db);
  if (config.SEED === 'demo') await addDemoCover(database.db, mediaDirs(config.DATA_DIR));
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

export async function buildApp({ config, now = () => new Date(), database }: AppOptions) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: true,
  });
  const publicDir = resolve(config.PUBLIC_DIR);
  const assets = new Assets(publicDir, config.NODE_ENV === 'development');

  const owned = !database;
  const dbh = database ?? (await openDatabase(config.DATABASE_URL));
  if (owned) {
    app.log.info({ db: safeUrl(config.DATABASE_URL) }, 'database');
    app.addHook('onClose', () => dbh.close());
    await prepareDatabase(dbh, config);
  }
  const db = dbh.db;
  app.decorate('db', db);

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

  await app.register(formbody, { bodyLimit: 16_384 });
  registerBrief(app, {
    db,
    siteUrl: config.SITE_URL,
    now,
    limit: new RateLimit(config.BRIEF_LIMIT, 10 * 60_000),
  });

  await app.register(fastifyStatic, {
    root: resolve(publicDir, 'assets'),
    prefix: '/assets/',
    index: false,
    immutable: true,
    maxAge: '365d',
  });

  // Image variants from the pipeline. Content-hashed names · cached for a year · originals are never served.
  const media = mediaDirs(config.DATA_DIR);
  mkdirSync(media.public, { recursive: true });
  await app.register(fastifyStatic, {
    root: resolve(media.public),
    prefix: '/media/',
    decorateReply: false,
    index: false,
    list: false,
    dotfiles: 'deny',
    immutable: true,
    maxAge: '365d',
    allowedPath: (path) => /^\/[0-9a-f]{16}\/\d{2,4}\.(avif|webp)$/.test(path),
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
      db,
    };
  }

  async function send(reply: FastifyReply, page: AnyPage, ctx: Ctx, status = 200) {
    const data = page.load ? await page.load(ctx) : undefined;
    return reply
      .status(status)
      .type('text/html; charset=utf-8')
      .header('cache-control', 'no-cache')
      .send(documentHtml(page, ctx, data).value);
  }

  for (const [id, page] of Object.entries(STATIC_PAGES) as [RouteId, AnyPage][]) {
    const alt = { tr: href('tr', id), en: href('en', id) };
    for (const lang of LANGS) {
      app.get(alt[lang], (req, reply) => {
        // The homepage shows the brief result after a post without JS.
        const state = id === 'home' ? (req.query as Record<string, string>).brief : undefined;
        const p = state === 'sent' || state === 'error' ? homePage({ sent: state === 'sent', error: state === 'error' }) : page;
        return send(reply, p, ctxFor(lang, alt[lang], alt));
      });
    }
  }

  app.get('/', (req: FastifyRequest, reply) => {
    const lang = negotiate(readCookie(req.headers.cookie, LANG_COOKIE), req.headers['accept-language']);
    reply.header('vary', 'Accept-Language, Cookie').header('cache-control', 'no-store');
    return reply.redirect(href(lang, 'home'), 302);
  });

  // Docker's healthcheck: the process answers and the database does too.
  app.get('/healthz', async (_req, reply) => {
    reply.header('cache-control', 'no-store');
    try {
      await db.execute(sql`select 1`);
      return { ok: true };
    } catch (err) {
      app.log.error(err, 'healthz: database unreachable');
      return reply.status(503).send({ ok: false });
    }
  });

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
