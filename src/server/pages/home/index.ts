import { boardProjects, newestLoop, type BoardProject, type ProjectCard } from '../../data/content';
import { SOCIAL } from '../../data/settings';
import { html, raw, type Safe } from '../../html';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { HOME } from '../../content/home';
import { board } from './board';
import { brief, type ContactTheme } from './brief';
import { hero } from './hero';
import { manifesto } from './manifesto';
import { process } from './process';
import { services } from './services';

/**
 * The contact section colour (Contact A–D from the design board). Blue for now: the colour of the
 * original Live contact · it breaks the paper → ink rhythm right before the dark footer.
 * Batuhan will revisit it.
 */
export const CONTACT_THEME: ContactTheme = 'blue';

/** Who we are for search engines: name · logo · the accounts filled in the panel. */
function organization(ctx: Ctx): Safe {
  const sameAs = SOCIAL.map((s) => ctx.settings.text(s.key, ctx.lang)).filter((u): u is string => !!u);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lost Comma',
    url: `${ctx.site}${href(ctx.lang, 'home')}`,
    logo: `${ctx.site}/icon-512.png`,
    email: 'hello@lostcomma.co',
    address: { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' },
    ...(sameAs.length ? { sameAs } : {}),
  };
  return raw(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
}

export interface HomeOptions {
  /** Set after a brief was posted without JS (?brief=sent). */
  sent?: boolean;
  /** The post without JS failed validation (?brief=error). */
  error?: boolean;
}

/** What the homepage reads from the database. */
export interface HomeData {
  board: BoardProject[];
  /** The newest live project with a loop: the motion frame plays it. */
  loop: ProjectCard | null;
}

export function homePage(opts: HomeOptions = {}): Page<HomeData> {
  return {
    id: 'home',
    theme: 'paper',
    host: 'design',
    home: true,
    scripts: ['home'],
    styles: ['home'],
    title: (t) => t('Yaratıcı yazılım stüdyosu'),
    description: (t) => t('İstanbul’da web siteleri ve uygulamalar tasarlayıp kodlayan bir ekip.'),
    load: async (ctx) => ({ board: await boardProjects(ctx.db, ctx.lang), loop: await newestLoop(ctx.db, ctx.lang) }),
    body: (ctx, d) => html`${hero(ctx)}
${manifesto(ctx)}
${services(ctx, d.loop)}
${board(ctx, d.board)}
${process(ctx)}
${brief(ctx, { theme: CONTACT_THEME, sent: !!opts.sent, error: !!opts.error })}`,
    head: (ctx) => organization(ctx),
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
