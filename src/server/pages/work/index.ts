import { listProjects, nextProjectNumber, type ProjectCard } from '../../data/content';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { coverOrArt, FRAME_SIZE, GROUP_CLASS } from './art';

/** Fills [AY] · [MONTH] with the month from the panel (Site ayarları). */
const withMonth = (line: string, month: string | null) => (month ? line.replace(/\[(AY|MONTH)\]/, month) : line);

/**
 * Work · the Layers panel. Every project is a layer in one file: groups can be hidden with their eye ·
 * hovering a layer pulls its frame along with the pointer · the canvas view shows them all at once.
 * NDA projects are locked layers. Without JS the list still reads top to bottom and every layer links.
 */
export interface WorkData {
  live: ProjectCard[];
  locked: ProjectCard[];
  next: number;
}

const GROUPS = [
  { k: 'web', name: msg('Web siteleri') },
  { k: 'app', name: msg('Uygulamalar') },
  { k: 'identity', name: msg('Kimlik') },
  { k: 'motion', name: msg('Hareket') },
] as const;

const pad = (n: number) => String(n).padStart(3, '0');

/** Puts markup where {n} sits in a translated sentence (the word order differs between languages). */
function slot(text: string, node: Safe): Safe {
  const [a = '', b = ''] = text.split('\u0000');
  return html`${a}${node}${b}`;
}

const EYE = raw(
  '<svg class="eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"></path><circle class="pu" cx="12" cy="12" r="2.8"></circle><path class="sl" d="M4 20L20 4"></path></svg>',
);
const ARROW = raw('<svg class="ra" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"></path></svg>');
const LOCK = raw('<svg class="lki" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"></rect><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"></path></svg>');

function hero(ctx: Ctx, d: WorkData): Safe {
  const { t } = ctx;
  const count = (g: string) => d.live.filter((p) => p.discipline === g).length;
  const since = Math.min(...d.live.map((p) => p.year), ctx.now.getFullYear());
  return html`<section class="whero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('İşler')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="design" data-rest-at="0.92 0.62">${t('İşler')}<span class="cnt" data-count data-rest="motion" data-rest-at="end 10 -6">${d.live.length}</span></h1>
<p class="lede">${t('Web siteleri ve uygulamalar ve kimlikler ve filmler. Gerçek şeyler üreten insanlarla.')}</p>
<div class="howto mono" aria-hidden="true"><span><kbd>◐</kbd>${t('Gizlemek için grubu kapat')}</span><span class="hv"><kbd>↗</kbd>${t('Göz atmak için katmanın üstüne gel')}</span></div>
<div class="lp" role="group" aria-label="${t('Katmanlar')}">
<div class="lph mono"><span>${t('Katmanlar')}</span><b data-vis aria-live="polite">${t('{n} görünür', { n: d.live.length })}</b></div>
${GROUPS.map(
  (g) => html`<button type="button" class="grow g-${GROUP_CLASS[g.k]}" data-gr="${g.k}" aria-pressed="true"><i class="chev" aria-hidden="true"></i>${EYE}<span class="gi" aria-hidden="true"></span><b>${t(g.name)}</b><span class="n mono">${count(g.k)}</span></button>`,
)}
<div class="lpf mono">
<span>${t('Görünüm')}<span class="seg" role="group" aria-label="${t('Görünüm')}"><button type="button" class="sg on" data-view="layers" aria-pressed="true">${t('Katmanlar')}</button><button type="button" class="sg" data-view="canvas" aria-pressed="false" data-rest="code" data-rest-at="0.5 1.1">${t('Tuval')}</button></span></span>
<span>${t('Sırala')}<span class="seg" role="group" aria-label="${t('Sırala')}"><button type="button" class="sg on" data-sort="new" aria-pressed="true">${t('Yeni')}</button><button type="button" class="sg" data-sort="az" aria-pressed="false">A–Z</button></span></span>
</div>
</div>
<div class="hfoot mono"><span>${t('Seçili işler · {y} – bugün', { y: since })}</span><span aria-hidden="true">${t('Kaydır ↓')}</span></div>
</div></section>`;
}

