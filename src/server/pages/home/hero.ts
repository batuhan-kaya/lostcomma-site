import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { HOME } from '../../content/home';

/**
 * 01 · Hero. The team is live in the file: design rewrites a word of the headline,
 * motion bounces the period, code publishes a new version.
 */
export function hero(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const word = HOME[lang].words[0] ?? '';
  const box = html`<button type="button" class="wbox" data-wbox title="${t('Kelimeyi değiştir')}"><span class="wtx" data-word>${word}</span><i class="tc" aria-hidden="true"></i><i class="hh hA" aria-hidden="true"></i><i class="hh hB" aria-hidden="true"></i><i class="hh hC" aria-hidden="true"></i><i class="hh hD" aria-hidden="true"></i><span class="sz mono" aria-hidden="true">${t('Metin')} · 146</span></button>`;
  const dot = html`<button type="button" class="dot" data-dot title="${t('Noktayı zıplat')}">.</button>`;
  // Turkish puts the variable word first · English at the end.
  const lines =
    lang === 'tr'
      ? html`<span class="ln">${box}</span><span class="ln">web siteleri ve</span><span class="ln">uygulamalar yapıyoruz${dot}</span>`
      : html`<span class="ln">We design and build</span><span class="ln">websites and apps</span><span class="ln">people ${box}${dot}</span>`;

  return html`<section class="hero" data-sec="hero" id="top">
<span class="rest" data-rest="design" data-rest-at="0.85 0.52" data-rest-at-m="0.8 0.34"></span>
<span class="rest" data-rest="code" data-rest-at="0.8 0.86" data-rest-at-m="0.72 0.86"></span>
<span class="rest" data-rest="motion" data-rest-at="0.51 0.67" data-rest-at-m="0.3 0.6"></span>
<div class="wrap hw">
<p class="flab mono"><i class="fi" aria-hidden="true"></i><span data-flab>${t('Ana sayfa')} · 1440 × 900</span></p>
<h1 class="hl">${lines}</h1>
<div class="hpin c-motion"><button type="button" class="pinb" aria-describedby="hpin-thr">M</button><span class="thr" id="hpin-thr" role="tooltip"><span><b class="tm">motion</b>${t('Nokta zıplayabilir mi?')}</span><span><b class="td">design</b>${t('Zaten zıplıyor. İzle.')}</span></span></div>
<div class="hlede">
<p>${t('Lost Comma İstanbul’da bir tasarım ve yazılım stüdyosu. Web siteleri ve uygulamalar ve kimlikleri sahipleriyle birlikte ve herkesin önünde yapıyoruz.')} <b>${t('Tam şu an olduğu gibi.')}</b></p>
<div class="ctas"><a class="btn f" href="#contact">${t('Proje başlat')} <span aria-hidden="true">↗</span></a><a class="btn g" href="#work">${t('İşlere bak')}</a></div>
</div>
<div class="pubc"><span class="ps mono"><i class="live" data-pubdot></i><span data-pubtxt>${t('Yayında · v{n}', { n: 214 })}</span></span><button type="button" class="pubb" data-pub>${t('Yayınla')}</button></div>
<div class="hfoot mono"><span>${t('Tasarım ve yazılım stüdyosu · İstanbul')}</span><span>${t('Aşağı kaydır · içimizden biri sana eşlik eder')} <span aria-hidden="true">↓</span></span></div>
</div>
</section>`;
}
