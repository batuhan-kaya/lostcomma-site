import { cx, html, type Safe } from '../html';
import { msg } from '../msg';
import type { Ctx, NextBand } from '../page';
import { href, type RouteId } from '../routes';

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

function langSwitch(ctx: Ctx): Safe {
  const items = (['en', 'tr'] as const).map((l) => {
    const on = l === ctx.lang;
    const to = ctx.alt[l] ?? href(l, 'home');
    return html`<a class="${cx('lg', on && 'on')}" href="${to}" hreflang="${l}" lang="${l}"${on ? html` aria-current="true"` : ''} data-lang="${l}">${l.toUpperCase()}</a>`;
  });
  return html`<nav class="lang mono" aria-label="${ctx.t('Dil')}">${items}</nav>`;
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
<a href="${href(lang, 'home')}" class="logo"><span>lost</span><b class="lgc egg" aria-hidden="true">,</b><span class="caret"> </span><span>comma</span></a>
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

export function footer(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  return html`<footer class="ft">
<div class="wrap mono">
<span>© ${ctx.now.getFullYear()} Lost Comma · ${t('İstanbul')} <time class="clk" data-clock>${istanbulTime(ctx.now)}</time></span>
<nav aria-label="${t('Diğer sayfalar')}"><a href="${href(lang, 'process')}">${t('Süreç')}</a><a href="${href(lang, 'now')}">${t('Şimdi')}</a><a href="${href(lang, 'uses')}">${t('Araçlar')}</a><a href="${href(lang, 'rss')}">RSS</a></nav>
<nav aria-label="${t('Yasal')}"><a href="${href(lang, 'privacy')}">${t('Gizlilik')}</a><a href="${href(lang, 'kvkk')}">KVKK</a><a href="${href(lang, 'cookies')}">${t('Çerezler')}</a></nav>
<a href="mailto:hello@lostcomma.co">hello@lostcomma.co</a>
</div>
</footer>`;
}
