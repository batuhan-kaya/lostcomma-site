/**
 * İstatistik (docs/ISTATISTIK.md): who is on the site now · how many came · from where · what they
 * read · what they clicked · one visit as a timeline · a page with its clicks on top.
 * Charts are SVG drawn here · bars are <progress> (no style attributes under the CSP).
 */
import type { FastifyInstance } from 'fastify';
import * as q from '../../data/stats';
import type { Db } from '../../db';
import { html, raw, type Safe } from '../../html';
import { sourceName } from '../../stats/source';
import { send, type Kit } from '../kit';
import { empty, section, timeTag, when } from '../ui';

const fmtN = (n: number) => n.toLocaleString('tr-TR');
export const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} dk ${String(s % 60).padStart(2, '0')} sn` : `${Math.floor(m / 60)} sa ${m % 60} dk`;
};
const change = (a: number, b: number) => {
  if (!b) return a ? html`<i class="p-delta up">yeni</i>` : '';
  const d = Math.round(((a - b) / b) * 100);
  return d ? html`<i class="p-delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%</i>` : html`<i class="p-delta">aynı</i>`;
};
/** "compared with yesterday" · "compared with the 7 days before" */
const PREV: Record<q.PeriodKey, string> = { today: 'düne göre', '7d': 'önceki 7 güne göre', '30d': 'önceki 30 güne göre', '90d': 'önceki 90 güne göre', '12m': 'önceki yıla göre' };
const placeOf = (country: string, city: string) => [city, q.countryName(country)].filter(Boolean).join(' · ');
const srcOf = (v: { refHost: string; utmSource: string; utmCampaign: string }) => sourceName(v.refHost) + (v.utmSource ? ` · ${v.utmSource}` : '') + (v.utmCampaign ? ` · ${v.utmCampaign}` : '');

function periodTabs(r: q.Range, base: string, extra = ''): Safe {
  return html`<nav class="p-tabs" aria-label="Dönem">${q.PERIODS.map((p) => html`<a href="${base}?p=${p.key}${extra}"${p.key === r.key ? html` aria-current="page"` : ''}>${p.label}</a>`)}</nav>`;
}

/**
 * Bars for visits · a line for page views · one column per hour · day or week. The drawing stretches
 * to its box (preserveAspectRatio none) · the numbers beside and under it are HTML so they stay at
 * reading size on every width.
 */
function chart(points: q.Point[], bucket: q.Range['bucket']): Safe {
  const W = Math.max(1, points.length);
  const H = 100;
  const top = Math.max(4, ...points.map((p) => p.views));
  const max = top + (top % 2); // even: the middle line is a whole number
  const y = (v: number) => H * (1 - v / max);
  const label = (k: string) => (bucket === 'hour' ? k.slice(11, 13) : `${Number(k.slice(8, 10))}.${Number(k.slice(5, 7))}`);
  const every = Math.ceil(points.length / 12);
  const line = points.map((p, i) => `${(i + 0.5).toFixed(2)},${y(p.views).toFixed(2)}`).join(' ');
  const total = points.reduce((a, p) => a + p.visits, 0);
  return html`<figure class="p-chart"><div class="p-plot">
<ol class="p-yax mono" aria-hidden="true">${[max, max / 2, 0].map((t) => html`<li>${fmtN(t)}</li>`)}</ol>
<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${points.length} ${bucket === 'hour' ? 'saatte' : 'dilimde'} toplam ${total} ziyaret">
${[0, H / 2, H].map((v) => html`<line class="p-gl" x1="0" x2="${W}" y1="${v}" y2="${v}"></line>`)}
${points.map((p, i) => {
  const h = p.visits ? Math.max(1.5, (H * p.visits) / max) : 0;
  return html`<rect class="p-bar" x="${(i + 0.18).toFixed(2)}" y="${(H - h).toFixed(2)}" width="0.64" height="${h.toFixed(2)}"><title>${p.key} · ${p.visits} ziyaret · ${p.views} görüntüleme</title></rect>`;
})}
<polyline class="p-line" points="${line}"></polyline>
</svg>
<ol class="p-xax mono" aria-hidden="true">${points.map((p, i) => html`<li${(i / every) % 2 === 1 ? html` class="alt"` : ''}>${i % every === 0 ? label(p.key) : ''}</li>`)}</ol>
</div><figcaption class="p-legend mono"><span><i class="bar"></i>Ziyaret</span><span><i class="line"></i>Sayfa görüntüleme</span></figcaption></figure>`;
}