function layers(ctx: Ctx, d: WorkData): Safe {
  const { t, lang } = ctx;
  const link = (p: ProjectCard) => href(lang, 'case', { slug: p.slug });
  return html`<section class="list" data-sec="list" data-host="design">
<div class="cols mono" aria-hidden="true"><span></span><span>No.</span><span>${t('Katman')}</span><span class="ck2">${t('Tür')}</span><span class="ry">${t('Yıl')}</span><span></span></div>
<ul class="rows" data-rows>${d.live.map(
    (p, i) => html`<li class="row g-${GROUP_CLASS[p.discipline]}" data-g="${p.discipline}" data-i="${i}" data-name="${p.name}"><div class="rin"><a class="rw" href="${link(p)}"${p.textLang !== lang ? html` lang="${p.textLang}"` : ''}>
<span class="gi" aria-hidden="true"></span><span class="rno mono">${p.number}</span><span class="rn"><span>${p.name}</span>${p.here ? html`<span class="here mono">${t('Buradasın')}</span>` : ''}</span><span class="rk mono">${p.kind}</span><span class="ry mono">${p.year}</span>${ARROW}
</a></div></li>`,
  )}</ul>
<div class="grid" data-grid hidden>${d.live.map(
    (p, i) => html`<a class="cell g-${GROUP_CLASS[p.discipline]}" data-g="${p.discipline}" data-i="${i}" href="${link(p)}">
<span class="cl mono"><b>${p.number}</b><span>${FRAME_SIZE[p.discipline]}</span></span><span class="cf">${coverOrArt(p, lang, '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 440px', { on: true })}</span><span class="cn">${p.name}</span><span class="ck mono">${p.kind} · ${p.year}</span>
</a>`,
  )}</div>
<div class="empty wrap" data-empty hidden><b>${t('Bütün katmanlar gizli. Çok minimal.')}</b><button type="button" class="btn g" data-showall>${t('Tüm katmanları göster')}</button></div>
</section>
<div class="pv" data-pv aria-hidden="true">
<span class="pvl mono"><b data-pvno></b><span data-pvname></span></span>
<span class="pvf">${d.live.map((p, i) => coverOrArt(p, lang, '440px', { index: i }))}<i class="h h1"></i><i class="h h2"></i><i class="h h3"></i><i class="h h4"></i></span>
<span class="pvs mono" data-pvsize></span>
</div>`;
}

function locked(ctx: Ctx, d: WorkData): Safe {
  const { t } = ctx;
  if (!d.locked.length) return html``;
  const list = d.locked.map((p) => p.number).join(t(' ve '));
  return html`<section class="lock" data-sec="lock" data-host="design">
<div class="lkh"><h2 class="h2">${t('Kilitli katmanlar.')}</h2><p data-rest="host" data-rest-at="0.3 -0.2">${t('Henüz gösteremediğimiz projeler. {list} buraya gitti. Yüz yüze sor ve izin verilen her şeyi anlatalım.', { list })}</p></div>
<div class="lks">${d.locked.map(
    (p) => html`<button type="button" class="lkr" data-knock><span class="sr">${t('Kilitli proje.')} </span>${LOCK}<span class="mono">${p.number}</span><span class="red" aria-hidden="true"></span><span class="msg mono"><span>${p.kind}</span><span>${t('Kahvede sor')}</span></span><span class="ry mono">${p.year}</span><span></span></button>`,
  )}</div>
</section>`;
}

function ask(ctx: Ctx, d: WorkData): Safe {
  const { t, lang } = ctx;
  return html`<section class="ask" data-sec="ask" data-host="design"><div class="wrap">
<h2 class="askt">${t('Senin projen')}<br>${slot(t('{n} numaralı katman olabilir.', { n: '\u0000' }), html`<span class="badge" data-rest="host" data-rest-at="1 0.9 14 0">${pad(d.next)}</span>`)}</h2>
<div class="askr"><p>${withMonth(t('Aynı anda az sayıda proje alıyoruz ki her biri bütün ekibi alsın. Bir sonraki boş yer [AY] ayında açılıyor.'), ctx.settings.month('work.nextMonth', lang))}</p><div><a class="btn f" href="${href(lang, 'start')}">${t('Proje başlat')} <span aria-hidden="true">↗</span></a><a class="btn g" href="${href(lang, 'process')}">${t('Nasıl çalışıyoruz')}</a></div></div>
</div></section>`;
}

export const workPage: Page<WorkData> = {
  id: 'work',
  theme: 'ink',
  host: 'design',
  section: 'work',
  scripts: ['work'],
  styles: ['work'],
  title: (t) => t('İşler'),
  description: (t) => t('Tasarladığımız ve kodladığımız projeler.'),
  load: async (ctx) => {
    const all = await listProjects(ctx.db, ctx.lang);
    return { live: all.filter((p) => p.status === 'live'), locked: all.filter((p) => p.status === 'nda'), next: await nextProjectNumber(ctx.db) };
  },
  /** The preview frame's label for each layer: number · name · frame size. */
  data: (_ctx, d) => ({ layers: d.live.map((p) => ({ no: p.number, name: p.name, size: FRAME_SIZE[p.discipline], g: p.discipline })), next: pad(d.next) }),
  body: (ctx, d) => html`${hero(ctx, d)}
${layers(ctx, d)}
${locked(ctx, d)}
${ask(ctx, d)}`,
  next: { to: 'services', kick: msg('Sonraki sayfa'), big: msg('Hizmetler'), tone: 'paper' },
};

