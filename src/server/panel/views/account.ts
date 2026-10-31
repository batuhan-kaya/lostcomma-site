/** Hesap: password · two-step sign in (TOTP with a QR code) · signed-in browsers. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { panelSessions, panelUser } from '../../db/schema';
import { html, raw } from '../../html';
import { endOtherSessions, endSession, getUser, passwordProblem, setPassword, verifyPassword } from '../auth';
import { back, bodyOf, log, send, str, type Kit } from '../kit';
import { checkCode, grouped, newSecret, otpauthUrl, stepOf } from '../totp';
import { actionForm, badge, csrfField, errorSummary, input, section, timeTag, type Errors } from '../ui';

function browser(agent: string): string {
  const os = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Mac OS X/.test(agent) ? 'macOS' : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : '';
  const b = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Tarayıcı';
  return [b, os].filter(Boolean).join(' · ');
}

export function registerAccount(p: FastifyInstance, k: Kit): void {
  const page = async (req: FastifyRequest, reply: FastifyReply, o: { pwErrors?: Errors; totpError?: string; status?: number } = {}) => {
    const user = (await getUser(k.db))!;
    const csrf = req.panel!.csrf;
    const now = k.now();
    const sessions = await k.db.select().from(panelSessions).orderBy(desc(panelSessions.seenAt));
    let totp = html``;
    if (user.totpSecret) {
      totp = html`<p>${badge('Açık', 'ok')} Girişte şifreden sonra doğrulama kodu soruluyor.</p>
<form method="post" action="/panel/account/totp/off" class="p-form narrow" data-confirm="İki adımlı doğrulama kapansın mı?">${csrfField(csrf)}
${input('password', 'Şifre', '', { type: 'password', required: true, attrs: html` autocomplete="current-password"` })}
${input('code', 'Şu anki kod', '', { required: true, attrs: html` inputmode="numeric" autocomplete="one-time-code"`, error: o.totpError })}
<button class="p-btn danger" type="submit">Kapat</button></form>`;
    } else if (user.totpPending) {
      const svg = await QRCode.toString(otpauthUrl(user.totpPending, 'panel'), { type: 'svg', margin: 1, color: { dark: '#0E0E0F', light: '#FFFFFF' } });
      totp = html`<div class="p-totp"><div class="p-qr" aria-label="QR kod">${raw(svg)}</div><div>
<ol class="p-steps"><li>Doğrulama uygulamasını aç (Google Authenticator · 1Password · Authy).</li><li>QR kodu okut ya da anahtarı elle yaz.</li><li>Uygulamanın gösterdiği altı haneli kodu buraya yaz.</li></ol>
<p class="mono p-key">${grouped(user.totpPending)}</p>
<form method="post" action="/panel/account/totp/confirm" class="p-form narrow">${csrfField(csrf)}
${input('code', 'Kod', '', { required: true, attrs: html` inputmode="numeric" autocomplete="one-time-code"`, error: o.totpError })}
<div class="p-row"><button class="p-btn" type="submit">Doğrula ve aç</button></div></form>
${actionForm('/panel/account/totp/cancel', 'Vazgeç', csrf, { ghost: true })}
</div></div>`;
    } else {
      totp = html`<p>${badge('Kapalı', 'warn')} Şifre çalınsa bile panele girilemesin diye telefondaki bir koda bağlanabilir.</p>${actionForm('/panel/account/totp/start', 'İki adımlı doğrulamayı kur', csrf)}`;
    }
    const pw = o.pwErrors ?? {};
    return send(k, req, reply, {
      title: 'Hesap',
      section: 'account',
      status: o.status,
      body: html`
${section(
  'Şifre',
  html`${errorSummary(pw)}<form method="post" action="/panel/account/password" class="p-form narrow">${csrfField(csrf)}
${input('current', 'Şu anki şifre', '', { type: 'password', required: true, error: pw.current, attrs: html` autocomplete="current-password"` })}
${input('next', 'Yeni şifre', '', { type: 'password', required: true, error: pw.next, hint: 'En az 12 karakter. Bir cümle iyi bir şifredir.', attrs: html` autocomplete="new-password" minlength="12"` })}
${input('again', 'Yeni şifre (tekrar)', '', { type: 'password', required: true, error: pw.again, attrs: html` autocomplete="new-password"` })}
<div class="p-row"><button class="p-btn" type="submit">Şifreyi değiştir</button></div></form>`,
  { hint: `Son değişiklik: ${user.updatedAt.toLocaleDateString('tr-TR')}. Değişince diğer bütün oturumlar kapanır.` },
)}
${section('İki adımlı doğrulama', totp, { id: 'totp' })}
${section(
  'Açık oturumlar',
  html`<table class="p-table"><thead><tr><th>Tarayıcı</th><th>IP</th><th>Açıldı</th><th>Son görülme</th><th><span class="sr">İşlem</span></th></tr></thead><tbody>${sessions.map(
    (s) => html`<tr><td>${browser(s.agent)}${s.id === req.panel!.id ? html` ${badge('Bu tarayıcı', 'acc')}` : ''}</td><td class="mono">${s.ip || '—'}</td><td>${timeTag(s.createdAt, now)}</td><td>${timeTag(s.seenAt, now)}</td><td class="p-end">${s.id === req.panel!.id ? '' : actionForm(`/panel/account/sessions/${encodeURIComponent(s.id)}/end`, 'Kapat', csrf, { ghost: true })}</td></tr>`,
  )}</tbody></table>
${sessions.length > 1 ? actionForm('/panel/account/sessions/others', 'Diğer bütün oturumları kapat', csrf, { confirm: 'Bu tarayıcı dışındaki bütün oturumlar kapansın mı?', danger: true }) : ''}`,
  { hint: 'Bir gün hiç kullanılmayan oturum kendiliğinden kapanır. En uzun ömür iki hafta.' },
)}`,
    });
  };

  p.get('/account', (req, reply) => page(req, reply));

  p.post('/account/password', async (req, reply) => {
    const b = bodyOf(req);
    const user = (await getUser(k.db))!;
    const errors: Errors = {};
    if (!(await verifyPassword(str(b, 'current'), user.passwordHash))) errors.current = 'Şu anki şifre doğru değil.';
    const problem = passwordProblem(str(b, 'next'));
    if (problem) errors.next = problem;
    else if (str(b, 'next') !== str(b, 'again')) errors.again = 'İki yeni şifre aynı değil.';
    else if (str(b, 'next') === str(b, 'current')) errors.next = 'Yeni şifre eskisiyle aynı.';
    if (Object.keys(errors).length) return page(req, reply, { pwErrors: errors, status: 422 });
    await setPassword(k.db, str(b, 'next'));
    await endOtherSessions(k.db, req.panel!.id);
    await log(k, req, { action: 'password', entity: 'account', summary: 'Şifre değişti' });
    return back(reply, '/panel/account', 'password');
  });

  p.post('/account/totp/start', async (req, reply) => {
    await k.db.update(panelUser).set({ totpPending: newSecret() }).where(eq(panelUser.id, 1));
    return back(reply, '/panel/account#totp');
  });

  p.post('/account/totp/cancel', async (req, reply) => {
    await k.db.update(panelUser).set({ totpPending: null }).where(eq(panelUser.id, 1));
    return back(reply, '/panel/account#totp');
  });

  p.post('/account/totp/confirm', async (req, reply) => {
    const user = (await getUser(k.db))!;
    if (!user.totpPending) return back(reply, '/panel/account#totp');
    const hit = checkCode(user.totpPending, str(bodyOf(req), 'code'), k.now(), null);
    if (hit === null) return page(req, reply, { totpError: 'Kod doğru değil. Saatin doğru olduğundan emin ol ve yeni kodu dene.', status: 422 });
    await k.db.update(panelUser).set({ totpSecret: user.totpPending, totpPending: null, totpLastStep: hit }).where(eq(panelUser.id, 1));
    await log(k, req, { action: 'totp-on', entity: 'account', summary: 'İki adımlı doğrulama açıldı' });
    return back(reply, '/panel/account', 'totp-on');
  });

  p.post('/account/totp/off', async (req, reply) => {
    const b = bodyOf(req);
    const user = (await getUser(k.db))!;
    const okPw = await verifyPassword(str(b, 'password'), user.passwordHash);
    const okCode = user.totpSecret ? checkCode(user.totpSecret, str(b, 'code'), k.now(), user.totpLastStep ?? null) : null;
    if (!okPw || okCode === null) return page(req, reply, { totpError: 'Şifre ya da kod doğru değil.', status: 422 });
    await k.db.update(panelUser).set({ totpSecret: null, totpPending: null, totpLastStep: null }).where(eq(panelUser.id, 1));
    await log(k, req, { action: 'totp-off', entity: 'account', summary: 'İki adımlı doğrulama kapandı' });
    return back(reply, '/panel/account', 'totp-off');
  });

  p.post('/account/sessions/others', async (req, reply) => {
    const n = await endOtherSessions(k.db, req.panel!.id);
    await log(k, req, { action: 'signout-others', entity: 'account', summary: `${n} oturum kapatıldı` });
    return back(reply, '/panel/account', 'others');
  });

  p.post('/account/sessions/:id/end', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    if (id !== req.panel!.id) await endSession(k.db, id);
    return back(reply, '/panel/account', 'ended');
  });

  void stepOf;
}
