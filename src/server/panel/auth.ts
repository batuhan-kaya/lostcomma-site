/**
 * Panel sign in: one password (scrypt) · sessions stored as the sha256 of a random token · a CSRF
 * token per session · cookies only for /panel. See docs/PANEL.md.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { eq, lt, ne } from 'drizzle-orm';
import type { Db } from '../db';
import { panelSessions, panelUser } from '../db/schema';

export const SESSION_COOKIE = 'lc_panel';
export const PENDING_COOKIE = 'lc_panel_step';
/** Signed out after a day without a request · after two weeks in any case. */
export const IDLE_MS = 24 * 3_600_000;
export const MAX_MS = 14 * 86_400_000;
export const MIN_PASSWORD = 12;

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;

function derive(password: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64url');
  const got = await derive(password, Buffer.from(salt, 'base64url'), Number(n), Number(r), Number(p));
  return got.length === want.length && timingSafeEqual(got, want);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const token = (bytes = 32) => randomBytes(bytes).toString('base64url');

/** Constant-time string comparison (CSRF tokens). */
export function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  if (password.length > 200) return 'Şifre çok uzun.';
  if (/^(.)\1+$/.test(password)) return 'Şifre tek bir karakterin tekrarı olamaz.';
  return null;
}

export async function getUser(db: Db) {
  return (await db.select().from(panelUser).where(eq(panelUser.id, 1)))[0] ?? null;
}

export async function setPassword(db: Db, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db.insert(panelUser).values({ id: 1, passwordHash }).onConflictDoUpdate({ target: panelUser.id, set: { passwordHash, updatedAt: new Date() } });
}

export interface PanelSession {
  id: string;
  csrf: string;
  createdAt: Date;
  seenAt: Date;
  expiresAt: Date;
  ip: string;
  agent: string;
}

export async function createSession(db: Db, o: { ip: string; agent: string; now: Date }): Promise<{ token: string; session: PanelSession }> {
  const t = token();
  const [row] = await db
    .insert(panelSessions)
    .values({ id: sha256(t), csrf: token(24), ip: o.ip.slice(0, 64), agent: o.agent.slice(0, 300), createdAt: o.now, seenAt: o.now, expiresAt: new Date(o.now.getTime() + MAX_MS) })
    .returning();
  // Old sessions go when a new one starts.
  await db.delete(panelSessions).where(lt(panelSessions.expiresAt, o.now));
  return { token: t, session: row! };
}

/** The session behind a cookie · null when it is unknown · expired · or idle too long. Touches it now and then. */
export async function readSession(db: Db, t: string | undefined, now: Date): Promise<PanelSession | null> {
  if (!t || t.length > 100) return null;
  const id = sha256(t);
  const [row] = await db.select().from(panelSessions).where(eq(panelSessions.id, id));
  if (!row) return null;
  if (row.expiresAt <= now || now.getTime() - row.seenAt.getTime() > IDLE_MS) {
    await db.delete(panelSessions).where(eq(panelSessions.id, id));
    return null;
  }
  if (now.getTime() - row.seenAt.getTime() > 60_000) await db.update(panelSessions).set({ seenAt: now }).where(eq(panelSessions.id, id));
  return row;
}

export async function endSession(db: Db, id: string): Promise<void> {
  await db.delete(panelSessions).where(eq(panelSessions.id, id));
}

export async function endOtherSessions(db: Db, keep: string): Promise<number> {
  const gone = await db.delete(panelSessions).where(ne(panelSessions.id, keep)).returning({ id: panelSessions.id });
  return gone.length;
}

export async function endAllSessions(db: Db): Promise<void> {
  await db.delete(panelSessions);
}

export function cookie(name: string, value: string, o: { secure: boolean; maxAge?: number }): string {
  return [`${name}=${value}`, 'Path=/panel', 'HttpOnly', 'SameSite=Strict', ...(o.maxAge !== undefined ? [`Max-Age=${o.maxAge}`] : []), ...(o.secure ? ['Secure'] : [])].join('; ');
}

export const cleared = (name: string, secure: boolean) => cookie(name, '', { secure, maxAge: 0 });


