/** Pano: what needs us today · the launch checklist · what changed lately. */
import type { FastifyInstance } from 'fastify';
import { and, asc, count, desc, eq, gte, isNull, lte, gt } from 'drizzle-orm';
import { audit, bookings, briefs, notes, outbox, projects } from '../../db/schema';
import { html } from '../../html';
import { cityOf, localHm } from '../../../shared/booking';
import { readiness } from '../checklist';
import { send, type Kit } from '../kit';
import { badge, empty, section, timeTag, when } from '../ui';

export function registerDashboard(p: FastifyInstance, k: Kit): void {
  p.get('/', async (req, reply) => {
    const db = k.db;
    const now = k.now();
    const [calls, fresh, recent, checks] = await Promise.all([
      db.select().from(bookings).where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, new Date(now.getTime() - 3_600_000)))).orderBy(asc(bookings.startsAt)).limit(5),
      db.select().from(briefs).where(eq(briefs.status, 'new')).orderBy(desc(briefs.createdAt)).limit(5),
      db.select().from(audit).orderBy(desc(audit.id)).limit(8),
      readiness(k),
    ]);
    const stat = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
    const [live, drafts, published, waiting, failed] = await Promise.all([
      stat(db.select({ n: count() }).from(projects).where(eq(projects.status, 'live'))),
      stat(db.select({ n: count() }).from(projects).where(eq(projects.status, 'draft'))),
      stat(db.select({ n: count() }).from(notes).where(lte(notes.publishedAt, now))),
      stat(db.select({ n: count() }).from(notes).where(isNull(notes.publishedAt))),
      stat(db.select({ n: count() }).from(outbox).where(eq(outbox.status, 'failed'))),
    ]);
    const scheduled = await stat(db.select({ n: count() }).from(notes).where(gt(notes.publishedAt, now)));
    const must = checks.filter((c) => c.kind === 'must');
    const done = must.filter((c) => c.ok).length;
    const pct = Math.round((done / Math.max(1, must.length)) * 100);

    return send(k, req, reply, {
      title: 'Pano',
      section: 'home',
      wide: true,
      body: html`
<div class="p-stats">
<a class="p-stat" href="/panel/briefs"><span class="mono">Yeni brief</span><b>${fresh.length}</b><small>${fresh[0] ? `Son: ${fresh[0].name || fresh[0].email}` : 'Gelen kutusu boş'}</small></a>
<a class="p-stat" href="/panel/bookings"><span class="mono">Yaklaşan görüşme</span><b>${calls.length}</b><small>${calls[0] ? `İlk: ${when(calls[0].startsAt)}` : 'Takvim boş'}</small></a>
<a class="p-stat${failed ? ' bad' : ''}" href="/panel/mail${failed ? '?status=failed' : ''}"><span class="mono">E-posta</span><b>${failed ? failed : k.postman.on ? 'Açık' : 'Kapalı'}</b><small>${failed ? 'gönderilemedi' : k.postman.on ? 'Bildirimler gidiyor' : 'MAIL_URL boş'}</small></a>
<a class="p-stat" href="/panel/projects"><span class="mono">İşler</span><b>${live}</b><small>yayında · ${drafts} taslak</small></a>
<a class="p-stat" href="/panel/notes"><span class="mono">Notlar</span><b>${published}</b><small>yayında · ${waiting} taslak${scheduled ? ` · ${scheduled} zamanlanmış` : ''}</small></a>
</div>
<div class="p-grid2">
${section(
  'Yayına hazırlık',
  html`<progress class="p-progress" max="100" value="${pct}" aria-label="Yayına hazırlık">${pct}%</progress>
<p class="p-hint">${done} / ${must.length} hazır</p>
<ul class="p-checks2">${checks.map(
    (c) => html`<li class="${c.ok ? 'ok' : c.kind}"><a href="${c.href}"><i aria-hidden="true"></i><span><b>${c.label}</b><small>${c.detail}</small></span>${c.kind === 'tip' && !c.ok ? badge('öneri', 'mute') : ''}<span class="sr">${c.ok ? 'tamam' : 'eksik'}</span></a></li>`,
  )}</ul>`,
  { id: 'ready' },
)}
<div>
${section(
  'Yaklaşan görüşmeler',
  calls.length
    ? html`<ul class="p-list">${calls.map(
        (b) => html`<li><a href="/panel/bookings/${b.id}"><b>${when(b.startsAt)}</b><span>${b.name} · ${b.email}</span>${b.tz !== 'Europe/Istanbul' ? html`<small class="mono">${localHm(b.startsAt, b.tz)} ${cityOf(b.tz)}</small>` : ''}</a></li>`,
      )}</ul>`
    : empty('Yaklaşan görüşme yok.'),
  { aside: html`<a class="p-more mono" href="/panel/bookings">Hepsi →</a>` },
)}
${section(
  'Yeni brief\'ler',
  fresh.length
    ? html`<ul class="p-list">${fresh.map((b) => html`<li><a href="/panel/briefs/${b.id}"><b>${b.name || b.email}</b><span>${b.message.slice(0, 90) || '(mesaj yok)'}</span><small>${timeTag(b.createdAt, now)}</small></a></li>`)}</ul>`
    : empty('Yeni brief yok.'),
  { aside: html`<a class="p-more mono" href="/panel/briefs">Gelen kutusu →</a>` },
)}
${section(
  'Son değişiklikler',
  recent.length ? html`<ul class="p-list tight">${recent.map((a) => html`<li><a href="/panel/log/${a.id}"><span>${a.summary}</span><small>${timeTag(a.at, now)}</small></a></li>`)}</ul>` : empty('Henüz bir şey yok.'),
  { aside: html`<a class="p-more mono" href="/panel/log">Kayıt →</a>` },
)}
</div>
</div>`,
    });
  });
}
