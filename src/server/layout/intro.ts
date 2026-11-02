import type { FastifyRequest } from 'fastify';
import { html, type Safe } from '../html';
import type { Ctx } from '../page';
import { MARK } from '../../shared/logo';

/**
 * The preloader: the lost comma is found. The corner of the mark waits in the middle with a
 * dashed place for its comma · design and code look around · motion brings the comma and drops
 * it in · the mark flies to the logo in the header and the page is there (src/client/lib/intro.ts).
 *
 * Only when someone arrives from outside: a typed address · a bookmark · a link on another site.
 * The server decides from the browser's Sec-Fetch headers so nothing is stored on the device
 * (the privacy page promises three localStorage keys and no more). A page reached from our own
 * pages never has it · neither do old browsers without the headers.
 */
export function arrivesFromOutside(req: Pick<FastifyRequest, 'headers'>): boolean {
  const h = req.headers;
  if (h['sec-fetch-mode'] !== 'navigate' || h['sec-fetch-dest'] !== 'document') return false;
  const site = h['sec-fetch-site'];
  return site === 'none' || site === 'cross-site' || site === 'same-site';
}

const ARROW = 'M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z';

function cursor(who: 'design' | 'code' | 'motion'): Safe {
  return html`<span class="lci-cur lci-${who}"><svg width="20" height="24" viewBox="0 0 20 24"><path d="${ARROW}"></path></svg><b>${who}</b></span>`;
}

/** The overlay. Drawn by the server so it is there on the first paint · CSS shows it only with JS and motion. */
export function intro(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  return html`<div class="lci" data-intro aria-hidden="true">
<div class="lci-bg"></div>
${cursor('design')}${cursor('code')}
<div class="lci-mk"><svg viewBox="0 0 ${MARK.w} ${MARK.h}"><path class="lci-t" d="${MARK.top}"></path><path class="lci-gh" d="${MARK.comma}"></path></svg><span class="lci-cm"><svg viewBox="34 586 247 283"><path d="${MARK.comma}"></path></svg>${cursor('motion')}</span></div>
<p class="lci-st mono"><span class="lci-say"><span class="lci-s1">${t('Virgül aranıyor · üç kişi bakıyor')}</span><span class="lci-s2">${t('Bulundu')}</span></span><b data-intro-p>${lang === 'tr' ? '%0' : '0%'}</b></p>
</div>`;
}
