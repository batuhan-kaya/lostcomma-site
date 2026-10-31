/** Yönlendirmeler: old addresses that now lead somewhere else (made when a slug changes · or by hand). */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { desc } from 'drizzle-orm';
import { addRedirect, removeRedirect, validPath } from '../../data/redirects';
import { redirects } from '../../db/schema';
import { html } from '../../html';
import { back, bodyOf, log, send, str, type Kit } from '../kit';
import { actionForm, csrfField, empty, errorSummary, input, section, timeTag, type Errors } from '../ui';

export function registerRedirects(p: FastifyInstance, k: Kit): void {
  const page = async (req: FastifyRequest, reply: FastifyReply, o: { values?: Record<string, string>; errors?: Errors; status?: number } = {}) => {
    const rows = await k.db.select().from(redirects).orderBy(desc(redirects.createdAt));
    const csrf = req.panel!.csrf;
    const e = o.errors ?? {};
    const now = k.now();
    return send(k, req, reply, {
      title: 'Yönlendirmeler',
      section: 'redirects',
      status: o.status,
      wide: true,
      body: html`<p class="p-hint">Yayındaki bir işin ya da notun adresi değişince eski adres kendiliğinden buraya eklenir. Eski bağlantılar ve arama motorları yeni adrese gider (301).</p>
${
  rows.length
    ? html`<table class="p-table"><thead><tr><th>Eski adres</th><th>Yeni adres</th><th>Kullanıldı</th><th>Eklendi</th><th><span class="sr">İşlem</span></th></tr></thead><tbody>${rows.map(
        (r) => html`<tr><td class="mono">${r.from}</td><td class="mono"><a href="${r.to}" target="_blank" rel="noopener">${r.to}</a></td><td>${r.hits}</td><td>${timeTag(r.createdAt, now)}</td><td class="p-end">${actionForm('/panel/redirects/delete', 'Kaldır', csrf, { ghost: true, confirm: 'Bu yönlendirme kaldırılsın mı? Eski adres 404 verir.', fields: html`<input type="hidden" name="from" value="${r.from}">` })}</td></tr>`,
      )}</tbody></table>`
    : empty('Henüz yönlendirme yok.')
}
${section(
  'Elle ekle',
  html`${errorSummary(e)}<form method="post" action="/panel/redirects" class="p-form">${csrfField(csrf)}<div class="p-cols2">
${input('from', 'Eski adres', o.values?.from ?? '', { required: true, error: e.from, attrs: html` placeholder="/tr/isler/eski-ad"` })}
${input('to', 'Yeni adres', o.values?.to ?? '', { required: true, error: e.to, attrs: html` placeholder="/tr/isler/yeni-ad"` })}
</div><div class="p-row"><button class="p-btn" type="submit">Ekle</button></div></form>`,
  { hint: 'Adresler /tr ya da /en ile başlar · küçük harf · rakam · tire.' },
)}`,
    });
  };

  p.get('/redirects', (req, reply) => page(req, reply));

  p.post('/redirects', async (req, reply) => {
    const b = bodyOf(req);
    const from = str(b, 'from').trim().replace(/\/+$/, '');
    const to = str(b, 'to').trim().replace(/\/+$/, '');
    const e: Errors = {};
    if (!validPath(from)) e.from = 'Adres /tr ya da /en ile başlamalı (küçük harf · rakam · tire).';
    if (!validPath(to)) e.to = 'Adres /tr ya da /en ile başlamalı (küçük harf · rakam · tire).';
    if (!e.from && from === to) e.to = 'Eski ve yeni adres aynı.';
    if (Object.keys(e).length) return page(req, reply, { values: { from, to }, errors: e, status: 422 });
    await addRedirect(k.db, from, to);
    await log(k, req, { action: 'create', entity: 'redirect', entityId: from, summary: `Yönlendirme: ${from} → ${to}` });
    return back(reply, '/panel/redirects', 'redirect');
  });

  p.post('/redirects/delete', async (req, reply) => {
    const from = str(bodyOf(req), 'from');
    await removeRedirect(k.db, from);
    await log(k, req, { action: 'delete', entity: 'redirect', entityId: from, summary: `Yönlendirme kaldırıldı: ${from}` });
    return back(reply, '/panel/redirects', 'redirect-gone');
  });
}
