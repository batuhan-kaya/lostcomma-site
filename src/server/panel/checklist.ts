/**
 * The launch checklist on the Pano: everything that still stands between the site and going live ·
 * each line links to where it gets fixed. "must" lines block a launch · "tip" lines are advice.
 */
import { and, count, eq, isNotNull, lte } from 'drizzle-orm';
import { SETTINGS } from '../data/settings';
import { media, notes, noteText, outbox, people, peopleText, projects, projectText, videos } from '../db/schema';
import { SAMPLE_NOTES, SAMPLE_PROJECTS } from '../db/sample';
import { StorySchema, storyMedia } from '../db/story';
import type { Kit } from './kit';

export interface Check {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  href: string;
  kind: 'must' | 'tip';
}

const PLACEHOLDER = /\[[^\]\n]{1,60}\]/;

/** Media ids something on the site shows (covers · portraits · posters · case study images). */
export async function usedMedia(k: Kit): Promise<Map<number, string[]>> {
  const used = new Map<number, string[]>();
  const add = (id: number | null | undefined, where: string) => {
    if (!id) return;
    used.set(id, [...(used.get(id) ?? []), where]);
  };
  const projs = await k.db.query.projects.findMany({ with: { texts: true } });
  for (const p of projs) {
    const name = p.texts.find((t) => t.lang === 'tr')?.name ?? `#${p.no}`;
    add(p.coverId, `${name} · kapak`);
    const s = p.story ? StorySchema.safeParse(p.story) : null;
    if (s?.success) for (const id of storyMedia(s.data)) add(id, `${name} · vaka hikâyesi`);
  }
  for (const person of await k.db.select().from(people)) add(person.portraitId, `${person.name} · portre`);
  for (const n of await k.db.select({ coverId: notes.coverId, id: notes.id }).from(notes)) add(n.coverId, `Not #${n.id} · kapak`);
  for (const v of await k.db.select().from(videos)) add(v.posterId, `Döngü ${v.source} · poster`);
  return used;
}

