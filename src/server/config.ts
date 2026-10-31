import { join } from 'node:path';
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SITE_URL: z.url().default('http://localhost:3000'),
  /** Where the built assets and manifest live. */
  PUBLIC_DIR: z.string().default('dist/public'),
  /** Writable data: uploaded images and their variants (and the PGlite files in development). A Docker volume in production. */
  DATA_DIR: z.string().default('data'),
  /**
   * postgres:// in production (required) · pglite://<dir> or memory:// without Docker.
   * Defaults: development → pglite://<DATA_DIR>/pglite · test → memory://
   */
  DATABASE_URL: z.string().min(1).optional(),
  /**
   * Content for an empty database. sample = the projects and notes from the design board ·
   * demo = sample plus a generated cover image (e2e and screenshots) · none = start empty.
   * Defaults to sample outside production. Never overwrites existing content.
   */
  SEED: z.enum(['none', 'sample', 'demo']).optional(),
  /** Briefs one address may send per 10 minutes. */
  BRIEF_LIMIT: z.coerce.number().int().min(1).default(5),
});

type Parsed = z.infer<typeof Env>;
export type Config = Omit<Parsed, 'DATABASE_URL' | 'SEED'> & { DATABASE_URL: string; SEED: 'none' | 'sample' | 'demo' };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error('Invalid environment\n' + issues);
  }
  const c = parsed.data;
  const prod = c.NODE_ENV === 'production';
  const DATABASE_URL = c.DATABASE_URL ?? (c.NODE_ENV === 'test' ? 'memory://' : prod ? '' : 'pglite://' + join(c.DATA_DIR, 'pglite'));
  if (!DATABASE_URL) throw new Error('Invalid environment\nDATABASE_URL: required in production (postgres://user:pass@host:5432/db)');
  return { ...c, SITE_URL: c.SITE_URL.replace(/\/$/, ''), DATABASE_URL, SEED: c.SEED ?? (prod ? 'none' : 'sample') };
}