/** A table of label · number · a bar. */
function table(rows: q.Row[], head: [string, string], opts: { note?: (r: q.Row) => Safe | string; emptyText?: string } = {}): Safe {
  if (!rows.length) return empty(opts.emptyText ?? 'Bu dönemde veri yok.');
  const max = Math.max(...rows.map((r) => r.n));
  return html`<table class="p-table p-rank"><thead><tr><th>${head[0]}</th><th class="num">${head[1]}</th></tr></thead><tbody>${rows.map(
    (r) => html`<tr><td>${r.href ? html`<a href="${r.href}">${r.label}</a>` : r.label}${r.extra ? html`<small>${r.extra}</small>` : ''}${opts.note ? opts.note(r) : ''}<progress class="p-rbar" max="${max}" value="${r.n}" aria-hidden="true"></progress></td><td class="num">${fmtN(r.n)}</td></tr>`,
  )}</tbody></table>`;
}

function funnel(steps: { label: string; n: number }[]): Safe {
  const first = steps[0]?.n || 0;
  return html`<ol class="p-funnel">${steps.map(
    (s, i) => html`<li><span>${s.label}</span><b>${fmtN(s.n)}</b>${i ? html`<small>${first ? Math.round((s.n / first) * 100) : 0}%</small>` : ''}<progress max="${Math.max(1, first)}" value="${s.n}" aria-hidden="true"></progress></li>`,
  )}</ol>`;
}

function liveList(rows: q.LiveVisit[], now: Date): Safe {
  if (!rows.length) return empty('Şu an sitede kimse yok.');
  return html`<ul class="p-list p-live">${rows.map(
    (v) => html`<li><a href="/panel/stats/visits/${v.id}"><b class="mono p-url">${v.path}</b><span>${placeOf(v.country, v.city) || 'Bilinmiyor'} · ${q.deviceName(v.device)} · ${v.source}</span><small>${v.views} sayfa · ${fmtMs(now.getTime() - v.since.getTime())}</small></a></li>`,
  )}</ul>`;
}

/** "How they came": a visit in a few lines (Gelen kutusu · Görüşmeler). */
export async function journey(db: Db, visitId: string | null): Promise<Safe> {
  if (!visitId) return section('Nasıl geldi', empty('Bilinmiyor. JS kapalıydı ya da kişi saymamamızı istedi.'));
  const d = await q.visitDetail(db, visitId);
  if (!d) return section('Nasıl geldi', empty('Bu ziyaretin kaydı silinmiş.'));
  const v = d.visit;
  return section(
    'Nasıl geldi',
    html`<dl class="p-facts">
<div><dt>Kaynak</dt><dd>${srcOf(v)}${v.refPath ? html` <small class="mono p-url">${v.refPath}</small>` : ''}</dd></div>
<div><dt>Yer</dt><dd>${placeOf(v.country, v.city) || 'Bilinmiyor'}</dd></div>
<div><dt>Cihaz</dt><dd>${q.deviceName(v.device)} · ${v.os || '—'} · ${v.browser || '—'}</dd></div>
<div><dt>Gezdiği</dt><dd>${v.views} sayfa · ${fmtMs(v.engagedMs)}</dd></div>
</dl>
<ol class="p-path mono p-url">${d.views.map((w) => html`<li>${w.path}<small>${fmtMs(w.engagedMs)}</small></li>`)}</ol>`,
    { aside: html`<a class="p-more mono" href="/panel/stats/visits/${v.id}">Ziyaretin tamamı →</a>` },
  );
}

