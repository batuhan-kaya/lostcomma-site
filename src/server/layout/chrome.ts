import { SERVICE_KEYS, SERVICE_SLUGS, SERVICES } from '../content/services';
import { SOCIAL } from '../data/settings';
import { cx, html, type Safe } from '../html';
import { msg } from '../msg';
import type { Ctx, NextBand } from '../page';
import { href, type RouteId } from '../routes';
import { MARK } from '../../shared/logo';
import { lockup } from './logo';

const NAV: [RouteId, string][] = [
  ['work', msg('İşler')],
  ['services', msg('Hizmetler')],
  ['studio', msg('Stüdyo')],
  ['notes', msg('Notes')],
  ['lab', msg('Lab')],
];

const TEAM = [
  ['design', 'D'],
  ['code', 'C'],
  ['motion', 'M'],
] as const;

/**
 * Roll label: the page language on top and the other language underneath.
 * The language switch rolls every label before it navigates.
 */
export function roll(ctx: Ctx, source: string, delay = 0): Safe {
  return html`<span class="${cx('rl', delay > 0 && 'd' + delay)}"><span>${ctx.t(source)}</span><span aria-hidden="true">${ctx.tAlt(source)}</span></span>`;
}

export function istanbulTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(d);
}

function langSwitch(ctx: Ctx, label = msg('Dil')): Safe {
  const items = (['en', 'tr'] as const).map((l) => {
    const on = l === ctx.lang;
    const to = ctx.alt[l] ?? href(l, 'home');
    return html`<a class="${cx('lg', on && 'on')}" href="${to}" hreflang="${l}" lang="${l}"${on ? html` aria-current="true"` : ''} data-lang="${l}">${l.toUpperCase()}</a>`;
  });
  return html`<nav class="lang mono" aria-label="${ctx.t(label)}">${items}</nav>`;
}

/** The "Live" presence: a status dot · the team avatars · on the homepage they are buttons with popovers. */
function presence(ctx: Ctx, home: boolean): Safe {
  const { t } = ctx;
  if (!home) {
    return html`<span class="pres mono" aria-hidden="true"><i></i>${roll(ctx, msg('Canlı'))}<span class="avs">${TEAM.map(([n, l]) => html`<span class="av c-${n}" data-av="${n}">${l}</span>`)}<span class="av c-you">${t('S')}</span></span></span>`;
  }
  return html`<div class="pres mono" data-pres>
<i></i>${roll(ctx, msg('Canlı'))}<span class="avs">${TEAM.map(
    ([n, l]) => html`<button type="button" class="av c-${n}" data-av="${n}" data-pop="${n}" aria-label="${t('{name} burada', { name: n })}">${l}</button>`,
  )}<button type="button" class="av c-comma egg" data-av="comma" data-pop="comma" aria-label="${t('virgül burada')}" hidden>,</button><button type="button" class="av ghost" data-pop="ghost" aria-label="${t('Biri dosyadan çıktı')}">?</button><button type="button" class="av c-you" data-pop="you" aria-label="${t('Sen')}">${t('S')}</button></span>
<div class="popv" data-popv role="status" hidden><b></b><span></span></div>
</div>`;
}

export function header(ctx: Ctx, section?: RouteId, opts: { home?: boolean } = {}): Safe {
  const { t, lang } = ctx;
  const links = NAV.map(([id, label], i) => {
    const on = id === section;
    return html`<a class="${cx('lk', on && 'act')}" href="${href(lang, id)}"${on ? html` aria-current="page"` : ''}>${roll(ctx, label, i)}</a>`;
  });
  const sheet = NAV.map(([id, label]) => html`<a href="${href(lang, id)}"${id === section ? html` aria-current="page"` : ''}>${t(label)}</a>`);
  return html`<header class="hd">
<div class="wrap">
<div class="hl2">
<a href="${href(lang, 'home')}" class="logo">${lockup()}</a>
${presence(ctx, !!opts.home)}
</div>
<nav class="links mono" aria-label="${t('Ana menü')}">${links}</nav>
<div class="hr">
${langSwitch(ctx)}
<a class="cta" href="${href(lang, 'start')}">${roll(ctx, msg('Proje başlat'), 5)}</a>
<details class="menu">
<summary class="mb mono"><span class="o">${t('Menü')}</span><span class="c">${t('Kapat')}</span></summary>
<div class="sheet">${sheet}<a href="${href(lang, 'start')}">${t('Proje başlat')}</a></div>
</details>
</div>
</div>
</header>`;
}

export function nextBand(ctx: Ctx, next: NextBand): Safe {
  return html`<a class="nx nb-${next.tone}" href="${href(ctx.lang, next.to)}" data-sec="next">
<span class="wrap"><span class="nxl"><span class="mono">${roll(ctx, next.kick)}</span><b>${roll(ctx, next.big)}</b></span><svg class="nxa" viewBox="0 0 48 48" aria-hidden="true" data-rest="host" data-rest-at="0.3 0.55"><path d="M6 24h34M28 12l12 12-12 12"></path></svg></span>
</a>`;
}

const EMAIL = 'hello@lostcomma.co';

/** A sitemap link · the current page is marked. */
function fl(ctx: Ctx, to: string, label: string, o: { rel?: string } = {}): Safe {
  const here = to === ctx.path;
  return html`<li><a class="ft-l" href="${to}"${here ? html` aria-current="page"` : ''}${o.rel ? html` rel="${o.rel}"` : ''}>${label}</a></li>`;
}

