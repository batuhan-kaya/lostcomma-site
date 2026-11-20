import { html, raw, type Safe } from '../../html';
import type { Ctx } from '../../page';

/** The review buttons' icons (stroke · currentColor). */
const ICON = {
  track: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  final: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  orig: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
} as const;

/**
 * 02 · Manifesto. The team edits a generic agency manifesto with tracked changes.
 * The server renders the finished edit (readable without JS). The client rewinds it and plays the
 * edits when the section comes into view: typed by the team · or by itself where the team does not
 * come below the hero (touch screens). The review buttons live in the document's own bar.
 */
export function manifesto(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const c = ctx.texts.home(lang);
  let n = 0;
  const doc = c.manifesto.map((seg) => {
    if (typeof seg === 'string') return seg;
    const i = n++;
    return html`<span class="chg on" data-ch="${i}" data-who="${seg.who}"><del>${seg.del}</del><ins data-ins="${seg.ins}">${seg.ins}</ins></span>`;
  });
  // The finished edit once more under the document (hidden): the page keeps that height while the
  // edit plays and when a mode hides words · nothing below it moves.
  const ghost = c.manifesto.map((seg) => (typeof seg === 'string' ? seg : html`<span class="chg on"><del>${seg.del}</del><ins>${seg.ins}</ins></span>`));
  // [mode · the full label (its name) · the short one a phone shows]
  const modes: [keyof typeof ICON, string, string][] = [
    ['track', t('Önerileri göster'), t('Öneriler')],
    ['final', t('Tümünü kabul et'), t('Kabul et')],
    ['orig', t('Tümünü reddet'), t('Reddet')],
  ];
  return html`<section class="mf mf-track" data-sec="mf" id="manifesto" data-host="design">
<span class="rest" data-rest="design" data-rest-at="0.8 0.24" data-rest-at-m="0.82 0.12"></span>
<div class="wrap">
<div class="mhead">
<p class="kick mono"><span>(02)</span><span>Manifesto</span></p>
<h2 class="h2">${t('Kendi manifestomuzu düzenledik.')}</h2>
<p class="msub">${t('Sıradan bir ajans manifestosunu öneri modunda düzenledik. Önerileri kabul et ya da reddet ve farkı gör.')}</p>
</div>
<div class="mbody">
<div class="paper">
<div class="mbar">
<p class="smeta mono"><span>manifesto.doc</span><span class="mstat" data-docstat>${t('5 öneri · 3 kişi')}</span></p>
<div class="mtools" role="group" aria-label="${t('Değişiklikleri incele')}">${modes.map(
    ([m, full, short]) =>
      html`<button type="button" class="mt${m === 'track' ? ' act' : ''}" data-mode="${m}" aria-pressed="${m === 'track' ? 'true' : 'false'}"><svg viewBox="0 0 24 24" aria-hidden="true">${raw(ICON[m])}</svg><span class="ml">${full}</span><span class="ms" aria-hidden="true">${short}</span></button>`,
  )}</div>
</div>
<div class="dstack"><p class="doc m-track ghost" aria-hidden="true">${ghost}</p><p class="doc m-track" data-doc>${doc}</p></div>
</div>
<div class="cmts" data-cmts>${c.comments.map((cm, i) => html`<span class="cmt c-${cm.who} show" data-cmt="${i}"><span class="who mono" lang="en"><i></i>${cm.who}</span><span class="ct">${cm.text}</span></span>`)}</div>
</div>
<p class="mcap mono" role="status"><span data-doccap>${t('Öneriler ekip yazdıkça beliriyor. Tümünü reddet’i dene.')}</span><span class="caret" aria-hidden="true"></span></p>
</div>
</section>`;
}
