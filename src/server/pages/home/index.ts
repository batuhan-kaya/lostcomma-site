import { boardProjects, newestLoop, type BoardProject, type ProjectCard } from '../../data/content';
import { html } from '../../html';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { board } from './board';
import { aroundBlank } from '../../content/home';
import { brief, type ContactTheme } from './brief';
import { hero } from './hero';
import { manifesto } from './manifesto';
import { process } from './process';
import { services } from './services';

/**
 * The contact section colour (phase 16 · Batuhan: the blue was too loud). Milk: a calm light
 * ground a step lighter than Process above · the ink footer closes the page · the selection is the
 * hero's blue (the page opens and ends with a sentence edited in place). Themes in home.css
 * (`.ct-*`): ink · night · paper · milk · lime · coral · blue.
 */
export const CONTACT_THEME: ContactTheme = 'milk';

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
    title: (t) => t('İstanbul’da tasarım ve yazılım stüdyosu'),
    description: (t) => t('Lost Comma İstanbul’da web siteleri · uygulamalar · kimlikler ve hareket tasarlayıp kodlayan küçük bir stüdyo. İşin sahipleriyle yan yana çalışırız.'),
    load: async (ctx) => ({ board: await boardProjects(ctx.db, ctx.lang), loop: await newestLoop(ctx.db, ctx.lang) }),
    body: (ctx, d) => html`${hero(ctx)}
${manifesto(ctx)}
${services(ctx, d.loop)}
${board(ctx, d.board)}
${process(ctx)}
${brief(ctx, { theme: CONTACT_THEME, sent: !!opts.sent, error: !!opts.error })}`,
    // The share card is the hero itself: its lines with the first word selected (Metinler rewrites both).
    og: (ctx) => {
      const c = ctx.texts.home(ctx.lang);
      return { hero: { lines: c.headline, word: c.words[0] ?? '', foot: ctx.t('Tasarım ve yazılım stüdyosu · İstanbul') } };
    },
    data: (ctx) => {
      const c = ctx.texts.home(ctx.lang);
      return {
        words: c.words,
        notes: c.notes,
        services: c.services.map((s) => ({ lab: s.lab, size: s.size, code: s.code, say: s.say })),
        sentence: { ideas: c.sentence.ideas, thanks: c.sentence.thanks, will: aroundBlank(c.sentence.will), plain: c.sentence.plain },
        doing: c.doing,
      };
    },
  };
}
