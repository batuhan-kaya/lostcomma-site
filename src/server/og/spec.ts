import type { Lang } from '../i18n';
import type { Ctx } from '../page';
import type { OgSpec } from './index';

/**
 * The share card (Batuhan · phase 17e): one per language for every page · its words come through
 * t() so Metinler can rewrite the slogan (a new slogan draws a new card under a new ?v=). The head
 * and the /og route both ask here.
 */
export function ogSpec(ctx: Ctx): OgSpec {
  return { lang: ctx.lang, slogan: ctx.t('Bir virgül. Koca fark.'), foot: ctx.t('Tasarım ve yazılım stüdyosu · İstanbul'), live: ctx.t('Canlı') };
}

/** /og/tr.jpg · /og/en.jpg */
export const ogPath = (lang: Lang): string => `/og/${lang}.jpg`;
