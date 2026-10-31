/** Ekip: the three people behind the cursors · names · roles · portraits · what their cursor says. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import { media, people, peopleText } from '../../db/schema';
import { html } from '../../html';
import { mediaUrl } from '../../media/picture';
import { back, bodyOf, COMMA, hasComma, log, send, str, type Kit } from '../kit';
import { personSnap } from '../snapshot';
import { csrfField, errorSummary, input, pair, saveBar, section, type Errors } from '../ui';

const CREW = { design: 'Tasarım · mavi imleç', code: 'Kod · nane yeşili imleç', motion: 'Hareket · pembe imleç' } as const;
type Crew = keyof typeof CREW;
const FIELDS = [
  { key: 'role', label: 'Rol', hint: 'Kartta adın altında: Tasarım ve marka' },
  { key: 'usually', label: 'Genelde', hint: 'Ne yapar · bir cümle' },
  { key: 'rightNow', label: 'Şu sıralar', hint: 'Şu an üzerinde çalıştığı şey' },
  { key: 'keysDo', label: 'Kısayolun yaptığı', hint: 'Sevdiği kısayol ne işe yarar' },
  { key: 'hello', label: 'İmleç selamı', hint: 'Kartta "Selam ver" deyince imlecin baloncuğu' },
] as const;
type Field = (typeof FIELDS)[number]['key'];

export function registerPeople(p: FastifyInstance, k: Kit): void {
  p.get('/people', async (req, reply) => {
    const team = await k.db.query.people.findMany({ orderBy: asc(people.sort), with: { texts: true, portrait: true } });
    return send(k, req, reply, {
      title: 'Ekip',
      section: 'people',
      body: html`<ul class="p-people">${team.map((m) => {
        const tr = m.texts.find((t) => t.lang === 'tr');
        return html`<li class="c-${m.crew}"><a href="/panel/people/${m.crew}">${m.portrait ? html`<img src="${mediaUrl(m.portrait.key, 320, 'webp')}" alt="" width="96" height="96">` : html`<span class="p-cursor" aria-hidden="true"></span>`}<span><b>${m.name}</b><small>${tr?.role ?? ''}</small><small class="mono">${CREW[m.crew]}</small></span></a></li>`;
      })}</ul>
<p class="p-hint">Stüdyo sayfasındaki kartlar · notların yazarları · imleçlerin selamları buradan gelir. Portre gelene kadar kartta imleç çizimi durur.</p>`,
    });
  });

  const editor = async (req: FastifyRequest, reply: FastifyReply, crew: Crew, o: { values?: Record<string, string>; errors?: Errors; status?: number } = {}) => {
    const m = await k.db.query.people.findFirst({ where: eq(people.crew, crew), with: { texts: true } });
    if (!m) return reply.callNotFound();
    const imgs = await k.db.select().from(media).orderBy(desc(media.id));
    const textOf = (l: 'tr' | 'en', f: Field) => o.values?.[`${f}_${l}`] ?? m.texts.find((x) => x.lang === l)?.[f] ?? '';
    const e = o.errors ?? {};
    const portrait = o.values?.portraitId ?? (m.portraitId ? String(m.portraitId) : '');
    const current = imgs.find((x) => String(x.id) === portrait);
    return send(k, req, reply, {
      title: m.name,
      section: 'people',
      status: o.status,
      crumbs: [{ label: 'Ekip', href: '/panel/people' }, { label: CREW[crew] }],
      body: html`${errorSummary(e)}
<form method="post" action="/panel/people/${crew}" class="p-form" data-dirty-guard>${csrfField(req.panel!.csrf)}
${section(
  'Kişi',
  html`<div class="p-cols3">
${input('name', 'Ad', o.values?.name ?? m.name, { required: true, error: e.name, copy: true })}
${input('keys', 'Sevdiği kısayol', o.values?.keys ?? m.keys.join(' '), { error: e.keys, hint: 'Tuşlar boşlukla: ⌘ ⇧ P' })}
${input('sort', 'Sıra', o.values?.sort ?? String(m.sort), { type: 'number', error: e.sort, attrs: html` min="0" max="9"` })}
</div>
<div class="p-field" data-pick-wrap><label for="f-portraitId">Portre</label>
<div class="p-pick">${current ? html`<img src="${mediaUrl(current.key, 320, 'webp')}" alt="" width="120" height="${Math.round((120 * current.height) / current.width)}" data-pick-img>` : html`<span class="p-noimg" data-pick-img>Portre yok</span>`}
<select class="p-in" id="f-portraitId" name="portraitId" data-pick><option value="">Portre yok · imleç çizimi</option>${imgs.map((x) => html`<option value="${x.id}" data-src="${mediaUrl(x.key, 320, 'webp')}" data-w="${x.width}" data-h="${x.height}"${String(x.id) === portrait ? html` selected` : ''}>#${x.id} · ${x.source} · ${x.width}×${x.height}</option>`)}</select></div>
<p class="p-hint">4:3 · 1200×900 · aynı ışık ve aynı fon · omuz hizasından.</p></div>`,
)}
${section('Metinler', html`${FIELDS.map((f) => pair(f.key, f.label, { tr: textOf('tr', f.key), en: textOf('en', f.key) }, e, { copy: true, hint: f.hint, required: f.key === 'role' }))}`)}
${saveBar()}
</form>`,
    });
  };

  p.get('/people/:crew', (req, reply) => {
    const crew = (req.params as { crew: string }).crew;
    return crew in CREW ? editor(req, reply, crew as Crew) : reply.callNotFound();
  });

  p.post('/people/:crew', async (req, reply) => {
    const crew = (req.params as { crew: string }).crew;
    if (!(crew in CREW)) return reply.callNotFound();
    const m = await k.db.query.people.findFirst({ where: eq(people.crew, crew as Crew) });
    if (!m) return reply.callNotFound();
    const b = bodyOf(req);
    const values: Record<string, string> = Object.fromEntries(Object.keys(b).filter((x) => x !== '_csrf').map((x) => [x, str(b, x).trim()]));
    const e: Errors = {};
    if (!values.name) e.name = 'Ad gerekli.';
    if (hasComma(values.name)) e.name = COMMA;
    const sort = Number(values.sort || '0');
    if (!Number.isInteger(sort) || sort < 0 || sort > 9) e.sort = 'Sıra 0 ile 9 arasında.';
    const portraitId = values.portraitId ? Number(values.portraitId) : null;
    if (portraitId) {
      const [img] = await k.db.select({ id: media.id }).from(media).where(eq(media.id, portraitId));
      if (!img) e.portraitId = 'Bu görsel artık yok.';
    }
    for (const l of ['tr', 'en'] as const) {
      if (!values[`role_${l}`]) e[`role_${l}`] = `Rol (${l.toUpperCase()}) gerekli.`;
      for (const f of FIELDS) if (hasComma(values[`${f.key}_${l}`])) e[`${f.key}_${l}`] = COMMA;
    }
    if (Object.keys(e).length) return editor(req, reply, crew as Crew, { values, errors: e, status: 422 });
    const before = await personSnap(k.db, m.id);
    await k.db.transaction(async (tx) => {
      await tx.update(people).set({ name: values.name!, keys: (values.keys ?? '').split(/\s+/).filter(Boolean).slice(0, 6), sort, portraitId, updatedAt: k.now() }).where(eq(people.id, m.id));
      await tx.delete(peopleText).where(eq(peopleText.personId, m.id));
      await tx.insert(peopleText).values((['tr', 'en'] as const).map((l) => ({ personId: m.id, lang: l, role: values[`role_${l}`]!, usually: values[`usually_${l}`] ?? '', rightNow: values[`rightNow_${l}`] ?? '', keysDo: values[`keysDo_${l}`] ?? '', hello: values[`hello_${l}`] ?? '' })));
    });
    await log(k, req, { action: 'update', entity: 'person', entityId: m.id, summary: `Ekip: ${values.name}`, before, after: await personSnap(k.db, m.id) });
    return back(reply, `/panel/people/${crew}`, 'saved');
  });
}
