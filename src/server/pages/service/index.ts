import { EDITOR_SAMPLE, HERO, SERVICE_SLUGS, SERVICES, serviceBySlug, type ServiceCopy, type ServiceKey } from '../../content/services';
import { projectsOf, type ProjectCard } from '../../data/content';
import { html, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { footer } from '../../layout/chrome';
import type { CrewName, Ctx, Page } from '../../page';
import { href } from '../../routes';
import type { NextTone, ThemeId } from '../../themes';
import { tierOf } from '../../../shared/checklist';
import { coverOrArt } from '../work/art';
import { appHero, appHood, identityHero, identityHood, motionHero, motionHood, webHero, webHood } from './heroes';
import { loopVideo } from '../../media/video';

/**
 * A service in detail (Websites · Apps · Identity · Motion). Each one has its own signature hero:
 * a frame you resize · a thumb that reaches · one mark from favicon to billboard · a curve you bend.
 * Then the same five beats: twelve things to tick · under the hood (with a working mock) · three
 * shapes and prices · work we made (Motion shows a reel of loops) · the next tool.
 */
export interface ServiceData {
  key: ServiceKey;
  name: string;
  desc: string;
  work: ProjectCard[];
}

const THEME: Record<ServiceKey, ThemeId> = { web: 'blue', app: 'lime', identity: 'pink', motion: 'ink' };
/** Who hosts the sections below the hero. */
const HOST: Record<ServiceKey, CrewName> = { web: 'code', app: 'design', identity: 'design', motion: 'motion' };
const NEXT: Record<ServiceKey, { to: ServiceKey | null; tone: NextTone }> = {
  web: { to: 'app', tone: 'lime' },
  app: { to: 'identity', tone: 'pink' },
  identity: { to: 'motion', tone: 'ink' },
  motion: { to: null, tone: 'blue' },
};
const SHORT: Record<ServiceKey, string> = { web: 'web', app: 'app', identity: 'id', motion: 'mo' };

const pad = (n: number) => String(n).padStart(2, '0');
const lines = (s: string): Safe => html`${s.split('\n').map((l, i) => html`${i ? html`<br>` : ''}${l}`)}`;
const serviceHref = (lang: Lang, k: ServiceKey) => href(lang, 'service', { slug: SERVICE_SLUGS[k][lang] });

/** Puts markup where {n} sits in a translated sentence (word order differs between languages). */
function slot(text: string, node: Safe): Safe {
  const [a = '', b = ''] = text.split('\u0000');
  return html`${a}${node}${b}`;
}

function hero(ctx: Ctx, key: ServiceKey, s: ServiceCopy): Safe {
  const { t, lang } = ctx;
  const copy = HERO[lang];
  const tool =
    key === 'web' ? webHero(ctx) : key === 'app' ? appHero(ctx, copy) : key === 'identity' ? identityHero(ctx, copy) : motionHero(ctx, copy);
  return html`<section class="vhero vh-${SHORT[key]}" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><a href="${href(lang, 'services')}"><span aria-hidden="true">← </span>${t('Hizmetler')}</a><span aria-hidden="true">/</span><span>${s.no} · <span class="url">lostcomma.co${ctx.path}</span></span></p>
<h1 class="ttl${s.name.length > 9 ? ' long' : ''}" data-rest="design" data-rest-at="end 16 -14">${s.name}</h1>
<p class="lede" data-rest="motion" data-rest-at="end 10 -4">${s.lede} <b>${s.try}</b></p>
${tool}
</div></section>`;
}

function get(ctx: Ctx, key: ServiceKey, s: ServiceCopy, host: CrewName): Safe {
  const { t, lang } = ctx;
  const ticks = s.checks.map((c) => !!c.on);
  const tier = tierOf(key, ticks);
  const n = ticks.filter(Boolean).length;
  return html`<section class="get" data-sec="get" data-host="${host}"><div class="wrap">
<div class="ghd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Neler var · ihtiyacın olanı işaretle')}</p><h2 class="h2">${t('On iki şey.')}<br>${t('Seçimini yap.')}</h2></div><p data-rest="host" data-rest-at="0.5 -0.5">${s.getText}</p></div>
<ul class="chk" data-chk>${s.checks.map(
    (c, i) => html`<li><button type="button" class="ci${c.on ? ' on' : ''}" data-ck="${i}" aria-pressed="${String(!!c.on)}"><span class="box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9"></path></svg></span><b>${c.t}<span class="mono" aria-hidden="true">${pad(i + 1)}</span></b><span class="d">${c.d}</span></button></li>`,
  )}</ul>
<div class="sumbar"><p role="status">${slot(t('{n} / 12 seçili', { n: '\u0000' }), html`<b data-picked>${n}</b>`)} · <span data-verdict>${s.verdict[tier]}</span><span class="sr"> · </span><span class="mono" data-weeks>${s.weeks[tier]}</span></p><a href="${href(lang, 'start')}">${t('Bu listeyle başla')} <span aria-hidden="true">↗</span></a></div>
</div></section>`;
}

function hood(ctx: Ctx, key: ServiceKey, s: ServiceCopy, host: CrewName): Safe {
  const { t, lang } = ctx;
  const copy = HERO[lang];
  const mock = key === 'web' ? webHood(ctx) : key === 'app' ? appHood(ctx, copy) : key === 'identity' ? identityHood(ctx, copy) : motionHood(ctx);
  return html`<section class="hood" data-sec="hood" data-host="${host}"><div class="wrap">
<div class="hda">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Kaputun altı')}</p>
<h2 class="h2">${lines(s.hood.h)}</h2>
<p>${s.hood.p}</p>
<ul class="chips">${s.hood.chips.map((c) => html`<li class="chip"><i aria-hidden="true"></i>${c}</li>`)}</ul>
<div class="budget">${s.hood.budget.map(([l, v, u]) => html`<div class="bud"><span class="mono">${l}</span><b>${v}<small> ${u}</small></b></div>`)}</div>
</div>
<div class="mock" data-rest="host" data-rest-at="0.62 -0.04">${mock}</div>
</div></section>`;
}

function price(ctx: Ctx, s: ServiceCopy, host: CrewName): Safe {
  const { t, lang } = ctx;
  return html`<section class="price" data-sec="price" data-host="${host}"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Şekiller ve fiyatlar')}</p>
<h2 class="h2" data-rest="host" data-rest-at="end 18 -10">${t('Üç şekil.')}<br>${t('Sabit teklifler.')}</h2>
<div class="pcs">${s.tiers.map(
    (x) => html`<div class="pc${x.hot ? ' hot' : ''}">${x.hot ? html`<span class="badge mono">${t('En çok istenen')}</span>` : ''}<span class="mono">${x.size}</span><h3>${x.name}</h3><p>${x.text}</p><div class="amt"><span class="mono">${t('Başlangıç')}</span><b>${t('[FİYAT]')}</b></div></div>`,
  )}</div>
<div class="pnote mono"><span>${t('Her teklif başlamadan önce sabitlenir. Saatlik sürpriz yok.')}</span><a href="${href(lang, 'process')}">${t('Bir proje nasıl ilerler')} <span aria-hidden="true">→</span></a></div>
</div></section>`;
}

function related(ctx: Ctx, s: ServiceCopy, work: ProjectCard[], host: CrewName): Safe {
  const { lang } = ctx;
  if (!work.length) return html``;
  return html`<section class="rel" data-sec="rel" data-host="${host}"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${s.related}</p>
<ul class="rgrid">${work.map(
    (p, i) => html`<li><a class="rc" href="${href(lang, 'case', { slug: p.slug })}"${p.textLang !== lang ? html` lang="${p.textLang}"` : ''}><span class="rf"${i === 0 ? html` data-rest="host" data-rest-at="0.82 0.12"` : ''}>${coverOrArt(p, lang, '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 440px', { on: true })}</span><b>${p.name}</b><span class="mono">${p.kind} · ${p.year}</span></a></li>`,
  )}</ul>
</div></section>`;
}

/** Motion shows its work as a reel: short loops that play muted and pause off screen or on a tap. */
function reel(ctx: Ctx, work: ProjectCard[], host: CrewName): Safe {
  const { t, lang } = ctx;
  if (!work.length) return html``;
  return html`<section class="reel" data-sec="reel" data-host="${host}"><div class="wrap">
<div class="rlh"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Yaptığımız hareket işleri · makara')}</p><h2 class="h2">${t('Döngüler.')}<br>${t('Ses gerekmez.')}</h2></div><p>${t('Gerçek projelerden kısa döngüler. Sessiz oynar ve ekrandan çıkınca durur. Durdurmak için birine dokun.')}</p></div>
<ul class="rgrid2">${work.map(
    (p, i) => html`<li><button type="button" class="lp" data-loop${i === 0 ? html` data-rest="host" data-rest-at="0.86 0.14"` : ''}>${p.loop ? loopVideo(p.loop, { lang, posterWidth: 960 }) : coverOrArt(p, lang, '(max-width: 640px) 92vw, 560px', { on: true })}<span class="lpb mono"><i aria-hidden="true"></i><span class="sr">${p.name} · </span><span data-lps>${t('Oynuyor · sessiz')}</span></span></button><p class="rcap"><a href="${href(lang, 'case', { slug: p.slug })}"${p.textLang !== lang ? html` lang="${p.textLang}"` : ''}>${p.name}</a><span class="mono">${p.kind}</span></p></li>`,
  )}</ul>
<a class="lab2 mono" href="${href(lang, 'lab')}">${t('Lab’de daha fazla deney')} <span aria-hidden="true">→</span></a>
</div></section>`;
}

function next(ctx: Ctx, key: ServiceKey): Safe {
  const { t, lang } = ctx;
  const n = NEXT[key];
  const to = n.to ? SERVICES[lang].services[n.to] : null;
  return html`<a class="nx nb-${n.tone}" href="${n.to ? serviceHref(lang, n.to) : href(lang, 'services')}" data-sec="next">
<span class="wrap"><span class="nxl"><span class="mono">${to ? t('Sonraki araç · {no}', { no: to.no }) : t('Geri dön')}</span><b>${to ? to.name : t('Bütün araçlar')}</b></span><svg class="nxa" viewBox="0 0 48 48" aria-hidden="true" data-rest="host" data-rest-at="0.3 0.55"><path d="M6 24h34M28 12l12 12-12 12"></path></svg></span>
</a>`;
}

export const servicePage: Page<ServiceData> = {
  id: 'service',
  theme: (d) => THEME[d.key],
  host: 'design',
  section: 'services',
  scripts: ['service'],
  styles: ['service'],
  title: (_t, d) => d.name,
  description: (_t, d) => d.desc,
  load: async (ctx, params) => {
    const key = serviceBySlug(ctx.lang, params.slug ?? '');
    if (!key) return null;
    const s = SERVICES[ctx.lang].services[key];
    return { key, name: s.name, desc: s.desc, work: await projectsOf(ctx.db, ctx.lang, key) };
  },
  paths: (d) => ({ tr: serviceHref('tr', d.key), en: serviceHref('en', d.key) }),
  body: (ctx, d) => {
    const s = SERVICES[ctx.lang].services[d.key];
    const host = HOST[d.key];
    const below = html`${get(ctx, d.key, s, host)}
${hood(ctx, d.key, s, host)}
${price(ctx, s, host)}
${d.key === 'motion' ? reel(ctx, d.work, host) : related(ctx, s, d.work, host)}
${next(ctx, d.key)}`;
    // Websites: a blue hero over a paper page. The others keep their colour all the way down.
    return html`${hero(ctx, d.key, s)}
${d.key === 'web' ? html`<div class="below th-paper">${below}</div>` : below}`;
  },
  footer: (ctx, d) => (d.key === 'web' ? html`<div class="below th-paper">${footer(ctx)}</div>` : footer(ctx)),
  data: (ctx, d) => {
    const s = SERVICES[ctx.lang].services[d.key];
    const hero = HERO[ctx.lang];
    return {
      key: d.key,
      host: HOST[d.key],
      verdict: s.verdict,
      weeks: s.weeks,
      ...(d.key === 'app' ? { reach: hero.reach } : {}),
      ...(d.key === 'identity' ? { sizes: hero.sizes } : {}),
      ...(d.key === 'motion' ? { curves: hero.curves } : {}),
      ...(d.key === 'web' ? { editor: EDITOR_SAMPLE } : {}),
    };
  },
};
