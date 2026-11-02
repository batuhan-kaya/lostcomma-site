import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { registerBooking } from './api/booking';
import { registerBrief } from './api/brief';
import { RateLimit } from './api/rate';
import { Assets } from './assets';
import type { Config } from './config';
import { SERVICE_KEYS, SERVICE_SLUGS } from './content/services';
import { caseSlugs, noteSlugs, notesIn } from './data/content';
import { findRedirect } from './data/redirects';
import { SettingsStore } from './data/settings';
import { openDatabase, safeUrl, type Database, type Db } from './db';
import { seedIfEmpty } from './db/seed';
import { isLang, LANGS, negotiate, translator, type Lang } from './i18n';
import { documentHtml } from './layout/document';
import { addDemoCover, addDemoLoop } from './media/demo';
import { mediaDirs } from './media/ingest';
import { createMailer, Postman, type Mailer } from './mail';
import { getUser, setPassword } from './panel/auth';
import { registerPanel } from './panel';
import { rssXml } from './notes/rss';
import { OgImages } from './og';
import { ogSpec } from './og/spec';
import type { AnyPage, Ctx } from './page';
import { homePage, notFound, PARAM_PAGES, STATIC_PAGES } from './pages';
import { href, ROUTES, type RouteId } from './routes';
import { readCookie } from './cookies';
import { securityHeaders } from './security';
import { robotsTxt, sitemapXml } from './seo';

export interface AppOptions {
  config: Config;
  /** Injected clock for tests. */
  now?: () => Date;
  /** An open database (tests share one). Defaults to opening config.DATABASE_URL · closed with the app. */
  database?: Database;
  /** Where mail goes (tests pass a MemoryMailer). Defaults to MAIL_URL · null sends nothing. */
  mailer?: Mailer | null;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    postman: Postman;
    settings: SettingsStore;
  }
}

/**
 * Brings the database up to date and fills an empty one (SEED). Runs on every boot:
 * migrations that already ran are skipped · seeding never touches existing content.
 */
export async function prepareDatabase(database: Database, config: Config): Promise<void> {
  await database.migrate();
  if (config.PANEL_PASSWORD && !(await getUser(database.db))) await setPassword(database.db, config.PANEL_PASSWORD);
  if (config.SEED === 'none') return;
  await seedIfEmpty(database.db);
  if (config.SEED === 'demo') {
    await addDemoCover(database.db, mediaDirs(config.DATA_DIR));
    await addDemoLoop(database.db, mediaDirs(config.DATA_DIR));
  }
}

export const LANG_COOKIE = 'lang';

export { readCookie } from './cookies';

