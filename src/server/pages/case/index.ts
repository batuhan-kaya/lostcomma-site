import { projectBySlug, type ProjectCard, type ProjectPage } from '../../data/content';
import type { Story, StoryTile } from '../../db/story';
import { html, raw, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { picture, type MediaRef } from '../../media/picture';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import type { NextTone } from '../../themes';
import { drawnArt } from '../work/art';
import { SAIL_COVER, SAIL_MOCK } from './sail';

/**
 * A case study. The hero always shows · every other section shows when the story has it:
 * history (the version timeline · its signature interaction) · brief · details · results · credits.
 * The page takes its colours from the story (story.theme).
 */
type Crew = 'design' | 'code' | 'motion';
const INITIAL: Record<Crew, string> = { design: 'D', code: 'C', motion: 'M' };
/** The wipe colour of the next layer band, by the next project's group. */
const NEXT_TONE: Record<ProjectCard['discipline'], NextTone> = { web: 'milk', app: 'lime', identity: 'sun', motion: 'pink' };

type L = { tr: string; en: string };
const pick = (l: L | undefined, lang: Lang) => (l ? l[lang] : '');
/** Line breaks written as \n in the story become <br>. */
const lines = (text: string): Safe => html`${text.split('\n').map((part, i) => html`${i ? html`<br>` : ''}${part}`)}`;

/** "03 Apr" · "03 Nis" */
export function shortDate(lang: Lang, day: string): string {
  return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T00:00:00Z')).replace('.', '');
}

/** Relative luminance below 0.4 = a dark colour. Picks the text colour class of a swatch. */
function isDark(hex: string): boolean {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]! < 0.4;
}

function cover(ctx: Ctx, p: ProjectPage, sizes: string, priority = false): Safe {
  if (p.cover) return picture(p.cover, { lang: ctx.lang, sizes, priority, alt: '' });
  if (p.art === 'sail') return SAIL_COVER;
  return drawnArt(p.art, { on: true });
}

function hero(ctx: Ctx, p: ProjectPage, s: Story | null): Safe {
  const { t, lang } = ctx;
  const last = s?.history?.versions.at(-1);
  const meta: [string, Safe | string][] = [];
  if (p.client) meta.push([t('Müşteri'), p.client]);
  meta.push([t('Yıl'), s?.weeks ? `${p.year} · ${t('{n} hafta', { n: s.weeks })}` : String(p.year)]);
  meta.push([t('Kapsam'), s?.scope ? pick(s.scope, lang) : p.kind]);
  if (s?.team.length)
    meta.push([
      t('Ekip'),
      html`<span class="avs">${s.team.map((c) => html`<span class="av c-${c}" aria-hidden="true">${INITIAL[c]}</span>`)}</span><span class="sr">${s.team.join(' · ')}</span>`,
    ]);
  meta.push([t('Durum'), s?.liveSince ? t('{d} tarihinden beri yayında', { d: shortDate(lang, s.liveSince) }) : t('Yayında')]);
  if (p.siteUrl) meta.push([t('Site'), html`<a class="visit" href="${p.siteUrl}" rel="noopener" target="_blank">${t('Siteyi ziyaret et')} <span aria-hidden="true">↗</span></a>`]);

  return html`<section class="chero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><a href="${href(lang, 'work')}"><span aria-hidden="true">←</span> ${t('İşler')}</a><span aria-hidden="true">/</span><span>${p.number} · <span class="url">lostcomma.co${ctx.path}</span></span></p>
<h1 class="ttl"${p.textLang !== lang ? html` lang="${p.textLang}"` : ''}>${p.name}</h1>
<div class="ctop">
${p.summary ? html`<p class="lede" data-rest="design" data-rest-at="end 12 -4">${p.summary}</p>` : html`<span data-rest="design" data-rest-at="0 0"></span>`}
<dl class="meta" data-rest="code" data-rest-at="0.86 0.96">${meta.map(([k, v]) => html`<div><dt class="mono">${k}</dt><dd>${v}</dd></div>`)}</dl>
</div>
<div class="cover" data-rest="motion" data-rest-at="0.58 0.62">${cover(ctx, p, '(max-width: 1440px) 94vw, 1360px', true)}${last ? html`<span class="cap mono">${t('Kapak')} · ${last.v}</span>` : ''}${s?.tags.length ? html`<span class="ttag mono">${s.tags.map((x) => html`<span>${pick(x, lang)}</span>`)}</span>` : ''}</div>
</div></section>`;
}

