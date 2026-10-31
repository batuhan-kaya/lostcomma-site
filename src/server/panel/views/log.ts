/** Kayıt: everything done in the panel · what changed (before and after) · and the way back. */
import type { FastifyInstance } from 'fastify';
import { count, desc, eq } from 'drizzle-orm';
import { audit } from '../../db/schema';
import { html, type Safe } from '../../html';
import { back, log, send, type Kit } from '../kit';
import { briefSnap, noteSnap, personSnap, projectSnap, restore, RestoreError, RESTORABLE, type Snap } from '../snapshot';
import { actionForm, empty, section, timeTag, when } from '../ui';

const ENTITY: Record<string, string> = { project: 'İş', note: 'Not', person: 'Ekip', media: 'Görsel', video: 'Döngü', brief: 'Brief', booking: 'Görüşme', closure: 'Kapalı zaman', outbox: 'E-posta', settings: 'Ayarlar', redirect: 'Yönlendirme', account: 'Hesap' };
const PAGE = 50;

/** Flat key → value pairs of a snapshot (texts become tr.name · en.slug …). */
function flat(v: unknown, path = '', out: Record<string, string> = {}): Record<string, string> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.texts) && 'row' in o) {
      flat(o.row, path, out);
      for (const t of o.texts as Record<string, unknown>[]) flat(Object.fromEntries(Object.entries(t).filter(([key]) => !['projectId', 'noteId', 'personId', 'lang'].includes(key))), `${t.lang}.`, out);
      return out;
    }
    for (const [key, x] of Object.entries(o)) {
      if (x && typeof x === 'object' && !Array.isArray(x) && key !== 'story') flat(x, `${path}${key}.`, out);
      else out[`${path}${key}`] = typeof x === 'string' ? x : JSON.stringify(x);
    }
  }
  return out;
}

function diff(before: unknown, after: unknown): Safe {
  const a = flat(before);
  const b = flat(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => a[key] !== b[key]);
  if (!keys.length) return empty('Görünen bir fark yok.');
  return html`<table class="p-table p-diff"><thead><tr><th>Alan</th><th>Önce</th><th>Sonra</th></tr></thead><tbody>${keys.map(
    (key) => html`<tr><td class="mono">${key}</td><td class="p-was">${(a[key] ?? '—').slice(0, 600)}</td><td class="p-now">${(b[key] ?? '—').slice(0, 600)}</td></tr>`,
  )}</tbody></table>`;
}