export async function buildApp({ config, now = () => new Date(), database, mailer }: AppOptions) {
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
  const settings = new SettingsStore(db);
  await settings.load();
  app.decorate('settings', settings);

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

  // Mail: briefs and bookings go into the outbox · the postman sends them when MAIL_URL is set.
  const postman = new Postman(db, mailer !== undefined ? mailer : createMailer(config.MAIL_URL, (m) => app.log.info(m)), config.MAIL_FROM, now);
  app.decorate('postman', postman);
  if (config.NODE_ENV !== 'test') postman.start();
  app.addHook('onClose', async () => {
    postman.stop();
    await postman.drain();
  });

  await app.register(formbody, { bodyLimit: 16_384 });
  registerBrief(app, {
    db,
    siteUrl: config.SITE_URL,
    now,
    limit: new RateLimit(config.BRIEF_LIMIT, 10 * 60_000),
    postman,
    studio: config.MAIL_TO,
  });
  registerBooking(app, {
    db,
    siteUrl: config.SITE_URL,
    now,
    limit: new RateLimit(config.BOOK_LIMIT, 60 * 60_000),
    postman,
    studio: config.MAIL_TO,
    meet: config.MEET_URL,
  });

  await app.register(fastifyStatic, {
    root: resolve(publicDir, 'assets'),
    prefix: '/assets/',
    index: false,
    immutable: true,
    maxAge: '365d',
  });

  // Image variants and loops from the pipeline. Content-hashed names · cached for a year · range requests
  // for video · originals are never served.
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
    allowedPath: (path) => /^\/[0-9a-f]{16}\/(\d{2,4}\.(avif|webp)|loop\.(mp4|webm))$/.test(path),
  });

  app.get('/favicon.svg', (_req, reply) => {
    reply.header('cache-control', 'public, max-age=86400');
    return reply.sendFile('favicon.svg', publicDir);
  });

  function ctxFor(lang: Lang, path: string, alt: Ctx['alt'], query: unknown = {}): Ctx {
    const q = Object.fromEntries(Object.entries((query ?? {}) as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
    return {
      query: q,
      lang,
      t: translator(lang),
      tAlt: translator(lang === 'tr' ? 'en' : 'tr'),
      site: config.SITE_URL,
      path,
      alt,
      assets,
      now: now(),
      db,
      settings,
    };
  }

  /** Renders a page. `loaded` skips load() when the route already fetched the data. */
  async function send(reply: FastifyReply, page: AnyPage, ctx: Ctx, status = 200, loaded?: { data: unknown }) {
    const data = loaded ? loaded.data : page.load ? await page.load(ctx, {}) : undefined;
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
        return send(reply, p, ctxFor(lang, alt[lang], alt, req.query));
      });
    }
  }

  // Pages on a route with params (a case study · a note): load() finds the content or it is a 404.
  for (const [id, page] of Object.entries(PARAM_PAGES) as [RouteId, AnyPage][]) {
    for (const lang of LANGS) {
      app.get(ROUTES[id][lang], async (req, reply) => {
        const ctx = ctxFor(lang, req.url.split('?')[0] ?? '/', { tr: null, en: null });
        const data = await page.load?.(ctx, req.params as Record<string, string>);
        if (data == null) return notFoundPage(req, reply);
        ctx.alt = page.paths?.(data) ?? ctx.alt;
        ctx.path = ctx.alt[lang] ?? ctx.path;
        return send(reply, page, ctx, 200, { data });
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

  // One feed per language with the notes written in it.
  for (const lang of LANGS) {
    app.get(href(lang, 'rss'), async (_req, reply) => {
      const at = now();
      const list = await notesIn(db, lang, at);
      return reply
        .type('application/rss+xml; charset=utf-8')
        .header('cache-control', 'public, max-age=600')
        .send(rssXml(config.SITE_URL, lang, translator(lang), list, at));
    });
  }

  // Share images: /og + the page address + .png. Drawn once per content (src/server/og).
  const og = new OgImages(join(config.DATA_DIR, 'og'), {
    built: (key) => {
      const url = assets.font(key);
      return url ? join(publicDir, url) : null;
    },
  });
  const ogRoutes = [
    ...(Object.entries(STATIC_PAGES) as [RouteId, AnyPage][]).flatMap(([id, page]) =>
      LANGS.map((lang) => ({ page, lang, re: new RegExp(`^${href(lang, id)}$`), keys: [] as string[] })),
    ),
    ...(Object.entries(PARAM_PAGES) as [RouteId, AnyPage][]).flatMap(([id, page]) =>
      LANGS.map((lang) => ({
        page,
        lang,
        re: new RegExp(`^${ROUTES[id][lang].replace(/:\w+/g, '([^/]+)')}$`),
        keys: [...ROUTES[id][lang].matchAll(/:(\w+)/g)].map((m) => m[1]!),
      })),
    ),
  ];
  app.get('/og/*', async (req, reply) => {
    const m = /^(\/.*)\.png$/.exec('/' + (req.params as { '*': string })['*']);
    const path = m?.[1] ?? '';
    for (const r of ogRoutes) {
      const hit = r.re.exec(path);
      if (!hit) continue;
      let params: Record<string, string>;
      try {
        params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(hit[i + 1]!)]));
      } catch {
        break;
      }
      const ctx = ctxFor(r.lang, path, { tr: null, en: null });
      const data = r.page.load ? await r.page.load(ctx, params) : undefined;
      if (r.page.load && data == null) break;
      if (r.page.paths) ctx.path = r.page.paths(data)[r.lang] ?? path;
      const { key, png } = await og.png(ogSpec(r.page, ctx, data));
      const fresh = (req.query as Record<string, string>).v === key;
      return reply
        .type('image/png')
        .header('cache-control', fresh ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
        .send(png);
    }
    return reply.status(404).type('text/plain; charset=utf-8').send('Not found');
  });

  app.get('/robots.txt', (_req, reply) => reply.type('text/plain; charset=utf-8').send(robotsTxt(config.SITE_URL)));

  app.get('/sitemap.xml', async (_req, reply) => {
    const cases = (await caseSlugs(db)).map((slugs) => Object.fromEntries(LANGS.flatMap((l) => (slugs[l] ? [[l, href(l, 'case', { slug: slugs[l] })]] : []))));
    const services = SERVICE_KEYS.map((k) => Object.fromEntries(LANGS.map((l) => [l, href(l, 'service', { slug: SERVICE_SLUGS[k][l] })])));
    const notes = (await noteSlugs(db, now())).map((slugs) => Object.fromEntries(LANGS.flatMap((l) => (slugs[l] ? [[l, href(l, 'note', { slug: slugs[l] })]] : []))));
    return reply.type('application/xml; charset=utf-8').send(sitemapXml(config.SITE_URL, Object.keys(STATIC_PAGES) as RouteId[], [...services, ...cases, ...notes]));
  });

  async function notFoundPage(req: FastifyRequest, reply: FastifyReply) {
    const path = req.url.split('?')[0] ?? '/';
    // An address that moved (a slug changed in the panel).
    if (req.method === 'GET' || req.method === 'HEAD') {
      const to = path.length <= 200 ? await findRedirect(db, path) : null;
      if (to) return reply.header('cache-control', 'no-cache').redirect(to, 301);
    }
    const prefix = path.split('/')[1];
    const lang = isLang(prefix) ? prefix : negotiate(readCookie(req.headers.cookie, LANG_COOKIE), req.headers['accept-language']);
    return send(reply, notFound, ctxFor(lang, path, { tr: null, en: null }), 404);
  }

  // The panel (docs/PANEL.md): sign in · content · media · inbox · calls · mail · settings · log.
  await registerPanel(app, {
    db,
    config,
    now,
    settings,
    postman,
    dirs: media,
    assets,
    secure: config.SITE_URL.startsWith('https://'),
    preview: (reply, page, lang, path, data) => send(reply, page, ctxFor(lang, path, { tr: null, en: null }), 200, { data }),
  });

  app.setNotFoundHandler(notFoundPage);

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).type('text/plain; charset=utf-8').send(status >= 500 ? 'Internal error' : err.message);
  });

  return app;
}