function history(ctx: Ctx, p: ProjectPage, s: Story): Safe {
  const h = s.history;
  if (!h) return html``;
  const { t, lang } = ctx;
  const n = h.versions.length;
  const at = n - 1;
  const cur = h.versions[at]!;
  const images = h.versions.map((v) => (v.image ? p.media[v.image] : undefined));
  const drawn = h.mock === 'sail' && images.every((x) => !x);
  const fallback = cover(ctx, p, '(max-width: 1024px) 92vw, 900px');
  const frame = drawn
    ? SAIL_MOCK
    : html`${h.versions.map((_, i) => {
        const m: MediaRef | undefined = images[i];
        return html`<span class="fimg${i === at ? ' on' : ''}" data-fi="${i}">${m ? picture(m, { lang, sizes: '(max-width: 1024px) 92vw, 900px', alt: '' }) : fallback}</span>`;
      })}`;
  const label = (i: number) => `${p.name} · ${h.versions[i]!.v} · ${pick(h.versions[i]!.title, lang)}`;
  return html`<section class="hist" data-sec="hist" data-host="${cur.who}"><div class="wrap">
<div class="hh"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Geçmiş · {n} sürüm', { n })}</p><h2 class="h2">${lines(pick(h.heading, lang))}</h2></div><p>${pick(h.intro, lang)}</p></div>
<div class="hb">
<div>
<ol class="vl">${h.versions.map(
    (v, i) => html`<li><button type="button" class="vi${i === at ? ' on' : ''}" data-v="${i}" aria-pressed="${String(i === at)}"${i === at ? html` data-rest="host" data-rest-at="1 0.32 6 0"` : ''}><span class="dot c-${v.who}" aria-hidden="true">${INITIAL[v.who]}</span><span><span class="top"><b>${pick(v.title, lang)}</b><span class="mono">${v.v} · ${shortDate(lang, v.date)}</span></span><span class="vs">${pick(v.summary, lang)}</span></span></button></li>`,
  )}</ol>
<div class="vctl"><button type="button" class="play" data-play aria-pressed="false"><svg viewBox="0 0 14 14" aria-hidden="true"><path class="pi" d="M3 1.5l9 5.5-9 5.5z"></path><path class="pa" d="M3 2h3v10H3zM8 2h3v10H8z"></path></svg><span data-playtxt>${t('Geçmişi oynat')}</span></button><span class="mono" data-verof>${cur.v} · ${pick(cur.title, lang)}</span></div>
</div>
<div>
<div class="fr${drawn ? ` vs-${at}` : ' imgs'}" data-fr role="img" aria-label="${label(at)}">${frame}</div>
<div class="scrub"><input class="rng" type="range" min="0" max="${n - 1}" step="1" value="${at}" data-rng aria-label="${t('Sürüm')}" aria-valuetext="${cur.v} · ${pick(cur.title, lang)}"><div class="ticks mono" aria-hidden="true">${h.versions.map((v, i) => html`<span${i === at ? html` class="on"` : ''}>${v.v}</span>`)}</div></div>
<div class="chg"><p data-curs aria-live="polite">${pick(cur.summary, lang)}</p><div class="cmt"><span class="av c-${cur.who}" data-curav aria-hidden="true">${INITIAL[cur.who]}</span><span><b class="mono" data-curwho>${cur.who} · ${cur.v}</b><span data-curc>${pick(cur.comment, lang)}</span></span></div></div>
</div>
</div>
</div></section>`;
}

