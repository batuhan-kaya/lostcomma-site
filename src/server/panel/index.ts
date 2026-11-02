/**
 * The panel (docs/PANEL.md). One Fastify plugin under /panel: sign in · sessions · CSRF · every
 * section. Uploads (multipart) are accepted here only. Nothing under /panel is cached or indexed.
 */
import multipart from '@fastify/multipart';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { readCookie } from '../cookies';
import { RateLimit } from '../api/rate';
import { panelUser } from '../db/schema';
import { html } from '../html';
import { cleared, cookie, createSession, endSession, getUser, PENDING_COOKIE, readSession, same, SESSION_COOKIE, token, verifyPassword, MAX_MS } from './auth';
import { back, bodyOf, ipOf, log, str, type Kit } from './kit';
import { checkCode } from './totp';
import { bare, csrfField } from './ui';
import { registerAccount } from './views/account';
import { registerBookings } from './views/bookings';
import { registerDashboard } from './views/dashboard';
import { registerInbox } from './views/inbox';
import { registerLog } from './views/log';
import { registerMail } from './views/mail';
import { registerMedia } from './views/media';
import { registerNotes } from './views/notes';
import { registerPeople } from './views/people';
import { registerProjects } from './views/projects';
import { registerRedirects } from './views/redirects';
import { registerSettings } from './views/settings';
import { registerStats } from './views/stats';

const OPEN = new Set(['/panel/login', '/panel/login/code']);
/** Panel forms can be long (a note · a case study): larger than the site's 16 kb forms. */
export const FORM_LIMIT = 2_000_000;

interface Pending {
  next: string;
  expires: number;
  tries: number;
}

const safeNext = (n: string | undefined) => (n && /^\/panel(\/[\w./?=&%-]*)?$/.test(n) && !n.startsWith('/panel/login') ? n : '/panel');

