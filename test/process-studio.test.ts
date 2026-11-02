import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { PROCESS } from '../src/server/content/process';
import { STUDIO } from '../src/server/content/studio';
import { people } from '../src/server/db/schema';
import { ingestImage, mediaDirs } from '../src/server/media/ingest';
import { ferry, istanbul, studioOpen, workday } from '../src/shared/istanbul';
import { onRoute, ROUTE } from '../src/shared/map';
import { meetLevel } from '../src/shared/studio';
import { clipOn, MILESTONES, phaseOf, TRACKS, WEEKS, weekDay } from '../src/shared/timeline';

const SITE = 'https://lostcomma.co';
const dataDir = mkdtempSync(join(tmpdir(), 'lc-studio-'));
// Saturday 31 October 2026 · 09:41 in Istanbul.
const SATURDAY = new Date('2026-10-31T09:41:00+03:00');
const WEDNESDAY = new Date('2026-10-28T11:05:00+03:00');
const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, DATA_DIR: dataDir }), now: () => SATURDAY });
const midweek = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SITE_URL: SITE, DATA_DIR: dataDir }), now: () => WEDNESDAY });
afterAll(async () => {
  await app.close();
  await midweek.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const secs = (doc: string) => [...doc.matchAll(/data-sec="([a-z]+)"/g)].map((m) => m[1]);
const text = (doc: string) =>
  (doc.split('<body>')[1] ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(b|button)\b[^>]*class="[^"]*\begg\b[^"]*"[^>]*>,<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
const css = (name: string) => readFileSync(new URL(`../src/styles/pages/${name}.css`, import.meta.url), 'utf8');

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe('Process and Studio content', () => {
  it('has no comma in either language', () => {
    const all = strings([PROCESS, STUDIO]);
    expect(all.length).toBeGreaterThan(250);
    expect(all.filter((s) => s.includes(','))).toEqual([]);
  });

  it('has a label for every clip and milestone in both languages', () => {
    for (const l of ['tr', 'en'] as const) {
      const p = PROCESS[l];
      expect(p.phases).toHaveLength(7);
      expect(p.tracks.map((x) => x.clips.length)).toEqual(TRACKS.map((x) => x.clips.length));
      expect(p.milestones).toHaveLength(MILESTONES.length);
      expect(p.week.days).toHaveLength(5);
      expect(p.rules).toHaveLength(6);
      expect(p.plans).toHaveLength(3);
      const s = STUDIO[l];
      expect(s.title.flat().filter((w) => w.who).map((w) => w.who)).toEqual(['design', 'code', 'motion']);
      expect(s.values.map((r) => r.kind)).toEqual(STUDIO.en.values.map((r) => r.kind));
      expect(s.display.every((r) => r.toast.length === 2)).toBe(true);
    }
  });
});

describe('the ten weeks', () => {
  it('knows the phase at every point', () => {
    expect([0, 0.9, 1.5, 2.5, 3, 4.99, 5, 7.99, 8, 9, 10].map(phaseOf)).toEqual([0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 6]);
  });
  it('turns a position into week and day', () => {
    expect(weekDay(0)).toEqual({ week: 1, day: 1 });
    expect(weekDay(4.5)).toEqual({ week: 5, day: 3 });
    expect(weekDay(WEEKS)).toEqual({ week: 10, day: 5 });
    // A day is a fifth of a week · floating point must not drop it (1.2 is day 2).
    expect(weekDay(1.2)).toEqual({ week: 2, day: 2 });
    expect(weekDay(3.8)).toEqual({ week: 4, day: 5 });
    expect(weekDay(5.999)).toEqual({ week: 6, day: 5 });
  });
  it('keeps the last clip on at the very end', () => {
    expect(clipOn(9.4, 0.6, 10)).toBe(true);
    expect(clipOn(8.5, 0.85, 9.35)).toBe(false);
    expect(clipOn(3, 2.4, 4.5)).toBe(true);
  });
  it('draws the same geometry in CSS', () => {
    const f = (x: number) => String(Math.round(x * 10 * 1000) / 1000);
    const c = css('process');
    TRACKS.forEach((tr, i) => tr.clips.forEach(([s, l], j) => expect(c).toContain(`.k${i}${j} { left: ${f(s)}%; width: calc(${f(l)}% - 4px); }`)));
    MILESTONES.forEach((m, k) => expect(c).toContain(`.ms.m${k} { left: ${f(m)}%; }`));
    for (let k = 0; k < WEEKS; k++) expect(c).toContain(`.fri.f${k} { left: ${f(k + 0.8)}%; }`);
  });
});

describe('Istanbul time', () => {
  it('reads the clock in Istanbul', () => {
    expect(istanbul(new Date('2026-10-31T06:41:00Z'))).toEqual({ day: 6, h: 9, m: 41, hm: '09:41' });
  });
  it('opens the studio on weekdays from ten to six', () => {
    expect(studioOpen(WEDNESDAY)).toBe(true);
    expect(studioOpen(SATURDAY)).toBe(false);
    expect(studioOpen(new Date('2026-10-28T18:00:00+03:00'))).toBe(false);
    expect(studioOpen(new Date('2026-10-28T09:59:00+03:00'))).toBe(false);
    expect(workday(WEDNESDAY)).toBe(2);
    expect(workday(SATURDAY)).toBeNull();
  });
  it('sails the ferry back and forth every twenty minutes', () => {
    const at = (hm: string) => ferry(new Date(`2026-10-28T${hm}:00+03:00`), 0);
    expect(at('07:10')).toEqual({ running: true, at: 0.5, east: true, next: '07:40' });
    expect(at('07:30')).toEqual({ running: true, at: 0.5, east: false, next: '07:40' });
    expect(at('06:30')).toMatchObject({ running: false, next: '07:00' });
    expect(at('23:10')).toMatchObject({ running: false, next: '07:00' });
  });
  it('puts the boat on the route', () => {
    expect(onRoute(0)).toMatchObject({ x: ROUTE[0], y: ROUTE[1] });
    expect(onRoute(1)).toMatchObject({ x: ROUTE[6], y: ROUTE[7] });
  });
  it('counts meetings in words', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 10].map(meetLevel)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('Process page', async () => {
  const en = (await app.inject('/en/process')).body;
  const tr = (await app.inject('/tr/surec')).body;
  const wed = (await midweek.inject('/en/process')).body;

  it('has the edit suite then calm paper', () => {
    expect(secs(en)).toEqual(['hero', 'week', 'rules', 'after', 'next', 'ft']);
    expect(en).toContain('class="th-night" data-page="process"');
    expect(en).toContain('<div class="below th-paper">\n<section class="week"');
    // The footer is always ink · it follows the paper wrapper instead of sitting in it.
    expect(en).toMatch(/<\/main>\s*<footer class="ft th-ink" data-sec="ft"/);
  });

  it('opens on week five in Design', () => {
    expect(en).toContain('<b data-tc>W05 · D3 · Design</b>');
    expect(tr).toContain('<b data-tc>H05 · G3 · Tasarım</b>');
    expect(en).toContain('<div class="ph p3 on" data-ph="3">');
    expect(en.match(/class="clip [^"]*\bon\b/g)).toHaveLength(3);
    expect(en).toContain('aria-valuenow="4.5"');
  });

  it('marks today in the weekly rhythm', () => {
    expect(en).toContain('Weekend. See you on Monday.');
    expect(en).not.toContain('class="day s0 now"');
    expect(wed).toContain('class="day s2 now"');
    expect(wed).toContain('<span class="today">Today</span>');
  });

  it('keeps the comma rule', () => {
    expect(text(en)).not.toContain(',');
    expect(text(tr)).not.toContain(',');
  });
});

describe('Studio page', async () => {
  const en = (await app.inject('/en/studio')).body;
  const tr = (await app.inject('/tr/studyo')).body;

  it('has its sections in order', () => {
    expect(secs(en)).toEqual(['hero', 'team', 'set', 'nums', 'city', 'next', 'ft']);
    expect(en).toContain('class="th-paper" data-page="studio"');
  });

  it('makes the title out of three selections', () => {
    expect(en.match(/<span class="sel c-(design|code|motion)"/g)).toEqual(['<span class="sel c-design"', '<span class="sel c-code"', '<span class="sel c-motion"']);
    expect(tr.match(/data-w="(\w+)"/g)).toEqual(['data-w="design"', 'data-w="code"', 'data-w="motion"']);
  });

  it('shows the team from the database and a fourth chair', () => {
    expect(en.match(/<li class="card c-(design|code|motion)" data-who/g)).toHaveLength(3);
    expect(en).toContain('Design lead');
    expect(tr).toContain('Tasarım lideri');
    expect(en).toContain('<kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd>');
    expect(en).toContain('class="card c4 c-you"');
  });

  it('counts from the database', () => {
    expect(en).toMatch(/<div class="n"><b>3<\/b><span>people who do everything/);
    expect(en).toMatch(/<div class="n"><b>16<\/b><span>projects since 2024/);
  });

  it('knows it is Saturday morning in Istanbul', () => {
    expect(en).toContain('The studio is closed');
    expect(en).toContain('<time class="clk" data-clock>09:41</time>');
    expect(en).toContain('Next ferry from Karaköy · 10:20');
  });

  it('has a settings window with tabs and switches', () => {
    expect(en.match(/role="tab"/g)).toHaveLength(3);
    expect(en.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(en.match(/role="switch"/g)).toHaveLength(8);
    expect(en.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(en).toContain('id="pane-d" aria-labelledby="tab-d" tabindex="0" hidden');
  });

  it('keeps the comma rule', () => {
    expect(text(en)).not.toContain(',');
    expect(text(tr)).not.toContain(',');
  });

  it('shows a portrait once a teammate has one', async () => {
    const photo = await sharp({ create: { width: 900, height: 1100, channels: 3, background: '#c9a27e' } }).jpeg().toBuffer();
    const image = await ingestImage(app.db, mediaDirs(dataDir), photo, { alt: { en: 'Portrait', tr: 'Portre' }, source: 'p.jpg' });
    await app.db.update(people).set({ portraitId: image.id }).where(eq(people.crew, 'motion'));
    const body = (await app.inject('/en/studio')).body;
    expect(body).toMatch(/<span class="bigc ph" aria-hidden="true"><picture class="pic">/);
    expect(body.match(/class="bigc ph"/g)).toHaveLength(1);
  });
});