export async function readiness(k: Kit): Promise<Check[]> {
  const db = k.db;
  const now = k.now();
  const out: Check[] = [];
  const s = k.settings;

  const prices = SETTINGS.filter((x) => x.group !== 'studio');
  const filledPrices = prices.filter((x) => s.filled(x.key)).length;
  out.push({ key: 'prices', label: 'Fiyatlar', ok: filledPrices === prices.length, detail: `${filledPrices} / ${prices.length} fiyat girildi (iki dilde)`, href: '/panel/settings#prices', kind: 'must' });
  out.push({ key: 'month', label: 'Bir sonraki boş yer', ok: s.filled('work.nextMonth'), detail: s.filled('work.nextMonth') ? `${s.month('work.nextMonth', 'tr')}` : 'İşler sayfasında [AY] yazıyor', href: '/panel/settings#studio', kind: 'must' });
  out.push({ key: 'address', label: 'Stüdyo adresi', ok: s.filled('studio.address'), detail: s.filled('studio.address') ? String(s.raw('studio.address')) : 'Stüdyo sayfasında [ADRES] yazıyor', href: '/panel/settings#studio', kind: 'must' });
  out.push({ key: 'phone', label: 'Telefon', ok: s.filled('studio.phone'), detail: s.filled('studio.phone') ? String(s.raw('studio.phone')) : 'Başla sayfasında [+90 telefon] yazıyor', href: '/panel/settings#studio', kind: 'must' });
  out.push({ key: 'controller', label: 'Veri sorumlusu', ok: s.filled('legal.controller'), detail: s.filled('legal.controller') ? String(s.raw('legal.controller')) : 'Gizlilik ve KVKK sayfalarında [VERİ SORUMLUSU] yazıyor', href: '/panel/settings#legal', kind: 'must' });
  out.push({ key: 'mailservice', label: 'E-posta servisi', ok: s.filled('legal.mail'), detail: s.filled('legal.mail') ? String(s.raw('legal.mail')) : 'KVKK metnindeki yurt dışına aktarım bölümünde [E-POSTA SERVİSİ] yazıyor', href: '/panel/settings#legal', kind: 'must' });

  const team = await db.query.people.findMany({ with: { texts: true } });
  const unnamed = team.filter((p) => PLACEHOLDER.test(p.name));
  out.push({ key: 'names', label: 'Ekip adları', ok: !unnamed.length, detail: unnamed.length ? `${unnamed.length} kişide hâlâ [Name] yazıyor` : 'Üç kişinin de adı var', href: '/panel/people', kind: 'must' });
  const noPortrait = team.filter((p) => !p.portraitId);
  out.push({ key: 'portraits', label: 'Portreler', ok: !noPortrait.length, detail: noPortrait.length ? `${noPortrait.length} portre eksik` : 'Üç portre de var', href: '/panel/people', kind: 'must' });
  const teamText = team.filter((p) => p.texts.some((t) => Object.values(t).some((v) => typeof v === 'string' && PLACEHOLDER.test(v))));
  if (teamText.length) out.push({ key: 'team-text', label: 'Ekip metinleri', ok: false, detail: `${teamText.length} kişide köşeli parantezli yer tutucu var`, href: '/panel/people', kind: 'must' });

  const sampleSlugs = new Set(SAMPLE_PROJECTS.map((p) => p.text.tr.slug));
  const projs = await db.query.projects.findMany({ with: { texts: true } });
  const live = projs.filter((p) => p.status === 'live');
  const liveSample = live.filter((p) => p.texts.some((t) => t.lang === 'tr' && sampleSlugs.has(t.slug)));
  out.push({ key: 'real-work', label: 'Gerçek işler', ok: live.length > liveSample.length && !liveSample.length, detail: liveSample.length ? `${liveSample.length} örnek iş yayında · ${live.length - liveSample.length} gerçek iş` : `${live.length} iş yayında`, href: '/panel/projects', kind: 'must' });
  const noCover = live.filter((p) => !p.coverId);
  out.push({ key: 'covers', label: 'Kapaklar', ok: !noCover.length, detail: noCover.length ? `${noCover.length} yayındaki işin kapağı yok (çizim gösteriliyor)` : 'Her yayındaki işin kapağı var', href: '/panel/projects', kind: 'must' });
  const holes = projs.filter((p) => p.status !== 'draft' && (p.texts.some((t) => [t.name, t.kind, t.summary, t.client].some((v) => PLACEHOLDER.test(v))) || PLACEHOLDER.test(JSON.stringify(p.story ?? {}))));
  out.push({ key: 'placeholders', label: 'Yer tutucular', ok: !holes.length, detail: holes.length ? `${holes.length} işte [X] · [İsim] gibi yer tutucu var` : 'İşlerde yer tutucu kalmadı', href: '/panel/projects', kind: 'must' });

  const sampleNotes = new Set(SAMPLE_NOTES.flatMap((n) => Object.values(n.text).map((t) => t!.slug)));
  const pub = await db.query.notes.findMany({ where: and(isNotNull(notes.publishedAt), lte(notes.publishedAt, now)), with: { texts: true } });
  const pubSample = pub.filter((n) => n.texts.some((t) => sampleNotes.has(t.slug)));
  out.push({ key: 'notes', label: 'Notlar', ok: !pubSample.length, detail: pubSample.length ? `${pubSample.length} örnek not yayında` : `${pub.length} not yayında`, href: '/panel/notes', kind: 'must' });

  const used = await usedMedia(k);
  const imgs = await db.select().from(media);
  const noAlt = imgs.filter((m) => used.has(m.id) && (!m.alt.tr?.trim() || !m.alt.en?.trim()));
  out.push({ key: 'alt', label: 'Alt metinler', ok: !noAlt.length, detail: noAlt.length ? `Kullanılan ${noAlt.length} görselin alt metni eksik` : 'Kullanılan her görselin iki dilde alt metni var', href: '/panel/media?filter=noalt', kind: 'must' });

  out.push({ key: 'mail', label: 'E-posta', ok: k.postman.on, detail: k.postman.on ? 'MAIL_URL ayarlı · bildirimler gidiyor' : 'MAIL_URL boş · bildirimler outbox tablosunda bekliyor', href: '/panel/mail', kind: 'must' });
  const [failed] = await db.select({ n: count() }).from(outbox).where(eq(outbox.status, 'failed'));
  if (failed?.n) out.push({ key: 'outbox', label: 'Gönderilemeyen e-postalar', ok: false, detail: `${failed.n} e-posta gönderilemedi`, href: '/panel/mail?status=failed', kind: 'must' });

  const user = await db.query.panelUser.findFirst();
  out.push({ key: 'totp', label: 'İki adımlı doğrulama', ok: !!user?.totpSecret, detail: user?.totpSecret ? 'Açık' : 'Önerilir: panel internete açık', href: '/panel/account#totp', kind: 'tip' });
  if (k.config.PANEL_PASSWORD) out.push({ key: 'env', label: 'PANEL_PASSWORD', ok: false, detail: 'Şifre konduktan sonra ortam değişkeninden silinebilir', href: '/panel/account', kind: 'tip' });

  void projectText;
  void noteText;
  void peopleText;
  return out;
}
