/**
 * /api/stats · the beacon from every page (src/client/lib/stats.ts) · /api/stats/me and
 * /api/stats/forget for the privacy page ("your record"). docs/ISTATISTIK.md
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { BeaconSchema, type Client, type Stats } from '../stats';
import { RateLimit } from './rate';

export interface StatsApiOptions {
  stats: Stats;
  siteUrl: string;
  limit?: RateLimit;
}

/** The visitor asked not to be followed (Do Not Track · Global Privacy Control). */
export const declines = (req: FastifyRequest) => req.headers.dnt === '1' || req.headers['sec-gpc'] === '1';

export const clientOf = (req: FastifyRequest): Client => ({ ip: req.ip ?? '', ua: String(req.headers['user-agent'] ?? '').slice(0, 400) });

export function registerStats(app: FastifyInstance, { stats, siteUrl, limit = new RateLimit(120, 60_000) }: StatsApiOptions): void {
  const siteHost = new URL(siteUrl).host;
  const sameSite = (req: FastifyRequest) => {
    const origin = req.headers.origin;
    if (!origin) return true;
    try {
      return new URL(origin).host === siteHost;
    } catch {
      return false;
    }
  };

  app.post('/api/stats', { bodyLimit: 16_384 }, async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (!sameSite(req)) return reply.status(403).send();
    if (declines(req) || !limit.take(req.ip)) return reply.status(204).send();
    let body: unknown = req.body;
    // sendBeacon may arrive as text: parse it here.
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return reply.status(400).send();
      }
    }
    const parsed = BeaconSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send();
    await stats.record(clientOf(req), parsed.data);
    return reply.status(204).send();
  });

  app.get('/api/stats/me', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (declines(req)) return { declined: true, visits: [] };
    return { declined: false, ...(await stats.mine(clientOf(req))) };
  });

  app.post('/api/stats/forget', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (!sameSite(req)) return reply.status(403).send({ ok: false });
    const removed = await stats.forget(clientOf(req));
    return { ok: true, removed };
  });
}
