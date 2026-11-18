import { NAV } from '../layout/chrome';
import type { Ctx, Page } from '../page';
import { ogExt, type OgSpec } from './index';

/** The name the cards carry (the kick and the corner): the studio's address without its scheme. */
export const SITE_LABEL = 'lostcomma.co';

/**
 * What the share image of a page shows. The document head and the /og route both ask here, so
 * the card follows the content: a renamed case · a new note · a line rewritten in Metinler.
 */
export function ogSpec<D>(page: Page<D>, ctx: Ctx, data: D): OgSpec {
  const theme = typeof page.theme === 'function' ? page.theme(data) : page.theme;
  const o = page.og?.(ctx, data) ?? {};
  // A page under a section says where it lives (never the raw address: its slug is not a word).
  const section = page.section && page.section !== page.id ? NAV.find(([id]) => id === page.section)?.[1] : undefined;
  const image = o.image ? { key: o.image.key, width: o.image.width, height: o.image.height, widths: o.image.widths } : undefined;
  return {
    lang: ctx.lang,
    theme,
    kick: o.kick ?? (section ? `${SITE_LABEL} · ${ctx.t(section)}` : SITE_LABEL),
    title: o.title ?? page.title(ctx.t, data),
    sub: o.sub ?? page.description(ctx.t, data),
    who: o.who ?? page.host ?? 'design',
    ...(o.hero ? { hero: o.hero } : {}),
    ...(image ? { image } : {}),
  };
}

/** /tr/notes/x → /og/tr/notes/x.png (a card with a photo is a .jpg). */
export function ogPath(path: string, spec: OgSpec): string {
  return `/og${path}.${ogExt(spec)}`;
}
