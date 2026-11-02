/**
 * İşler: the list · a project's form (numbers · texts in both languages · board frame · cover ·
 * loop · the case study) · preview as the real case page · delete. Every save is logged with the
 * state before and after · a changed address leaves a redirect behind.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { audit, media, projects, projectText, videos } from '../../db/schema';
import { projectBySlug, nextProjectNumber } from '../../data/content';
import { addRedirect } from '../../data/redirects';
import { StorySchema, storyMedia, type StoryInput } from '../../db/story';
import { html, type Safe } from '../../html';
import { mediaUrl } from '../../media/picture';
import { casePage } from '../../pages/case';
import { ART_TEXT } from '../../pages/work/art';
import { href } from '../../routes';
import { THEMES } from '../../themes';
import { back, bodyOf, COMMA, commasIn, hasComma, log, num, send, SLUG_RE, str, type Body, type Kit } from '../kit';
import { projectSnap } from '../snapshot';
import { actionForm, badge, csrfField, empty, errorSummary, input, pair, saveBar, section, select, timeTag, when, type Errors } from '../ui';

export const DISCIPLINES = [
  { value: 'web', label: 'Web sitesi' },
  { value: 'app', label: 'Uygulama' },
  { value: 'identity', label: 'Kimlik' },
  { value: 'motion', label: 'Hareket' },
] as const;
export const STATUSES = [
  { value: 'draft', label: 'Taslak · sadece panelde' },
  { value: 'live', label: 'Yayında' },
  { value: 'nda', label: 'NDA · kilitli katman (numara · tür · yıl)' },
] as const;
const STATUS_BADGE = { draft: badge('Taslak', 'mute'), live: badge('Yayında', 'ok'), nda: badge('NDA', 'warn') } as const;
const FRAME_NAMES = ['0 · büyük yatay', '1 · dikey', '2 · dikey', '3 · yatay', '4 · geniş', '5 · dikey', '6 · yatay'];

interface Form {
  no: string;
  discipline: string;
  year: string;
  status: string;
  boardSlot: string;
  art: string;
  coverId: string;
  loopId: string;
  siteUrl: string;
  story: string;
  t: Record<'tr' | 'en', { name: string; slug: string; kind: string; summary: string; client: string }>;
}

const blankText = { name: '', slug: '', kind: '', summary: '', client: '' };

function formFromRow(row: typeof projects.$inferSelect, texts: (typeof projectText.$inferSelect)[]): Form {
  const textOf = (l: 'tr' | 'en') => {
    const x = texts.find((r) => r.lang === l);
    return x ? { name: x.name, slug: x.slug, kind: x.kind, summary: x.summary, client: x.client } : { ...blankText };
  };
  return {
    no: String(row.no),
    discipline: row.discipline,
    year: String(row.year),
    status: row.status,
    boardSlot: row.boardSlot === null ? '' : String(row.boardSlot),
    art: row.art ?? '',
    coverId: row.coverId ? String(row.coverId) : '',
    loopId: row.loopId ? String(row.loopId) : '',
    siteUrl: row.siteUrl ?? '',
    story: row.story ? JSON.stringify(row.story, null, 2) : '',
    t: { tr: textOf('tr'), en: textOf('en') },
  };
}

function formFromBody(b: Body): Form {
  const textOf = (l: 'tr' | 'en') => ({ name: str(b, `name_${l}`).trim(), slug: str(b, `slug_${l}`).trim(), kind: str(b, `kind_${l}`).trim(), summary: str(b, `summary_${l}`).trim(), client: str(b, `client_${l}`).trim() });
  return {
    no: str(b, 'no').trim(),
    discipline: str(b, 'discipline'),
    year: str(b, 'year').trim(),
    status: str(b, 'status'),
    boardSlot: str(b, 'boardSlot'),
    art: str(b, 'art'),
    coverId: str(b, 'coverId'),
    loopId: str(b, 'loopId'),
    siteUrl: str(b, 'siteUrl').trim(),
    story: str(b, 'story').trim(),
    t: { tr: textOf('tr'), en: textOf('en') },
  };
}

interface Clean {
  values: Omit<typeof projects.$inferInsert, 'id'>;
  texts: Record<'tr' | 'en', { slug: string; name: string; kind: string; summary: string; client: string }>;
}

async function check(k: Kit, f: Form, id: number | null): Promise<{ errors: Errors; clean: Clean | null }> {
  const e: Errors = {};
  const no = Number(f.no);
  if (!Number.isInteger(no) || no < 1 || no > 999) e.no = 'Numara 1 ile 999 arasında bir tam sayı olmalı.';
  else {
    const [clash] = await k.db.select({ id: projects.id }).from(projects).where(id ? and(eq(projects.no, no), ne(projects.id, id)) : eq(projects.no, no));
    if (clash) e.no = `${String(no).padStart(3, '0')} numarası başka bir işte.`;
  }
  if (!DISCIPLINES.some((d) => d.value === f.discipline)) e.discipline = 'Bir disiplin seç.';
  const year = Number(f.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) e.year = 'Yıl 2000 ile 2100 arasında olmalı.';
  if (!STATUSES.some((s) => s.value === f.status)) e.status = 'Bir durum seç.';
  const slot = f.boardSlot === '' ? null : Number(f.boardSlot);
  if (slot !== null && !(Number.isInteger(slot) && slot >= 0 && slot <= 6)) e.boardSlot = 'Çerçeve 0 ile 6 arasında.';
  if (f.art && !(f.art in ART_TEXT)) e.art = 'Bilinmeyen çizim.';
  if (f.siteUrl && !/^https?:\/\/[^\s]+$/.test(f.siteUrl)) e.siteUrl = 'Tam bir adres yaz (https:// ile).';
  const coverId = f.coverId ? Number(f.coverId) : null;
  if (coverId) {
    const [m] = await k.db.select({ id: media.id }).from(media).where(eq(media.id, coverId));
    if (!m) e.coverId = 'Bu görsel artık yok.';
  }
  const loopId = f.loopId ? Number(f.loopId) : null;
  if (loopId) {
    const [v] = await k.db.select({ id: videos.id }).from(videos).where(eq(videos.id, loopId));
    if (!v) e.loopId = 'Bu döngü artık yok.';
  }
  for (const l of ['tr', 'en'] as const) {
    const t = f.t[l];
    if (!t.name) e[`name_${l}`] = `Ad (${l.toUpperCase()}) gerekli.`;
    if (!t.kind) e[`kind_${l}`] = `Tür (${l.toUpperCase()}) gerekli. Örnek: Web sitesi ve uygulama.`;
    if (!SLUG_RE.test(t.slug)) e[`slug_${l}`] = `Adres (${l.toUpperCase()}) küçük harf · rakam ve tire olmalı. Örnek: yelken-kulubu`;
    else {
      const [clash] = await k.db
        .select({ id: projectText.projectId })
        .from(projectText)
        .where(id ? and(eq(projectText.lang, l), eq(projectText.slug, t.slug), ne(projectText.projectId, id)) : and(eq(projectText.lang, l), eq(projectText.slug, t.slug)));
      if (clash) e[`slug_${l}`] = `Bu adres (${l.toUpperCase()}) başka bir işte kullanılıyor.`;
    }
    for (const key of ['name', 'kind', 'summary', 'client'] as const) if (hasComma(t[key])) e[`${key}_${l}`] = COMMA;
  }
  let story: StoryInput | null = null;
  if (f.story) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(f.story);
    } catch (err) {
      e.story = `Vaka hikâyesi okunamadı (JSON): ${(err as Error).message}`;
    }
    if (parsed !== undefined && !e.story) {
      const r = StorySchema.safeParse(parsed);
      if (!r.success) {
        e.story = `Vaka hikâyesinde ${r.error.issues.length} sorun: ${r.error.issues
          .slice(0, 4)
          .map((i) => `${i.path.join('.') || 'kök'} · ${i.message}`)
          .join(' | ')}`;
      } else {
        const commas = commasIn(parsed);
        if (commas.length) e.story = `Vaka hikâyesinde virgül var: ${commas.slice(0, 4).join(' · ')}. ${COMMA}`;
        const ids = storyMedia(r.data);
        if (ids.length) {
          const found = await k.db.select({ id: media.id }).from(media).where(inArray(media.id, ids));
          const missing = ids.filter((x) => !found.some((m) => m.id === x));
          if (missing.length) e.story = `Vaka hikâyesi olmayan görsellere bakıyor: #${missing.join(' #')}`;
        }
        story = parsed as StoryInput;
      }
    }
  }
  if (Object.keys(e).length) return { errors: e, clean: null };
  return {
    errors: e,
    clean: {
      values: {
        no,
        discipline: f.discipline as Clean['values']['discipline'],
        year,
        status: f.status as Clean['values']['status'],
        boardSlot: slot,
        art: f.art || null,
        coverId,
        loopId,
        siteUrl: f.siteUrl || null,
        story,
      },
      texts: f.t,
    },
  };
}

async function editor(k: Kit, req: FastifyRequest, reply: FastifyReply, o: { id: number | null; form: Form; errors?: Errors; conflict?: boolean; version?: number; status?: number }) {
  const csrf = req.panel!.csrf;
  const e = o.errors ?? {};
  const f = o.form;
  const [imgs, loops, slots] = await Promise.all([
    k.db.select().from(media).orderBy(desc(media.id)),
    k.db.select().from(videos).orderBy(desc(videos.id)),
    k.db.query.projects.findMany({ where: isNotNull(projects.boardSlot), with: { texts: true } }),
  ]);
  const holder = (s: number) => slots.find((x) => x.boardSlot === s && x.id !== o.id);
  const history = o.id ? await k.db.select().from(audit).where(and(eq(audit.entity, 'project'), eq(audit.entityId, String(o.id)))).orderBy(desc(audit.id)).limit(12) : [];
  const now = k.now();
  const cover = imgs.find((m) => String(m.id) === f.coverId);
  const action = o.id ? `/panel/projects/${o.id}` : '/panel/projects';
  const title = o.id ? `${f.no.padStart(3, '0')} · ${f.t.tr.name || 'Adsız iş'}` : 'Yeni iş';

  const body = html`
${errorSummary(e, o.conflict ? 'Bu iş sen düzenlerken başka bir yerde kaydedildi. Değişikliklerin aşağıda duruyor. Üzerine yazmak için "Yine de kaydet" kutusunu işaretle.' : null)}
<form method="post" action="${action}" class="p-form" data-dirty-guard data-autosave-key="project-${o.id ?? 'new'}">
${csrfField(csrf)}
${o.version ? html`<input type="hidden" name="v" value="${o.version}">` : ''}
${section(
  'Temel',
  html`<div class="p-cols4">
${input('no', 'Numara', f.no, { type: 'number', required: true, error: e.no, attrs: html` min="1" max="999"`, hint: 'Sitede 014 gibi görünür.' })}
${select('discipline', 'Disiplin', f.discipline, [...DISCIPLINES], { error: e.discipline })}
${input('year', 'Yıl', f.year, { type: 'number', required: true, error: e.year, attrs: html` min="2000" max="2100"` })}
${select('status', 'Durum', f.status, [...STATUSES], { error: e.status })}
</div>
${input('siteUrl', 'Canlı site', f.siteUrl, { type: 'url', error: e.siteUrl, hint: 'İsteğe bağlı. Vaka sayfasında "Siteyi aç" olur.', attrs: html` placeholder="https://"` })}`,
)}
${section(
  'Metinler',
  html`${pair('name', 'Ad', { tr: f.t.tr.name, en: f.t.en.name }, e, { required: true, copy: true, attrs: html` data-slug-source` })}
${pair('slug', 'Adres', { tr: f.t.tr.slug, en: f.t.en.slug }, e, { required: true, hint: html`Addan kendiliğinden dolar. Yayındaki bir işin adresi değişirse eski adres yeniye yönlenir.`, attrs: html` data-slug pattern="[a-z0-9]+(-[a-z0-9]+)*"` })}
${pair('kind', 'Ne yaptık', { tr: f.t.tr.kind, en: f.t.en.kind }, e, { required: true, copy: true, hint: 'Kısa: Web sitesi ve uygulama' })}
${pair('summary', 'Özet', { tr: f.t.tr.summary, en: f.t.en.summary }, e, { area: true, rows: 3, copy: true, hint: 'Bir iki cümle. İşler sayfasında ve vaka sayfasının başında.' })}
${pair('client', 'Müşteri', { tr: f.t.tr.client, en: f.t.en.client }, e, { copy: true })}`,
)}
${section(
  'Görünüm',
  html`<div class="p-cols2">
${select('boardSlot', 'Ana sayfa panosu', f.boardSlot, [{ value: '', label: 'Panoda değil' }, ...FRAME_NAMES.map((n, i) => ({ value: i, label: holder(i) ? `${n} · şu an ${holder(i)!.texts.find((t) => t.lang === 'tr')?.name ?? `#${holder(i)!.no}`} (yer değiştirir)` : n }))], { error: e.boardSlot, hint: 'Dolu bir çerçeve seçersen o iş bu işin eski yerine geçer.' })}
${select('art', 'Çizim', f.art, [{ value: '', label: 'Yok' }, ...Object.entries(ART_TEXT).map(([key, label]) => ({ value: key, label: `${key} · ${label}` }))], { error: e.art, hint: 'Kapak gelene kadar gösterilen çizim.' })}
</div>
<div class="p-cols2">
<div class="p-field${e.coverId ? ' bad' : ''}" data-pick-wrap>
<label for="f-coverId">Kapak</label>
<div class="p-pick">${cover ? html`<img src="${mediaUrl(cover.key, 320, 'webp')}" alt="" width="160" height="${Math.round((160 * cover.height) / cover.width)}" data-pick-img>` : html`<span class="p-noimg" data-pick-img>Kapak yok</span>`}
<select class="p-in" id="f-coverId" name="coverId" data-pick>${[html`<option value="">Kapak yok · çizim gösterilir</option>`, ...imgs.map((m) => html`<option value="${m.id}" data-src="${mediaUrl(m.key, 320, 'webp')}" data-w="${m.width}" data-h="${m.height}"${String(m.id) === f.coverId ? html` selected` : ''}>#${m.id} · ${m.source} · ${m.width}×${m.height}${!m.alt.tr || !m.alt.en ? ' · alt metin eksik' : ''}</option>`)]}</select></div>
<p class="p-hint">En iyi tek görsel · 16:9 ya da daha geniş · en az 2720×1120. <a href="/panel/media">Görsel yükle</a></p>
${e.coverId ? html`<p class="p-err">${e.coverId}</p>` : ''}
</div>
${select('loopId', 'Döngü videosu', f.loopId, [{ value: '', label: 'Yok' }, ...loops.map((v) => ({ value: v.id, label: `#${v.id} · ${v.source} · ${(v.durationMs / 1000).toFixed(1)} sn` }))], { error: e.loopId, hint: 'Hareket işleri için: Hareket makarasında ve ana sayfadaki hareket çerçevesinde oynar.' })}
</div>`,
)}
${section(
  'Vaka hikâyesi',
  html`<div class="p-field${e.story ? ' bad' : ''}">
<label for="f-story">Hikâye <span class="p-lang">JSON</span></label>
<textarea class="p-in p-mono" id="f-story" name="story" rows="16" spellcheck="false" data-story${e.story ? html` aria-invalid="true" aria-describedby="f-story-e"` : ''}>${f.story}</textarea>
<p class="p-hint">Boş bırakılırsa kısa vaka sayfası gösterilir. Düzenleyici her bölümü alan alan açar: sürümler · brief · detay karoları · sonuçlar · emek verenler.</p>
${e.story ? html`<p class="p-err" id="f-story-e">${e.story}</p>` : ''}
</div>`,
  { id: 'story' },
)}
${o.conflict ? html`<label class="p-toggle warn"><input type="checkbox" name="force" value="1"><span>Yine de kaydet (öbür değişikliğin üzerine yaz)</span></label>` : ''}
${saveBar(o.id ? 'Kaydet' : 'Oluştur')}
</form>
${
  o.id
    ? section(
        'Geçmiş',
        history.length
          ? html`<ul class="p-list tight">${history.map((a) => html`<li><a href="/panel/log/${a.id}"><span>${a.summary}</span><small>${when(a.at)} · ${timeTag(a.at, now)}</small></a></li>`)}</ul>`
          : empty('Henüz kayıt yok.'),
        { hint: 'Her kaydın önceki hali saklanır. Bir kayda girip "Bu hale dön" ile geri alabilirsin.' },
      )
    : ''
}
${
  o.id
    ? section(
        'Sil',
        actionForm(`/panel/projects/${o.id}/delete`, 'Bu işi sil', csrf, { danger: true, confirm: `${title} silinsin mi? Kayıtta saklanır ve geri getirilebilir.` }),
        { hint: 'Yayındaki bir iş silinirse eski adresi İşler sayfasına yönlenir.' },
      )
    : ''
}`;
  return send(k, req, reply, {
    title,
    section: 'projects',
    status: o.status,
    crumbs: [{ label: 'İşler', href: '/panel/projects' }, { label: o.id ? f.no.padStart(3, '0') : 'Yeni' }],
    actions: o.id
      ? html`<a class="p-btn ghost" href="/panel/projects/${o.id}/preview/tr" target="_blank" rel="noopener">Önizle TR</a><a class="p-btn ghost" href="/panel/projects/${o.id}/preview/en" target="_blank" rel="noopener">Önizle EN</a>${f.status === 'live' && f.t.tr.slug ? html`<a class="p-btn ghost" href="${href('tr', 'case', { slug: f.t.tr.slug })}" target="_blank" rel="noopener">Sitede gör ↗</a>` : ''}`
      : undefined,
    body,
  });
}

const where = (s: Safe) => s;

export function registerProjects(p: FastifyInstance, k: Kit): void {
  p.get('/projects', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const rows = await k.db.query.projects.findMany({ orderBy: desc(projects.no), with: { texts: true, cover: true } });
    const status = ['draft', 'live', 'nda'].includes(q.status ?? '') ? q.status : '';
    const list = rows.filter((r) => !status || r.status === status);
    const now = k.now();
    const tabs = [
      { v: '', label: `Hepsi · ${rows.length}` },
      { v: 'live', label: `Yayında · ${rows.filter((r) => r.status === 'live').length}` },
      { v: 'draft', label: `Taslak · ${rows.filter((r) => r.status === 'draft').length}` },
      { v: 'nda', label: `NDA · ${rows.filter((r) => r.status === 'nda').length}` },
    ];
    return send(k, req, reply, {
      title: 'İşler',
      section: 'projects',
      wide: true,
      actions: html`<a class="p-btn" href="/panel/projects/new">Yeni iş</a>`,
      body: where(html`<div class="p-toolbar"><nav class="p-tabs" aria-label="Durum">${tabs.map((t) => html`<a href="/panel/projects${t.v ? `?status=${t.v}` : ''}"${t.v === status ? html` aria-current="page"` : ''}>${t.label}</a>`)}</nav><input class="p-in p-search" type="search" placeholder="Ara · /" aria-label="İşlerde ara" data-filter="#projects"></div>
${
  list.length
    ? html`<table class="p-table" id="projects"><thead><tr><th><span class="sr">Kapak</span></th><th>No</th><th>Ad</th><th>Disiplin</th><th>Durum</th><th>Pano</th><th>Güncellendi</th></tr></thead><tbody>${list.map((r) => {
        const tr = r.texts.find((t) => t.lang === 'tr');
        return html`<tr data-row><td class="p-thumbcell">${r.cover ? html`<img class="p-thumb" src="${mediaUrl(r.cover.key, 320, 'webp')}" alt="" width="64" height="40" loading="lazy">` : html`<span class="p-thumb none mono">${r.art ?? '—'}</span>`}</td><td class="mono">${String(r.no).padStart(3, '0')}</td><td><a class="p-rowlink" href="/panel/projects/${r.id}">${tr?.name ?? 'Adsız'}</a><small>${tr?.kind ?? ''}</small></td><td>${DISCIPLINES.find((d) => d.value === r.discipline)?.label}</td><td>${STATUS_BADGE[r.status]}</td><td class="mono">${r.boardSlot ?? '—'}</td><td>${timeTag(r.updatedAt, now)}</td></tr>`;
      })}</tbody></table>`
    : empty('Burada iş yok.', html`<a class="p-btn" href="/panel/projects/new">Yeni iş</a>`)
}`),
    });
  });

  p.get('/projects/new', async (req, reply) => {
    const no = await nextProjectNumber(k.db);
    return editor(k, req, reply, { id: null, form: { no: String(no), discipline: 'web', year: String(k.now().getUTCFullYear()), status: 'draft', boardSlot: '', art: '', coverId: '', loopId: '', siteUrl: '', story: '', t: { tr: { ...blankText }, en: { ...blankText } } } });
  });

  const saveTexts = async (tx: Pick<Kit['db'], 'delete' | 'insert'>, id: number, texts: Clean['texts']) => {
    await tx.delete(projectText).where(eq(projectText.projectId, id));
    await tx.insert(projectText).values((['tr', 'en'] as const).map((l) => ({ projectId: id, lang: l, ...texts[l] })));
  };

  /** Takes a board frame: whoever had it moves to this project's old frame (or off the board). */
  const takeSlot = async (tx: Pick<Kit['db'], 'select' | 'update'>, id: number, slot: number | null | undefined, old: number | null): Promise<string | null> => {
    if (slot === null || slot === undefined || slot === old) return null;
    const [other] = await tx.select({ id: projects.id }).from(projects).where(and(eq(projects.boardSlot, slot), ne(projects.id, id)));
    if (!other) return null;
    await tx.update(projects).set({ boardSlot: null }).where(eq(projects.id, other.id));
    return `${other.id}:${old ?? ''}`;
  };

  p.post('/projects', async (req, reply) => {
    const form = formFromBody(bodyOf(req));
    const { errors, clean } = await check(k, form, null);
    if (!clean) return editor(k, req, reply, { id: null, form, errors, status: 422 });
    const id = await k.db.transaction(async (tx) => {
      const [row] = await tx.insert(projects).values({ ...clean.values, boardSlot: null }).returning({ id: projects.id });
      const swap = await takeSlot(tx, row!.id, clean.values.boardSlot, null);
      if (clean.values.boardSlot !== null && clean.values.boardSlot !== undefined) await tx.update(projects).set({ boardSlot: clean.values.boardSlot }).where(eq(projects.id, row!.id));
      void swap;
      await saveTexts(tx, row!.id, clean.texts);
      return row!.id;
    });
    await log(k, req, { action: 'create', entity: 'project', entityId: id, summary: `İş oluşturuldu: ${clean.texts.tr.name}`, after: await projectSnap(k.db, id) });
    return back(reply, `/panel/projects/${id}`, 'created');
  });

  const load = async (id: number) => {
    const [row] = await k.db.select().from(projects).where(eq(projects.id, id));
    if (!row) return null;
    const texts = await k.db.select().from(projectText).where(eq(projectText.projectId, id));
    return { row, texts };
  };

  p.get('/projects/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const hit = Number.isInteger(id) ? await load(id) : null;
    if (!hit) return reply.callNotFound();
    return editor(k, req, reply, { id, form: formFromRow(hit.row, hit.texts), version: hit.row.updatedAt.getTime() });
  });

  p.post('/projects/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const hit = Number.isInteger(id) ? await load(id) : null;
    if (!hit) return reply.callNotFound();
    const b = bodyOf(req);
    const form = formFromBody(b);
    const version = Number(str(b, 'v'));
    if (version && version !== hit.row.updatedAt.getTime() && str(b, 'force') !== '1') {
      return editor(k, req, reply, { id, form, conflict: true, version: hit.row.updatedAt.getTime(), status: 409 });
    }
    const { errors, clean } = await check(k, form, id);
    if (!clean) return editor(k, req, reply, { id, form, errors, version: version || hit.row.updatedAt.getTime(), status: 422 });
    const before = await projectSnap(k.db, id);
    let moved = '';
    await k.db.transaction(async (tx) => {
      const old = hit.row.boardSlot;
      const swap = await takeSlot(tx, id, clean.values.boardSlot, old);
      await tx.update(projects).set({ ...clean.values, updatedAt: k.now() }).where(eq(projects.id, id));
      if (swap) {
        const [otherId, oldSlot] = swap.split(':');
        if (oldSlot !== '') await tx.update(projects).set({ boardSlot: Number(oldSlot) }).where(eq(projects.id, Number(otherId)));
        moved = otherId!;
      }
      await saveTexts(tx, id, clean.texts);
    });
    // A live case page that moved keeps its old address working.
    if (hit.row.status === 'live') {
      for (const l of ['tr', 'en'] as const) {
        const was = hit.texts.find((t) => t.lang === l)?.slug;
        if (was && was !== clean.texts[l].slug) await addRedirect(k.db, href(l, 'case', { slug: was }), href(l, 'case', { slug: clean.texts[l].slug }));
      }
    }
    await log(k, req, { action: 'update', entity: 'project', entityId: id, summary: `İş kaydedildi: ${clean.texts.tr.name}${moved ? ' · panoda yer değiştirdi' : ''}`, before, after: await projectSnap(k.db, id) });
    return back(reply, `/panel/projects/${id}`, 'saved');
  });

  p.post('/projects/:id/delete', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const before = Number.isInteger(id) ? await projectSnap(k.db, id) : null;
    if (!before) return reply.callNotFound();
    await k.db.delete(projects).where(eq(projects.id, id));
    if (before.row.status === 'live') for (const t of before.texts) await addRedirect(k.db, href(t.lang as 'tr' | 'en', 'case', { slug: String(t.slug) }), href(t.lang as 'tr' | 'en', 'work'));
    const name = before.texts.find((t) => t.lang === 'tr')?.name;
    await log(k, req, { action: 'delete', entity: 'project', entityId: id, summary: `İş silindi: ${name ?? `#${before.row.no}`}`, before });
    return back(reply, '/panel/projects', 'deleted');
  });

  p.get('/projects/:id/preview/:lang', async (req, reply) => {
    const { id, lang } = req.params as { id: string; lang: string };
    if (lang !== 'tr' && lang !== 'en') return reply.callNotFound();
    const [t] = await k.db.select().from(projectText).where(and(eq(projectText.projectId, Number(id)), eq(projectText.lang, lang)));
    if (!t) return reply.callNotFound();
    const data = await projectBySlug(k.db, lang, t.slug, true);
    if (!data) return reply.callNotFound();
    return k.preview(reply, casePage as never, lang, href(lang, 'case', { slug: t.slug }), data);
  });

  void asc;
}
