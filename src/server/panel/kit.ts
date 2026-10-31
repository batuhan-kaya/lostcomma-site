/**
 * What every panel route needs: the database · the clock · settings · mail · media folders · a way
 * to render the site's own pages (previews) · the page shell · audit logging · form helpers.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, count, eq, gt, gte, lte } from 'drizzle-orm';
import type { Assets } from '../assets';
import type { Config } from '../config';
import type { SettingsStore } from '../data/settings';
import type { Db } from '../db';
import { audit, bookings, briefs, outbox } from '../db/schema';
import type { Lang } from '../i18n';
import type { Postman } from '../mail';
import type { MediaDirs } from '../media/ingest';
import type { AnyPage } from '../page';
import type { PanelSession } from './auth';
import { FLASH, shell, type Counts, type Shell } from './ui';

export interface Kit {
  db: Db;
  config: Config;
  now: () => Date;
  settings: SettingsStore;
  postman: Postman;
  dirs: MediaDirs;
  assets: Assets;
  secure: boolean;
  /** Renders one of the site's pages with the given data (draft previews). */
  preview: (reply: FastifyReply, page: AnyPage, lang: Lang, path: string, data: unknown) => Promise<unknown>;
}

declare module 'fastify' {
  interface FastifyRequest {
    panel?: PanelSession;
  }
}

export type Body = Record<string, string | string[] | undefined>;

export const bodyOf = (req: FastifyRequest): Body => (req.body && typeof req.body === 'object' ? (req.body as Body) : {});
export const str = (b: Body, k: string): string => {
  const v = b[k];
  return (Array.isArray(v) ? (v[0] ?? '') : (v ?? '')).toString();
};
export const strs = (b: Body, k: string): string[] => {
  const v = b[k];
  return v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)];
};
export const num = (b: Body, k: string): number | null => {
  const v = str(b, k).trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/** The client address for the log (behind the proxy). */
export const ipOf = (req: FastifyRequest) => (req.ip ?? '').slice(0, 64);

export async function counts(db: Db, now: Date): Promise<Counts> {
  const [b] = await db.select({ n: count() }).from(briefs).where(eq(briefs.status, 'new'));
  const [c] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.status, 'booked'), gte(bookings.startsAt, now), lte(bookings.startsAt, new Date(now.getTime() + 14 * 86_400_000))));
  const [m] = await db.select({ n: count() }).from(outbox).where(eq(outbox.status, 'failed'));
  const [p] = await db.select({ n: count() }).from(outbox).where(and(eq(outbox.status, 'pending'), gt(outbox.tries, 0)));
  return { briefs: b?.n ?? 0, calls: c?.n ?? 0, mail: (m?.n ?? 0) + (p?.n ?? 0) };
}

/** Sends a panel page. The flash message comes from ?m= (after a redirect). */
export async function send(k: Kit, req: FastifyRequest, reply: FastifyReply, s: Omit<Shell, 'counts' | 'csrf' | 'flash'> & { flash?: string | null; status?: number }) {
  const m = (req.query as Record<string, string> | undefined)?.m;
  const doc = shell(k.assets, { ...s, flash: s.flash ?? (m ? (FLASH[m] ?? null) : null), counts: await counts(k.db, k.now()), csrf: req.panel?.csrf ?? '' });
  return reply.status(s.status ?? 200).type('text/html; charset=utf-8').send(doc);
}

/** Back to a page with a flash message (303 so a reload never posts again). */
export const back = (reply: FastifyReply, to: string, m?: string) => reply.redirect(m ? `${to}${to.includes('?') ? '&' : '?'}m=${m}` : to, 303);

export interface LogEntry {
  action: string;
  entity: string;
  entityId?: string | number | null;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export async function log(k: Kit, req: FastifyRequest | null, e: LogEntry): Promise<void> {
  await k.db.insert(audit).values({
    at: k.now(),
    action: e.action,
    entity: e.entity,
    entityId: e.entityId === undefined || e.entityId === null ? null : String(e.entityId),
    summary: e.summary.slice(0, 300),
    before: e.before === undefined ? null : (e.before as object),
    after: e.after === undefined ? null : (e.after as object),
    ip: req ? ipOf(req) : '',
  });
}

/* ---------------- the comma rule ---------------- */

/** Visible copy never has a comma (brand rule). */
export const hasComma = (s: string | null | undefined) => !!s && s.includes(',');

/** Markdown prose without code fences and inline code (code may have commas). */
export function proseOf(md: string): string {
  return md
    .replace(/^(~~~|```)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

export const COMMA = 'Virgül kullanma: marka kuralı. Cümleyi ikiye böl ya da "ve" ile bağla.';

/** Every string in a value (story JSON) that has a comma · with its path. */
export function commasIn(v: unknown, path = ''): string[] {
  if (typeof v === 'string') return v.includes(',') ? [path] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => commasIn(x, `${path}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([key, x]) => commasIn(x, path ? `${path}.${key}` : key));
  return [];
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
