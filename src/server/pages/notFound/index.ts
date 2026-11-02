import { SERVICE_KEYS, SERVICE_SLUGS, SERVICES } from '../../content/services';
import { mapEntries, type MapEntry } from '../../data/content';
import { html, raw, type Safe } from '../../html';
import type { Lang, T } from '../../i18n';
import type { Ctx, Page } from '../../page';
import { href, type RouteId } from '../../routes';
import { addressKey, chart, distance, EDGE, isClose, placeYou, RING, type Placed, type Spot } from '../../../shared/lost';

/**
 * 404 · "This place is not on the map". The whole site drawn as a star chart: home in the middle ·
 * the main pages on the first ring · their own pages on the second. The visitor is a lost comma
 * standing next to the page their address came closest to (counted in letters). Every star is a
 * link · hovering one draws the way there and says how many letters away it is.
 * Without JS it is the same chart with the way to the closest page already drawn.
 */
export interface MapNode extends Spot {
  key: string;
  href: string;
  label: string;
  /** Set when the label is in the other language (a note written in one language only). */
  lang: Lang | null;
  ring: 0 | 1 | 2;
  parent: number | null;
  /** Letters between the typed address and this page. */
  d: number;
}

export interface LostData {
  typed: string;
  nodes: MapNode[];
  target: number;
  close: boolean;
  you: Placed;
}

const MAIN: { id: RouteId; label: (t: T) => string }[] = [
  { id: 'work', label: (t) => t('İşler') },
  { id: 'services', label: (t) => t('Hizmetler') },
  { id: 'process', label: (t) => t('Süreç') },
  { id: 'studio', label: (t) => t('Stüdyo') },
  { id: 'notes', label: (t) => t('Notes') },
  { id: 'lab', label: (t) => t('Lab') },
  { id: 'start', label: (t) => t('Başla') },
];
/** How many of a page's own pages the chart shows (all of them are measured). */
const SHOWN: Partial<Record<RouteId, number>> = { work: 4, services: 4, notes: 3 };

interface Kid {
  key: string;
  href: string;
  label: string;
  lang: Lang | null;
  d: number;
}

function entryKids(ctx: Ctx, id: 'case' | 'note', list: MapEntry[], typed: string): Kid[] {
  const other: Lang = ctx.lang === 'tr' ? 'en' : 'tr';
  return list.flatMap((e, i) => {
    const lang = e.slugs[ctx.lang] ? ctx.lang : other;
    const slug = e.slugs[lang];
    if (!slug) return [];
    const addrs = (['tr', 'en'] as const).flatMap((l) => (e.slugs[l] ? [href(l, id, { slug: e.slugs[l]! })] : []));
    return [{ key: `${id}-${i}`, href: href(lang, id, { slug }), label: short(e.names[lang] ?? slug), lang: lang === ctx.lang ? null : lang, d: distance(typed, addrs) }];
  });
}

/** Labels on the chart stay short. */
const short = (s: string, n = 20) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const shownPath = (typed: string) => `/${short(typed, 22)}`;

/** The first few · and the closest one even when it is further down the list. */
function pick(kids: Kid[], n: number): Kid[] {
  const shown = kids.slice(0, n);
  const best = kids.reduce<Kid | null>((b, k) => (!b || k.d < b.d ? k : b), null);
  if (best && !shown.includes(best)) shown[shown.length - 1] = best;
  return shown;
}

