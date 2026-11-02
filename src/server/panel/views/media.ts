/**
 * Görseller: the image library (drag and drop · many at once · alt text in both languages · where
 * each image is used · delete when unused) and the loops (MP4 · optional WebM · poster).
 */
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { media, projects, videos } from '../../db/schema';
import { html } from '../../html';
import { ingestImage, MediaError } from '../../media/ingest';
import { mediaUrl } from '../../media/picture';
import { ingestLoop, loopUrl, LOOP_LIMITS } from '../../media/video';
import { same } from '../auth';
import { usedMedia } from '../checklist';
import { back, bodyOf, COMMA, hasComma, log, send, str, type Kit } from '../kit';
import { actionForm, badge, csrfField, empty, errorSummary, pair, saveBar, section, timeTag, type Errors } from '../ui';

interface Upload {
  field: string;
  name: string;
  data: Buffer;
}

/** Reads a multipart post: fields · files · and the files that were too large. */
async function parts(req: FastifyRequest): Promise<{ fields: Record<string, string>; files: Upload[]; tooBig: string[] }> {
  const fields: Record<string, string> = {};
  const files: Upload[] = [];
  const tooBig: string[] = [];
  for await (const part of req.parts()) {
    if (part.type === 'file') {
      try {
        const data = await part.toBuffer();
        if (data.length) files.push({ field: part.fieldname, name: part.filename.slice(0, 120), data });
      } catch {
        tooBig.push(part.filename);
      }
    } else fields[part.fieldname] = String(part.value ?? '');
  }
  return { fields, files, tooBig };
}

const csrfOk = (req: FastifyRequest, fields: Record<string, string>) => {
  const sent = String(req.headers['x-csrf'] ?? fields._csrf ?? '');
  return !!req.panel && !!sent && same(sent, req.panel.csrf);
};

