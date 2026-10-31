import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { TAGS, TABS } from '../src/server/content/notes';
import { SAMPLE } from '../src/server/db/sample';
import { translator } from '../src/server/i18n';
import { highlightLines, parseLines, tokenize } from '../src/server/notes/highlight';
import { parseInfo, readMinutes, renderNote } from '../src/server/notes/render';
import { ogKey } from '../src/server/og';
import { ago, longDate } from '../src/shared/dates';
import { contains, fold, hits, segments } from '../src/shared/find';
import { slugify } from '../src/shared/slug';
import { criticalDamping, feel, graphPoints, PRESETS, presetOf, response, SPRING } from '../src/shared/spring';

const SITE = 'https://lostcomma.co';
const dataDir = mkdtempSync(join(tmpdir(), 'lc-notes-'));
// Saturday 31 October 2026 · a week after the newest sample note.
const NOW = new Date('2026-10-31T09:41:00+03:00');
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, DATA_DIR: dataDir }), now: () => NOW });
afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const get = (url: string) => app.inject({ method: 'GET', url });
const en = { lang: 'en' as const, t: translator('en') };
const tr = { lang: 'tr' as const, t: translator('tr') };
const visible = (doc: string) =>
  (doc.split('<body>')[1] ?? doc)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<code[\s\S]*?<\/code>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

describe('find in notes', () => {
  it('folds Turkish letters both ways and keeps the length', () => {
    expect(fold('Türkçe IŞIK İz')).toBe('turkce isik iz');
    expect(fold('Türkçe IŞIK İz').length).toBe('Türkçe IŞIK İz'.length);
    expect(contains('Türkçe büyük harf sorunu', 'turkce')).toBe(true);
    expect(contains('Işık', 'isik')).toBe(true);
    expect(contains('How our cursors move', 'CURSOR')).toBe(true);
  });

  it('match case means the exact letters', () => {
    expect(contains('Türkçe', 'turkce', true)).toBe(false);
    expect(contains('Türkçe', 'Türk', true)).toBe(true);
    expect(contains('spring', 'Spring', true)).toBe(false);
  });

  it('cuts text into marked and plain pieces that join back into the original', () => {
    const segs = segments('A thirty line spring and a spring', 'SPRING');
    expect(segs.filter((s) => s.hit).map((s) => s.t)).toEqual(['spring', 'spring']);
    expect(segs.map((s) => s.t).join('')).toBe('A thirty line spring and a spring');
    expect(segments('Türkçe büyük', 'turkce')[0]).toEqual({ t: 'Türkçe', hit: true });
    expect(segments('anything', '  ')).toEqual([{ t: 'anything', hit: false }]);
    expect(hits('İstanbul istanbul ISTANBUL', 'istanbul')).toBe(3);
  });
});

describe('the spring', () => {
  it('starts one jump away and settles on the target', () => {
    const r = response(SPRING.pull, SPRING.damping, 300);
    expect(r[0]).toBe(1);
    expect(Math.abs(r[r.length - 1]!)).toBeLessThan(0.01);
  });

  it('stops overshooting below the critical damping (about 0.70 for ours)', () => {
    const c = criticalDamping(SPRING.pull);
    expect(c).toBeCloseTo(0.704, 3);
    expect(Math.min(...response(SPRING.pull, c - 0.01, 600))).toBeGreaterThanOrEqual(0);
    expect(Math.min(...response(SPRING.pull, c + 0.05, 600))).toBeLessThan(0);
  });

  it('names how each preset feels', () => {
    const f = Object.fromEntries(PRESETS.map((p) => [p.key, feel(p.pull, p.damping)]));
    expect(f).toEqual({ first: 'little', calm: 'little', jelly: 'wobbly', sleepy: 'none' });
    expect(presetOf(0.026, 0.8)).toBe('calm');
    expect(presetOf(0.03, 0.8)).toBeNull();
  });

  it('draws the graph inside its 640 × 110 box', () => {
    const pts = graphPoints(response(0.09, 0.88)).split(' ').map(Number);
    const ys = pts.filter((_, i) => i % 2 === 1);
    expect(Math.max(...pts.filter((_, i) => i % 2 === 0))).toBeLessThanOrEqual(640);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(110);
  });
});