export function registerStats(p: FastifyInstance, k: Kit): void {
  p.get('/stats', async (req, reply) => {
    const qs = req.query as Record<string, string>;
    const now = k.now();
    const r = q.rangeOf(qs.p, now);
    const db = k.db;
    const [cur, prev, points, live, pages, entries, sources, campaigns, places, devices, clicks, outbound, events, funnels] = await Promise.all([
      q.summary(db, r),
      q.summary(db, r.prev),
      q.series(db, r),
      q.live(db, now),
      q.pages(db, r),
      q.entries(db, r),
      q.sources(db, r),
      q.campaigns(db, r),
      q.places(db, r),
      q.devices(db, r),
      q.clicks(db, r),
      q.outbound(db, r),
      q.events(db, r),
      q.funnels(db, r),
    ]);
    const pageHref = (path: string) => `/panel/stats/page?path=${encodeURIComponent(path)}&p=${r.key}`;
    return send(k, req, reply, {
      title: 'İstatistik',
      section: 'stats',
      wide: true,
      actions: html`<a class="p-btn ghost" href="/panel/stats/visits?p=${r.key}">Ziyaretler</a><button type="button" class="p-btn ghost p-js-only" data-statsoff>Bu tarayıcıyı sayma</button>`,
      body: html`<div class="p-toolbar">${periodTabs(r, '/panel/stats')}<p class="p-hint">Çerezsiz ve anonim · <a href="/panel/stats/visits?p=${r.key}">ziyaretleri tek tek gör</a> · ayrıntı için bir sayfaya tıkla</p></div>
<div class="p-stats">
<div class="p-stat"><span class="mono">Ziyaret</span><b>${fmtN(cur.visits)}</b><small>${change(cur.visits, prev.visits)} ${PREV[r.key]}</small></div>
<div class="p-stat"><span class="mono">Ziyaretçi</span><b>${fmtN(cur.visitors)}</b><small>günlük tekil · ${change(cur.visitors, prev.visitors)}</small></div>
<div class="p-stat"><span class="mono">Sayfa görüntüleme</span><b>${fmtN(cur.views)}</b><small>ziyaret başına ${cur.visits ? (cur.views / cur.visits).toFixed(1) : '0'} · ${change(cur.views, prev.views)}</small></div>
<div class="p-stat"><span class="mono">Ortalama süre</span><b>${fmtMs(cur.avgMs)}</b><small>tek sayfada çıkan %${cur.single}</small></div>
<a class="p-stat" href="/panel/briefs"><span class="mono">Brief · görüşme</span><b>${cur.briefs} · ${cur.calls}</b><small>${cur.visits ? (((cur.briefs + cur.calls) / cur.visits) * 100).toFixed(1) : '0'}% dönüşüm</small></a>
</div>
<div class="p-grid2 p-statgrid">
${section('Ziyaretler', chart(points, r.bucket), { id: 'chart' })}
${section(html`Şu an sitede <span class="p-count">${live.length}</span>`, html`<div data-live data-src="/panel/stats/live">${liveList(live, now)}</div>`, { aside: html`<span class="p-hint mono">son 5 dakika</span>` })}
</div>
<div class="p-grid2 p-statgrid">
${section(
  'Sayfalar',
  pages.length
    ? html`<table class="p-table p-rank p-pages"><thead><tr><th>Sayfa</th><th class="num">Görüntüleme</th><th class="num">Süre</th><th class="num">Okuma</th><th class="num">Çıkış</th></tr></thead><tbody>${pages.map(
        (x) => html`<tr><td><a class="mono p-url" href="${pageHref(x.path)}">${x.path}</a><progress class="p-rbar" max="${pages[0]!.views}" value="${x.views}" aria-hidden="true"></progress></td><td class="num" data-l="görüntüleme">${fmtN(x.views)}</td><td class="num" data-l="ortalama">${fmtMs(x.avgMs)}</td><td class="num" data-l="okuma">%${x.scroll}</td><td class="num" data-l="çıkış">${fmtN(x.exits)}</td></tr>`,
      )}</tbody></table>`
    : empty('Bu dönemde sayfa görüntülenmemiş.'),
)}
${section('Nereden geldiler', table(sources, ['Kaynak', 'Ziyaret']))}
${section('Giriş sayfaları', table(entries.map((e) => ({ label: e.k, n: e.n, href: pageHref(e.k) })), ['Sayfa', 'Ziyaret']))}
${section('Nereden', table(places, ['Ülke', 'Ziyaret']))}
${section('Cihazlar', html`<div class="p-cols2">${table(devices.device, ['Cihaz', 'Ziyaret'])}${table(devices.os, ['Sistem', 'Ziyaret'])}</div><div class="p-cols2">${table(devices.browser, ['Tarayıcı', 'Ziyaret'])}${table(devices.lang, ['Tarayıcı dili', 'Ziyaret'])}</div>`)}
${section('Neye tıkladılar', table(clicks, ['Bağlantı ya da düğme', 'Tıklama'], { emptyText: 'Bu dönemde tıklama yok.' }))}
${section('Dışarı giden bağlantılar', table(outbound, ['Adres', 'Tıklama'], { emptyText: 'Kimse dışarı bir bağlantıya tıklamamış.' }))}
${section('Olaylar', table(events, ['Olay', 'Kaç kez'], { emptyText: 'Bu dönemde olay yok.' }))}
${section('Huniler', html`<h3 class="p-sub">Görüşmeye giden yol</h3>${funnel(funnels.call)}<h3 class="p-sub">Brief</h3>${funnel(funnels.brief)}`)}
${campaigns.length ? section('Kampanyalar (utm)', table(campaigns, ['Kaynak · ortam · kampanya', 'Ziyaret'])) : ''}
</div>`,
    });
  });

  // The live block alone (panel.ts refreshes it every 15 seconds).
  p.get('/stats/live', async (_req, reply) => {
    const now = k.now();
    return reply.type('text/html; charset=utf-8').header('cache-control', 'no-store').send(liveList(await q.live(k.db, now), now).value);
  });

  p.get('/stats/visits', async (req, reply) => {
    const qs = req.query as Record<string, string>;
    const now = k.now();
    const r = q.rangeOf(qs.p, now);
    const page = Math.max(0, Math.min(1000, Number(qs.page) || 0));
    const path = (qs.path ?? '').slice(0, 300);
    const { rows, more, linked } = await q.visitList(k.db, r, page, 50, { path: path || undefined });
    const extra = `${path ? `&path=${encodeURIComponent(path)}` : ''}`;
    return send(k, req, reply, {
      title: 'Ziyaretler',
      section: 'stats',
      wide: true,
      crumbs: [{ label: 'İstatistik', href: `/panel/stats?p=${r.key}` }, { label: 'Ziyaretler' }],
      body: html`<div class="p-toolbar">${periodTabs(r, '/panel/stats/visits', extra)}${path ? html`<p class="p-hint">Sadece <b class="mono p-url">${path}</b> sayfasını görenler · <a href="/panel/stats/visits?p=${r.key}">hepsi</a></p>` : ''}</div>
${
  rows.length
    ? html`<table class="p-table" id="visits"><thead><tr><th>Ne zaman</th><th>Nereden</th><th>Yer · cihaz</th><th>Giriş → çıkış</th><th class="num">Sayfa</th><th class="num">Süre</th></tr></thead><tbody>${rows.map((v) => {
        const tags = linked.filter((l) => l.id === v.id);
        return html`<tr data-row><td><a class="p-rowlink" href="/panel/stats/visits/${v.id}">${when(v.startedAt)}</a>${tags.map((t) => html` <span class="p-badge acc">${t.kind === 'brief' ? 'brief' : 'görüşme'}</span>`)}</td><td>${srcOf(v)}</td><td>${placeOf(v.country, v.city) || '—'}<small>${q.deviceName(v.device)} · ${v.browser || '—'}</small></td><td class="mono p-url">${v.entry}${v.exit !== v.entry ? html`<small>→ ${v.exit}</small>` : ''}</td><td class="num">${v.views}</td><td class="num">${fmtMs(v.engagedMs)}</td></tr>`;
      })}</tbody></table>
<nav class="p-pager">${page ? html`<a class="p-btn ghost" href="/panel/stats/visits?p=${r.key}&page=${page - 1}${extra}">← Daha yeni</a>` : ''}${more ? html`<a class="p-btn ghost" href="/panel/stats/visits?p=${r.key}&page=${page + 1}${extra}">Daha eski →</a>` : ''}</nav>`
    : empty('Bu dönemde ziyaret yok.')
}`,
    });
  });

  p.get('/stats/visits/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const d = /^[0-9a-f-]{36}$/.test(id) ? await q.visitDetail(k.db, id) : null;
    if (!d) return reply.callNotFound();
    const v = d.visit;
    const now = k.now();
    const evOf = (viewId: string | null) => d.events.filter((e) => e.viewId === viewId);
    const evLine = (e: (typeof d.events)[number]) =>
      html`<li class="${e.kind}"><span class="mono">${timeOf(e.at)}</span><span>${e.kind === 'event' ? q.eventName(e.name) : e.name}</span>${e.target && e.kind !== 'event' ? html`<small class="mono p-url">${e.kind === 'out' ? '↗ ' : e.kind === 'contact' ? '✉ ' : '→ '}${e.target}</small>` : ''}</li>`;
    return send(k, req, reply, {
      title: `Ziyaret · ${when(v.startedAt)}`,
      section: 'stats',
      crumbs: [{ label: 'İstatistik', href: '/panel/stats' }, { label: 'Ziyaretler', href: '/panel/stats/visits' }, { label: when(v.startedAt) }],
      body: html`<dl class="p-facts">
<div><dt>Başladı</dt><dd>${when(v.startedAt)} · ${timeTag(v.startedAt, now)}</dd></div>
<div><dt>Kaynak</dt><dd>${srcOf(v)}${v.refPath ? html` <small class="mono p-url">${v.refPath}</small>` : ''}</dd></div>
<div><dt>Yer</dt><dd>${placeOf(v.country, v.city) || 'Bilinmiyor'}${v.tz ? html` <small class="mono p-url">${v.tz}</small>` : ''}</dd></div>
<div><dt>Cihaz</dt><dd>${q.deviceName(v.device)} · ${v.os || '—'} · ${v.browser || '—'} · ${v.browserLang || '—'}</dd></div>
<div><dt>Toplam</dt><dd>${v.views} sayfa · ${fmtMs(v.engagedMs)}</dd></div>
${d.brief ? html`<div><dt>Brief</dt><dd><a href="/panel/briefs/${d.brief.id}">${d.brief.name || d.brief.email}</a></dd></div>` : ''}
${d.call ? html`<div><dt>Görüşme</dt><dd><a href="/panel/bookings/${d.call.id}">No. ${String(d.call.no).padStart(4, '0')} · ${d.call.name}</a></dd></div>` : ''}
</dl>
${section(
  'Zaman çizelgesi',
  html`<ol class="p-timeline">${d.views.map(
    (w) => html`<li><div class="p-tlhead"><span class="mono">${timeOf(w.at)}</span><a class="mono p-url" href="/panel/stats/page?path=${encodeURIComponent(w.path)}">${w.path}</a><small>${fmtMs(w.engagedMs)} · %${w.scroll} okudu${w.width ? ` · ${w.width} px` : ''}</small></div>${evOf(w.id).length ? html`<ul class="p-evs">${evOf(w.id).map(evLine)}</ul>` : ''}</li>`,
  )}${evOf(null).map((e) => html`<li class="p-tlevent">${evLine(e)}</li>`)}</ol>`,
)}`,
    });
  });

  p.get('/stats/page', async (req, reply) => {
    const qs = req.query as Record<string, string>;
    const path = (qs.path ?? '').slice(0, 300);
    if (!path.startsWith('/') || path.startsWith('//') || /^\/(panel|api)(\/|$)/.test(path)) return reply.callNotFound();
    const now = k.now();
    const r = q.rangeOf(qs.p, now);
    const band = (Object.keys(q.BANDS) as q.Band[]).includes(qs.b as q.Band) ? (qs.b as q.Band) : 'desktop';
    const B = q.BANDS[band];
    const [s, clicks, dots] = await Promise.all([q.pageSummary(k.db, r, path), q.clicks(k.db, r, ['click', 'out', 'contact'], path, 20), q.clickMap(k.db, r, path, B)]);
    const h = Math.max(1200, ...dots.map((d) => (d.y ?? 0) + 200));
    const extra = `&path=${encodeURIComponent(path)}&b=${band}`;
    return send(k, req, reply, {
      title: path,
      section: 'stats',
      wide: true,
      crumbs: [{ label: 'İstatistik', href: `/panel/stats?p=${r.key}` }, { label: 'Sayfa' }],
      actions: html`<a class="p-btn ghost" href="${path}" target="_blank" rel="noopener">Sayfayı aç ↗</a><a class="p-btn ghost" href="/panel/stats/visits?p=${r.key}&path=${encodeURIComponent(path)}">Bu sayfayı görenler</a>`,
      body: html`<div class="p-toolbar">${periodTabs(r, '/panel/stats/page', extra)}</div>
<div class="p-stats">
<div class="p-stat"><span class="mono">Görüntüleme</span><b>${fmtN(s.views)}</b><small>${fmtN(s.visits)} ziyarette</small></div>
<div class="p-stat"><span class="mono">Ortalama süre</span><b>${fmtMs(s.avgMs)}</b><small>sayfa ekrandayken</small></div>
<div class="p-stat"><span class="mono">Okuma</span><b>%${s.scroll}</b><small>${s.views ? Math.round((s.deep / s.views) * 100) : 0}% sonuna kadar indi</small></div>
</div>
<div class="p-grid2 p-statgrid">
${section(
  'Tıklama haritası',
  html`<nav class="p-tabs" aria-label="Genişlik">${(Object.keys(q.BANDS) as q.Band[]).map((b) => html`<a href="/panel/stats/page?p=${r.key}&path=${encodeURIComponent(path)}&b=${b}"${b === band ? html` aria-current="page"` : ''}>${q.BANDS[b].label}</a>`)}</nav>
<p class="p-hint">${dots.length ? `${dots.length} tıklama · ${B.frame} px genişliğinde` : 'Bu genişlikte tıklama yok.'} Sayfa bugünkü haliyle gösterilir.</p>
<div class="p-map ${band}" data-map>
<iframe src="${path}" title="${path} sayfası" loading="lazy" inert tabindex="-1" data-map-frame></iframe>
<svg class="p-dots" viewBox="0 0 ${B.frame} ${h}" preserveAspectRatio="xMinYMin meet" aria-hidden="true" data-map-dots data-frame="${B.frame}">${dots.map((d) => raw(`<circle cx="${(((d.x ?? 0) / 1000) * B.frame).toFixed(0)}" cy="${d.y ?? 0}" r="16"></circle>`))}</svg>
</div>`,
)}
<div>
${section('Neye tıkladılar', table(clicks, ['Bağlantı ya da düğme', 'Tıklama'], { emptyText: 'Bu dönemde tıklama yok.' }))}
${section('Bu sayfadan başlayanlar nereden geldi', table(s.sources, ['Kaynak', 'Ziyaret']))}
</div>
</div>`,
    });
  });
}

/** 14:05 in Istanbul. */
function timeOf(d: Date): string {
  return new Date(d.getTime() + 180 * 60_000).toISOString().slice(11, 16);
}
