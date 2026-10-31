import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { HOME } from '../../content/home';
import { FRAME_ART } from './art';

/** 03 · Services. One frame changes shape between website · app · identity · motion. */
export function services(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const sv = HOME[lang].services;
  const first = sv[0]!;
  return html`<section class="svc" data-sec="svc" id="services" data-host="motion">
<span class="rest" data-rest="motion" data-rest-at="0.3 0.92" data-rest-at-m="0.8 0.5"></span>
<div class="wrap">
<div class="sl">
<p class="kick mono"><span>(03)</span><span>${t('Ne yapıyoruz')}</span></p>
<h2 class="h2">${t('Dört biçim. Tek stüdyo.')}</h2>
<p class="ssub">${t('Her çerçeve boyutunda aynı ekip ve aynı özen. Birini seç ya da ekibin değiştirmesini izle.')}</p>
<div class="opts" role="radiogroup" aria-label="${t('Hizmetler')}">${sv.map(
    (o, i) => html`<button type="button" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}" class="opt${i === 0 ? ' act' : ''}" data-opt="${i}"><i class="rd" aria-hidden="true"></i><b>${o.name}</b><span class="os mono">${o.size}</span><span class="od"><span class="odi"><span class="odd">${o.desc}</span><span class="odl mono">${o.dl}</span></span></span></button>`,
  )}</div>
</div>
<div class="stage" data-stage>
<div class="sscale" data-sscale>
<div class="frm v0" data-frm>
<div class="flab2 mono"><span><i class="fi" aria-hidden="true"></i><span data-frmlab>${first.lab}</span></span><button type="button" class="ib2" data-inspb aria-pressed="false">&lt;/&gt; ${t('İncele')}</button></div>
<div class="clip" aria-hidden="true">${FRAME_ART.map((art, i) => html`<div class="fc${i === 0 ? ' on' : ''}" data-fc="${i}">${art}</div>`)}</div>
<pre class="code" data-code hidden>${first.code}</pre>
<i class="hd2 a" aria-hidden="true"></i><i class="hd2 b" aria-hidden="true"></i><i class="hd2 c" aria-hidden="true"></i><i class="hd2 d" aria-hidden="true"></i>
<span class="szb mono" data-frmsize>${first.size}</span>
</div>
</div>
</div>
</div>
</section>`;
}
