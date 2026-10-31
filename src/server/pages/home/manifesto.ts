import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { HOME } from '../../content/home';

/**
 * 02 · Manifesto. The team edits a generic agency manifesto with tracked changes.
 * The server renders the finished edit (readable without JS). The client rewinds it
 * and plays the edits when the section comes into view.
 */
export function manifesto(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const c = HOME[lang];
  let n = 0;
  const doc = c.manifesto.map((seg) => {
    if (typeof seg === 'string') return seg;
    const i = n++;
    return html`<span class="chg on" data-ch="${i}" data-who="${seg.who}"><del>${seg.del}</del><ins data-ins="${seg.ins}">${seg.ins}</ins></span>`;
  });
  const modes: [string, string][] = [
    ['track', t('Değişiklikleri göster')],
    ['final', t('Tümünü kabul et')],
    ['orig', t('Tümünü reddet')],
  ];
  return html`<section class="mf mf-track" data-sec="mf" id="manifesto" data-host="design">
<span class="rest" data-rest="design" data-rest-at="0.8 0.24" data-rest-at-m="0.82 0.12"></span>
<div class="wrap">
<div class="mhead">
<div><p class="kick mono"><span>(02)</span><span>Manifesto</span></p><h2 class="h2">${t('Kendi manifestomuzu düzenledik.')}</h2></div>
<div class="mtools" role="group" aria-label="${t('Değişiklikleri incele')}">${modes.map(
    ([m, label]) => html`<button type="button" class="mt${m === 'track' ? ' act' : ''}" data-mode="${m}" aria-pressed="${m === 'track' ? 'true' : 'false'}">${label}</button>`,
  )}</div>
</div>
<div class="mbody">
<div class="paper">
<p class="smeta mono"><span>manifesto.doc</span><span data-docstat>${t('5 öneri · 3 kişi')}</span></p>
<p class="doc m-track" data-doc>${doc}</p>
</div>
<div class="cmts">${c.comments.map((cm, i) => html`<span class="cmt c-${cm.who} show" data-cmt="${i}"><span class="who mono"><i></i>${cm.who}</span><span class="ct">${cm.text}</span></span>`)}</div>
</div>
<p class="mcap mono" role="status"><span data-doccap>${t('Öneriler ekip yazdıkça beliriyor. Tümünü reddet’i dene.')}</span><span class="caret" aria-hidden="true"></span></p>
</div>
</section>`;
}