export async function lostMap(ctx: Ctx): Promise<LostData> {
  const { t, lang } = ctx;
  const typed = addressKey(ctx.path);
  const both = (id: RouteId, params?: Record<string, string>) => [href('tr', id, params), href('en', id, params)];
  const { cases, notes } = await mapEntries(ctx.db, ctx.now);

  const kidsOf: Record<string, Kid[]> = {
    work: pick(entryKids(ctx, 'case', cases, typed), SHOWN.work!),
    services: SERVICE_KEYS.map((k) => ({
      key: `service-${k}`,
      href: href(lang, 'service', { slug: SERVICE_SLUGS[k][lang] }),
      label: SERVICES[lang].services[k].name,
      lang: null,
      d: Math.min(...(['tr', 'en'] as const).map((l) => distance(typed, [href(l, 'service', { slug: SERVICE_SLUGS[k][l] })]))),
    })),
    notes: pick(entryKids(ctx, 'note', notes, typed), SHOWN.notes!),
  };

  const layout = chart(MAIN.map((m) => kidsOf[m.id]?.length ?? 0));
  const nodes: MapNode[] = [{ key: 'home', href: href(lang, 'home'), label: t('Ana sayfa'), lang: null, ring: 0, parent: null, d: distance(typed, both('home')), x: 0, y: 0, side: 'b' }];
  MAIN.forEach((m, i) => {
    const at = nodes.length;
    nodes.push({ key: m.id, href: href(lang, m.id), label: m.label(t), lang: null, ring: 1, parent: 0, d: distance(typed, both(m.id)), ...layout.main[i]! });
    (kidsOf[m.id] ?? []).forEach((k, j) => nodes.push({ ...k, ring: 2, parent: at, ...layout.kids[i]![j]! }));
  });

  // The closest page · on a tie the one nearer the middle (a main page before one of its own).
  let target = 0;
  nodes.forEach((n, i) => {
    const b = nodes[target]!;
    if (n.d < b.d || (n.d === b.d && n.ring < b.ring)) target = i;
  });
  const close = typed.length > 0 && isClose(nodes[target]!.d, typed);
  if (!close) target = 0;
  return { typed, nodes, target, close, you: placeYou(nodes, target, nodes[target]!.d, close, `${t('sen')} ${shownPath(typed)}`) };
}

export function lettersAway(t: T, d: number): string {
  return d === 0 ? t('Sadece dili farklı') : d === 1 ? t('1 harf uzakta') : t('{n} harf uzakta', { n: d });
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function label(n: MapNode): { x: number; y: number; anchor: string } {
  const g = n.ring === 0 ? 7 : n.ring === 1 ? 6.4 : 5;
  if (n.side === 'r') return { x: r2(n.x + g), y: r2(n.y + 1.2), anchor: 'start' };
  if (n.side === 'l') return { x: r2(n.x - g), y: r2(n.y + 1.2), anchor: 'end' };
  if (n.side === 't') return { x: n.x, y: r2(n.y - g - 0.6), anchor: 'middle' };
  return { x: n.x, y: r2(n.y + g + 2.6), anchor: 'middle' };
}

/** A comma drawn as a shape (the head and its tail) · centred on the head. */
const COMMA = 'M3 0A3 3 0 1 1-3 0A3 3 0 1 1 3 0ZM2.3 1.9Q3.1 5.4-1.6 7.8Q.3 5.5-.8 2.9Z';

function grid(): Safe {
  const ticks: string[] = [];
  for (let a = 0; a < 360; a += 6) {
    const long = a % 30 === 0;
    const rad = (a * Math.PI) / 180;
    const r1 = EDGE + (long ? -3 : -1.4);
    ticks.push(`M${r2(Math.cos(rad) * r1)} ${r2(Math.sin(rad) * r1)}L${r2(Math.cos(rad) * EDGE)} ${r2(Math.sin(rad) * EDGE)}`);
  }
  return html`<g class="grid" aria-hidden="true"><path class="cross" d="M-${EDGE} 0H${EDGE}M0 -${EDGE}V${EDGE}"/><circle r="${RING[1]}"/><circle r="${RING[2]}"/><circle class="edge" r="${EDGE}"/><path class="ticks" d="${ticks.join('')}"/></g>`;
}

export function mapSvg(ctx: Ctx, d: LostData): Safe {
  const { t } = ctx;
  const target = d.nodes[d.target]!;
  const lines = d.nodes
    .filter((n) => n.parent !== null)
    .map((n) => {
      const p = d.nodes[n.parent!]!;
      return `M${p.x} ${p.y}L${n.x} ${n.y}`;
    })
    .join('');
  const shown = shownPath(d.typed);
  const side = d.you.side;
  const yl = side === 'r' ? { x: 5.5, y: 1.1, a: 'start' } : side === 'l' ? { x: -5.5, y: 1.1, a: 'end' } : { x: 0, y: 12.8, a: 'middle' };
  return html`<svg class="map" viewBox="-100 -100 200 200" role="group" aria-label="${t('Sitenin haritası')}" data-map>
${grid()}
<path class="edges" d="${lines}" aria-hidden="true"/>
<path class="route" d="M${d.you.x} ${d.you.y}L${target.x} ${target.y}" aria-hidden="true" data-route/>
<g class="nodes">${d.nodes.map((n, i) => {
    const l = label(n);
    return html`<a class="nd r${n.ring}${i === d.target ? ' on' : ''}" href="${n.href}" data-node data-x="${n.x}" data-y="${n.y}" data-d="${n.d}"${n.lang ? html` hreflang="${n.lang}"` : ''}><circle class="hit" cx="${n.x}" cy="${n.y}" r="8.5"/><circle class="halo" cx="${n.x}" cy="${n.y}" r="${n.ring === 0 ? 6.2 : n.ring === 1 ? 4.6 : 3.6}"/><circle class="dot" cx="${n.x}" cy="${n.y}" r="${n.ring === 0 ? 3 : n.ring === 1 ? 2.1 : 1.3}"/><text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}"${n.lang ? html` lang="${n.lang}"` : ''}>${n.label}</text></a>`;
  })}</g>
