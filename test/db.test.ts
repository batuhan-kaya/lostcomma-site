import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { count, eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { boardProjects, listNotes, listPeople, listProjects, noteBySlug, projectBySlug } from '../src/server/data/content';
import { openDatabase } from '../src/server/db';
import { SAMPLE } from '../src/server/db/sample';
import { media, notes, noteText, people, projects, projectText } from '../src/server/db/schema';
import { seed, seedIfEmpty } from '../src/server/db/seed';

const NOW = new Date('2026-10-31T12:00:00+03:00');
const database = await openDatabase('memory://');
await database.migrate();
await seed(database.db);
const { db } = database;
afterAll(() => database.close());

const total = async (table: PgTable) => (await db.select({ n: count() }).from(table))[0]!.n;

describe('migrations', () => {
  it('match the schema (run npm run db:generate after changing schema.ts)', () => {
    // drizzle-kit only takes relative paths: work in a copy inside node_modules/.cache.
    const tmp = mkdtempSync(join('node_modules', '.cache', 'drift-'));
    try {
      cpSync('drizzle', join(tmp, 'drizzle'), { recursive: true });
      writeFileSync(join(tmp, 'check.config.ts'), `export default ${JSON.stringify({ dialect: 'postgresql', schema: './src/server/db/schema.ts', out: './' + relative('.', join(tmp, 'drizzle')), casing: 'snake_case' })};\n`);
      const out = execFileSync('npx', ['drizzle-kit', 'generate', '--config', join(tmp, 'check.config.ts')], { encoding: 'utf8' });
      expect(readdirSync(join(tmp, 'drizzle')).filter((f) => f.endsWith('.sql'))).toEqual(readdirSync('drizzle').filter((f) => f.endsWith('.sql')));
      expect(out).toContain('No schema changes');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 30_000);

  it('run twice without complaint', async () => {
    await expect(database.migrate()).resolves.toBeUndefined();
  });
});

describe('seed', () => {
  it('loads the design board content', async () => {
    expect(await total(people)).toBe(3);
    expect(await total(projects)).toBe(16);
    expect(await total(projectText)).toBe(32);
    expect(await total(notes)).toBe(12);
    expect(await total(noteText)).toBe(SAMPLE.notes.reduce((n, x) => n + Object.keys(x.text).length, 0));
  });

  it('is idempotent and keeps covers added later', async () => {
    const [m] = await db.insert(media).values({ key: 'aaaaaaaaaaaaaaaa', width: 10, height: 10, widths: [10], color: '#000000', source: 'x.jpg', bytes: 1 }).returning();
    await db.update(projects).set({ coverId: m!.id }).where(eq(projects.no, 14));
    await seed(db);
    expect(await total(projects)).toBe(16);
    expect(await total(notes)).toBe(12);
    const [p] = await db.select().from(projects).where(eq(projects.no, 14));
    expect(p?.coverId).toBe(m!.id);
    await db.update(projects).set({ coverId: null }).where(eq(projects.no, 14));
    await db.delete(media);
  });

  it('only fills an empty database on boot', async () => {
    expect(await seedIfEmpty(db)).toBe(false);
  });

  it('keeps the comma rule: no comma in any text', () => {
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(SAMPLE);
    expect(strings.filter((s) => s.includes(','))).toEqual([]);
  });
});

describe('content', () => {
  it('the board: seven projects in frame order', async () => {
    const en = await boardProjects(db, 'en');
    expect(en.map((p) => p.slot)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(en[0]).toMatchObject({ number: '014', name: 'Sailing club', kind: 'Website and app', year: 2026, art: 'sail', cover: null });
    const tr = await boardProjects(db, 'tr');
    expect(tr[1]).toMatchObject({ name: 'Seramik atölyesi', slug: 'seramik-atolyesi', textLang: 'tr' });
  });

  it('the work list: newest first with the locked NDA layers', async () => {
    const list = await listProjects(db, 'en');
    expect(list.map((p) => p.no)).toEqual([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(list.filter((p) => p.status === 'nda').map((p) => p.number)).toEqual(['012', '007']);
  });

  it('a case study by its slug in each language', async () => {
    const tr = await projectBySlug(db, 'tr', 'yelken-kulubu');
    expect(tr).toMatchObject({ name: 'Yelken kulübü', client: 'Yelken kulübü · İstanbul', slugs: { tr: 'yelken-kulubu', en: 'sailing-club' } });
    expect(await projectBySlug(db, 'en', 'yelken-kulubu')).toBeNull();
    expect(await projectBySlug(db, 'en', 'nda-012')).toBeNull();
  });

  it('notes: newest first · one-language notes fall back with their language', async () => {
    const en = await listNotes(db, 'en', NOW);
    expect(en).toHaveLength(12);
    expect(en[0]).toMatchObject({ title: 'How our cursors move', langs: ['tr', 'en'], textLang: 'en', author: { crew: 'code' }, tags: ['motion', 'code'] });
    const tr = en.find((n) => n.slug === 'turkce-buyuk-harf-sorunu');
    expect(tr).toMatchObject({ textLang: 'tr', langs: ['tr'] });
    expect((await listNotes(db, 'tr', NOW))[0]?.title).toBe('İmleçlerimiz nasıl hareket ediyor');
  });

  it('notes: drafts and scheduled notes stay hidden', async () => {
    const [author] = await db.select().from(people).limit(1);
    const [future] = await db.insert(notes).values({ authorId: author!.id, publishedAt: new Date('2027-01-01') }).returning();
    await db.insert(noteText).values({ noteId: future!.id, lang: 'en', slug: 'next-year', title: 'Next year' });
    expect((await listNotes(db, 'en', NOW)).some((n) => n.slug === 'next-year')).toBe(false);
    expect(await noteBySlug(db, 'en', 'next-year', NOW)).toBeNull();
    expect(await noteBySlug(db, 'en', 'next-year', new Date('2027-02-01'))).not.toBeNull();
    await db.delete(notes).where(eq(notes.id, future!.id));
  });

  it('a note by its slug · the language switch knows the other slug', async () => {
    const note = await noteBySlug(db, 'tr', 'iki-dil-ve-tek-derleme', NOW);
    expect(note).toMatchObject({ title: 'İki dil ve tek derleme', slugs: { tr: 'iki-dil-ve-tek-derleme', en: 'two-languages-and-one-build' } });
    expect(await noteBySlug(db, 'en', 'turkce-buyuk-harf-sorunu', NOW)).toBeNull();
  });

  it('the team in each language', async () => {
    const tr = await listPeople(db, 'tr');
    expect(tr.map((p) => [p.crew, p.role])).toEqual([
      ['design', 'Tasarım lideri'],
      ['code', 'Yazılım lideri'],
      ['motion', 'Hareket lideri'],
    ]);
    expect(tr[1]?.keys).toEqual(['⌘', '⇧', 'P']);
  });
});

describe('constraints', () => {
  it('refuses a slug with spaces or capitals', async () => {
    const [p] = await db.select().from(projects).where(eq(projects.no, 16));
    await expect(db.update(projectText).set({ slug: 'Bad Slug' }).where(eq(projectText.projectId, p!.id))).rejects.toThrow();
  });

  it('refuses a board frame that does not exist and a frame used twice', async () => {
    await expect(db.update(projects).set({ boardSlot: 7 }).where(eq(projects.no, 16))).rejects.toThrow();
    await expect(db.update(projects).set({ boardSlot: 0 }).where(eq(projects.no, 16))).rejects.toThrow();
  });
});

describe('config', () => {
  it('needs a postgres address in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
    expect(loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://a:b@db:5432/c' }).SEED).toBe('none');
  });

  it('runs without Docker elsewhere', () => {
    expect(loadConfig({ NODE_ENV: 'test' })).toMatchObject({ DATABASE_URL: 'memory://', SEED: 'sample' });
    expect(loadConfig({ NODE_ENV: 'development', DATA_DIR: 'data' }).DATABASE_URL).toBe('pglite://data/pglite');
  });
});

describe('healthz', () => {
  it('reports the database', async () => {
    const own = await openDatabase('memory://');
    await own.migrate();
    const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SEED: 'none' }), database: own });
    expect((await app.inject('/healthz')).json()).toEqual({ ok: true });
    await own.close();
    const down = await app.inject('/healthz');
    expect(down.statusCode).toBe(503);
    expect(down.headers['cache-control']).toBe('no-store');
    await app.close();
  });
});
