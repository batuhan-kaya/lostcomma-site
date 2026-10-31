import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { HOME } from '../../content/home';
import { stepArt } from './art';

/** 05 · How a project moves: a clickable prototype of five screens joined by noodles. */
export function process(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const steps = HOME[lang].steps;
  const chat = { ask: t('Peki bu aslında kimin için?'), answer: t('Pazar günü yelken açanlar.'), live: t('Yayında · v1.0') };
  const NOODLES = [
    ['M136 256 C226 256 205 220 289 220', 'M281 214 L289 220 L281 226'],
    ['M431 336 C540 336 480 140 584 140', 'M576 134 L584 140 L576 146'],
    ['M726 256 C816 256 795 220 879 220', 'M871 214 L879 220 L871 226'],
    ['M1021 336 C1130 336 1070 140 1174 140', 'M1166 134 L1174 140 L1166 146'],
  ];
  return html`<section class="prc" data-sec="prc" id="process" data-host="code">
<span class="rest" data-rest="code" data-rest-at="0.88 0.26" data-rest-at-m="0.82 0.14"></span>
<div class="wrap">
<div class="phead">
<div><p class="kick mono"><span>(05)</span><span>${t('Süreç')}</span></p><h2 class="h2">${t('Bir proje nasıl ilerler.')}</h2></div>
<p class="psub">${t('Nasıl çalıştığımızın tıklanabilir bir prototipi. Herhangi bir ekranda İleri’ye bas ya da ekibe bırak.')}</p>
</div>
<div class="flowbox" data-flowbox>
<div class="flow" data-flow>
${steps.map(
  (s, i) => html`<div class="pf p${i}${i === 0 ? ' act' : ''}" data-pf="${i}"><span class="pl mono">${String(i + 1).padStart(2, '0')} · ${s.name}</span><span class="pc" aria-hidden="true">${stepArt(i, chat)}</span><button type="button" class="hot" data-hot="${i}">${i < 4 ? t('İleri →') : t('Baştan ↺')}</button></div>`,
)}
<svg class="nood" viewBox="0 0 1360 400" aria-hidden="true">${NOODLES.map(([d, a], i) => html`<path class="nl${i === 0 ? ' act' : ''}" data-np="${i}" d="${d}"></path><path class="ah${i === 0 ? ' act' : ''}" data-ah="${i}" d="${a}"></path>`)}<circle class="pdot" data-pdot cx="0" cy="0" r="7"></circle></svg>
</div>
</div>
<div class="pdet" aria-live="polite">${steps.map(
    (s, i) => html`<div class="pd${i === 0 ? ' act' : ''}" data-pd="${i}"${i === 0 ? '' : html` aria-hidden="true"`}><div><p class="pn">${s.name}</p><p class="pt mono">${s.time}</p></div><p class="px">${s.text}</p><p class="pget mono">${t('Sana kalan')}<span>${s.get}</span></p></div>`,
  )}</div>
</div>
</section>`;
}
