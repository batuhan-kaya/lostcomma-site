import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import type { ProjectCard } from '../../data/content';
import { href } from '../../routes';
import { loopVideo } from '../../media/video';
import { androidArt, frameArt } from './frames';

/**
 * 03 · Services. One frame changes shape between website · app · identity · motion · automation.
 * Each shape plays a real looking product (frames.ts). The motion frame plays a real loop once a
 * live project has one: inside the editor's preview. A phone turns the list into a row of chips
 * over the frame and shows the picked row's words under it (`.sdesc` · the rows' own words are
 * hidden there): the change happens where the finger is.
 */
export function services(ctx: Ctx, loop: ProjectCard | null = null): Safe {
  const { t, lang } = ctx;
  const sv = ctx.texts.home(lang).services;
  const first = sv[0]!;
  return html`<section class="svc" data-sec="svc" id="services" data-host="motion" data-far>
<span class="rest" data-rest="motion" data-rest-at="0.3 0.92" data-rest-at-m="0.8 0.5"></span>
<div class="wrap">
<div class="sl">
<p class="kick mono"><span>(03)</span><span>${t('Ne yapıyoruz')}</span></p>
<h2 class="h2">${t('Beş biçim. Tek stüdyo.')}</h2>
<p class="ssub">${t('Her çerçeve boyutunda aynı ekip ve aynı özen. Birini seç ya da ekibin değiştirmesini izle.')}</p>
<div class="opts" role="radiogroup" aria-label="${t('Hizmetler')}">${sv.map(
    (o, i) => html`<button type="button" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}" class="opt${i === 0 ? ' act' : ''}" data-opt="${i}"><i class="rd" aria-hidden="true"></i><b>${o.name}</b><span class="os mono">${o.size}</span><span class="od"><span class="odi"><span class="odd">${o.desc}</span><span class="odl mono">${o.dl}</span></span></span></button>`,
  )}</div>
<a class="sec-go" href="${href(lang, 'services')}">${t('Hizmetleri tek tek gör')} <span aria-hidden="true">→</span></a>
</div>
<div class="stage" data-stage>
<div class="sscale" data-sscale>
<div class="frm v0" data-frm>
<div class="flab2 mono"><span><i class="fi" aria-hidden="true"></i><span data-frmlab>${first.lab}</span></span><button type="button" class="ib2" data-inspb aria-pressed="false">&lt;/&gt; ${t('İncele')}</button></div>
<div class="clip" aria-hidden="true">${frameArt(loop?.loop ? loopVideo(loop.loop, { lang, alt: '', posterWidth: 1280, lazyPoster: true }) : null, (n) => ctx.assets.image(n)).map(
    (art, i) => html`<div class="fc${i === 0 ? ' on' : ''}" data-fc="${i}">${art}</div>`,
  )}</div>
<pre class="code" data-code hidden>${first.code}</pre>
<i class="hd2 a" aria-hidden="true"></i><i class="hd2 b" aria-hidden="true"></i><i class="hd2 c" aria-hidden="true"></i><i class="hd2 d" aria-hidden="true"></i>
<span class="szb mono" data-frmsize>${first.size}</span>
<span class="ftry mono" aria-hidden="true"><i></i><span class="tw">${t('Canlı · bir gün ve saat seç')}</span><span class="ta">${t('Canlı · tutar yaz ve gönder')}</span><span class="tl">${t('Kontrol sende')}</span></span>
<button type="button" class="fxp mono" data-fxp hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span class="tw">${t('Tam ekran dene')}</span></button>
</div>
<div class="frm2" aria-hidden="true"><div class="flab3 mono" lang="en"><span>Android</span><span>412 × 915</span></div><div class="clip2"><div class="fc" data-fca>${androidArt((n) => ctx.assets.image(n))}</div></div></div>
</div>
</div>
<div class="sdesc" data-sdesc>${sv.map((o, i) => html`<p class="sdi${i === 0 ? ' on' : ''}" data-sd="${i}"><span class="odd">${o.desc}</span><span class="odl mono">${o.dl}</span></p>`)}</div>
<dialog class="fv" data-fv aria-labelledby="fv-t" tabindex="-1" autofocus>
<div class="fv-bar"><span class="fv-t mono" id="fv-t" data-fvt>${first.lab}</span><button type="button" class="fv-x mono" data-fvx>${t('Kapat')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<div class="fv-box" data-fvbox></div>
<p class="fv-hint mono"><span class="tw">${t('Kaydır ve dokun · gerçekten çalışıyor')}</span><span class="ta">${t('Dokun ve gönder · gerçekten çalışıyor')}</span></p>
</dialog>
</div>
</section>`;
}
