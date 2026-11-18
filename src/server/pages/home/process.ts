import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { href } from '../../routes';
import { layerArt } from './layers';

type Seat = 'you' | 'design' | 'code' | 'motion';

/** Who sits at the table in each step (small marks only · calm rule). */
const AT: Seat[][] = [
  ['you', 'design', 'code'],
  ['design', 'motion'],
  ['design', 'motion', 'code'],
  ['code', 'design', 'motion'],
  ['code', 'you'],
];

/**
 * 05 · Process · "Layer by layer". One real project (Clay's website) as five sheets in an
 * isometric stack · the first step at the bottom · the live site on top. Pick a step and the sheets
 * above it lift away like tracing paper · its note opens beside it on a leader line. The stack is
 * drawn in `layers.ts` · its geometry lives in home.css (`.ly`) · the client opens a step
 * (`client/home/process.ts`). The first step is open on the server.
 */
export function process(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const steps = ctx.texts.home(lang).steps;
  const art = layerArt(
    ctx,
    steps.map((s) => s.name),
    (n) => ctx.assets.image(n),
  );
  // The team's names are English words (keep their i in upper case) · the visitor is in the page's language.
  const seat = (s: Seat) => (s === 'you' ? html`<span>${t('sen')}</span>` : html`<span lang="en">${s}</span>`);
  return html`<section class="prc" data-sec="prc" id="process" data-host="code">
<span class="rest" data-rest="code" data-rest-at="0.9 0.94" data-rest-at-m="0.84 0.97"></span>
<div class="wrap">
<div class="phead">
<div><p class="kick mono"><span>(05)</span><span>${t('Süreç')}</span></p><h2 class="h2">${t('Katman katman.')}</h2></div>
<p class="psub">${t('Her proje en alttan kurulur. Beş katman ve her biri bir sonrakinin zemini. Bir adım seç ya da ekibin katmanları kaldırmasını izle.')}</p>
</div>
<div class="ly s0" data-ly>
<p class="ly-cap mono"><b>${t('Örnek proje')}</b>${t('Clay · Kadıköy’de bir seramik atölyesinin sitesi')}</p>
<div class="ly-v" aria-hidden="true"><div class="ly-s"><div class="ly-iso"><i class="ly-gr"></i>
${art.map((a, i) => html`<div class="ly-p l${i}${i === 0 ? ' on' : ' fut'}" data-lp="${i}"><i class="ly-ed"></i>${a}<i class="ly-hd"><i></i><i></i><i></i><i></i></i></div>`)}
</div></div></div>
<ol class="ly-a">
${steps.map(
  (s, i) => html`<li class="ly-r r${i}${i === 0 ? ' on' : ' fut'}" data-lr="${i}"><button type="button" class="ly-b" id="ly-b${i}" aria-expanded="${i === 0 ? 'true' : 'false'}" aria-controls="ly-d${i}" data-lb="${i}"><span class="ly-n mono">${String(i + 1).padStart(2, '0')}</span><span class="ly-t">${s.name}</span><span class="ly-w mono">${s.time}</span></button><div class="ly-d" id="ly-d${i}" role="region" aria-labelledby="ly-b${i}"${i === 0 ? '' : html` aria-hidden="true"`}><p class="ly-x">${s.text}</p><p class="ly-k mono"><span>${t('Sana kalan')}</span>${s.get}</p><p class="ly-at mono"><span>${t('Masada')}</span>${AT[i]!.map((w) => html`<i class="c-${w}"></i>${seat(w)}`)}</p></div></li>`,
)}
</ol>
<div class="ly-ft"><p class="mono">${t('Toplam · yaklaşık on hafta · ilk görüşmeden yayına')}</p><a class="ly-go" href="${href(lang, 'process')}">${t('Süreci hafta hafta gör')} <span aria-hidden="true">→</span></a></div>
</div>
</div>
</section>`;
}