describe('code', () => {
  it('colours keywords · numbers · comments · calls · strings', () => {
    const toks = tokenize("const k = 0.026 // was 0.052\nstep('a')", 'ts').filter((t) => t.cls);
    expect(toks.map((t) => `${t.cls}:${t.text}`)).toEqual(['k:const', 'k:=', 'n:0.026', 'c:// was 0.052', 'f:step', "s:'a'"]);
  });

  it('splits tokens across lines and escapes markup', () => {
    const lines = highlightLines('/* one\ntwo */ a < b', 'ts');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('<span class="c">/* one</span>');
    expect(lines[1]).toContain('&lt;');
    expect(highlightLines('<b>', 'unknown')).toEqual(['&lt;b&gt;']);
  });

  it('reads which lines to mark', () => {
    expect([...parseLines('2-4 7')]).toEqual([2, 3, 4, 7]);
    expect([...parseLines('x')]).toEqual([]);
    expect(parseInfo('ts title=calm.ts hl=2 note="runs once per frame"')).toEqual({ kind: 'ts', arg: '', attrs: { title: 'calm.ts', hl: '2', note: 'runs once per frame' } });
  });
});

describe('markdown', () => {
  it('never lets raw HTML through', () => {
    const r = renderNote('Hello <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', en);
    expect(r.html.value).not.toContain('<script');
    expect(r.html.value).not.toContain('<img');
    expect(renderNote('![a cat](https://example.com/cat.png)', en).html.value).not.toContain('<img');
  });

  it('gives headings Turkish-safe unique ids · h2 make the contents · the first paragraph is the lead', () => {
    const r = renderNote('Önce bu.\n\n# Çok fazla ve çok hızlı\n\n## Çok fazla ve çok hızlı\n\n### Küçük\n\nSon.', tr);
    expect(r.toc).toEqual([
      { id: 'cok-fazla-ve-cok-hizli', text: 'Çok fazla ve çok hızlı' },
      { id: 'cok-fazla-ve-cok-hizli-2', text: 'Çok fazla ve çok hızlı' },
    ]);
    expect(r.html.value).toContain('<p class="lead">Önce bu.</p>');
    expect(r.html.value).toContain('<h2 id="cok-fazla-ve-cok-hizli" data-h="0">');
    expect(r.html.value).toContain('<h3 id="kucuk">');
    expect(r.html.value).not.toContain('<h1');
    expect(slugify('İki dil ve tek derleme!')).toBe('iki-dil-ve-tek-derleme');
  });

  it('turns footnotes into side notes in order of use', () => {
    const r = renderNote('B first.[^b] A later.[^a] Again.[^b] Missing.[^x]\n\n[^a]: The a note.\n[^b]: The *b* note.', en);
    expect(r.notes).toEqual([
      { n: 1, html: 'The <em>b</em> note.' },
      { n: 2, html: 'The a note.' },
    ]);
    expect(r.html.value.match(/id="fnr-1"/g)).toHaveLength(1);
    expect(r.html.value).toContain('href="#fn-2"');
    expect(r.html.value).toContain('[^x]');
    expect(r.html.value).not.toContain('The a note');
  });

  it('renders code · the playground · figures', () => {
    const r = renderNote('~~~ts title=spring.ts hl=2\nconst a = 1\nconst b = 2\n~~~\n\n~~~playground spring\n~~~\n\n~~~figure host\nFirst | The whole team.\n~~~', { ...en, author: 'motion' });
    const h = r.html.value;
    expect(h).toContain('<b>spring.ts</b>');
    expect(h).toContain('<span class="ln hl" data-n="2">');
    expect(h).toContain('data-copy hidden>Copy</button>');
    expect(h).toContain('data-play');
    expect(h).toContain('class="pcur c-motion"');
    expect(h).toContain('data-pgp="calm" aria-pressed="true"');
    expect(h).toContain('<b class="mono">First</b><span>The whole team.</span>');
    expect(h).toContain('<i class="c-motion">');
    expect(r.outline.map((b) => b.k)).toEqual(['code', 'play', 'fig']);
  });

  it('keeps feeds plain: the playground becomes a link back', () => {
    const r = renderNote('Text.[^1]\n\n~~~playground spring\n~~~\n\n~~~ts\nx\n~~~\n\n[^1]: Note.', { ...en, feed: { url: `${SITE}/en/notes/x` } });
    expect(r.html.value).toContain(`href="${SITE}/en/notes/x#oyun-alani"`);
    expect(r.html.value).toContain('<pre><code>x</code></pre>');
    expect(r.html.value).toContain('<sup>1</sup>');
    expect(r.html.value).not.toContain('data-');
  });

  it('counts reading minutes from prose · code · playgrounds', () => {
    expect(readMinutes('word '.repeat(400))).toBe(2);
    expect(readMinutes(`${'word '.repeat(100)}\n\n~~~ts\n${'x\n'.repeat(50)}~~~\n\n~~~playground spring\n~~~`)).toBe(4);
    expect(readMinutes('')).toBe(1);
  });

  it('every sample note renders · its prose keeps the comma rule', () => {
    for (const note of SAMPLE.notes) {
      for (const [lang, text] of Object.entries(note.text)) {
        expect(text.body, text.slug).toBeTruthy();
        const r = renderNote(text.body!, { lang: lang as 'tr' | 'en', t: translator(lang as 'tr' | 'en'), author: note.author });
        expect(r.toc.length, text.slug).toBeGreaterThan(0);
        expect(visible(r.html.value).includes(','), text.slug).toBe(false);
        for (const s of r.notes) expect(s.html.includes(','), text.slug).toBe(false);
      }
    }
  });

  it('every tag on a sample note has a label', () => {
    for (const note of SAMPLE.notes) for (const tag of note.tags) expect(Object.keys(TAGS)).toContain(tag);
    expect(TABS.every((k) => k in TAGS)).toBe(true);
  });
});

