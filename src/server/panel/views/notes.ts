/**
 * Notlar: the list (draft · scheduled · live) · a note's form with a live preview of the markdown
 * (the site's own renderer) · preview as the real note page · delete.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { TAGS } from '../../content/notes';
import { noteBySlug } from '../../data/content';
import { addRedirect } from '../../data/redirects';
import { audit, notes, noteText, people } from '../../db/schema';
import { html } from '../../html';
import { translator } from '../../i18n';
import { readMinutes, renderNote } from '../../notes/render';
import { notePage } from '../../pages/note';
import { href } from '../../routes';
import { back, bodyOf, COMMA, hasComma, log, proseOf, send, SLUG_RE, str, strs, type Body, type Kit } from '../kit';
import { noteSnap } from '../snapshot';
import { actionForm, area, badge, checks, csrfField, empty, errorSummary, fromIstLocal, input, istLocal, saveBar, section, select, timeTag, toggle, when, type Errors } from '../ui';

type L = 'tr' | 'en';
interface Form {
  authorId: string;
  tags: string[];
  state: 'draft' | 'publish';
  at: string;
  has: Record<L, boolean>;
  t: Record<L, { title: string; slug: string; excerpt: string; body: string }>;
}
const blank = { title: '', slug: '', excerpt: '', body: '' };

const stateOf = (d: Date | null, now: Date) => (!d ? badge('Taslak', 'mute') : d > now ? badge('Zamanlanmış', 'acc') : badge('Yayında', 'ok'));

function fromBody(b: Body): Form {
  const textOf = (l: L) => ({ title: str(b, `title_${l}`).trim(), slug: str(b, `slug_${l}`).trim(), excerpt: str(b, `excerpt_${l}`).trim(), body: str(b, `body_${l}`).replace(/\r\n/g, '\n') });
  return {
    authorId: str(b, 'authorId'),
    tags: strs(b, 'tags'),
    state: str(b, 'state') === 'publish' ? 'publish' : 'draft',
    at: str(b, 'at'),
    has: { tr: str(b, 'has_tr') === '1', en: str(b, 'has_en') === '1' },
    t: { tr: textOf('tr'), en: textOf('en') },
  };
}

async function check(k: Kit, f: Form, id: number | null) {
  const e: Errors = {};
  const [author] = f.authorId ? await k.db.select({ id: people.id }).from(people).where(eq(people.id, Number(f.authorId))) : [];
  if (!author) e.authorId = 'Bir yazar seç.';
  const tags = f.tags.filter((x) => x in TAGS);
  if (tags.length !== f.tags.length) e.tags = 'Bilinmeyen etiket.';
  let publishedAt: Date | null = null;
  if (f.state === 'publish') {
    publishedAt = f.at ? fromIstLocal(f.at) : k.now();
    if (!publishedAt) e.at = 'Tarih ve saat okunamadı.';
  }
  if (!f.has.tr && !f.has.en) e.has_tr = 'En az bir dilde yaz.';
  for (const l of ['tr', 'en'] as const) {
    if (!f.has[l]) continue;
    const t = f.t[l];
    const U = l.toUpperCase();
    if (!t.title) e[`title_${l}`] = `Başlık (${U}) gerekli.`;
    if (!SLUG_RE.test(t.slug)) e[`slug_${l}`] = `Adres (${U}) küçük harf · rakam ve tire olmalı.`;
    else {
      const [clash] = await k.db.select({ id: noteText.noteId }).from(noteText).where(id ? and(eq(noteText.lang, l), eq(noteText.slug, t.slug), ne(noteText.noteId, id)) : and(eq(noteText.lang, l), eq(noteText.slug, t.slug)));
      if (clash) e[`slug_${l}`] = `Bu adres (${U}) başka bir notta kullanılıyor.`;
    }
    if (hasComma(t.title)) e[`title_${l}`] = COMMA;
    if (hasComma(t.excerpt)) e[`excerpt_${l}`] = COMMA;
    if (hasComma(proseOf(t.body))) e[`body_${l}`] = `${COMMA} Kod bloklarında virgül serbest.`;
    if (t.body.length > 200_000) e[`body_${l}`] = 'Metin çok uzun.';
  }
  return { errors: e, clean: Object.keys(e).length ? null : { authorId: Number(f.authorId), tags, publishedAt } };
}

async function editor(k: Kit, req: FastifyRequest, reply: FastifyReply, o: { id: number | null; form: Form; errors?: Errors; version?: number; conflict?: boolean; status?: number }) {
  const csrf = req.panel!.csrf;
  const f = o.form;
  const e = o.errors ?? {};
  const team = await k.db.select().from(people).orderBy(asc(people.sort));
  const now = k.now();
  const history = o.id ? await k.db.select().from(audit).where(and(eq(audit.entity, 'note'), eq(audit.entityId, String(o.id)))).orderBy(desc(audit.id)).limit(12) : [];
  const title = o.id ? f.t.tr.title || f.t.en.title || 'Adsız not' : 'Yeni not';
  const lang = (l: L) =>
    html`<div class="p-langcol" data-langcol="${l}">
${toggle(`has_${l}`, l === 'tr' ? 'Türkçe' : 'İngilizce', f.has[l], l === 'tr' ? 'Sadece bir dilde yazılan not o dilde yayınlanır.' : undefined)}
${input(`title_${l}`, html`Başlık <span class="p-lang">${l.toUpperCase()}</span>`, f.t[l].title, { error: e[`title_${l}`], copy: true, attrs: html` lang="${l}" data-slug-source="${l}"` })}
${input(`slug_${l}`, html`Adres <span class="p-lang">${l.toUpperCase()}</span>`, f.t[l].slug, { error: e[`slug_${l}`], attrs: html` data-slug="${l}" pattern="[a-z0-9]+(-[a-z0-9]+)*"` })}
${area(`excerpt_${l}`, html`Özet <span class="p-lang">${l.toUpperCase()}</span>`, f.t[l].excerpt, { rows: 2, error: e[`excerpt_${l}`], copy: true, attrs: html` lang="${l}"` })}
<div class="p-md">
<div class="p-field${e[`body_${l}`] ? ' bad' : ''}">
<label for="f-body-${l}">Metin <span class="p-lang">${l.toUpperCase()}</span> <small class="mono" data-minutes="${l}">${readMinutes(f.t[l].body)} dk okuma</small></label>
<div class="p-mdbar" data-mdbar="${l}" hidden><button type="button" data-md="h2">Ara başlık</button><button type="button" data-md="code">Kod</button><button type="button" data-md="playground">Yay oyun alanı</button><button type="button" data-md="figure">Şekil</button><button type="button" data-md="note">Dipnot</button><button type="button" data-md="link">Bağlantı</button></div>
<textarea class="p-in p-mono" id="f-body-${l}" name="body_${l}" rows="22" lang="${l}" spellcheck="true" data-md-source="${l}" data-lint="prose"${e[`body_${l}`] ? html` aria-invalid="true"` : ''}>${f.t[l].body}</textarea>
${e[`body_${l}`] ? html`<p class="p-err">${e[`body_${l}`]}</p>` : ''}
<p class="p-hint">Markdown. İlk paragraf giriş olur. <code>## Ara başlık</code> içindekileri yapar. Kod için <code>~~~ts title=dosya.ts</code> · oyun alanı için <code>~~~playground spring</code> · dipnot için <code>[^1]</code>.</p>
</div>
<div class="p-preview note" data-md-preview="${l}" aria-live="polite" hidden><p class="p-hint">Önizleme yazarken güncellenir.</p></div>
</div>
</div>`;

  const body = html`
${errorSummary(e, o.conflict ? 'Bu not sen düzenlerken başka bir yerde kaydedildi. Üzerine yazmak için aşağıdaki kutuyu işaretle.' : null)}
<form method="post" action="${o.id ? `/panel/notes/${o.id}` : '/panel/notes'}" class="p-form" data-dirty-guard>
${csrfField(csrf)}
${o.version ? html`<input type="hidden" name="v" value="${o.version}">` : ''}
${section(
  'Yayın',
  html`<div class="p-cols3">
${select('authorId', 'Yazar', f.authorId, [{ value: '', label: 'Seç' }, ...team.map((p) => ({ value: p.id, label: `${p.name} · ${p.crew}` }))], { error: e.authorId })}
${select('state', 'Durum', f.state, [{ value: 'draft', label: 'Taslak' }, { value: 'publish', label: 'Yayında ya da zamanlanmış' }])}
${input('at', 'Yayın zamanı (İstanbul)', f.at, { type: 'datetime-local', error: e.at, hint: 'Boşsa şimdi. İleri bir tarih notu o saatte yayına alır.' })}
</div>
${checks('tags', 'Etiketler', f.tags, Object.entries(TAGS).map(([key, label]) => ({ value: key, label })), { error: e.tags })}`,
)}
${e.has_tr ? html`<p class="p-err">${e.has_tr}</p>` : ''}
<div class="p-langs">${lang('tr')}${lang('en')}</div>
${o.conflict ? html`<label class="p-toggle warn"><input type="checkbox" name="force" value="1"><span>Yine de kaydet</span></label>` : ''}
${saveBar(o.id ? 'Kaydet' : 'Oluştur')}
</form>
${o.id ? section('Geçmiş', history.length ? html`<ul class="p-list tight">${history.map((a) => html`<li><a href="/panel/log/${a.id}"><span>${a.summary}</span><small>${when(a.at)} · ${timeTag(a.at, now)}</small></a></li>`)}</ul>` : empty('Henüz kayıt yok.')) : ''}
${o.id ? section('Sil', actionForm(`/panel/notes/${o.id}/delete`, 'Bu notu sil', csrf, { danger: true, confirm: `"${title}" silinsin mi? Kayıtta saklanır ve geri getirilebilir.` })) : ''}`;

  return send(k, req, reply, {
    title,
    section: 'notes',
    status: o.status,
    wide: true,
    styles: ['note'],
    crumbs: [{ label: 'Notlar', href: '/panel/notes' }, { label: o.id ? `#${o.id}` : 'Yeni' }],
    actions: o.id ? html`${f.has.tr ? html`<a class="p-btn ghost" href="/panel/notes/${o.id}/preview/tr" target="_blank" rel="noopener">Önizle TR</a>` : ''}${f.has.en ? html`<a class="p-btn ghost" href="/panel/notes/${o.id}/preview/en" target="_blank" rel="noopener">Önizle EN</a>` : ''}` : undefined,
    body,
  });
}

export function registerNotes(p: FastifyInstance, k: Kit): void {
  p.get('/notes', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const now = k.now();
    const rows = await k.db.query.notes.findMany({ orderBy: [desc(notes.publishedAt), desc(notes.id)], with: { texts: true, author: true } });
    const kind = (d: Date | null) => (!d ? 'draft' : d > now ? 'scheduled' : 'live');
    const filter = ['draft', 'scheduled', 'live'].includes(q.state ?? '') ? q.state : '';
    const list = rows.filter((r) => !filter || kind(r.publishedAt) === filter);
    const tab = (v: string, label: string) => html`<a href="/panel/notes${v ? `?state=${v}` : ''}"${v === filter ? html` aria-current="page"` : ''}>${label} · ${v ? rows.filter((r) => kind(r.publishedAt) === v).length : rows.length}</a>`;
    return send(k, req, reply, {
      title: 'Notlar',
      section: 'notes',
      wide: true,
      actions: html`<a class="p-btn" href="/panel/notes/new">Yeni not</a>`,
      body: html`<div class="p-toolbar"><nav class="p-tabs" aria-label="Durum">${tab('', 'Hepsi')}${tab('live', 'Yayında')}${tab('scheduled', 'Zamanlanmış')}${tab('draft', 'Taslak')}</nav><input class="p-in p-search" type="search" placeholder="Ara · /" aria-label="Notlarda ara" data-filter="#notes"></div>
${
  list.length
    ? html`<table class="p-table" id="notes"><thead><tr><th>Başlık</th><th>Diller</th><th>Yazar</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>${list.map((r) => {
        const t = r.texts.find((x) => x.lang === 'tr') ?? r.texts[0];
        return html`<tr data-row><td><a class="p-rowlink" href="/panel/notes/${r.id}">${t?.title ?? 'Adsız'}</a><small>${r.tags.map((x) => (TAGS as Record<string, string>)[x] ?? x).join(' · ')}</small></td><td class="mono">${r.texts.map((x) => x.lang.toUpperCase()).join(' ')}</td><td>${r.author.name}</td><td>${stateOf(r.publishedAt, now)}</td><td>${r.publishedAt ? when(r.publishedAt, false) : timeTag(r.updatedAt, now)}</td></tr>`;
      })}</tbody></table>`
    : empty('Burada not yok.', html`<a class="p-btn" href="/panel/notes/new">Yeni not</a>`)
}`,
    });
  });

  p.get('/notes/new', async (req, reply) => {
    const [first] = await k.db.select().from(people).orderBy(asc(people.sort)).limit(1);
    return editor(k, req, reply, { id: null, form: { authorId: first ? String(first.id) : '', tags: [], state: 'draft', at: '', has: { tr: true, en: true }, t: { tr: { ...blank }, en: { ...blank } } } });
  });

  const load = async (id: number) => {
    const [row] = await k.db.select().from(notes).where(eq(notes.id, id));
    if (!row) return null;
    return { row, texts: await k.db.select().from(noteText).where(eq(noteText.noteId, id)) };
  };

  p.get('/notes/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const hit = Number.isInteger(id) ? await load(id) : null;
    if (!hit) return reply.callNotFound();
    const textOf = (l: L) => {
      const x = hit.texts.find((r) => r.lang === l);
      return x ? { title: x.title, slug: x.slug, excerpt: x.excerpt, body: x.body } : { ...blank };
    };
    return editor(k, req, reply, {
      id,
      version: hit.row.updatedAt.getTime(),
      form: { authorId: String(hit.row.authorId), tags: hit.row.tags, state: hit.row.publishedAt ? 'publish' : 'draft', at: istLocal(hit.row.publishedAt), has: { tr: hit.texts.some((x) => x.lang === 'tr'), en: hit.texts.some((x) => x.lang === 'en') }, t: { tr: textOf('tr'), en: textOf('en') } },
    });
  });

  const saveTexts = async (tx: Pick<Kit['db'], 'delete' | 'insert'>, id: number, f: Form) => {
    await tx.delete(noteText).where(eq(noteText.noteId, id));
    const rows = (['tr', 'en'] as const).filter((l) => f.has[l]).map((l) => ({ noteId: id, lang: l, ...f.t[l] }));
    if (rows.length) await tx.insert(noteText).values(rows);
  };

  p.post('/notes', async (req, reply) => {
    const form = fromBody(bodyOf(req));
    const { errors, clean } = await check(k, form, null);
    if (!clean) return editor(k, req, reply, { id: null, form, errors, status: 422 });
    const id = await k.db.transaction(async (tx) => {
      const [row] = await tx.insert(notes).values(clean).returning({ id: notes.id });
      await saveTexts(tx, row!.id, form);
      return row!.id;
    });
    await log(k, req, { action: 'create', entity: 'note', entityId: id, summary: `Not oluşturuldu: ${form.t.tr.title || form.t.en.title}`, after: await noteSnap(k.db, id) });
    return back(reply, `/panel/notes/${id}`, 'created');
  });

  p.post('/notes/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const hit = Number.isInteger(id) ? await load(id) : null;
    if (!hit) return reply.callNotFound();
    const b = bodyOf(req);
    const form = fromBody(b);
    const version = Number(str(b, 'v'));
    if (version && version !== hit.row.updatedAt.getTime() && str(b, 'force') !== '1') return editor(k, req, reply, { id, form, conflict: true, version: hit.row.updatedAt.getTime(), status: 409 });
    const { errors, clean } = await check(k, form, id);
    if (!clean) return editor(k, req, reply, { id, form, errors, version: version || hit.row.updatedAt.getTime(), status: 422 });
    const before = await noteSnap(k.db, id);
    await k.db.transaction(async (tx) => {
      await tx.update(notes).set({ ...clean, updatedAt: k.now() }).where(eq(notes.id, id));
      await saveTexts(tx, id, form);
    });
    const wasLive = !!hit.row.publishedAt && hit.row.publishedAt <= k.now();
    if (wasLive) {
      for (const t of hit.texts) {
        const l = t.lang;
        if (!form.has[l]) await addRedirect(k.db, href(l, 'note', { slug: t.slug }), href(l, 'notes'));
        else if (form.t[l].slug !== t.slug) await addRedirect(k.db, href(l, 'note', { slug: t.slug }), href(l, 'note', { slug: form.t[l].slug }));
      }
    }
    await log(k, req, { action: 'update', entity: 'note', entityId: id, summary: `Not kaydedildi: ${form.t.tr.title || form.t.en.title}`, before, after: await noteSnap(k.db, id) });
    return back(reply, `/panel/notes/${id}`, 'saved');
  });

  p.post('/notes/:id/delete', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const before = Number.isInteger(id) ? await noteSnap(k.db, id) : null;
    if (!before) return reply.callNotFound();
    await k.db.delete(notes).where(eq(notes.id, id));
    const at = before.row.publishedAt ? new Date(String(before.row.publishedAt)) : null;
    if (at && at <= k.now()) for (const t of before.texts) await addRedirect(k.db, href(t.lang as L, 'note', { slug: String(t.slug) }), href(t.lang as L, 'notes'));
    await log(k, req, { action: 'delete', entity: 'note', entityId: id, summary: `Not silindi: ${String(before.texts[0]?.title ?? `#${id}`)}`, before });
    return back(reply, '/panel/notes', 'deleted');
  });

  // Live preview while typing: the site's own renderer.
  p.post('/notes/render', async (req, reply) => {
    const b = (req.body ?? {}) as { body?: unknown; lang?: unknown; author?: unknown };
    const lang: L = b.lang === 'en' ? 'en' : 'tr';
    const source = typeof b.body === 'string' ? b.body.slice(0, 200_000) : '';
    const author = b.author === 'code' || b.author === 'motion' ? b.author : 'design';
    try {
      const r = renderNote(source, { lang, t: translator(lang), author });
      return reply.send({ ok: true, html: r.html.value, minutes: readMinutes(source), toc: r.toc, commas: hasComma(proseOf(source)) });
    } catch (err) {
      return reply.status(422).send({ ok: false, error: String((err as Error).message ?? err) });
    }
  });

  p.get('/notes/:id/preview/:lang', async (req, reply) => {
    const { id, lang } = req.params as { id: string; lang: string };
    if (lang !== 'tr' && lang !== 'en') return reply.callNotFound();
    const [t] = await k.db.select().from(noteText).where(and(eq(noteText.noteId, Number(id)), eq(noteText.lang, lang)));
    if (!t) return reply.callNotFound();
    const note = await noteBySlug(k.db, lang, t.slug, k.now(), true);
    if (!note) return reply.callNotFound();
    return k.preview(reply, notePage as never, lang, href(lang, 'note', { slug: t.slug }), { note, r: renderNote(note.body, { lang, t: translator(lang), author: note.author.crew }) });
  });
}
