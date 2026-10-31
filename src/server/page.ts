import type { Assets } from './assets';
import type { Safe } from './html';
import type { Lang, T } from './i18n';
import type { RouteId } from './routes';
import type { NextTone, ThemeId } from './themes';

export interface Ctx {
  lang: Lang;
  /** Translate into the page language. */
  t: T;
  /** Translate into the other language (roll labels on the language switch). */
  tAlt: T;
  /** Absolute site origin without trailing slash. */
  site: string;
  /** Path of this page in this language. */
  path: string;
  /** Path of this page in each language. Null when the page has no translation. */
  alt: Record<Lang, string | null>;
  assets: Assets;
  /** Server time used for the footer clock and dated copy. */
  now: Date;
}

export interface NextBand {
  to: RouteId;
  /** Turkish source strings marked with msg(). */
  kick: string;
  big: string;
  tone: NextTone;
}

export interface Page {
  id: RouteId | 'notFound';
  theme: ThemeId;
  /** Which header link is active. */
  section?: RouteId;
  title: (t: T) => string;
  description: (t: T) => string;
  body: (ctx: Ctx) => Safe;
  next?: NextBand;
  /** Client entries to load besides the shared one. */
  scripts?: string[];
  /** Extra CSS entries besides app.css. */
  styles?: string[];
  /** Pages like 404 have no footer or next band. */
  bare?: boolean;
  /** Keep out of search engines (404 · panel). Drops canonical and hreflang. */
  noindex?: boolean;
}
