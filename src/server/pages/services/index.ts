import { priceKey } from '../../data/settings';
import { SERVICE_KEYS, SERVICE_SLUGS, SERVICES, type ServiceKey } from '../../content/services';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';

/**
 * Services. A calm page that answers three things at a glance: what we make · how long it takes ·
 * where it starts. The hero is the list itself: four rows (number · a small drawing · name and
 * what it is · what you get · time and starting price) · each one leads to its detail page. The
 * team shows its own work: a cursor comes to a row and its drawing plays (so does hover and
 * focus). Below: the combinations we like · fair questions. (The drawing board that used to be
 * the hero is gone: Batuhan found no reason for it.)
 */

/** Short keys used in class names (.t-web · .t-app · .t-id · .t-mo). */
export const TOOL_CLASS: Record<ServiceKey, string> = { web: 'web', app: 'app', identity: 'id', motion: 'mo' };

export const TOOL_ICON: Record<ServiceKey, Safe> = {
  web: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2"></rect><path d="M3 9h18"></path></svg>'),
  app: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><path d="M10.5 18.5h3"></path></svg>'),
  identity: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 8.5-6 9.5-6-9.5z"></path><circle cx="12" cy="12" r="1.6"></circle></svg>'),
  motion: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19c7 0 7-14 16-14"></path><circle cx="4" cy="19" r="2"></circle><circle cx="20" cy="5" r="2"></circle></svg>'),
};
/** The small drawing of each row. It plays on hover · on focus · when a teammate points at it (.play). */
const TILE_ART: Record<ServiceKey, Safe> = {
  web: raw('<span class="br"><i></i><i></i><i></i><i></i></span>'),
  app: raw('<span class="ph"><em></em><i></i><i></i><i></i></span>'),
  identity: raw(
    '<svg class="mk" viewBox="0 0 300 270"><path d="M60 200 C 40 90 150 40 190 90 S 170 210 120 170 S 200 60 250 120"></path><rect x="54" y="194" width="12" height="12"></rect><rect x="184" y="84" width="12" height="12"></rect><rect x="244" y="114" width="12" height="12"></rect></svg>',
  ),
  motion: raw(
    '<span class="ez"><svg viewBox="0 0 300 270"><path class="ax" d="M20 20V250H280"></path><path class="hd2" d="M20 250L190 250M280 20L110 20"></path><path class="cv" d="M20 250C190 250 110 20 280 20"></path></svg><i class="bd"></i></span>',
  ),
};

const serviceHref = (ctx: Ctx, k: ServiceKey) => href(ctx.lang, 'service', { slug: SERVICE_SLUGS[k][ctx.lang] });

/** Who shows which row: the teammate whose work it mostly is. */
const SHOWS: Record<ServiceKey, string> = { web: 'code', app: 'code', identity: 'design', motion: 'motion' };

function hero(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o, services: s } = SERVICES[lang];
  return html`<section class="shero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('Hizmetler')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<div class="shd"><h1 class="ttl" data-rest="design" data-rest-at="end 14 -12">${o.title}</h1><p class="lede" data-rest="motion" data-rest-at="end 12 4">${o.lede}</p></div>
<ol class="sl">${SERVICE_KEYS.map(
    (k) => html`<li><a class="svr t-${TOOL_CLASS[k]}" href="${serviceHref(ctx, k)}" data-row="${k}" data-by="${SHOWS[k]}">
<span class="sv-no mono"><i aria-hidden="true"></i>${s[k].no}</span>
<span class="sv-art" aria-hidden="true"${k === 'web' ? html` data-rest="code" data-rest-at="1 1 4 2"` : ''}><span class="tart">${TILE_ART[k]}</span></span>
<span class="sv-main"><b class="sv-name">${s[k].name}</b><span class="sv-desc">${s[k].desc}</span><span class="sv-dl mono">${s[k].dl.join(' · ')}</span></span>
<span class="sv-facts"><span><span class="mono">${t('Genelde')}</span><b>${s[k].time}</b></span><span><span class="mono">${t('Başlangıç fiyatı')}</span><b>${ctx.settings.text(priceKey(k, 0), ctx.lang) ?? t('[FİYAT]')}</b></span></span>
<span class="sv-go"><span class="sr">${s[k].see}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"></path></svg></span>
</a></li>`,
  )}</ol>
<p class="sl-note">${o.toolsP}</p>
</div></section>`;
}

function combos(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o, services: s } = SERVICES[lang];
  const pill = (k: ServiceKey) => html`<span class="pl t-${TOOL_CLASS[k]}">${TOOL_ICON[k]}${s[k].name}</span>`;
  return html`<section class="combo" data-sec="combo"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Birlikte daha iyi')}</p>
<h2 class="h2">${t('Sevdiğimiz matematik.')}</h2>
<ul class="eqs">${o.combos.map(
    (c, i) => html`<li class="eq"><span class="pills">${pill(c.a)}<span class="plus" aria-hidden="true">+</span>${pill(c.b)}</span><span class="eqs-q" aria-hidden="true">=</span><b class="res"${i === 0 ? html` data-rest="host" data-rest-at="end 18 -6"` : ''}>${c.is}</b></li>`,
  )}</ul>
</div></section>`;
}

function faq(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o } = SERVICES[lang];
  return html`<section class="faq" data-sec="faq"><div class="wrap">
<aside><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Sorular')}</p><h2 class="h2">${t('Haklı')}<br>${t('sorular.')}</h2><p>${t('Aklında başka bir şey mi var?')} <a href="${href(lang, 'start')}">${t('Doğrudan bize sor.')}</a> ${t('Bir gün içinde bir insan cevap verir.')}</p></aside>
<div class="qs" data-qs>${o.faq.map(
    (f, i) => html`<div class="q${i === 0 ? ' open' : ''}"><h3 class="qh"><button type="button" class="qb" id="q${i}" aria-expanded="${String(i === 0)}" aria-controls="a${i}"${i === 0 ? html` data-rest="host" data-rest-at="0.6 0.5"` : ''}><b>${f.q}</b><i class="pm" aria-hidden="true"></i></button></h3><div class="qa" id="a${i}" role="region" aria-labelledby="q${i}"><div><p>${f.a}</p></div></div></div>`,
  )}</div>
</div></section>`;
}

export const servicesPage: Page = {
  id: 'services',
  theme: 'paper',
  host: 'design',
  section: 'services',
  scripts: ['services'],
  styles: ['services'],
  title: (t) => t('Hizmetler'),
  description: (t) => t('Web siteleri · uygulamalar · kimlik ve hareket.'),
  body: (ctx) => html`${hero(ctx)}
${combos(ctx)}
${faq(ctx)}`,
  next: { to: 'process', kick: msg('Sonraki sayfa'), big: msg('Süreç'), tone: 'night' },
};