describe('dates', () => {
  it('says how long ago without commas', () => {
    expect(ago(new Date('2026-10-24T09:00:00+03:00'), NOW, 'en')).toBe('7 days ago');
    expect(ago(new Date('2026-10-24T09:00:00+03:00'), NOW, 'tr')).toBe('7 gün önce');
    expect(ago(new Date('2026-10-30T09:00:00+03:00'), NOW, 'en')).toBe('yesterday');
    expect(ago(new Date('2026-08-30T09:00:00+03:00'), NOW, 'en')).toBe('2 months ago');
    expect(longDate(new Date('2026-10-24T09:00:00+03:00'), 'en')).toBe('24 October 2026');
    expect(longDate(new Date('2026-10-24T09:00:00+03:00'), 'tr')).toBe('24 Ekim 2026');
  });
});

describe('the Notes page', () => {
  it('lists every published note with its line number · author · languages', async () => {
    const res = await get('/en/notes');
    expect(res.statusCode).toBe(200);
    const doc = res.body;
    expect(doc.match(/class="nr c-/g)).toHaveLength(12);
    expect(doc).toContain('<span class="no">01</span>');
    // A Turkish-only note links to its own page · its words carry lang · the tags stay English.
    expect(doc).toContain('href="/tr/notes/turkce-buyuk-harf-sorunu" hreflang="tr"');
    expect(doc).toContain('<span class="nt" data-f lang="tr">Türkçe büyük harf sorunu</span>');
    expect(doc).toContain('TR only');
    expect(doc).toContain('data-save disabled');
    expect(visible(doc).includes(',')).toBe(false);
  });

  it('opens the newest note in its own language as a file with a minimap', async () => {
    const doc = (await get('/tr/notes')).body;
    expect(doc).toContain('imleclerimiz-nasil-hareket-ediyor.md');
    expect(doc).toContain('İmleçlerimiz nasıl hareket ediyor.');
    expect(doc).toContain('class="mm"');
    expect(doc).toContain('5 bölüm');
    expect(doc).toContain('<span lang="en">i18n</span>');
  });

  it('hands the client the notes and the tag labels', async () => {
    const doc = (await get('/en/notes')).body;
    const data = JSON.parse(/id="page-data">([^<]*)</.exec(doc)![1]!) as { notes: { title: string; langs: string[] }[]; tags: Record<string, string> };
    expect(data.notes).toHaveLength(12);
    expect(data.notes[2]).toMatchObject({ title: 'Türkçe büyük harf sorunu', langs: ['tr'] });
    expect(data.tags.tooling).toBe('Tooling');
  });
});

describe('a note', () => {
  it('renders the text with contents · side notes · the other language', async () => {
    const res = await get('/en/notes/how-our-cursors-move');
    expect(res.statusCode).toBe(200);
    const doc = res.body;
    expect(doc).toContain('<h1 class="atl"');
    expect(doc).toContain('How our cursors move.</h1>');
    expect(doc.match(/<li( class="on")?><a href="#[a-z-]+">/g)).toHaveLength(5);
    expect(doc).toContain('id="fn-1"');
    expect(doc).toContain('href="/tr/notes/imleclerimiz-nasil-hareket-ediyor" hreflang="tr"');
    expect(doc).toContain('<link rel="alternate" hreflang="tr" href="https://lostcomma.co/tr/notes/imleclerimiz-nasil-hareket-ediyor">');
    expect(doc).toContain('<meta property="og:type" content="article">');
    expect(doc).toContain('"@type":"BlogPosting"');
    expect(doc).toContain('data-sec="art" data-host="code"');
    expect(doc).toMatch(/Variable fonts on a budget<\/b><\/a>/);
    expect(visible(doc).includes(',')).toBe(false);
  });

  it('a note in one language only has no address in the other', async () => {
    expect((await get('/en/notes/turkce-buyuk-harf-sorunu')).statusCode).toBe(404);
    const doc = (await get('/tr/notes/turkce-buyuk-harf-sorunu')).body;
    expect(doc).not.toContain('hreflang="en" href="https://lostcomma.co/en/notes');
    expect(doc).not.toContain('class="also"');
    expect((await get('/en/notes/nope')).statusCode).toBe(404);
  });

  it('the oldest note points back to the start', async () => {
    const doc = (await get('/en/notes/our-friday-demo-template')).body;
    expect(doc).toContain('This is where we started');
  });
});

describe('feeds · share images · sitemap', () => {
  it('one RSS feed per language with the full text of the notes written in it', async () => {
    const res = await get('/en/notes/rss.xml');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/rss+xml');
    const xml = res.body;
    const enCount = SAMPLE.notes.filter((n) => n.text.en).length;
    expect(xml.match(/<item>/g)).toHaveLength(enCount);
    expect(xml).not.toContain('turkce-buyuk-harf-sorunu');
    expect(xml).toContain('<atom:link href="https://lostcomma.co/en/notes/rss.xml" rel="self"');
    expect(xml).toContain('<content:encoded><![CDATA[<p class="lead">');
    expect(xml).toContain('#oyun-alani');
    const trXml = (await get('/tr/notes/rss.xml')).body;
    expect(trXml.match(/<item>/g)).toHaveLength(SAMPLE.notes.filter((n) => n.text.tr).length);
    expect(trXml).toContain('<language>tr</language>');
  });

  it('every page links its share image · the image is a 1200 × 630 PNG cached by content', async () => {
    const doc = (await get('/tr/notes/imleclerimiz-nasil-hareket-ediyor')).body;
    const url = /<meta property="og:image" content="([^"]+)">/.exec(doc)?.[1];
    expect(url).toMatch(/^https:\/\/lostcomma\.co\/og\/tr\/notes\/imleclerimiz-nasil-hareket-ediyor\.png\?v=[0-9a-f]{12}$/);
    const res = await get(url!.replace(SITE, ''));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('immutable');
    const meta = await sharp(res.rawPayload).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);

    const stale = await get('/og/tr/notes/imleclerimiz-nasil-hareket-ediyor.png?v=old');
    expect(stale.headers['cache-control']).toBe('public, max-age=3600');
    expect((await get('/og/en/work.png')).statusCode).toBe(200);
    expect((await get('/og/en/notes/nope.png')).statusCode).toBe(404);
    expect((await get('/og/en/nowhere.png')).statusCode).toBe(404);
    expect(ogKey({ lang: 'en', theme: 'milk', kick: 'a', title: 'b', who: 'code' })).not.toBe(ogKey({ lang: 'en', theme: 'milk', kick: 'a', title: 'c', who: 'code' }));
  });

  it('the 404 page has no share image', async () => {
    expect((await get('/en/nowhere')).body).not.toContain('og:image');
  });

  it('the sitemap lists every note in the languages it exists in', async () => {
    const xml = (await get('/sitemap.xml')).body;
    expect(xml).toContain('<loc>https://lostcomma.co/en/notes/how-our-cursors-move</loc>');
    expect(xml).toContain('<loc>https://lostcomma.co/tr/notes/turkce-buyuk-harf-sorunu</loc>');
    expect(xml).not.toContain('/en/notes/turkce-buyuk-harf-sorunu');
  });
});
