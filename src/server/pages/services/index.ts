import { priceKey } from '../../data/settings';
import { SERVICE_KEYS, SERVICE_SLUGS, SERVICES, type ServiceKey } from '../../content/services';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';

/**
 * Services · "Pick a tool". The hero is a drawing board with one tool per service: drag out a
 * website frame · place a phone · draw a mark with the pen · draw a path and watch it move. The
 * inspector describes the tool in hand. Below: the four tools · the combinations we like · fair
 * questions. Without JS the board is a picture and everything else reads top to bottom.
 */

/** Short keys used in class names (.t-web · .t-app · .t-id · .t-mo). */
export const TOOL_CLASS: Record<ServiceKey, string> = { web: 'web', app: 'app', identity: 'id', motion: 'mo' };

export const TOOL_ICON: Record<ServiceKey, Safe> = {
  web: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2"></rect><path d="M3 9h18"></path></svg>'),
  app: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><path d="M10.5 18.5h3"></path></svg>'),
  identity: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 8.5-6 9.5-6-9.5z"></path><circle cx="12" cy="12" r="1.6"></circle></svg>'),
  motion: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19c7 0 7-14 16-14"></path><circle cx="4" cy="19" r="2"></circle><circle cx="20" cy="5" r="2"></circle></svg>'),
};
const UNDO = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6L4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3"></path></svg>');
const BIN = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg>');

/** The drawings on the four tiles. They come alive on hover. */
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

const lines = (s: string): Safe => html`${s.split('\n').map((l, i) => html`${i ? html`<br>` : ''}${l}`)}`;
const serviceHref = (ctx: Ctx, k: ServiceKey) => href(ctx.lang, 'service', { slug: SERVICE_SLUGS[k][ctx.lang] });

function hero(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o, services: s } = SERVICES[lang];
  return html`<section class="shero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('Hizmetler')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="design" data-rest-at="end 14 -12">${o.title}</h1>
<p class="lede">${o.lede} <b>${o.try}</b> ${o.after}</p>
<div class="board" data-board data-rest="motion" data-rest-at="0.07 0.88" data-rest-at-m="0.06 0 0 296">
<div class="stage t-web" data-stage role="img" aria-label="${t('Çizim tahtası')}">
<p class="empty" data-empty aria-hidden="true">${t('Buraya çiz')}</p>
</div>
<p class="tbh mono" data-hint aria-hidden="true">${s.web.hint}</p>
<div class="tb" role="toolbar" aria-label="${t('Araçlar')}">
${SERVICE_KEYS.map(
  (k, i) => html`<button type="button" class="tl t-${TOOL_CLASS[k]}${i === 0 ? ' on' : ''}" data-tool="${k}" aria-pressed="${String(i === 0)}" aria-label="${s[k].tool}">${TOOL_ICON[k]}<span class="tt mono" aria-hidden="true">${s[k].tool}</span></button>`,
)}
<i class="sep" aria-hidden="true"></i>
<button type="button" class="tl" data-undo aria-label="${t('Geri al')}">${UNDO}<span class="tt mono" aria-hidden="true">${t('Geri al')}</span></button>
<button type="button" class="tl" data-clear aria-label="${t('Tahtayı temizle')}">${BIN}<span class="tt mono" aria-hidden="true">${t('Temizle')}</span></button>
</div>
<aside class="insp" aria-label="${t('Denetçi')}">
<p class="ih mono" aria-hidden="true"><span>${t('Denetçi')}</span><span data-itag>${s.web.tag}</span></p>
${SERVICE_KEYS.map(
  (k, i) => html`<div class="ib t-${TOOL_CLASS[k]}" data-ib="${k}"${i ? html` hidden` : ''}>
<b>${s[k].name}</b>
<p>${s[k].desc}</p>
<ul class="dl">${s[k].dl.map((d) => html`<li>${d}</li>`)}</ul>
<div class="ir"><span class="mono">${t('Genelde')}</span><b>${s[k].time}</b></div>
<div class="ir"><span class="mono">${t('Başlangıç fiyatı')}</span><b>${ctx.settings.text(priceKey(k, 0), ctx.lang) ?? t('[FİYAT]')}</b></div>
<a class="ilink" href="${serviceHref(ctx, k)}"${k === 'web' ? html` data-rest="code" data-rest-at="0.82 1 0 16"` : ''}><span>${s[k].more}</span><span aria-hidden="true">→</span></a>
</div>`,
)}
</aside>
</div>
</div></section>`;
}

function tools(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o, services: s } = SERVICES[lang];
  return html`<section class="tools" data-sec="tools"><div class="wrap">
<div class="thd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Dört araç')}</p><h2 class="h2">${lines(o.toolsH)}</h2></div><p data-rest="host" data-rest-at="0.6 -0.6">${o.toolsP}</p></div>
<div class="tg">${SERVICE_KEYS.map(
    (k) => html`<a class="tile t-${TOOL_CLASS[k]}" href="${serviceHref(ctx, k)}">
<span class="tnum mono"><span>${s[k].no} · ${s[k].tag}</span><span>${s[k].size}</span></span>
<span class="tart" aria-hidden="true">${TILE_ART[k]}</span>
<b class="tname">${s[k].name}</b>
<p>${s[k].desc}</p>
<span class="tdl mono">${s[k].dl.join(' · ')}</span>
<span class="tfoot"><span class="mono">${s[k].time}</span><span class="tgo">${s[k].see} <span aria-hidden="true">→</span></span></span>
</a>`,
  )}</div>
</div></section>`;
}

function combos(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const { overview: o, services: s } = SERVICES[lang];
  const pill = (k: ServiceKey) => html`<span class="pl t-${TOOL_CLASS[k]}">${TOOL_ICON[k]}${s[k].tool}</span>`;
  return html`<section class="combo" data-sec="combo"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Birlikte daha iyi · bir satırın üstüne gel')}</p>
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
${tools(ctx)}
${combos(ctx)}
${faq(ctx)}`,
  /** The board needs each tool's name · tag · hint and how drawn things are labelled. */
  data: (ctx) => {
    const s = SERVICES[ctx.lang].services;
    return { tools: Object.fromEntries(SERVICE_KEYS.map((k) => [k, { tag: s[k].tag, hint: s[k].hint }])) };
  },
  next: { to: 'process', kick: msg('Sonraki sayfa'), big: msg('Süreç'), tone: 'night' },
};
