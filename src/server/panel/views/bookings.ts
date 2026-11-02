/**
 * Görüşmeler: upcoming and past calls · a private note · cancel (the slot opens again · the visitor
 * can get a message in their language with a calendar cancellation) · closed days and hours.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, desc, eq, gte, lt, or } from 'drizzle-orm';
import { closures, bookings } from '../../db/schema';
import { upcomingClosures } from '../../data/closures';
import { ticketNo } from '../../data/bookings';
import { html } from '../../html';
import { enqueue } from '../../mail';
import { cancelMail } from '../../mail/messages';
import { href } from '../../routes';
import { cityOf, hm, istDay, istInstant, localHm } from '../../../shared/booking';
import { back, bodyOf, log, send, str, type Kit } from '../kit';
import { actionForm, area, badge, csrfField, empty, errorSummary, input, saveBar, section, timeTag, toggle, when, type Errors } from '../ui';
import { journey } from './stats';

const ABOUT: Record<string, string> = { website: 'Web sitesi', app: 'Uygulama', identity: 'Kimlik', motion: 'Hareket', unsure: 'Emin değil' };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = (v: string) => {
  const m = TIME_RE.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const dayName = (day: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

export function registerBookings(p: FastifyInstance, k: Kit): void {
  const list = async (req: FastifyRequest, reply: FastifyReply, o: { errors?: Errors; values?: Record<string, string>; status?: number } = {}) => {
    const now = k.now();
    const soon = await k.db.select().from(bookings).where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, new Date(now.getTime() - 3_600_000)))).orderBy(asc(bookings.startsAt));
    const past = await k.db.select().from(bookings).where(or(lt(bookings.startsAt, new Date(now.getTime() - 3_600_000)), eq(bookings.status, 'cancelled'))).orderBy(desc(bookings.startsAt)).limit(60);
    const closed = await upcomingClosures(k.db, now);
    const csrf = req.panel!.csrf;
    const e = o.errors ?? {};
    const v = o.values ?? {};
    const affected = Number((req.query as Record<string, string>).affected ?? 0);
    const row = (b: typeof bookings.$inferSelect) =>
      html`<tr data-row><td><a class="p-rowlink" href="/panel/bookings/${b.id}">${when(b.startsAt)}</a><small>${b.tz !== 'Europe/Istanbul' ? `${localHm(b.startsAt, b.tz)} ${cityOf(b.tz)}` : 'İstanbul'}</small></td><td>${b.name}<small>${b.email}</small></td><td>${b.about.map((a) => ABOUT[a] ?? a).join(' · ') || '—'}</td><td>${b.status === 'cancelled' ? badge('İptal', 'bad') : b.startsAt < now ? badge('Geçti', 'mute') : badge('Ayrıldı', 'ok')}${b.staffNote ? html` ${badge('not', 'mute')}` : ''}</td><td class="mono">${ticketNo(b.no)}</td></tr>`;
    return send(k, req, reply, {
      title: 'Görüşmeler',
      section: 'bookings',
      status: o.status,
      wide: true,
      actions: html`<a class="p-btn ghost" href="${href('tr', 'start')}" target="_blank" rel="noopener">Başla sayfası ↗</a>`,
      body: html`
${affected ? html`<div class="p-note warn"><b>Bu kapalı aralıkta ${affected} görüşme var.</b><p>Kendiliğinden iptal edilmedi. Aşağıdan açıp tek tek iptal edebilirsin.</p></div>` : ''}
${section(
  'Yaklaşan',
  soon.length
    ? html`<table class="p-table"><thead><tr><th>Zaman</th><th>Kim</th><th>Konu</th><th>Durum</th><th>Bilet</th></tr></thead><tbody>${soon.map(row)}</tbody></table>`
    : empty('Yaklaşan görüşme yok.'),
)}
${section(
  'Kapalı günler ve saatler',
  html`${
    closed.length
      ? html`<ul class="p-list tight">${closed.map(
          (c) => html`<li><span><b>${dayName(c.day)}</b> · ${c.fromMin === null ? 'bütün gün' : `${hm(c.fromMin)} ile ${hm(c.toMin!)}`}${c.reason ? ` · ${c.reason}` : ''}</span>${actionForm(`/panel/closures/${c.id}/delete`, 'Kaldır', csrf, { ghost: true })}</li>`,
        )}</ul>`
      : empty('Kapalı gün yok. Bütün iş günleri 10:30 ile 17:00 arası açık.')
  }
${errorSummary(e)}
<form method="post" action="/panel/closures" class="p-form p-closure">${csrfField(csrf)}
<div class="p-cols4">
${input('day', 'Gün', v.day ?? '', { type: 'date', required: true, error: e.day, attrs: html` min="${istDay(new Date(k.now().getTime() + 86_400_000))}"` })}
${input('from', 'Başlangıç', v.from ?? '', { type: 'time', error: e.from, hint: 'Boşsa bütün gün', attrs: html` step="1800"` })}
${input('to', 'Bitiş', v.to ?? '', { type: 'time', error: e.to, attrs: html` step="1800"` })}
${input('reason', 'Sebep', v.reason ?? '', { hint: 'Sadece sen görürsün', attrs: html` maxlength="120"` })}
</div>
<div class="p-row"><button class="p-btn" type="submit">Kapat</button></div>
</form>`,
  { id: 'closed', hint: 'Bütün gün kapalıysa o gün Başla sayfasından çıkar ve yerine bir sonraki iş günü gelir. Saat aralığı kapalıysa o saatler dolu görünür.' },
)}
${section('Geçmiş ve iptal', past.length ? html`<table class="p-table"><thead><tr><th>Zaman</th><th>Kim</th><th>Konu</th><th>Durum</th><th>Bilet</th></tr></thead><tbody>${past.map(row)}</tbody></table>` : empty('Henüz geçmiş görüşme yok.'))}`,
    });
  };

  p.get('/bookings', (req, reply) => list(req, reply));

  p.post('/closures', async (req, reply) => {
    const b = bodyOf(req);
    const values = { day: str(b, 'day'), from: str(b, 'from'), to: str(b, 'to'), reason: str(b, 'reason').trim().slice(0, 120) };
    const e: Errors = {};
    const today = istDay(k.now());
    if (!DAY_RE.test(values.day)) e.day = 'Bir gün seç.';
    else if (values.day <= today) e.day = 'Bugünden sonraki bir gün seç. Bugün zaten randevu alınamıyor.';
    const from = values.from ? toMin(values.from) : null;
    const to = values.to ? toMin(values.to) : null;
    if (values.from && from === null) e.from = 'Saat okunamadı.';
    if (values.to && to === null) e.to = 'Saat okunamadı.';
    if ((from === null) !== (to === null) && !e.from && !e.to) e.to = 'Başlangıç ve bitişi birlikte yaz · ya da ikisini de boş bırak.';
    if (from !== null && to !== null && from >= to) e.to = 'Bitiş başlangıçtan sonra olmalı.';
    if (Object.keys(e).length) return list(req, reply, { errors: e, values, status: 422 });
    const [row] = await k.db.insert(closures).values({ day: values.day, fromMin: from, toMin: to, reason: values.reason }).returning();
    const start = istInstant(values.day, from ?? 0);
    const end = istInstant(values.day, to ?? 1440);
    const hit = await k.db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, new Date(start.getTime() - 20 * 60_000)), lt(bookings.startsAt, end)));
    await log(k, req, { action: 'create', entity: 'closure', entityId: row!.id, summary: `Kapalı: ${dayName(values.day)}${from !== null ? ` ${values.from} ile ${values.to}` : ' bütün gün'}`, after: row });
    return back(reply, `/panel/bookings${hit.length ? `?affected=${hit.length}` : ''}#closed`, 'closure');
  });

  p.post('/closures/:id/delete', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [row] = Number.isInteger(id) ? await k.db.delete(closures).where(eq(closures.id, id)).returning() : [];
    if (row) await log(k, req, { action: 'delete', entity: 'closure', entityId: id, summary: `Kapalı zaman kaldırıldı: ${dayName(row.day)}`, before: row });
    return back(reply, '/panel/bookings#closed', 'closure-gone');
  });

  const one = async (req: FastifyRequest, reply: FastifyReply, id: string) => {
    const [b] = /^[0-9a-f-]{36}$/.test(id) ? await k.db.select().from(bookings).where(eq(bookings.id, id)) : [];
    if (!b) return reply.callNotFound();
    const now = k.now();
    const csrf = req.panel!.csrf;
    const startPath = href(b.lang, 'start');
    return send(k, req, reply, {
      title: `${b.name} · ${when(b.startsAt)}`,
      section: 'bookings',
      crumbs: [{ label: 'Görüşmeler', href: '/panel/bookings' }, { label: ticketNo(b.no) }],
      actions: html`<a class="p-btn" href="mailto:${b.email}">E-posta yaz</a><a class="p-btn ghost" href="/api/booking/${b.token}.ics" download="lost-comma.ics">Takvim dosyası</a>`,
      body: html`<dl class="p-facts">
<div><dt>Durum</dt><dd>${b.status === 'cancelled' ? html`${badge('İptal', 'bad')} ${b.cancelledAt ? when(b.cancelledAt) : ''}` : b.startsAt < now ? badge('Geçti', 'mute') : badge('Ayrıldı', 'ok')}</dd></div>
<div><dt>İstanbul</dt><dd>${when(b.startsAt)} · ${b.minutes} dk</dd></div>
<div><dt>Onun saati</dt><dd>${localHm(b.startsAt, b.tz)} · ${cityOf(b.tz)} <span class="mono">${b.tz}</span></dd></div>
<div><dt>Kim</dt><dd>${b.name} · <a href="mailto:${b.email}">${b.email}</a></dd></div>
<div><dt>Konu</dt><dd>${b.about.map((a) => ABOUT[a] ?? a).join(' · ') || '—'}</dd></div>
<div><dt>Dil</dt><dd>${b.lang === 'tr' ? 'Türkçe' : 'İngilizce'}</dd></div>
<div><dt>Ayrıldı</dt><dd>${timeTag(b.createdAt, now)}</dd></div>
<div><dt>Bilet</dt><dd class="mono">${ticketNo(b.no)}</dd></div>
</dl>
${section('Notu', b.note ? html`<blockquote class="p-quote" lang="${b.lang}">${b.note}</blockquote>` : empty('Not bırakmamış.'))}
${await journey(k.db, b.visitId)}
<form method="post" action="/panel/bookings/${b.id}" class="p-form" data-dirty-guard>${csrfField(csrf)}
${area('staffNote', 'Bizim notumuz', b.staffNote, { rows: 3, hint: 'Sadece sen görürsün. Örnek: sitesi WordPress · bütçe net değil.' })}
${saveBar()}
</form>
${
  b.status === 'booked' && b.startsAt > now
    ? section(
        'İptal et',
        html`<form method="post" action="/panel/bookings/${b.id}/cancel" class="p-form" data-confirm="Görüşme iptal edilsin mi? Saat yeniden açılır.">${csrfField(csrf)}
${toggle('notify', `${b.name} kişisine iptal e-postası gönder`, true, `${b.lang === 'tr' ? 'Türkçe' : 'İngilizce'} · takvimden de silinir · yeni saat için Başla sayfasının bağlantısı`)}
${area('message', 'E-postaya eklenecek bir cümle', '', { rows: 2, copy: true, hint: 'İsteğe bağlı. Örnek: O gün bir hastalık çıktı. Virgüller · işaretine döner (marka kuralı).' })}
<div class="p-row"><button class="p-btn danger" type="submit">Görüşmeyi iptal et</button></div>
</form>`,
      )
    : ''
}`,
    });
    void startPath;
  };

  p.get('/bookings/:id', (req, reply) => one(req, reply, (req.params as { id: string }).id));

  p.post('/bookings/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const [b] = /^[0-9a-f-]{36}$/.test(id) ? await k.db.select().from(bookings).where(eq(bookings.id, id)) : [];
    if (!b) return reply.callNotFound();
    await k.db.update(bookings).set({ staffNote: str(bodyOf(req), 'staffNote').trim().slice(0, 4000) }).where(eq(bookings.id, id));
    return back(reply, `/panel/bookings/${id}`, 'saved');
  });

  p.post('/bookings/:id/cancel', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const [b] = /^[0-9a-f-]{36}$/.test(id) ? await k.db.select().from(bookings).where(eq(bookings.id, id)) : [];
    if (!b) return reply.callNotFound();
    if (b.status === 'cancelled') return back(reply, `/panel/bookings/${id}`);
    const body = bodyOf(req);
    const [done] = await k.db.update(bookings).set({ status: 'cancelled', cancelledAt: k.now() }).where(eq(bookings.id, id)).returning();
    const notify = str(body, 'notify') === '1';
    if (notify) {
      await enqueue(k.db, [cancelMail(done!, { studio: k.config.MAIL_TO, startUrl: `${k.config.SITE_URL}${href(b.lang, 'start')}`, message: str(body, 'message').replace(/\s*,\s*/g, ' · ').slice(0, 600), now: k.now() })], k.now());
      void k.postman.kick().catch(() => undefined);
    }
    await log(k, req, { action: 'cancel', entity: 'booking', entityId: id, summary: `Görüşme iptal: ${b.name} · ${when(b.startsAt)}${notify ? ' · e-posta gitti' : ''}` });
    return back(reply, `/panel/bookings/${id}`, 'cancelled');
  });
}