export async function registerPanel(app: FastifyInstance, k: Kit): Promise<void> {
  const siteHost = new URL(k.config.SITE_URL).host;
  const signIns = new RateLimit(k.config.PANEL_SIGNIN_LIMIT, 15 * 60_000);
  const pending = new Map<string, Pending>();

  await app.register(
    async (p) => {
      await p.register(multipart, { limits: { fileSize: 30_000_000, files: 25, fields: 40, fieldSize: 100_000 } });
      p.addHook('onRoute', (route) => {
        if (route.method === 'POST' || (Array.isArray(route.method) && route.method.includes('POST'))) route.bodyLimit = FORM_LIMIT;
      });

      p.addHook('onRequest', async (req, reply) => {
        reply.header('x-robots-tag', 'noindex, nofollow').header('cache-control', 'no-store');
        // Same-site posts only (browsers always send Origin on POST).
        if (req.method === 'POST' && req.headers.origin) {
          let host = '';
          try {
            host = new URL(req.headers.origin).host;
          } catch {
            host = '';
          }
          if (host !== siteHost) return reply.status(403).type('text/plain; charset=utf-8').send('Forbidden');
        }
        const path = req.url.split('?')[0]!;
        if (OPEN.has(path)) return;
        const session = await readSession(k.db, readCookie(req.headers.cookie, SESSION_COOKIE), k.now());
        if (!session) {
          if (req.method === 'GET' && !path.endsWith('.json')) return reply.redirect(`/panel/login?next=${encodeURIComponent(req.url)}`, 303);
          return reply.status(401).type('application/json').send({ ok: false, error: 'signed-out' });
        }
        req.panel = session;
      });

      // CSRF: every post carries the session's token (forms: _csrf · fetch: x-csrf). Uploads check it themselves.
      p.addHook('preHandler', async (req, reply) => {
        if (req.method !== 'POST' || OPEN.has(req.url.split('?')[0]!) || req.isMultipart()) return;
        const sent = String(req.headers['x-csrf'] ?? str(bodyOf(req), '_csrf'));
        if (!req.panel || !sent || !same(sent, req.panel.csrf)) return reply.status(403).type('text/plain; charset=utf-8').send('The form expired. Go back and reload the page.');
      });

      /* ---------------- sign in ---------------- */

      const gate = (reply: FastifyReply, body: ReturnType<typeof html>, status = 200) => reply.status(status).type('text/html; charset=utf-8').send(bare(k.assets, 'Giriş', body));

      const loginForm = (next: string, error?: string, setup = false) =>
        html`<div class="p-card">
<p class="p-logo big"><span>lost</span><i aria-hidden="true">|</i><span>comma</span><small class="mono">panel</small></p>
${
  setup
    ? html`<h1>Panel henüz kurulmadı</h1><p>Önce bir şifre koy. Sunucuda şunu çalıştır:</p><pre class="p-code">npm run panel -- password</pre><p class="p-hint">Docker içinde: <code>node dist/server/cli.js panel password</code> · ya da ilk açılışta <code>PANEL_PASSWORD</code> ortam değişkeni.</p>`
    : html`<h1>Giriş</h1>
${error ? html`<p class="p-errors" role="alert">${error}</p>` : ''}
<form method="post" action="/panel/login" class="p-stack">
<input type="hidden" name="next" value="${next}">
<div class="p-field"><label for="f-password">Şifre</label><input class="p-in" id="f-password" name="password" type="password" autocomplete="current-password" required autofocus></div>
<button class="p-btn" type="submit">Giriş yap</button>
</form>`
}
</div>`;

      p.get('/login', async (req, reply) => {
        const q = req.query as Record<string, string>;
        const user = await getUser(k.db);
        const already = await readSession(k.db, readCookie(req.headers.cookie, SESSION_COOKIE), k.now());
        if (already && user) return reply.redirect(safeNext(q.next), 303);
        return gate(reply, loginForm(safeNext(q.next), q.m === 'out' ? undefined : undefined, !user));
      });

      const signIn = async (req: FastifyRequest, reply: FastifyReply, next: string) => {
        const { token: t } = await createSession(k.db, { ip: ipOf(req), agent: String(req.headers['user-agent'] ?? ''), now: k.now() });
        await log(k, req, { action: 'signin', entity: 'account', summary: 'Giriş yapıldı' });
        reply.header('set-cookie', [cookie(SESSION_COOKIE, t, { secure: k.secure, maxAge: Math.floor(MAX_MS / 1000) }), cleared(PENDING_COOKIE, k.secure)]);
        return reply.redirect(next, 303);
      };

      const slow = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 250));

      p.post('/login', async (req, reply) => {
        const b = bodyOf(req);
        const next = safeNext(str(b, 'next'));
        const user = await getUser(k.db);
        if (!user) return gate(reply, loginForm(next, undefined, true), 503);
        if (!signIns.take(ipOf(req))) {
          await log(k, req, { action: 'signin-blocked', entity: 'account', summary: 'Çok fazla deneme · bekletildi' });
          return gate(reply, loginForm(next, 'Çok fazla deneme. On beş dakika sonra tekrar dene.'), 429);
        }
        const ok = await verifyPassword(str(b, 'password'), user.passwordHash);
        if (!ok) {
          await slow();
          await log(k, req, { action: 'signin-failed', entity: 'account', summary: 'Yanlış şifre' });
          return gate(reply, loginForm(next, 'Şifre doğru değil.'), 401);
        }
        if (user.totpSecret) {
          const t = token(24);
          pending.set(t, { next, expires: Date.now() + 5 * 60_000, tries: 0 });
          for (const [key, v] of pending) if (v.expires < Date.now()) pending.delete(key);
          reply.header('set-cookie', cookie(PENDING_COOKIE, t, { secure: k.secure, maxAge: 300 }));
          return reply.redirect('/panel/login/code', 303);
        }
        return signIn(req, reply, next);
      });

      const codeForm = (error?: string) =>
        html`<div class="p-card">
<p class="p-logo big"><span>lost</span><i aria-hidden="true">|</i><span>comma</span><small class="mono">panel</small></p>
<h1>Doğrulama kodu</h1>
<p>Doğrulama uygulamandaki altı haneli kodu yaz.</p>
${error ? html`<p class="p-errors" role="alert">${error}</p>` : ''}
<form method="post" action="/panel/login/code" class="p-stack">
<div class="p-field"><label for="f-code">Kod</label><input class="p-in p-code-in" id="f-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus></div>
<button class="p-btn" type="submit">Devam et</button>
</form>
<p class="p-hint"><a href="/panel/login">Baştan başla</a></p>
</div>`;

      p.get('/login/code', async (req, reply) => {
        const t = readCookie(req.headers.cookie, PENDING_COOKIE);
        const step = t ? pending.get(t) : undefined;
        if (!step || step.expires < Date.now()) return reply.redirect('/panel/login', 303);
        return gate(reply, codeForm());
      });

      p.post('/login/code', async (req, reply) => {
        const t = readCookie(req.headers.cookie, PENDING_COOKIE);
        const step = t ? pending.get(t) : undefined;
        const user = await getUser(k.db);
        if (!t || !step || step.expires < Date.now() || !user?.totpSecret) return reply.redirect('/panel/login', 303);
        const hit = checkCode(user.totpSecret, str(bodyOf(req), 'code'), k.now(), user.totpLastStep ?? null);
        if (hit === null) {
          step.tries += 1;
          await slow();
          await log(k, req, { action: 'signin-failed', entity: 'account', summary: 'Yanlış doğrulama kodu' });
          if (step.tries >= 5) {
            pending.delete(t);
            return gate(reply, loginForm('/panel', 'Çok fazla yanlış kod. Baştan giriş yap.'), 401);
          }
          return gate(reply, codeForm('Kod doğru değil ya da süresi geçti.'), 401);
        }
        pending.delete(t);
        await k.db.update(panelUser).set({ totpLastStep: hit }).where(eq(panelUser.id, 1));
        return signIn(req, reply, step.next);
      });

      p.post('/logout', async (req, reply) => {
        if (req.panel) {
          await endSession(k.db, req.panel.id);
          await log(k, req, { action: 'signout', entity: 'account', summary: 'Çıkış yapıldı' });
        }
        reply.header('set-cookie', cleared(SESSION_COOKIE, k.secure));
        return reply.redirect('/panel/login?m=out', 303);
      });

      /* ---------------- sections ---------------- */

      registerDashboard(p, k);
      registerStats(p, k);
      registerProjects(p, k);
      registerNotes(p, k);
      registerMedia(p, k);
      registerPeople(p, k);
      registerInbox(p, k);
      registerBookings(p, k);
      registerMail(p, k);
      registerSettings(p, k);
      registerRedirects(p, k);
      registerLog(p, k);
      registerAccount(p, k);
    },
    { prefix: '/panel' },
  );
}

export { back, csrfField };
