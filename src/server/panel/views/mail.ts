/** E-postalar: the outbox · sent · waiting · failed (with the error) · try again · a test message. */
import type { FastifyInstance } from 'fastify';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { outbox } from '../../db/schema';
import { html } from '../../html';
import { enqueue } from '../../mail';
import { back, bodyOf, EMAIL_RE, log, send, str, type Kit } from '../kit';
import { actionForm, badge, csrfField, empty, input, section, timeTag, when } from '../ui';

const STATE = { pending: badge('Bekliyor', 'acc'), sent: badge('Gitti', 'ok'), failed: badge('Gitmedi', 'bad'), skipped: badge('Atlandı', 'mute') } as const;
const KIND: Record<string, string> = { brief: 'Brief bildirimi', booking: 'Görüşme bildirimi', 'booking-guest': 'Görüşme onayı', 'booking-cancel': 'Görüşme iptali', test: 'Deneme' };

export function registerMail(p: FastifyInstance, k: Kit): void {
  p.get('/mail', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const now = k.now();
    const status = ['pending', 'sent', 'failed', 'skipped'].includes(q.status ?? '') ? (q.status as 'pending' | 'sent' | 'failed' | 'skipped') : null;
    const rows = await k.db.select().from(outbox).where(status ? eq(outbox.status, status) : undefined).orderBy(desc(outbox.id)).limit(200);
    const per = await k.db.select({ s: outbox.status, n: count() }).from(outbox).groupBy(outbox.status);
    const n = (s: string) => per.find((x) => x.s === s)?.n ?? 0;
    const csrf = req.panel!.csrf;
    return send(k, req, reply, {
      title: 'E-postalar',
      section: 'mail',
      wide: true,
      body: html`
<div class="p-note${k.postman.on ? '' : ' warn'}">${
        k.postman.on
          ? html`<b>E-posta açık.</b><p>Brief ve görüşme bildirimleri <span class="mono">${k.config.MAIL_TO}</span> adresine · onaylar ziyaretçiye gidiyor. Gönderen: <span class="mono">${k.config.MAIL_FROM}</span></p>`
          : html`<b>E-posta kapalı.</b><p>MAIL_URL boş: hiçbir şey gönderilmiyor ama hiçbir şey de kaybolmuyor · mesajlar burada bekliyor. Sunucuda MAIL_URL ayarlanınca bekleyenler iki gün içindeyse gönderilir.</p>`
      }</div>
<div class="p-toolbar"><nav class="p-tabs" aria-label="Durum"><a href="/panel/mail"${!status ? html` aria-current="page"` : ''}>Hepsi</a><a href="/panel/mail?status=failed"${status === 'failed' ? html` aria-current="page"` : ''}>Gitmedi · ${n('failed')}</a><a href="/panel/mail?status=pending"${status === 'pending' ? html` aria-current="page"` : ''}>Bekliyor · ${n('pending')}</a><a href="/panel/mail?status=sent"${status === 'sent' ? html` aria-current="page"` : ''}>Gitti · ${n('sent')}</a><a href="/panel/mail?status=skipped"${status === 'skipped' ? html` aria-current="page"` : ''}>Atlandı · ${n('skipped')}</a></nav>
${n('failed') || n('pending') ? actionForm('/panel/mail/retry', 'Bekleyenleri ve gitmeyenleri şimdi dene', csrf, { ghost: true }) : ''}</div>
${
  rows.length
    ? html`<table class="p-table"><thead><tr><th>Konu</th><th>Kime</th><th>Tür</th><th>Durum</th><th>Zaman</th></tr></thead><tbody>${rows.map(
        (m) => html`<tr><td><a class="p-rowlink" href="/panel/mail/${m.id}">${m.subject}</a>${m.lastError ? html`<small class="p-errtext">${m.lastError}</small>` : ''}</td><td class="mono">${m.to}</td><td>${KIND[m.kind] ?? m.kind}</td><td>${STATE[m.status]}${m.tries > 1 ? html` <small>${m.tries} deneme</small>` : ''}</td><td>${timeTag(m.sentAt ?? m.createdAt, now)}</td></tr>`,
      )}</tbody></table>`
    : empty('Henüz e-posta yok.')
}
${section(
  'Deneme e-postası',
  html`<form method="post" action="/panel/mail/test" class="p-form narrow">${csrfField(csrf)}${input('to', 'Kime', k.config.MAIL_TO, { type: 'email', required: true })}<div class="p-row"><button class="p-btn" type="submit">Gönder</button></div></form>`,
  { hint: 'Ayarların doğru olup olmadığını görmek için. Gelmezse listede hatasıyla görünür.' },
)}`,
    });
  });

  p.get('/mail/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [m] = Number.isInteger(id) ? await k.db.select().from(outbox).where(eq(outbox.id, id)) : [];
    if (!m) return reply.callNotFound();
    const csrf = req.panel!.csrf;
    return send(k, req, reply, {
      title: m.subject,
      section: 'mail',
      crumbs: [{ label: 'E-postalar', href: '/panel/mail' }, { label: `#${m.id}` }],
      actions: m.status === 'failed' || m.status === 'pending' || m.status === 'skipped' ? actionForm(`/panel/mail/${m.id}/retry`, 'Tekrar dene', csrf) : undefined,
      body: html`<dl class="p-facts">
<div><dt>Durum</dt><dd>${STATE[m.status]} · ${m.tries} deneme</dd></div>
<div><dt>Kime</dt><dd class="mono">${m.to}</dd></div>
<div><dt>Yanıt</dt><dd class="mono">${m.replyTo ?? '—'}</dd></div>
<div><dt>Tür</dt><dd>${KIND[m.kind] ?? m.kind}${m.ics ? ' · takvim dosyası ekli' : ''}</dd></div>
<div><dt>Oluştu</dt><dd>${when(m.createdAt)}</dd></div>
<div><dt>Gitti</dt><dd>${m.sentAt ? when(m.sentAt) : '—'}</dd></div>
</dl>
${m.lastError ? html`<div class="p-note bad"><b>Son hata</b><p class="mono">${m.lastError}</p></div>` : ''}
${section('Metin', html`<pre class="p-mailtext">${m.text}</pre>`)}`,
    });
  });

  const retry = async (ids: number[] | null) => {
    const q = k.db.update(outbox).set({ status: 'pending', tries: 0, lastError: null, createdAt: k.now() });
    await (ids ? q.where(inArray(outbox.id, ids)) : q.where(inArray(outbox.status, ['failed', 'pending', 'skipped'])));
    void k.postman.kick(true).catch(() => undefined);
  };

  p.post('/mail/:id/retry', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    await retry([id]);
    await log(k, req, { action: 'retry', entity: 'outbox', entityId: id, summary: `E-posta tekrar denendi: #${id}` });
    return back(reply, `/panel/mail/${id}`, 'retried');
  });

  p.post('/mail/retry', async (req, reply) => {
    await retry(null);
    await log(k, req, { action: 'retry', entity: 'outbox', summary: 'Bekleyen e-postalar tekrar denendi' });
    return back(reply, '/panel/mail', 'retried');
  });

  p.post('/mail/test', async (req, reply) => {
    const to = str(bodyOf(req), 'to').trim();
    if (!EMAIL_RE.test(to)) return back(reply, '/panel/mail');
    await enqueue(k.db, [{ kind: 'test', to, subject: 'Lost Comma · deneme', text: 'Bu bir deneme. Bunu okuyorsan e-posta ayarları doğru.\n\nLost Comma panel' }], k.now());
    void k.postman.kick().catch(() => undefined);
    await log(k, req, { action: 'test', entity: 'outbox', summary: `Deneme e-postası: ${to}` });
    return back(reply, '/panel/mail', 'test');
  });
}
