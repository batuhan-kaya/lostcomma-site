import { html, type Safe } from '../../html';
import { istanbulTime } from '../../layout/chrome';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { HOME } from '../../content/home';
import { board } from './board';
import { brief, type ContactTheme } from './brief';
import { hero } from './hero';
import { manifesto } from './manifesto';
import { process } from './process';
import { services } from './services';

/** The contact section colour (Contact A–D from the design board). Ink until Batuhan picks. */
export const CONTACT_THEME: ContactTheme = 'ink';

const LETTERS_A = ['l', 'o', 's', 't'];
const LETTERS_B = ['c', 'o', 'm', 'm', 'a'];

/** The homepage ends with the big wordmark instead of the shared footer. */
function bigFooter(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const letter = (ch: string, i: number) => html`<span data-fl="${i}"${i === 0 ? html` data-rest="motion" data-rest-at="0.4 0.12"` : ''}>${ch}</span>`;
  return html`<footer class="bigft" data-sec="ft" data-host="motion">
<div class="wrap">
<p class="fwm"><span class="sr">Lost Comma</span><span class="fwl" aria-hidden="true">${LETTERS_A.map(letter)}<b class="fc2 egg">,</b><i class="gp"></i>${LETTERS_B.map((ch, i) => letter(ch, i + 4))}</span></p>
<div class="frow mono">
<span>© ${ctx.now.getFullYear()} Lost Comma · ${t('İstanbul')} <time data-clock>${istanbulTime(ctx.now)}</time></span>
<nav aria-label="${t('Diğer sayfalar')}"><a href="${href(lang, 'process')}">${t('Süreç')}</a><a href="${href(lang, 'now')}">${t('Şimdi')}</a><a href="${href(lang, 'uses')}">${t('Araçlar')}</a><a href="${href(lang, 'rss')}">RSS</a></nav>
<span data-footnote>${t('Üç kişi ve bir yerlerde bir virgül')}</span>
<a href="#top">${t('Başa dön')} <span aria-hidden="true">↑</span></a>
</div>
</div>
</footer>`;
}

export interface HomeOptions {
  /** Set after a brief was posted without JS (?brief=sent). */
  sent?: boolean;
  /** The post without JS failed validation (?brief=error). */
  error?: boolean;
}

export function homePage(opts: HomeOptions = {}): Page {
  return {
    id: 'home',
    theme: 'paper',
    host: 'design',
    home: true,
    scripts: ['home'],
    styles: ['home'],
    title: (t) => t('Yaratıcı yazılım stüdyosu'),
    description: (t) => t('İstanbul’da web siteleri ve uygulamalar tasarlayıp kodlayan bir ekip.'),
    body: (ctx) => html`${hero(ctx)}
${manifesto(ctx)}
${services(ctx)}
${board(ctx)}
${process(ctx)}
${brief(ctx, { theme: CONTACT_THEME, sent: !!opts.sent, error: !!opts.error })}`,
    footer: bigFooter,
    data: (ctx) => {
      const c = HOME[ctx.lang];
      return {
        words: c.words,
        notes: c.notes,
        services: c.services.map((s) => ({ lab: s.lab, size: s.size, code: s.code, say: s.say })),
        types: c.types.map((x) => ({ p: x.p, n: x.n, who: x.who, say: x.say })),
        times: c.times.map((x) => ({ p: x.p, n: x.n, who: x.who, say: x.say })),
        budgets: c.budgets,
        doing: c.doing,
      };
    },
  };
}
