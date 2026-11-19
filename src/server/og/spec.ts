import type { Lang } from '../i18n';
import type { Ctx } from '../page';
import type { OgSpec } from './index';

/**
 * The share card (Batuhan · phase 17d): one card per language for every page · the homepage hero
 * with its first word selected. Its words come from Metinler (the headline · the words · the line
 * under the rule) so a rewritten hero redraws the card. The head and the /og route both ask here.
 */
export function ogSpec(ctx: Ctx): OgSpec {
  const c = ctx.texts.home(ctx.lang);
  return { lang: ctx.lang, lines: c.headline, word: c.words[0] ?? '', foot: ctx.t('Tasarım ve yazılım stüdyosu · İstanbul') };
}

/** /og/tr.png · /og/en.png */
export const ogPath = (lang: Lang): string => `/og/${lang}.png`;
