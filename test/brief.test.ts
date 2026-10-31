import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MemoryInbox } from '../src/server/api/inbox';
import { RateLimit } from '../src/server/api/rate';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';

const SITE = 'https://lostcomma.co';
const inbox = new MemoryInbox();
const app = await buildApp({ inbox, config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE }), now: () => new Date('2026-10-31T12:00:00Z') });
afterAll(() => app.close());

let ip = 0;
/** A fresh client address per test so the rate limit never leaks between tests. */
const post = (payload: unknown, headers: Record<string, string> = {}, raw?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/brief',
    remoteAddress: `10.0.0.${++ip}`,
    headers: { 'content-type': raw ? 'application/x-www-form-urlencoded' : 'application/json', ...headers },
    payload: raw ?? JSON.stringify(payload),
  });

beforeEach(() => {
  inbox.items.length = 0;
});

describe('POST /api/brief (fetch)', () => {
  it('stores a valid brief', async () => {
    const res = await post({ lang: 'tr', types: ['website', 'app', 'app'], time: '1m', budget: 'b40', name: '  Batu ', email: 'batu@example.com', message: 'Merhaba' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(inbox.items).toHaveLength(1);
    expect(inbox.items[0]).toMatchObject({ lang: 'tr', types: ['website', 'app'], time: '1m', budget: 'b40', name: 'Batu', email: 'batu@example.com', message: 'Merhaba', at: '2026-10-31T12:00:00.000Z' });
    expect(inbox.items[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('only needs an email', async () => {
    const res = await post({ email: 'a@b.co' });
    expect(res.statusCode).toBe(200);
    expect(inbox.items[0]).toMatchObject({ lang: 'en', types: [], time: null, budget: null, name: '' });
  });

  it('rejects a missing or broken email and says which field', async () => {
    const res = await post({ name: 'x', email: 'nope' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ ok: false, error: 'invalid', fields: ['email'] });
    expect(inbox.items).toHaveLength(0);
  });

  it('rejects unknown choices', async () => {
    expect((await post({ email: 'a@b.co', types: ['spaceship'] })).statusCode).toBe(422);
    expect((await post({ email: 'a@b.co', time: 'yesterday' })).statusCode).toBe(422);
  });

  it('caps long fields', async () => {
    expect((await post({ email: 'a@b.co', message: 'x'.repeat(2001) })).statusCode).toBe(200);
    expect(inbox.items[0]?.message).toBe('');
  });

  it('answers bots politely and stores nothing (honeypot)', async () => {
    const res = await post({ email: 'bot@spam.io', company: 'Spam Inc' });
    expect(res.statusCode).toBe(200);
    expect(inbox.items).toHaveLength(0);
  });

  it('refuses posts from other sites', async () => {
    const res = await post({ email: 'a@b.co' }, { origin: 'https://evil.example' });
    expect(res.statusCode).toBe(403);
    expect(inbox.items).toHaveLength(0);
  });

  it('accepts posts from our own origin', async () => {
    expect((await post({ email: 'a@b.co' }, { origin: SITE })).statusCode).toBe(200);
  });
});

describe('POST /api/brief (form without JS)', () => {
  it('redirects back to the brief with a thank you', async () => {
    const res = await post(null, {}, 'lang=tr&types=website&types=motion&time=3m&budget=unsure&name=Ay%C5%9Fe&email=ayse%40example.com&message=&company=');
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/tr?brief=sent#contact');
    expect(inbox.items[0]).toMatchObject({ types: ['website', 'motion'], time: '3m', budget: 'unsure', name: 'Ayşe' });
  });

  it('a single checkbox value still becomes a list', async () => {
    await post(null, {}, 'lang=en&types=app&email=a%40b.co');
    expect(inbox.items[0]?.types).toEqual(['app']);
  });

  it('redirects back with an error when the email is missing', async () => {
    const res = await post(null, {}, 'lang=en&name=Ann&email=');
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/en?brief=error#contact');
  });

  it('renders the sent state and the error state on the homepage', async () => {
    const sent = await app.inject('/tr?brief=sent');
    expect(sent.body).toMatch(/<form class="fb" data-fb method="post" action="\/api\/brief" hidden>/);
    expect(sent.body).toMatch(/<div class="thread" data-thread>/);
    const err = await app.inject('/en?brief=error');
    expect(err.body).toContain('fnote mono err');
    expect(err.body).toContain('That did not go through.');
  });
});

describe('rate limit', () => {
  it('lets five through per window and then says slow down', () => {
    const r = new RateLimit(5, 1000);
    const results = Array.from({ length: 6 }, (_, i) => r.take('ip', 1000 + i));
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(r.take('ip', 2100)).toBe(true);
  });

  it('applies to the endpoint per address', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/brief', remoteAddress: '10.9.9.9', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ email: 'a@b.co' }) });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
