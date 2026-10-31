import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { href } from '../../routes';
import { HOME } from '../../content/home';
import { BOARD_ART } from './art';

/**
 * 04 · Selected work on an endless board. Drag to pan · it wraps around · click a frame to open it.
 * Frame positions without JS come from CSS (.b0…b7). The client takes over with transforms.
 */
export function board(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const projects = HOME[lang].projects;
  return html`<section class="work" data-sec="work" id="work" data-host="design">
<span class="rest" data-rest="design" data-rest-at="0.68 0.64" data-rest-at-m="0.7 0.3"></span>
<div class="wrap whead">
<div><p class="kick mono"><span>(04)</span><span>${t('Seçili işler')}</span></p><h2 class="h2">${t('Pano.')}</h2><p class="wsub">${t('Gurur duyduğumuz her şey tek bir sonsuz panoda. İstediğin yöne sürükle. Hiç bitmiyor.')}</p></div>
<div class="wtools"><span class="mono">${t('Sürükle ve gez')}</span><span class="zoom mono">100%</span><div class="mm" aria-hidden="true">${projects.map((_, i) => html`<i class="m${i}"></i>`)}<b class="mmv" data-mmv></b></div></div>
</div>
<div class="board" data-board>
<div class="bwrap" data-bwrap>${projects.map(
    (p, i) => html`<div class="bf b${i}" data-bf="${i}" role="button" tabindex="0" data-no="${p.no}" data-name="${p.name}" data-what="${p.what}">
<span class="bl mono">${p.no} · ${p.name}</span><span class="sr"> · ${p.what}</span><span class="ba" aria-hidden="true">${BOARD_ART[i]}</span><span class="pin" aria-hidden="true"><i>D</i><b></b></span>
</div>`,
  )}</div>
<div class="ov" data-ov hidden>
<button type="button" class="ovb" data-close aria-label="${t('Kapat')}"></button>
<div class="ovc" role="dialog" aria-modal="true" aria-labelledby="ov-name">
<span class="ba" data-ovart aria-hidden="true"></span>
<div><p class="mono"><span data-ovno></span> · ${t('örnek proje')}</p><h3 id="ov-name" data-ovname></h3><p data-ovwhat></p><div class="ovr"><a class="btn f" href="${href(lang, 'work')}">${t('Vakayı oku')} <span aria-hidden="true">↗</span></a><button type="button" class="btn g" data-close>${t('Panoya dön')}</button></div></div>
</div>
</div>
</div>
</section>`;
}
