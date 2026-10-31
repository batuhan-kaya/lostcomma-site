import type { Ctx, Page } from '../page';
import type { OgSpec } from './index';

/** What the share image of a page shows. The document head and the /og route both ask here. */
export function ogSpec<D>(page: Page<D>, ctx: Ctx, data: D): OgSpec {
  const theme = typeof page.theme === 'function' ? page.theme(data) : page.theme;
  const o = page.og?.(ctx, data) ?? {};
  return {
    lang: ctx.lang,
    theme,
    kick: o.kick ?? `lostcomma.co${ctx.path}`,
    title: o.title ?? page.title(ctx.t, data),
    who: o.who ?? page.host ?? 'design',
  };
}

/** /tr/notes/x → /og/tr/notes/x.png */
export function ogPath(path: string): string {
  return `/og${path}.png`;
}