const TR: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/not an image/, () => 'Bu dosya okunabilen bir görsel değil.'],
  [/format (\S+) is not accepted/, (m) => `${m[1]} biçimi kabul edilmiyor (JPEG · PNG · WebP · AVIF · HEIC · TIFF).`],
  [/image has no size/, () => 'Görselin boyutu okunamadı.'],
  [/not an MP4/, () => 'Bu bir MP4 dosyası değil.'],
  [/no index \(moov/, () => 'MP4 bozuk görünüyor (dizin yok).'],
  [/no video track/, () => 'MP4 içinde video yok.'],
  [/must be H\.264 \(avc1\) · this one is (\S+)/, (m) => `MP4 H.264 olmalı · bu dosya ${m[1]}.`],
  [/(\S+) is ([\d.]+ MB) · a loop must stay under ([\d.]+ MB)/, (m) => `${m[1]} ${m[2]} · bir döngü ${m[3]} altında kalmalı.`],
  [/(\S+) is ([\d.]+ MB) · aim for under ([\d.]+ MB)/, (m) => `${m[1]} ${m[2]} · ${m[3]} altı hedeflenmeli (bit hızını ya da boyutu düşür).`],
  [/second file is not a WebM/, () => 'İkinci dosya bir WebM değil.'],
  [/no WebM/, () => 'WebM yok · MP4 her yerde oynar ama WebM genelde daha küçüktür.'],
  [/sound track/, () => 'MP4 içinde ses kanalı var · döngüler sessiz oynar · sesi kaldırarak dışa aktarırsan dosya küçülür.'],
  [/fast start/, () => 'MP4 web için optimize değil (fast start kapalı) · tamamen inmeden oynamaz.'],
  [/the loop is ([\d.]+) s/, (m) => `Döngü ${m[1]} sn · 6 ile 12 sn arası en iyisi.`],
  [/poster \((\S+)\) does not have the video's shape \((\S+)\)/, (m) => `Posterin oranı (${m[1]}) videonunkiyle (${m[2]}) aynı değil.`],
];
const turkish = (s: string) => {
  for (const [re, f] of TR) {
    const m = s.match(re);
    if (m) return f(m);
  }
  return s;
};

async function dropFiles(k: Kit, key: string): Promise<void> {
  await rm(join(k.dirs.public, key), { recursive: true, force: true });
  try {
    for (const f of await readdir(k.dirs.originals)) if (f.startsWith(`${key}.`)) await rm(join(k.dirs.originals, f), { force: true });
  } catch {
    /* no originals folder yet */
  }
}

const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} kB`);

export function registerMedia(p: FastifyInstance, k: Kit): void {
  p.get('/media', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const now = k.now();
    const [imgs, loops, used] = await Promise.all([k.db.select().from(media).orderBy(desc(media.id)), k.db.query.videos.findMany({ orderBy: desc(videos.id), with: { poster: true } }), usedMedia(k)]);
    const filter = q.filter === 'noalt' || q.filter === 'unused' ? q.filter : '';
    const list = imgs.filter((m) => (filter === 'noalt' ? !m.alt.tr?.trim() || !m.alt.en?.trim() : filter === 'unused' ? !used.has(m.id) : true));
    const csrf = req.panel!.csrf;
    const loopUse = new Map<number, string>();
    for (const pr of await k.db.query.projects.findMany({ with: { texts: true } })) if (pr.loopId) loopUse.set(pr.loopId, pr.texts.find((t) => t.lang === 'tr')?.name ?? `#${pr.no}`);
    return send(k, req, reply, {
      title: 'Görseller',
      section: 'media',
      wide: true,
      body: html`
${q.error ? html`<div class="p-errors" role="alert"><b>Yüklenmedi</b><p>${q.error}</p></div>` : ''}
${section(
  'Yükle',
  html`<form method="post" action="/panel/media/upload" enctype="multipart/form-data" class="p-drop" data-upload>
${csrfField(csrf)}
<label class="p-dropzone" for="f-files"><b>Görselleri buraya bırak</b><span>ya da seçmek için tıkla · JPEG · PNG · WebP · AVIF · HEIC · en fazla 30 MB</span></label>
<input id="f-files" type="file" name="files" accept="image/*" multiple required>
<div class="p-row"><button class="p-btn" type="submit">Yükle</button></div>
<ul class="p-uploads" data-uploads aria-live="polite"></ul>
</form>`,
  { hint: 'Her görsel AVIF ve WebP olarak 320 ile 2560 piksel arası boylara çevrilir. Konum ve kamera bilgisi silinir. Aynı dosya iki kez yüklenmez.' },
)}
<div class="p-toolbar"><nav class="p-tabs" aria-label="Süz"><a href="/panel/media"${!filter ? html` aria-current="page"` : ''}>Hepsi · ${imgs.length}</a><a href="/panel/media?filter=noalt"${filter === 'noalt' ? html` aria-current="page"` : ''}>Alt metni eksik · ${imgs.filter((m) => !m.alt.tr?.trim() || !m.alt.en?.trim()).length}</a><a href="/panel/media?filter=unused"${filter === 'unused' ? html` aria-current="page"` : ''}>Kullanılmayan · ${imgs.filter((m) => !used.has(m.id)).length}</a></nav><input class="p-in p-search" type="search" placeholder="Ara · /" aria-label="Görsellerde ara" data-filter="#library"></div>
${
  list.length
    ? html`<ul class="p-library" id="library">${list.map(
        (m) => html`<li data-row><a href="/panel/media/${m.id}"><img src="${mediaUrl(m.key, 320, 'webp')}" alt="${m.alt.tr ?? ''}" width="${m.width}" height="${m.height}" loading="lazy"><span class="p-libmeta"><b>#${m.id} · ${m.source}</b><small>${m.width}×${m.height} · ${kb(m.bytes)} · ${timeTag(m.createdAt, now)}</small><span>${used.has(m.id) ? badge(`${used.get(m.id)!.length} yerde`, 'ok') : badge('kullanılmıyor', 'mute')}${!m.alt.tr?.trim() || !m.alt.en?.trim() ? badge('alt metin eksik', 'warn') : ''}</span></span></a></li>`,
      )}</ul>`
    : empty(filter ? 'Bu süzgece uyan görsel yok.' : 'Henüz görsel yok. Yukarıdan yükle.')
}
${section(
  'Döngü videoları',
  html`${
    loops.length
      ? html`<ul class="p-library" id="loops">${loops.map(
          (v) => html`<li><a href="/panel/media/loops/${v.id}"><img src="${mediaUrl(v.poster.key, 320, 'webp')}" alt="" width="${v.width}" height="${v.height}" loading="lazy"><span class="p-libmeta"><b>#${v.id} · ${v.source}</b><small>${v.width}×${v.height} · ${(v.durationMs / 1000).toFixed(1)} sn · ${kb(v.mp4Bytes)}${v.webmBytes ? ` · WebM ${kb(v.webmBytes)}` : ''}</small><span>${loopUse.has(v.id) ? badge(loopUse.get(v.id)!, 'ok') : badge('kullanılmıyor', 'mute')}</span></span></a></li>`,
        )}</ul>`
      : empty('Henüz döngü yok.')
  }
<form method="post" action="/panel/media/loops/upload" enctype="multipart/form-data" class="p-form p-loopform" data-upload-loop>
${csrfField(csrf)}
<div class="p-cols3">
<div class="p-field"><label for="f-mp4">MP4 <span class="p-req" aria-hidden="true">*</span></label><input class="p-in" id="f-mp4" type="file" name="mp4" accept="video/mp4" required></div>
<div class="p-field"><label for="f-webm">WebM</label><input class="p-in" id="f-webm" type="file" name="webm" accept="video/webm"></div>
<div class="p-field"><label for="f-poster">Poster (ilk kare) <span class="p-req" aria-hidden="true">*</span></label><input class="p-in" id="f-poster" type="file" name="poster" accept="image/*" required></div>
</div>
${pair('alt', 'Ne hareket ediyor', {}, {}, { copy: true, hint: 'Bir cümle · virgülsüz. Ekran okuyucular bunu okur.' })}
<div class="p-row"><button class="p-btn" type="submit">Döngüyü ekle</button></div>
</form>`,
  { id: 'loops', hint: html`Sessiz · kendi içinde dönen · 6 ile 12 saniye · 1280×800 · H.264 · ${Math.round(LOOP_LIMITS.warnBytes / 1_000_000)} MB altı. Nasıl hazırlanacağı docs/GORSELLER.md içinde.` },
)}`,
    });
  });

  p.get('/media.json', async (_req, reply) => {
    const imgs = await k.db.select().from(media).orderBy(desc(media.id));
    return reply.send(imgs.map((m) => ({ id: m.id, src: mediaUrl(m.key, 320, 'webp'), w: m.width, h: m.height, source: m.source, alt: m.alt.tr ?? '' })));
  });

  p.post('/media/upload', async (req, reply) => {
    const wantsJson = String(req.headers.accept ?? '').includes('application/json');
    if (!req.isMultipart()) return reply.status(415).send({ ok: false, error: 'multipart' });
    const { fields, files, tooBig } = await parts(req);
    if (!csrfOk(req, fields)) return reply.status(403).send({ ok: false, error: 'csrf' });
    const done: { id: number; name: string; src: string; w: number; h: number }[] = [];
    const failed: { name: string; error: string }[] = tooBig.map((name) => ({ name, error: 'Dosya 30 MB sınırını aşıyor.' }));
    for (const f of files) {
      try {
        const m = await ingestImage(k.db, k.dirs, f.data, { source: f.name });
        done.push({ id: m.id, name: f.name, src: mediaUrl(m.key, 320, 'webp'), w: m.width, h: m.height });
      } catch (err) {
        failed.push({ name: f.name, error: err instanceof MediaError ? turkish(err.message) : 'Görsel işlenemedi.' });
      }
    }
    if (done.length) await log(k, req, { action: 'upload', entity: 'media', entityId: done.map((d) => d.id).join(' '), summary: `${done.length} görsel yüklendi: ${done.map((d) => d.name).join(' · ').slice(0, 200)}` });
    if (wantsJson) return reply.status(done.length || !failed.length ? 200 : 422).send({ ok: !failed.length, done, failed });
    if (failed.length && !done.length) return back(reply, `/panel/media?error=${encodeURIComponent(failed[0]!.error)}`);
    return back(reply, done.length === 1 ? `/panel/media/${done[0]!.id}` : '/panel/media', 'uploaded');
  });

  const detail = async (req: FastifyRequest, reply: FastifyReply, id: number, o: { errors?: Errors; alt?: Record<string, string>; status?: number; error?: string } = {}) => {
    const [m] = await k.db.select().from(media).where(eq(media.id, id));
    if (!m) return reply.callNotFound();
    const used = (await usedMedia(k)).get(id) ?? [];
    const csrf = req.panel!.csrf;
    const e = o.errors ?? {};
    return send(k, req, reply, {
      title: `#${m.id} · ${m.source}`,
      section: 'media',
      status: o.status,
      crumbs: [{ label: 'Görseller', href: '/panel/media' }, { label: `#${m.id}` }],
      body: html`${errorSummary(e, o.error ?? null)}
<div class="p-mediadetail">
<figure class="p-big"><img src="${mediaUrl(m.key, m.widths.includes(1280) ? 1280 : m.widths.at(-1)!, 'webp')}" alt="${m.alt.tr ?? ''}" width="${m.width}" height="${m.height}"><figcaption class="mono">${m.width}×${m.height} · ${kb(m.bytes)} · <i class="p-swatch" data-color="${m.color}"></i>${m.color}</figcaption></figure>
<div>
<form method="post" action="/panel/media/${m.id}" class="p-form" data-dirty-guard>${csrfField(csrf)}
${pair('alt', 'Alt metin', { tr: o.alt?.alt_tr ?? m.alt.tr ?? '', en: o.alt?.alt_en ?? m.alt.en ?? '' }, e, { area: true, rows: 2, copy: true, hint: 'Görmeyen biri için ne görünüyor · bir cümle · virgülsüz. Yakındaki metin zaten anlatıyorsa sayfa onu boş geçer.' })}
${saveBar('Alt metni kaydet')}
</form>
${section('Nerede kullanılıyor', used.length ? html`<ul class="p-list tight">${used.map((u) => html`<li><span>${u}</span></li>`)}</ul>` : empty('Hiçbir yerde. Silinebilir.'))}
${section('Boylar', html`<p class="p-hint">AVIF ve WebP: ${m.widths.join(' · ')} piksel.</p><ul class="p-sizes mono">${m.widths.map((w) => html`<li><a href="${mediaUrl(m.key, w, 'avif')}" target="_blank" rel="noopener">${w}.avif</a> <a href="${mediaUrl(m.key, w, 'webp')}" target="_blank" rel="noopener">${w}.webp</a></li>`)}</ul>`)}
${used.length ? '' : section('Sil', actionForm(`/panel/media/${m.id}/delete`, 'Bu görseli sil', csrf, { danger: true, confirm: 'Görsel ve bütün boyları silinsin mi? Bu geri alınamaz.' }))}
</div>
</div>`,
    });
  };

  p.get('/media/:id', (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    return Number.isInteger(id) ? detail(req, reply, id) : reply.callNotFound();
  });

  p.post('/media/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [m] = Number.isInteger(id) ? await k.db.select().from(media).where(eq(media.id, id)) : [];
    if (!m) return reply.callNotFound();
    const b = bodyOf(req);
    const alt = { tr: str(b, 'alt_tr').trim(), en: str(b, 'alt_en').trim() };
    const errors: Errors = {};
    if (hasComma(alt.tr)) errors.alt_tr = COMMA;
    if (hasComma(alt.en)) errors.alt_en = COMMA;
    if (alt.tr.length > 300) errors.alt_tr = 'Alt metin kısa olmalı (300 karakter).';
    if (alt.en.length > 300) errors.alt_en = 'Alt metin kısa olmalı (300 karakter).';
    if (Object.keys(errors).length) return detail(req, reply, id, { errors, alt: { alt_tr: alt.tr, alt_en: alt.en }, status: 422 });
    await k.db.update(media).set({ alt }).where(eq(media.id, id));
    await log(k, req, { action: 'update', entity: 'media', entityId: id, summary: `Alt metin: #${id} ${m.source}`, before: { alt: m.alt }, after: { alt } });
    return back(reply, `/panel/media/${id}`, 'saved');
  });

  p.post('/media/:id/delete', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [m] = Number.isInteger(id) ? await k.db.select().from(media).where(eq(media.id, id)) : [];
    if (!m) return reply.callNotFound();
    const used = (await usedMedia(k)).get(id);
    if (used?.length) return detail(req, reply, id, { error: `Bu görsel kullanılıyor: ${used.join(' · ')}. Önce oradan kaldır.`, status: 409 });
    await k.db.delete(media).where(eq(media.id, id));
    await dropFiles(k, m.key);
    await log(k, req, { action: 'delete', entity: 'media', entityId: id, summary: `Görsel silindi: #${id} ${m.source}` });
    return back(reply, '/panel/media', 'deleted');
  });

  /* ---------------- loops ---------------- */

  p.post('/media/loops/upload', async (req, reply) => {
    if (!req.isMultipart()) return reply.status(415).send('multipart');
    const { fields, files, tooBig } = await parts(req);
    if (!csrfOk(req, fields)) return reply.status(403).send('csrf');
    const mp4 = files.find((f) => f.field === 'mp4');
    const webm = files.find((f) => f.field === 'webm');
    const poster = files.find((f) => f.field === 'poster');
    const fail = (msg: string) => back(reply, `/panel/media?error=${encodeURIComponent(msg)}#loops`);
    if (tooBig.length) return fail(`Çok büyük: ${tooBig.join(' · ')}`);
    if (!mp4 || !poster) return fail('MP4 ve poster gerekli.');
    const alt = { tr: (fields.alt_tr ?? '').trim(), en: (fields.alt_en ?? '').trim() };
    if (hasComma(alt.tr) || hasComma(alt.en)) return fail(COMMA);
    try {
      const { video, warnings } = await ingestLoop(k.db, k.dirs, { mp4: mp4.data, webm: webm?.data, poster: poster.data, alt, source: mp4.name });
      await log(k, req, { action: 'upload', entity: 'video', entityId: video.id, summary: `Döngü yüklendi: ${mp4.name}`, after: { warnings } });
      return back(reply, `/panel/media/loops/${video.id}${warnings.length ? `?warn=${encodeURIComponent(warnings.map(turkish).join('\n'))}` : ''}`, 'uploaded');
    } catch (err) {
      return fail(err instanceof MediaError ? turkish(err.message) : 'Döngü işlenemedi.');
    }
  });

  const loopPage = async (req: FastifyRequest, reply: FastifyReply, id: number, o: { errors?: Errors; error?: string; status?: number } = {}) => {
    const v = await k.db.query.videos.findFirst({ where: eq(videos.id, id), with: { poster: true } });
    if (!v) return reply.callNotFound();
    const users = await k.db.query.projects.findMany({ where: eq(projects.loopId, id), with: { texts: true } });
    const warn = (req.query as Record<string, string>).warn;
    const csrf = req.panel!.csrf;
    return send(k, req, reply, {
      title: `Döngü #${v.id}`,
      section: 'media',
      status: o.status,
      crumbs: [{ label: 'Görseller', href: '/panel/media#loops' }, { label: `Döngü #${v.id}` }],
      body: html`${errorSummary(o.errors ?? {}, o.error ?? null)}
${warn ? html`<div class="p-note warn"><b>Bir sonraki dışa aktarımda düzeltilebilir</b><ul>${warn.split('\n').map((w) => html`<li>${w}</li>`)}</ul></div>` : ''}
<div class="p-mediadetail">
<figure class="p-big"><video src="${loopUrl(v.key, 'mp4')}" poster="${mediaUrl(v.poster.key, 1280, 'webp')}" muted loop playsinline controls width="${v.width}" height="${v.height}"></video><figcaption class="mono">${v.width}×${v.height} · ${(v.durationMs / 1000).toFixed(1)} sn · MP4 ${kb(v.mp4Bytes)}${v.webmBytes ? ` · WebM ${kb(v.webmBytes)}` : ''}</figcaption></figure>
<div>
<form method="post" action="/panel/media/loops/${v.id}" class="p-form" data-dirty-guard>${csrfField(csrf)}
${pair('alt', 'Ne hareket ediyor', { tr: v.alt.tr ?? '', en: v.alt.en ?? '' }, o.errors ?? {}, { area: true, rows: 2, copy: true })}
${saveBar('Kaydet')}
</form>
${section('Nerede kullanılıyor', users.length ? html`<ul class="p-list tight">${users.map((u) => html`<li><a href="/panel/projects/${u.id}"><span>${u.texts.find((t) => t.lang === 'tr')?.name ?? `#${u.no}`}</span></a></li>`)}</ul>` : empty('Hiçbir işte. Bir hareket işine bağlamak için o işin formundan seç.'))}
${users.length ? '' : section('Sil', actionForm(`/panel/media/loops/${v.id}/delete`, 'Döngüyü sil', csrf, { danger: true, confirm: 'Döngü silinsin mi? Poster görsel kitaplığında kalır.' }))}
</div></div>`,
    });
  };

  p.get('/media/loops/:id', (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    return Number.isInteger(id) ? loopPage(req, reply, id) : reply.callNotFound();
  });

  p.post('/media/loops/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [v] = Number.isInteger(id) ? await k.db.select().from(videos).where(eq(videos.id, id)) : [];
    if (!v) return reply.callNotFound();
    const b = bodyOf(req);
    const alt = { tr: str(b, 'alt_tr').trim(), en: str(b, 'alt_en').trim() };
    const errors: Errors = {};
    if (hasComma(alt.tr)) errors.alt_tr = COMMA;
    if (hasComma(alt.en)) errors.alt_en = COMMA;
    if (Object.keys(errors).length) return loopPage(req, reply, id, { errors, status: 422 });
    await k.db.update(videos).set({ alt }).where(eq(videos.id, id));
    await log(k, req, { action: 'update', entity: 'video', entityId: id, summary: `Döngü alt metni: #${id}`, before: { alt: v.alt }, after: { alt } });
    return back(reply, `/panel/media/loops/${id}`, 'saved');
  });

  p.post('/media/loops/:id/delete', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [v] = Number.isInteger(id) ? await k.db.select().from(videos).where(eq(videos.id, id)) : [];
    if (!v) return reply.callNotFound();
    const [user] = await k.db.select({ id: projects.id }).from(projects).where(eq(projects.loopId, id));
    if (user) return loopPage(req, reply, id, { error: 'Bu döngü bir işte kullanılıyor.', status: 409 });
    await k.db.delete(videos).where(eq(videos.id, id));
    await rm(join(k.dirs.public, v.key), { recursive: true, force: true });
    await log(k, req, { action: 'delete', entity: 'video', entityId: id, summary: `Döngü silindi: ${v.source}` });
    return back(reply, '/panel/media#loops', 'deleted');
  });
}
