import type { BoardProject } from '../../data/content';
import { html, type Safe } from '../../html';
import { picture } from '../../media/picture';
import type { Ctx } from '../../page';
import { href } from '../../routes';
import { HOME } from '../../content/home';
import { BOARD_ART } from './art';

/** Frame 7 is always the Lab. Frames 0–6 belong to projects (projects.board_slot). */
export const LAB_FRAME = 7;

/** Frames are at most 540 px wide · the opened frame is 600 px · on a phone it fills the screen. */
const SIZES = '(max-width: 760px) 92vw, 600px';

interface Frame {
  slot: number;
  /** Where "Read the case" goes: the project's case study (the Lab frame opens the Lab). */
  href: string;
  no: string;
  name: string;
  what: string;
  art: Safe;
}

function frames(ctx: Ctx, projects: BoardProject[]): Frame[] {
  const lab = HOME[ctx.lang].lab;
  return [
    ...projects.map((p) => ({
      slot: p.slot,
      href: href(ctx.lang, 'case', { slug: p.slug }),
      no: `No. ${p.number}`,
      name: p.name,
      what: `${p.kind} · ${p.year}`,
      art: p.cover ? picture(p.cover, { lang: ctx.lang, sizes: SIZES, alt: '' }) : (BOARD_ART[p.art ?? ''] ?? html`<span class="ar ar-none"></span>`),
    })),
    { slot: LAB_FRAME, href: href(ctx.lang, 'lab'), no: 'Lab', name: lab.name, what: lab.what, art: BOARD_ART.lab! },
  ];
}

/**
 * 04 · Selected work on an endless board. Drag to pan · it wraps around · click a frame to open it.
 * Frame positions without JS come from CSS (.b0…b7). The client takes over with transforms.
 * The frame names the project in text, so its image is decorative (alt="").
 */
export function board(ctx: Ctx, projects: BoardProject[]): Safe {
  const { t, lang } = ctx;
  const list = frames(ctx, projects);
  return html`<section class="work" data-sec="work" id="work" data-host="design">
<span class="rest" data-rest="design" data-rest-at="0.68 0.64" data-rest-at-m="0.7 0.3"></span>
<div class="wrap whead">
<div><p class="kick mono"><span>(04)</span><span>${t('Seçili işler')}</span></p><h2 class="h2">${t('Pano.')}</h2><p class="wsub">${t('Gurur duyduğumuz her şey tek bir sonsuz panoda. İstediğin yöne sürükle. Hiç bitmiyor.')}</p></div>
<div class="wtools"><span class="mono">${t('Sürükle ve gez')}</span><span class="zoom mono">100%</span><div class="mm" aria-hidden="true">${list.map((f) => html`<i class="m${f.slot}"></i>`)}<b class="mmv" data-mmv></b></div></div>
</div>
<div class="board" data-board>
<div class="bwrap" data-bwrap>${list.map(
    (f) => html`<div class="bf b${f.slot}" data-bf="${f.slot}" role="button" tabindex="0" data-no="${f.no}" data-name="${f.name}" data-what="${f.what}" data-href="${f.href}">
<span class="bl mono">${f.no} · ${f.name}</span><span class="sr"> · ${f.what}</span><span class="ba" aria-hidden="true">${f.art}</span><span class="pin" aria-hidden="true"><i>D</i><b></b></span>
</div>`,
  )}</div>
<div class="ov" data-ov hidden>
<button type="button" class="ovb" data-close aria-label="${t('Kapat')}"></button>
<div class="ovc" role="dialog" aria-modal="true" aria-labelledby="ov-name">
<span class="ba" data-ovart aria-hidden="true"></span>
<div><p class="mono"><span data-ovno></span> · ${t('örnek proje')}</p><h3 id="ov-name" data-ovname></h3><p data-ovwhat></p><div class="ovr"><a class="btn f" href="${href(lang, 'work')}" data-ovlink>${t('Vakayı oku')} <span aria-hidden="true">↗</span></a><button type="button" class="btn g" data-close>${t('Panoya dön')}</button></div></div>
</div>
</div>
</div>
</section>`;
}