/** The big sign-off: the mark is drawn with a pen (src/client/lib/footer.ts) · the name rises after it. */
function signature(): Safe {
  const letters = (w: string) => w.split('').map((ch) => html`<span>${ch}</span>`);
  return html`<p class="ft-lock" data-rest="host" data-rest-at="end 18 -10"><svg class="lc-mark ft-mk" viewBox="0 0 ${MARK.w} ${MARK.h}" aria-hidden="true" focusable="false"><path class="lc-t" pathLength="1" d="${MARK.top}"></path><path class="lc-c" pathLength="1" d="${MARK.comma}"></path><path class="lc-r" pathLength="1" d="${MARK.top}"></path></svg><span class="ft-w">${letters('lost')}</span><b class="lgc egg" aria-hidden="true">,</b><span class="ft-gap"> </span><span class="ft-w">${letters('comma')}</span></p>`;
}

/**
 * The footer of every page (the homepage too): a way to start · the whole site · the drawn
 * sign-off · the small print. Always on ink · lime is its one accent. Social links come from the
 * panel (Site ayarları · Sosyal) and an empty one does not show · so do an empty phone and address.
 */
export function footer(ctx: Ctx): Safe {
  const { t, lang, settings } = ctx;
  const month = settings.month('work.nextMonth', lang);
  const phone = settings.text('studio.phone', lang);
  const address = settings.text('studio.address', lang);
  const social = SOCIAL.map((s) => ({ ...s, url: settings.text(s.key, lang) })).filter((s) => s.url);
  const services = SERVICE_KEYS.map((k) => fl(ctx, href(lang, 'service', { slug: SERVICE_SLUGS[k][lang] }), SERVICES[lang].services[k].name));
  return html`<footer class="ft th-ink" data-sec="ft" data-ft>
<div class="wrap">
<div class="ft-top">
<div class="ft-ask">
<p class="ft-avail mono"><i aria-hidden="true"></i><span>${month ? t('Bir sonraki boş yer {m} ayında açılıyor', { m: month }) : t('Yeni projeleri konuşmaya açığız')}</span></p>
<h2 class="ft-big">${t('Bir fikrin mi var?')}</h2>
</div>
<div class="ft-go">
<div class="ft-btns"><a class="ft-b f" href="${href(lang, 'start')}">${t('Proje başlat')} <span aria-hidden="true">→</span></a><a class="ft-b g" href="${href(lang, 'start')}#book">${t('20 dakikalık görüşme al')}</a></div>
<a class="ft-mail" href="mailto:${EMAIL}">${EMAIL}</a>
</div>
</div>
<nav class="ft-map" aria-label="${t('Site haritası')}">
<div class="ft-col"><h3 class="mono">${t('Stüdyo')}</h3><ul>${fl(ctx, href(lang, 'work'), t('İşler'))}${fl(ctx, href(lang, 'services'), t('Hizmetler'))}${fl(ctx, href(lang, 'process'), t('Süreç'))}${fl(ctx, href(lang, 'studio'), t('Stüdyo'))}</ul></div>
<div class="ft-col"><h3 class="mono">${t('Hizmetler')}</h3><ul>${services}</ul></div>
<div class="ft-col"><h3 class="mono">${t('Okuma')}</h3><ul>${fl(ctx, href(lang, 'notes'), 'Notes')}${fl(ctx, href(lang, 'lab'), 'Lab')}${fl(ctx, href(lang, 'now'), t('Şimdi'))}${fl(ctx, href(lang, 'uses'), t('Araçlar'))}${fl(ctx, href(lang, 'rss'), 'RSS')}</ul></div>
<div class="ft-col"><h3 class="mono">${t('İletişim')}</h3><ul>${fl(ctx, `mailto:${EMAIL}`, EMAIL)}${phone ? fl(ctx, `tel:${phone.replace(/[^\d+]/g, '')}`, phone) : ''}${fl(ctx, `${href(lang, 'home')}#contact`, t('Brief gönder'))}${address ? html`<li><span class="ft-addr">${address} · Kadıköy</span></li>` : ''}</ul></div>
${social.length ? html`<div class="ft-col"><h3 class="mono">${t('Takip et')}</h3><ul>${social.map((s) => html`<li><a class="ft-l" href="${s.url!}" rel="me noopener">${s.label} <span aria-hidden="true">↗</span></a></li>`)}</ul></div>` : ''}
</nav>
<div class="ft-sign">
${signature()}
<p class="ft-note mono"><span>${t('Üç kişi ve bir yerlerde bir virgül')}</span><span>${t('İstanbul')} <time data-clock>${istanbulTime(ctx.now)}</time></span></p>
</div>
<div class="ft-bar mono">
<span>© ${ctx.now.getFullYear()} Lost Comma</span>
<nav aria-label="${t('Yasal')}"><a href="${href(lang, 'privacy')}">${t('Gizlilik')}</a><a href="${href(lang, 'kvkk')}">KVKK</a><a href="${href(lang, 'cookies')}">${t('Çerezler')}</a></nav>
<div class="ft-end">${langSwitch(ctx, msg('Sayfanın dili'))}<a class="ft-up" href="#top">${t('Başa dön')} <span aria-hidden="true">↑</span></a></div>
</div>
</div>
</footer>`;
}
