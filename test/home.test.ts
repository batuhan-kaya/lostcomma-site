import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { readFileSync } from 'node:fs';
import { HOME } from '../src/server/content/home';
import { androidArt, frameArt } from '../src/server/pages/home/frames';
import { PICTURES } from '../src/server/pages/home/pictures';

const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: 'https://lostcomma.co' }), now: () => new Date('2026-10-28T10:00:00+03:00') });
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
      expect(data.sentence.ideas).toEqual(HOME[lang].sentence.ideas);
      expect(m![1]).not.toContain('<');
    });

    it('the contact sentence is a real form: a name · a topic · an address', () => {
      expect(doc).toContain('action="/api/brief"');
      expect(doc).toMatch(/data-in="name" type="text" name="name"/);
      expect(doc).toMatch(/data-in="what" type="text" name="message"/);
      expect(doc).toMatch(/data-in="mail" type="email" name="email" required/);
      expect(doc).toContain('name="company" tabindex="-1"');
      // The earlier brief's choices are gone from the page.
      expect(doc).not.toMatch(/name="(types|time|budget)"/);
      // Every blank has a name a screen reader can say · the first one invites (the selection is on it).
      expect(doc.match(/class="blank[^"]*"[^>]*aria-label="/g)).toHaveLength(3);
      expect(doc).toMatch(/<span class="bw on" data-bw="name">/);
      // The topic starts with the first idea and is wide enough for the longest one.
      const longest = Math.max(...HOME[lang].sentence.ideas.map((i) => i.length));
      expect(doc).toContain(`placeholder="${HOME[lang].sentence.ideas[0]}" size="${longest + 1}"`);
    });

    it('loads its own CSS and script', () => {
      expect(doc).toContain('<html lang="' + lang + '" class="th-paper" data-page="home">');
    });

    it('has no comma easter egg: no shy cursor · no ghost avatar · no comma in the logo', () => {
      expect(doc).not.toMatch(/c-comma|av ghost|class="lgc/);
    });
  });
}

describe('03 · the service frames', () => {
  const art = frameArt().map((a) => a.value);

  it('one real looking product per service · five of them · the products speak English', () => {
    expect(HOME.tr.services.map((s) => s.name)).toEqual(['Web siteleri', 'Uygulamalar', 'Kimlik', 'Hareket', 'Otomasyon']);
    expect(HOME.en.services[4]).toMatchObject({ name: 'Automation', lab: 'Automation & integration', size: '1280 × 800' });
    expect(art).toHaveLength(HOME.en.services.length);
    expect(art.map((a) => /^<div class="fc-(\w+)" lang="en">/.exec(a)?.[1])).toEqual(['web', 'app', 'id', 'mo', 'auto']);
  });

  it('Pocket also on Android: the same product · its own skin (a punch hole · arrows back)', () => {
    const and = androidArt().value;
    expect(and).toMatch(/^<div class="fc-app and" lang="en">/);
    expect(and).toContain('class="pun"');
    expect(and).not.toContain('class="isl"');
    expect(and.match(/class="arow /g)?.length).toBe(art[1]!.match(/class="arow /g)?.length);
  });

  it('keeps the comma rule in the mock copy too', () => {
    for (const a of [...art, androidArt().value]) {
      const text = a.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
      expect(text, text.slice(0, 80)).not.toContain(',');
    }
  });

  it('a mock photo replaces its drawing once its slot has one (pictures.ts · npm run mock)', () => {
    const drawn = frameArt()[0]!.value;
    expect(drawn).not.toContain('<img');
    expect(drawn).toContain('id="lds-sky"');
    const shot = (n: string) => `/assets/img/${n}-0123456789.webp`;
    const all = frameArt(null, shot).map((a) => a.value).join('');
    for (const n of Object.keys(PICTURES)) expect(all, n).toContain(`src="${shot(n)}"`);
    expect(all).not.toMatch(/id="(lds-sky|lj-s|ll-s|lc-s)"/);
  });

  it('a real motion loop plays inside the editor preview', () => {
    const mo = frameArt({ value: '<video data-x></video>' } as never)[3]!.value;
    expect(mo).toContain('<div class="mcomp"><div class="fc-vid"><video data-x></video></div></div>');
    expect(mo).not.toContain('class="mcomma"');
  });

  it('every loop moves transform and opacity only (motion budget)', () => {
    const css = readFileSync(new URL('../src/styles/pages/_frames.css', import.meta.url), 'utf8');
    // Each @keyframes block by counting braces.
    const blocks: [string, string][] = [];
    for (const m of css.matchAll(/@keyframes ([\w-]+) \{/g)) {
      let depth = 1;
      let i = m.index + m[0].length;
      const from = i;
      for (; depth && i < css.length; i++) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
      blocks.push([m[1]!, css.slice(from, i)]);
    }
    expect(blocks.length).toBeGreaterThan(40);
    for (const [name, body] of blocks) {
      const props = new Set([...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]));
      for (const p of props) expect(['transform', 'opacity', 'animation-timing-function'], `${name} animates ${p}`).toContain(p);
    }
  });
});

describe('content', () => {
  it('both languages have the same shape', () => {
    const shape = (l: 'tr' | 'en') => ({
      words: HOME[l].words.length,
      changes: HOME[l].manifesto.filter((s) => typeof s !== 'string').map((s) => (typeof s === 'string' ? '' : s.who)),
      comments: HOME[l].comments.map((c) => c.who),
      services: HOME[l].services.length,
      steps: HOME[l].steps.length,
      ideas: HOME[l].sentence.ideas.length,
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