function brief(ctx: Ctx, s: Story): Safe {
  const b = s.brief;
  if (!b) return html``;
  const { t, lang } = ctx;
  return html`<section class="brief" data-sec="brief"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Brief')}</p>
<h2 class="h2">${lines(pick(b.heading, lang))}</h2>
<div class="bcols"><div class="bcol"><span class="mono">${t('Önce')}</span><p>${pick(b.before, lang)}</p></div><div class="bcol af"><span class="mono">${t('Sonra')}</span><p data-rest="host" data-rest-at="0.9 0.2">${pick(b.after, lang)}</p></div></div>
${b.quote ? html`<figure class="quote"><span class="q" aria-hidden="true">“</span><div><blockquote>${pick(b.quote.text, lang)}</blockquote><figcaption class="mono">${pick(b.quote.cite, lang)}</figcaption></div></figure>` : ''}
</div></section>`;
}

const WIND_SVG = raw('<svg viewBox="0 0 150 150"><path d="M75 128V22M48 50l27-28 27 28"></path></svg>');
const WAVES = raw(
  '<svg viewBox="0 0 800 120" preserveAspectRatio="none"><path d="M0 60 Q 50 20 100 60 T 200 60 T 300 60 T 400 60 T 500 60 T 600 60 T 700 60 T 800 60"></path></svg><svg viewBox="0 0 800 120" preserveAspectRatio="none"><path d="M0 60 Q 50 30 100 60 T 200 60 T 300 60 T 400 60 T 500 60 T 600 60 T 700 60 T 800 60"></path></svg>',
);

function tile(ctx: Ctx, p: ProjectPage, x: StoryTile): Safe {
  const { t, lang } = ctx;
  const head = html`<span class="mono">${pick(x.kick, lang)}</span><h3>${pick(x.title, lang)}</h3>`;
  switch (x.kind) {
    case 'palette':
      return html`<div class="tile t-pal" data-rest="host" data-rest-at="0.42 0.5">${head}<div class="sw">${x.swatches.map(
        (sw) => html`<button type="button" class="swb ${isDark(sw.ink) ? 'tdk' : 'tlt'}" data-hex="${sw.hex}"><svg class="swc" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1 1"><rect width="1" height="1" fill="${sw.hex}"></rect></svg><span class="ok mono" aria-hidden="true">${t('Kopyalandı')}</span><b>${pick(sw.name, lang)}</b><span class="mono">${sw.hex}</span><span class="sr"> · ${t('kopyala')}</span></button>`,
      )}</div><span class="sr" data-copied aria-live="polite"></span></div>`;
    case 'type':
      return html`<div class="tile t-type">${head}<span class="aa" aria-hidden="true">Aa</span><span class="spec mono"><span>${pick(x.spec[0], lang)}</span><span>${pick(x.spec[1], lang)}</span></span></div>`;
    case 'image': {
      const m = p.media[x.image];
      return html`<div class="tile t-img${x.wide ? ' w2' : ''}">${head}${m ? picture(m, { lang, sizes: x.wide ? '(max-width: 900px) 92vw, 900px' : '(max-width: 900px) 92vw, 440px' }) : ''}</div>`;
    }
    case 'wind':
      return html`<div class="tile t-wind">${head}<div class="dial" aria-hidden="true"><span class="n mono">N</span><span class="e mono">E</span>${WIND_SVG}</div><span class="kn">${x.value}<small> ${pick(x.unit, lang)}</small></span></div>`;
    case 'steps':
      return html`<div class="tile t-steps">${head}<div class="steps">${x.steps.map(
        (st, i) => html`<div class="stp"><span class="mono">${i + 1}</span><b>${pick(st, lang)}</b>${i === 2 ? html`<i class="lt"></i>` : html`<i></i>${i === 1 ? html`<i></i>` : ''}<i class="s"></i>`}</div>`,
      )}</div></div>`;
    case 'tide':
      return html`<div class="tile t-tide">${head}<div class="wv" aria-hidden="true">${WAVES}</div><span class="pct mono"><b>${pick(x.word, lang)}</b>${pick(x.note, lang)}</span></div>`;
  }
}

function details(ctx: Ctx, p: ProjectPage, s: Story): Safe {
  if (!s.details) return html``;
  const { t } = ctx;
  return html`<section class="dets" data-sec="dets"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Detaylar')}</p>
