import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BRIEF_BUDGETS, BRIEF_TIMES, BRIEF_TYPES } from '../content/home';
import { href } from '../routes';
import type { Inbox } from './inbox';
import { RateLimit } from './rate';

const one = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.enum(values).optional());

/** Shared by the JSON (fetch) and the form (no JS) paths. */
export const BriefSchema = z.object({
  lang: z.enum(['tr', 'en']).catch('en'),
  types: z
    .preprocess((v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(BRIEF_TYPES)).max(4))
    .transform((a) => [...new Set(a)]),
  time: one(BRIEF_TIMES),
  budget: one(BRIEF_BUDGETS),
  name: z.string().trim().max(60).catch(''),
  email: z.string().trim().max(200).email(),
  message: z.string().trim().max(2000).catch(''),
  /** Honeypot: people never see it · bots fill it. */
  company: z.string().optional(),
});

export type BriefInput = z.input<typeof BriefSchema>;

export interface BriefOptions {
  inbox: Inbox;
  siteUrl: string;
  now?: () => Date;
  limit?: RateLimit;
}

export function registerBrief(app: FastifyInstance, { inbox, siteUrl, now = () => new Date(), limit = new RateLimit(5, 10 * 60_000) }: BriefOptions): void {
  const siteHost = new URL(siteUrl).host;

  app.post('/api/brief', async (req, reply) => {
    const wantsJson = String(req.headers['content-type'] ?? '').includes('application/json');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const lang = body.lang === 'tr' ? 'tr' : 'en';
    const back = (state: string) => reply.redirect(`${href(lang, 'home')}?brief=${state}#contact`, 303);

    // Same-site posts only. Browsers always send Origin on POST.
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try {
        host = new URL(origin).host;
      } catch {
        host = '';
      }
      if (host !== siteHost) return reply.status(403).send({ ok: false, error: 'origin' });
    }

    if (!limit.take(req.ip)) {
      return wantsJson ? reply.status(429).send({ ok: false, error: 'slow-down' }) : back('error');
    }

    const parsed = BriefSchema.safeParse(body);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? '')))];
      return wantsJson ? reply.status(422).send({ ok: false, error: 'invalid', fields }) : back('error');
    }
    const b = parsed.data;

    // Bots get a friendly yes and nothing is stored.
    if (b.company) return wantsJson ? reply.send({ ok: true }) : back('sent');

    const id = randomUUID();
    await inbox.add({
      id,
      at: now().toISOString(),
      lang: b.lang,
      types: b.types,
      time: b.time ?? null,
      budget: b.budget ?? null,
      name: b.name,
      email: b.email,
      message: b.message,
    });
    req.log.info({ brief: id }, 'brief received');
    return wantsJson ? reply.send({ ok: true }) : back('sent');
  });
}