export function registerLog(p: FastifyInstance, k: Kit): void {
  p.get('/log', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const entity = q.entity && q.entity in ENTITY ? q.entity : '';
    const pageNo = Math.max(1, Number(q.page) || 1);
    const where = entity ? eq(audit.entity, entity) : undefined;
    const rows = await k.db.select().from(audit).where(where).orderBy(desc(audit.id)).limit(PAGE).offset((pageNo - 1) * PAGE);
    const [total] = await k.db.select({ n: count() }).from(audit).where(where);
    const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
    const now = k.now();
    const link = (n: number) => `/panel/log?${entity ? `entity=${entity}&` : ''}page=${n}`;
    return send(k, req, reply, {
      title: 'Kayıt',
      section: 'log',
      wide: true,
      body: html`<div class="p-toolbar"><nav class="p-tabs" aria-label="Tür"><a href="/panel/log"${!entity ? html` aria-current="page"` : ''}>Hepsi</a>${Object.entries(ENTITY).map(([key, label]) => html`<a href="/panel/log?entity=${key}"${key === entity ? html` aria-current="page"` : ''}>${label}</a>`)}</nav></div>
${
  rows.length
    ? html`<table class="p-table"><thead><tr><th>Ne</th><th>Tür</th><th>Zaman</th><th>IP</th></tr></thead><tbody>${rows.map(
        (a) => html`<tr><td><a class="p-rowlink" href="/panel/log/${a.id}">${a.summary || a.action}</a>${a.before ? html`<small>önceki hali saklı</small>` : ''}</td><td>${ENTITY[a.entity] ?? a.entity}</td><td title="${when(a.at)}">${timeTag(a.at, now)}</td><td class="mono">${a.ip || '—'}</td></tr>`,
      )}</tbody></table>
${pages > 1 ? html`<nav class="p-pager mono" aria-label="Sayfalar">${pageNo > 1 ? html`<a href="${link(pageNo - 1)}">← Yeni</a>` : ''}<span>${pageNo} / ${pages}</span>${pageNo < pages ? html`<a href="${link(pageNo + 1)}">Eski →</a>` : ''}</nav>` : ''}`
    : empty('Henüz kayıt yok.')
}`,
    });
  });

  p.get('/log/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [a] = Number.isInteger(id) ? await k.db.select().from(audit).where(eq(audit.id, id)) : [];
    if (!a) return reply.callNotFound();
    const err = (req.query as Record<string, string>).error;
    const canRestore = RESTORABLE.has(a.entity) && !!a.before;
    const editLink = a.entity === 'project' || a.entity === 'note' ? `/panel/${a.entity}s/${a.entityId}` : a.entity === 'brief' ? `/panel/briefs/${a.entityId}` : null;
    return send(k, req, reply, {
      title: a.summary || a.action,
      section: 'log',
      wide: true,
      crumbs: [{ label: 'Kayıt', href: '/panel/log' }, { label: `#${a.id}` }],
      actions: html`${editLink && a.action !== 'delete' ? html`<a class="p-btn ghost" href="${editLink}">Aç</a>` : ''}${
        canRestore ? actionForm(`/panel/log/${a.id}/restore`, a.action === 'delete' ? 'Geri getir' : 'Bu değişiklikten önceki hale dön', req.panel!.csrf, { confirm: 'Bugünkü hali kayda düşer · bu kayıttaki önceki hal geri gelir. Devam edilsin mi?' }) : ''
      }`,
      body: html`${err ? html`<div class="p-errors" role="alert"><b>Geri alınamadı</b><p>${err}</p></div>` : ''}
<dl class="p-facts"><div><dt>Ne zaman</dt><dd>${when(a.at)}</dd></div><div><dt>İşlem</dt><dd class="mono">${a.action}</dd></div><div><dt>Tür</dt><dd>${ENTITY[a.entity] ?? a.entity}${a.entityId ? ` · ${a.entityId}` : ''}</dd></div><div><dt>IP</dt><dd class="mono">${a.ip || '—'}</dd></div></dl>
${a.before || a.after ? section('Değişiklik', a.before && a.after ? diff(a.before, a.after) : html`<pre class="p-json">${JSON.stringify(a.before ?? a.after, null, 2)}</pre>`) : ''}`,
    });
  });

  p.post('/log/:id/restore', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [a] = Number.isInteger(id) ? await k.db.select().from(audit).where(eq(audit.id, id)) : [];
    if (!a || !a.before) return reply.callNotFound();
    if (a.entity === 'settings') {
      const was = k.settings.snapshot();
      const snap = a.before as Record<string, unknown>;
      for (const key of new Set([...Object.keys(was), ...Object.keys(snap)])) await k.settings.set(key, (snap[key] as never) ?? null).catch(() => undefined);
      await log(k, req, { action: 'restore', entity: 'settings', summary: `Ayarlar geri alındı (kayıt #${a.id})`, before: was, after: k.settings.snapshot() });
      return back(reply, '/panel/settings', 'restored');
    }
    if (!RESTORABLE.has(a.entity)) return reply.callNotFound();
    const snap = a.before as Snap;
    const id2 = a.entityId ?? '';
    const nowState =
      a.entity === 'project' ? await projectSnap(k.db, Number(id2)) : a.entity === 'note' ? await noteSnap(k.db, Number(id2)) : a.entity === 'person' ? await personSnap(k.db, Number(id2)) : await briefSnap(k.db, id2);
    try {
      const notes = await restore(k.db, a.entity, snap);
      await log(k, req, { action: 'restore', entity: a.entity, entityId: a.entityId, summary: `Geri alındı (kayıt #${a.id}): ${a.summary}${notes.length ? ` · ${notes.join(' ')}` : ''}`.slice(0, 300), before: nowState, after: snap });
    } catch (err) {
      return back(reply, `/panel/log/${a.id}?error=${encodeURIComponent(err instanceof RestoreError ? err.message : 'Geri alınamadı.')}`);
    }
    const to = a.entity === 'project' ? `/panel/projects/${a.entityId}` : a.entity === 'note' ? `/panel/notes/${a.entityId}` : a.entity === 'brief' ? `/panel/briefs/${a.entityId}` : '/panel/people';
    return back(reply, to, 'restored');
  });
}