<h2 class="h2">${t('Küçük şeyler.')}</h2>
<div class="bento">${s.details.tiles.map((x) => tile(ctx, p, x))}</div>
</div></section>`;
}

function results(ctx: Ctx, s: Story): Safe {
  const r = s.results;
  if (!r) return html``;
  const { t, lang } = ctx;
  return html`<section class="res" data-sec="res"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${pick(r.kick, lang)}</p>
<div class="nums" data-rest="host" data-rest-at="0.42 0.05">${r.numbers.map((x) => html`<div class="num"><b>${pick(x.value, lang)}</b><span>${pick(x.label, lang)}</span></div>`)}</div>
${r.stack.length ? html`<div class="stack"><span class="mono">${t('Şunlarla yapıldı')}</span>${r.stack.map((x) => html`<span class="chip">${x}</span>`)}</div>` : ''}
</div></section>`;
}

function credits(ctx: Ctx, s: Story): Safe {
  const c = s.credits;
  if (!c) return html``;
  const { t, lang } = ctx;
  return html`<section class="cred" data-sec="cred"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Katkı verenler')}</p>
<h2 class="h2" data-rest="host" data-rest-at="end 16 -8">${t('Dosyaya kim dokundu.')}</h2>
<div class="crl">${c.rows.map(
    (r) => html`<div class="crr c-${r.who === 'client' ? 'you' : r.who}"><span class="who"><i aria-hidden="true"></i><span class="mono">${r.who === 'client' ? pick(r.label, lang) || t('müşteri') : r.who}</span></span><b>${pick(r.name, lang)}</b><span>${pick(r.did, lang)}</span><span class="n mono">${pick(r.count, lang)}</span></div>`,
  )}</div>
</div></section>`;
}

function onward(ctx: Ctx, p: ProjectPage): Safe {
  const { t, lang } = ctx;
  const n = p.next;
  return html`<div class="wrap onward"><a class="back mono" href="${href(lang, 'work')}"><span aria-hidden="true">←</span> ${t('Bütün işler')}</a></div>
${n
  ? html`<a class="nx nb-${NEXT_TONE[n.discipline]}" href="${href(lang, 'case', { slug: n.slug })}" data-sec="next">
<span class="wrap"><span class="nxl"><span class="mono">${t('Sonraki katman · {no}', { no: n.number })}</span><b${n.textLang !== lang ? html` lang="${n.textLang}"` : ''}>${n.name}</b></span><svg class="nxa" viewBox="0 0 48 48" aria-hidden="true" data-rest="host" data-rest-at="0.3 0.55"><path d="M6 24h34M28 12l12 12-12 12"></path></svg></span>
</a>`
  : ''}`;
}

export const casePage: Page<ProjectPage> = {
  id: 'case',
  theme: (p) => p.story?.theme ?? 'ink',
  host: 'design',
  section: 'work',
  scripts: ['case'],
  styles: ['case'],
  title: (_t, p) => p.name,
  description: (_t, p) => p.summary || p.kind,
  load: (ctx, params) => projectBySlug(ctx.db, ctx.lang, params.slug ?? ''),
  paths: (p) => ({
    tr: p.slugs.tr ? href('tr', 'case', { slug: p.slugs.tr }) : null,
    en: p.slugs.en ? href('en', 'case', { slug: p.slugs.en }) : null,
  }),
  body: (ctx, p) => {
    const s = p.story;
    return html`${hero(ctx, p, s)}
${s ? html`${history(ctx, p, s)}
${brief(ctx, s)}
${details(ctx, p, s)}
${results(ctx, s)}
${credits(ctx, s)}` : ''}
${onward(ctx, p)}`;
  },
  /** The client needs the version texts (history) and what the team says in the hero. */
  data: (ctx, p) => ({
    bubbles: p.story?.bubbles.map((b) => ({ who: b.who, text: b.text[ctx.lang] })) ?? [],
    versions:
      p.story?.history?.versions.map((v) => ({
        v: v.v,
        who: v.who,
        title: v.title[ctx.lang],
        summary: v.summary[ctx.lang],
        comment: v.comment[ctx.lang],
        label: `${p.name} · ${v.v} · ${v.title[ctx.lang]}`,
      })) ?? [],
  }),
};
