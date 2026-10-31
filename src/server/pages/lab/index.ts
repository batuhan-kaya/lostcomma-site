import { EXP_KEYS, EXPS, LAB, LOG_ORDER, type ExpKey } from '../../content/lab';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { BUDGET } from '../../../shared/lab';

/**
 * Lab · six things that run. A field of commas turns toward every cursor on the page (yours and
 * the team's). Below it six live specimens: each draws only while it is on screen · shows what
 * one frame costs · steps down its quality when it goes over the budget. Then where they went.
 */
const FILTERS = [
  ['all', msg('Tümü')],
  ['type', msg('Tipografi')],
  ['motion', msg('Hareket')],
  ['pixels', msg('Piksel')],
] as const;

const FATE = { graduated: msg('Mezun oldu'), lab: msg('Hâlâ lab’de'), retired: msg('Emekli') } as const;

const PAUSE = raw('<svg viewBox="0 0 14 14" aria-hidden="true"><path class="pa" d="M2.5 2h3v10h-3zM8.5 2h3v10h-3z"></path><path class="pi" d="M3 1.5l9 5.5-9 5.5z"></path></svg>');

function hero(ctx: Ctx): Safe {
  const { t } = ctx;
  const copy = LAB[ctx.lang];
  return html`<section class="lhero" data-sec="hero" id="top">
<canvas class="field" data-field aria-hidden="true"></canvas>
<div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>Lab</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="design" data-rest-at="end 18 -40">Lab<span class="dot">.</span></h1>
<p class="lede" data-rest="motion" data-rest-at="end 12 -4">${copy.lede}</p>
<div class="stamp mono">
<span class="run" data-run><i aria-hidden="true"></i><span data-runt>${t('Hazırlanıyor')}</span></span>
<button type="button" class="pause" data-pause aria-pressed="false" data-rest="code" data-rest-at="0.2 2.6">${PAUSE}<span data-pauset>${t('Hepsini durdur')}</span></button>
<span class="bud">${t('Bütçe: kare başına {n} ms', { n: BUDGET.page })}</span>
</div>
<div class="hfoot mono"><span>${t('Gezin · virgüller seni izliyor')}</span><span>${t('Örnekler aşağıda')} <span aria-hidden="true">↓</span></span></div>
</div>
</section>`;
}

function control(ctx: Ctx, key: ExpKey): Safe {
  const copy = LAB[ctx.lang];
  const c = EXPS[key].control;
  if (!c) {
    return html`<label class="ctl mono"><span>${copy.exps[key].control}</span><input type="text" maxlength="9" value="${copy.word}" spellcheck="false" autocomplete="off" data-word></label>`;
  }
  const shown = c.step < 1 ? c.value.toFixed(2) : String(c.value);
  return html`<label class="ctl mono"><span>${copy.exps[key].control}</span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}" data-v><b data-vt>${shown}</b></label>`;
}

function grid(ctx: Ctx): Safe {
  const { t } = ctx;
  const copy = LAB[ctx.lang];
  return html`<section class="lgrid" data-sec="grid" data-host="motion"><div class="wrap">
<div class="ghd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Örnekler · birinin üstüne gel')}</p><h2 class="h2">${t('Çalışan')}<br>${t('altı şey.')}</h2></div>
<div class="filt mono" role="group" aria-label="${t('Deneyleri süz')}">${FILTERS.map(
    ([k, label], i) => html`<button type="button" class="fb${i === 0 ? ' on' : ''}" aria-pressed="${i === 0}" data-filt="${k}">${t(label)}</button>`,
  )}</div></div>
<ol class="tiles" data-tiles>${EXP_KEYS.map((key) => {
    const e = EXPS[key];
    const c = copy.exps[key];
    return html`<li class="tile" data-exp="${key}" data-g="${e.group}" data-run="off">
<div class="th mono"><span>${e.no}</span><span class="st"><i aria-hidden="true"></i><span data-st>${t('ekran dışında')}</span><span class="cost" data-cost></span></span></div>
<div class="stage" data-stage${key === 'chain' ? html` data-rest="host" data-rest-at="0.7 0.3"` : ''}>${
      key === 'breathe'
        ? html`<span class="breathe" data-br>${copy.word}</span>`
        : html`<canvas data-cv role="img" aria-label="${c.alt}"></canvas>`
    }<p class="nojs mono">${t('Bu deney JavaScript ile çalışıyor')}</p></div>
<div class="tf"><div><h3>${c.t}</h3><span class="mono">${c.tag}</span></div><button type="button" class="open" data-open aria-expanded="false">${t('Büyüt')}</button>${control(ctx, key)}</div>
</li>`;
  })}</ol>
</div></section>`;
}

function log(ctx: Ctx): Safe {
  const { t } = ctx;
  const copy = LAB[ctx.lang];
  return html`<section class="llog" data-sec="log" data-host="motion"><div class="wrap">
<div class="lla"><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Nereye gittiler')}</p><h2 class="h2">${t('Bazıları')}<br>${t('mezun oldu.')}</h2><p>${t('Lab müşteri fikirlerinin ucuz ilk taslaklarının yeri. Burada işe yarayan bir şey çoğu zaman birkaç ay sonra gerçek bir projede çıkıyor.')}</p></div>
<ol class="lrows">${LOG_ORDER.map((key, i) => {
    const e = EXPS[key];
    return html`<li class="lr"><span class="mono">${e.no}</span><div><b>${copy.exps[key].t}</b><span class="d">${copy.exps[key].fate}</span></div><span class="chip ${e.fate}"${i === 0 ? html` data-rest="host" data-rest-at="0 0.5 -26 -6"` : ''}>${t(FATE[e.fate])}</span></li>`;
  })}</ol>
</div></section>`;
}

export const labPage: Page = {
  id: 'lab',
  theme: 'lab',
  host: 'motion',
  section: 'lab',
  scripts: ['lab'],
  styles: ['lab'],
  title: (t) => t('Lab'),
  description: (t) => t('Küçük deneyler ve canlı örnekler.'),
  body: (ctx) => html`${hero(ctx)}
${grid(ctx)}
${log(ctx)}`,
  next: { to: 'start', kick: msg('Tuhaf bir fikrin mi var?'), big: msg('Başlayalım'), tone: 'lime' },
};
