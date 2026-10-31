import { afterAll, describe, expect, it } from 'vitest';
import { MemoryInbox } from '../src/server/api/inbox';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { HOME } from '../src/server/content/home';

const app = await buildApp({ inbox: new MemoryInbox(), config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://lostcomma.co' }), now: () => new Date('2026-10-28T10:00:00+03:00') });
afterAll(() => app.close());

for (const lang of ['tr', 'en'] as const) {
  describe(`homepage /${lang}`, async () => {
    const doc = (await app.inject(`/${lang}`)).body;

    it('has every section of the Live design in order', () => {
      const secs = [...doc.matchAll(/data-sec="([a-z]+)"/g)].map((m) => m[1]);
      expect(secs).toEqual(['hero', 'mf', 'svc', 'work', 'prc', 'ctc', 'ft']);
    });

    it('one host per section below the hero', () => {
      expect(doc).toMatch(/data-sec="mf"[^>]*data-host="design"/);
      expect(doc).toMatch(/data-sec="svc"[^>]*data-host="motion"/);
      expect(doc).toMatch(/data-sec="prc"[^>]*data-host="code"/);
    });

    it('renders the finished manifesto edit for readers without JS', () => {
      const first = HOME[lang].manifesto.find((s) => typeof s !== 'string');
      expect(first && typeof first !== 'string' ? doc.includes(`>${first.ins}</ins>`) : false).toBe(true);
    });

    it('hands the client its data as a JSON block', () => {
      const m = doc.match(/<script type="application\/json" id="page-data">([\s\S]*?)<\/script>/);
      expect(m).not.toBeNull();
      const data = JSON.parse(m![1]!);
      expect(data.words).toEqual(HOME[lang].words);
      expect(data.types).toHaveLength(4);
      expect(m![1]).not.toContain('<');
    });

    it('the brief is a real form', () => {
      expect(doc).toContain('action="/api/brief"');
      expect(doc.match(/name="types"/g)).toHaveLength(4);
      expect(doc.match(/name="time"/g)).toHaveLength(5);
      expect(doc.match(/name="budget"/g)).toHaveLength(5);
      expect(doc).toMatch(/type="email" name="email" required/);
      expect(doc).toContain('name="company" tabindex="-1"');
    });

    it('loads its own CSS and script', () => {
      expect(doc).toContain('<html lang="' + lang + '" class="th-paper" data-page="home">');
    });

    it('keeps the comma egg hidden and out of the accessibility tree', () => {
      expect(doc).toContain('<b class="lgc egg" aria-hidden="true">,</b>');
      expect(doc).toMatch(/class="av c-comma egg"[^>]*hidden>,<\/button>/);
    });
  });
}

describe('content', () => {
  it('both languages have the same shape', () => {
    const shape = (l: 'tr' | 'en') => ({
      words: HOME[l].words.length,
      changes: HOME[l].manifesto.filter((s) => typeof s !== 'string').map((s) => (typeof s === 'string' ? '' : s.who)),
      comments: HOME[l].comments.map((c) => c.who),
      services: HOME[l].services.length,
      projects: HOME[l].projects.length,
      steps: HOME[l].steps.length,
      types: HOME[l].types.map((x) => x.who),
      times: HOME[l].times.map((x) => x.who),
      budgets: HOME[l].budgets.length,
    });
    expect(shape('tr')).toEqual(shape('en'));
  });

  it('no comma anywhere in homepage copy', () => {
    const all = JSON.stringify(HOME).replace(/","|":|",|\{"|"\}|\["|"\]|\],|\},|\[\{|\}\]/g, ' ');
    const strings = [...JSON.stringify(HOME).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? '');
    expect(all.length).toBeGreaterThan(0);
    expect(strings.filter((s) => s.includes(','))).toEqual([]);
  });
});
