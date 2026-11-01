/** Gelen kutusu: briefs from the homepage · new · read · answered · archived · a note · reply · delete. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { count, desc, eq } from 'drizzle-orm';
import { BRIEF_BUDGETS, BRIEF_TIMES, HOME } from '../../content/home';
import { briefs } from '../../db/schema';
import { html } from '../../html';
import { back, bodyOf, log, send, str, type Kit } from '../kit';
import { briefSnap } from '../snapshot';
import { journey } from './stats';
import { actionForm, area, badge, csrfField, empty, saveBar, section, select, timeTag, when } from '../ui';

const STATES = [
  { value: 'new', label: 'Yeni' },
  { value: 'read', label: 'Okundu' },
  { value: 'answered', label: 'Yanıtlandı' },
  { value: 'archived', label: 'Arşiv' },
] as const;
const TONE = { new: 'acc', read: 'mute', answered: 'ok', archived: 'mute' } as const;
const TYPES: Record<string, string> = { website: 'Web sitesi', app: 'Uygulama', identity: 'Kimlik', motion: 'Hareket' };
const timeLabel = (k: string | null) => (k ? (HOME.tr.times[BRIEF_TIMES.indexOf(k as (typeof BRIEF_TIMES)[number])]?.n ?? k) : '—');
const budgetLabel = (k: string | null) => (k ? (HOME.tr.budgets[BRIEF_BUDGETS.indexOf(k as (typeof BRIEF_BUDGETS)[number])]?.n ?? k) : '—');

export function registerInbox(p: FastifyInstance, k: Kit): void {
  p.get('/briefs', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const now = k.now();
    const status = STATES.some((s) => s.value === q.status) ? q.status : '';
    const rows = await k.db.select().from(briefs).where(status ? eq(briefs.status, status as 'new') : undefined).orderBy(desc(briefs.createdAt)).limit(300);
    const per = await k.db.select({ s: briefs.status, n: count() }).from(briefs).groupBy(briefs.status);
    const n = (s: string) => per.find((x) => x.s === s)?.n ?? 0;
    return send(k, req, reply, {
      title: 'Gelen kutusu',
      section: 'briefs',
      wide: true,
      body: html`<div class="p-toolbar"><nav class="p-tabs" aria-label="Durum"><a href="/panel/briefs"${!status ? html` aria-current="page"` : ''}>Hepsi · ${per.reduce((a, b) => a + b.n, 0)}</a>${STATES.map((s) => html`<a href="/panel/briefs?status=${s.value}"${s.value === status ? html` aria-current="page"` : ''}>${s.label} · ${n(s.value)}</a>`)}</nav><input class="p-in p-search" type="search" placeholder="Ara · /" aria-label="Brief'lerde ara" data-filter="#briefs"></div>
${
  rows.length
    ? html`<table class="p-table" id="briefs"><thead><tr><th>Kimden</th><th>Ne</th><th>Mesaj</th><th>Durum</th><th>Geldi</th></tr></thead><tbody>${rows.map(
        (b) => html`<tr data-row class="${b.status === 'new' ? 'p-unread' : ''}"><td><a class="p-rowlink" href="/panel/briefs/${b.id}">${b.name || 'İsimsiz'}</a><small>${b.email}</small></td><td>${b.types.map((t) => TYPES[t] ?? t).join(' · ') || '—'}</td><td class="p-clip">${b.message || '—'}</td><td>${badge(STATES.find((s) => s.value === b.status)!.label, TONE[b.status])}</td><td>${timeTag(b.createdAt, now)}</td></tr>`,
      )}</tbody></table>`
    : empty(status ? 'Bu durumda brief yok.' : 'Henüz brief gelmedi. Ana sayfadaki formdan gelenler burada görünür.')
}`,
    });
  });

  const page = async (req: FastifyRequest, reply: FastifyReply, id: string) => {
    const [b] = await k.db.select().from(briefs).where(eq(briefs.id, id));
    if (!b) return reply.callNotFound();
    // Opening a new brief marks it read.
    if (b.status === 'new') {
      await k.db.update(briefs).set({ status: 'read' }).where(eq(briefs.id, id));
      b.status = 'read';
    }
    const csrf = req.panel!.csrf;
    const subject = encodeURIComponent(b.lang === 'tr' ? 'Lost Comma · brief\'in hakkında' : 'Lost Comma · about your brief');
    return send(k, req, reply, {
      title: b.name || b.email,
      section: 'briefs',
      crumbs: [{ label: 'Gelen kutusu', href: '/panel/briefs' }, { label: when(b.createdAt) }],
      actions: html`<a class="p-btn" href="mailto:${b.email}?subject=${subject}">Yanıtla</a>`,
      body: html`<dl class="p-facts">
<div><dt>Kimden</dt><dd>${b.name || 'İsimsiz'} · <a href="mailto:${b.email}">${b.email}</a></dd></div>
<div><dt>Ne</dt><dd>${b.types.map((t) => TYPES[t] ?? t).join(' · ') || '—'}</dd></div>
<div><dt>Ne zaman</dt><dd>${timeLabel(b.time)}</dd></div>
<div><dt>Bütçe</dt><dd>${budgetLabel(b.budget)}</dd></div>
<div><dt>Dil</dt><dd>${b.lang === 'tr' ? 'Türkçe' : 'İngilizce'}</dd></div>
<div><dt>Geldi</dt><dd>${when(b.createdAt)}</dd></div>
</dl>
${section('Mesaj', b.message ? html`<blockquote class="p-quote" lang="${b.lang}">${b.message}</blockquote>` : empty('Mesaj yazılmamış.'))}
${await journey(k.db, b.visitId)}
<form method="post" action="/panel/briefs/${b.id}" class="p-form" data-dirty-guard>${csrfField(csrf)}
<div class="p-cols2">${select('status', 'Durum', b.status, [...STATES])}</div>
${area('note', 'Not', b.note, { rows: 3, hint: 'Sadece sen görürsün. Örnek: Perşembe aradım · teklif gidecek.' })}
${saveBar()}
</form>
${section('Sil', actionForm(`/panel/briefs/${b.id}/delete`, 'Brief\'i sil', csrf, { danger: true, confirm: 'Brief silinsin mi? Kayıtta saklanır ve geri getirilebilir.' }))}`,
    });
  };

  p.get('/briefs/:id', (req, reply) => {
    const id = (req.params as { id: string }).id;
    return /^[0-9a-f-]{36}$/.test(id) ? page(req, reply, id) : reply.callNotFound();
  });

  p.post('/briefs/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const before = /^[0-9a-f-]{36}$/.test(id) ? await briefSnap(k.db, id) : null;
    if (!before) return reply.callNotFound();
    const b = bodyOf(req);
    const status = STATES.find((s) => s.value === str(b, 'status'))?.value ?? (before.row.status as 'new');
    const note = str(b, 'note').trim().slice(0, 4000);
    await k.db.update(briefs).set({ status, note }).where(eq(briefs.id, id));
    if (status !== before.row.status) await log(k, req, { action: 'status', entity: 'brief', entityId: id, summary: `Brief ${String(before.row.name || before.row.email)}: ${STATES.find((s) => s.value === status)!.label}` });
    return back(reply, `/panel/briefs/${id}`, 'saved');
  });

  p.post('/briefs/:id/delete', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const before = /^[0-9a-f-]{36}$/.test(id) ? await briefSnap(k.db, id) : null;
    if (!before) return reply.callNotFound();
    await k.db.delete(briefs).where(eq(briefs.id, id));
    await log(k, req, { action: 'delete', entity: 'brief', entityId: id, summary: `Brief silindi: ${String(before.row.name || before.row.email)}`, before });
    return back(reply, '/panel/briefs', 'deleted');
  });
}