<g class="me${d.close ? '' : ' off'}" transform="translate(${d.you.x} ${d.you.y})" aria-hidden="true" data-you-at data-x="${d.you.x}" data-y="${d.you.y}"><circle class="ping" r="5"/><g class="bob"><path class="cm" d="${COMMA}"/></g><text class="yl" x="${yl.x}" y="${yl.y}" text-anchor="${yl.a}">${t('sen')}<tspan class="yp"> ${shown}</tspan></text></g>
</svg>`;
}

export function readout(ctx: Ctx, d: LostData): Safe {
  const { t } = ctx;
  const n = d.nodes[d.target]!;
  return html`<div class="near" data-near>
<span class="mono nk" data-rk>${d.close ? t('En yakın sayfa') : t('Yakında bir sayfa yok')}</span>
<a class="nl" href="${n.href}" data-rname${n.lang ? html` hreflang="${n.lang}"` : ''}><span data-rlabel${n.lang ? html` lang="${n.lang}"` : ''}>${n.label}</span> <span aria-hidden="true">→</span></a>
<span class="mono nd2" data-rd>${d.close ? lettersAway(t, n.d) : t('Haritanın ortasından başla')}</span>
</div>`;
}

export const notFound: Page<LostData> = {
  id: 'notFound',
  theme: 'ink',
  host: 'design',
  bare: true,
  noindex: true,
  scripts: ['notfound'],
  styles: ['notfound'],
  title: (t) => t('Sayfa bulunamadı'),
  description: (t) => t('Bu adreste bir sayfa yok.'),
  load: (ctx) => lostMap(ctx),
  data: (_ctx, d) => ({ close: d.close, target: d.target }),
  body: (ctx, d) => html`<section class="lost" data-sec="hero" id="top"><div class="wrap">
<div class="lt">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>404</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="design" data-rest-at="end 14 -14">${ctx.t('Burası haritada yok.')}</h1>
<p class="lede" data-rest="motion" data-rest-at="end 12 -4">${ctx.t('Yazdığın adres sitemizde hiçbir yere çıkmıyor.')} ${ctx.t('Dert etme. Kaybolmak adımızda var.')}</p>
${readout(ctx, d)}
<p class="hint mono"><span class="hv">${ctx.t('Haritada bir noktanın üstüne gel. Kaç harf uzakta olduğunu gösterir.')}</span><span class="tc">${ctx.t('Haritadaki her nokta bir sayfa.')}</span></p>
</div>
<figure class="mapf" data-rest="code" data-rest-at="0.86 0.12">
${mapSvg(ctx, d)}
<figcaption class="legend mono" aria-hidden="true"><span><i class="key dot"></i>${ctx.t('Sayfa')}</span><span><i class="key ring"></i>${ctx.t('En yakın')}</span><span><svg class="key cm" viewBox="-5 -5 10 14">${raw(`<path d="${COMMA}"/>`)}</svg>${ctx.t('Sen')}</span></figcaption>
</figure>
</div></section>`,
};
