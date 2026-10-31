import type { Assets } from './assets';
import type { Db } from './db';
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
  /** Content lives here (see src/server/data). Read it in a page's load(). */
  db: Db;
}

export interface NextBand {
  to: RouteId;
  /** Turkish source strings marked with msg(). */
  kick: string;
  big: string;
  tone: NextTone;
}

export type CrewName = 'design' | 'code' | 'motion';

/**
 * A page. Pages with content from the database declare load(): it runs before rendering and
 * its result reaches body · footer · data as the second argument.
 */
export interface Page<D = undefined> {
  id: RouteId | 'notFound';
  /** A fixed theme · or one picked from the data (a case study chooses its own colours). */
  theme: ThemeId | ((data: D) => ThemeId);
  /** The cursor that hosts the sections below the hero (sections may override with data-host). */
  host?: CrewName;
  /** Which header link is active. */
  section?: RouteId;
  title: (t: T, data: D) => string;
  description: (t: T, data: D) => string;
  /**
   * Fetches what the page needs before it renders. Pages on a route with params (case · note)
   * get them here and return null when nothing matches: the visitor gets the 404 page.
   */
  load?: (ctx: Ctx, params: Record<string, string>) => Promise<D | null>;
  /** Pages on a route with params: their address in each language (language switch · hreflang · canonical). */
  paths?: (data: D) => Record<Lang, string | null>;
  body: (ctx: Ctx, data: D) => Safe;
  next?: NextBand;
  /** Client entries to load besides the shared one. */
  scripts?: string[];
  /** Extra CSS entries besides app.css. */
  styles?: string[];
  /** Pages like 404 have no footer or next band. */
  bare?: boolean;
  /** Keep out of search engines (404 · panel). Drops canonical and hreflang. */
  noindex?: boolean;
  /** The homepage: interactive presence avatars in the header. */
  home?: boolean;
  /** Replaces the shared footer (the homepage has its big wordmark footer). */
  footer?: (ctx: Ctx, data: D) => Safe;
  /** Extra JSON handed to the page's client module (rendered as a non-executable data block). */
  data?: (ctx: Ctx, data: D) => unknown;
  /**
   * The share image (src/server/og): the small label · the title · whose cursor rests at its end.
   * Defaults: the page address · the page title · the page host.
   */
  og?: (ctx: Ctx, data: D) => { kick?: string; title?: string; who?: CrewName };
  /** og:type. Notes are articles. */
  ogType?: 'website' | 'article';
  /** Extra tags for <head> (article dates · structured data). Data blocks only: CSP runs no inline script. */
  head?: (ctx: Ctx, data: D) => Safe;
}

/** The route table holds pages with different data. */
export type AnyPage = Page<any>;
