import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  /** Where the built assets and manifest live. */
  PUBLIC_DIR: z.string().default('dist/public'),
  /** Writable data (briefs until the database arrives). A Docker volume in production. */
  DATA_DIR: z.string().default('data'),
  /** Briefs one address may send per 10 minutes. */
  BRIEF_LIMIT: z.coerce.number().int().min(1).default(5),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error('Invalid environment\n' + issues);
  }
  return { ...parsed.data, SITE_URL: parsed.data.SITE_URL.replace(/\/$/, '') };
}
