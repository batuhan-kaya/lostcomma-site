/**
 * Read access to the content tables, shaped for pages. Every function takes the language
 * and returns the text in that language, falling back to the other one when a row is missing
 * (`textLang` says which one was used, so the page can set lang="" on it).
 */
import { and, asc, desc, eq, inArray, isNotNull, lte, max } from 'drizzle-orm';
import type { Db } from '../db';
import { media, notes, noteText, people, projects, projectText } from '../db/schema';
import { StorySchema, storyMedia, type Story } from '../db/story';
import type { Lang } from '../i18n';
import type { MediaRef } from '../media/picture';

type Crew = 'design' | 'code' | 'motion';
type Discipline = 'web' | 'app' | 'identity' | 'motion';

/** The text row in the asked language or else the first one there is. */
export function pickText<T extends { lang: Lang }>(texts: T[], lang: Lang): T | undefined {
  return texts.find((t) => t.lang === lang) ?? texts[0];
}

function mediaRef(m: { key: string; width: number; height: number; widths: number[]; color: string; alt: Partial<Record<Lang, string>> } | null): MediaRef | null {
  return m ? { key: m.key, width: m.width, height: m.height, widths: m.widths, color: m.color, alt: m.alt } : null;
}

export interface ProjectCard {
  id: number;
  no: number;
  /** "014" */
  number: string;
  slug: string;
  name: string;
  kind: string;
  year: number;
  discipline: Discipline;
  status: 'draft' | 'live' | 'nda';
  art: string | null;
  cover: MediaRef | null;
  textLang: Lang;
  /** This website (the "You are here" layer). */
  here: boolean;
}

/** The slug of the project that is this website. */
export const HERE_SLUG = 'lost-comma';

export interface BoardProject extends ProjectCard {
  slot: number;
}

export interface ProjectPage extends ProjectCard {
  summary: string;
  client: string;
  siteUrl: string | null;
  /** The slug in each language for the language switch. */
  slugs: Partial<Record<Lang, string>>;
  /** The case study. A project without one (or with a broken one) gets the short case page. */
  story: Story | null;
  /** Images the story points at, by media id. */
  media: Record<number, MediaRef>;
  /** The next live layer down the list (wraps around to the newest). */
  next: ProjectCard | null;
}

const projectWith = { texts: true, cover: true } as const;

type ProjectRow = typeof projects.$inferSelect & {
  texts: (typeof projectText.$inferSelect)[];
  cover: Parameters<typeof mediaRef>[0];
};

function card(row: ProjectRow, lang: Lang): ProjectCard {
  const t = pickText(row.texts, lang);
  if (!t) throw new Error(`project ${row.no} has no text`);
  return {
    id: row.id,
    no: row.no,
    number: String(row.no).padStart(3, '0'),
    slug: t.slug,
    name: t.name,
    kind: t.kind,
    year: row.year,
    discipline: row.discipline,
    status: row.status,
    art: row.art,
    cover: mediaRef(row.cover),
    textLang: t.lang,
    here: row.texts.some((x) => x.slug === HERE_SLUG),
  };
}

/** The homepage board: live projects with a frame, in frame order. */
export async function boardProjects(db: Db, lang: Lang): Promise<BoardProject[]> {
  const rows = await db.query.projects.findMany({
    where: and(isNotNull(projects.boardSlot), eq(projects.status, 'live')),
    orderBy: asc(projects.boardSlot),
    with: projectWith,
  });
  return rows.filter((r) => r.texts.length).map((r) => ({ ...card(r, lang), slot: r.boardSlot! }));
}

/** The Work page: live and NDA projects, newest number first. */
export async function listProjects(db: Db, lang: Lang): Promise<ProjectCard[]> {
  const rows = await db.query.projects.findMany({
    where: inArray(projects.status, ['live', 'nda']),
    orderBy: desc(projects.no),
    with: projectWith,
  });
  return rows.filter((r) => r.texts.length).map((r) => card(r, lang));
}

/** A case study by its slug in this language. NDA and draft projects have no public page. */
export async function projectBySlug(db: Db, lang: Lang, slug: string): Promise<ProjectPage | null> {
  const hit = await db.query.projectText.findFirst({ where: and(eq(projectText.lang, lang), eq(projectText.slug, slug)) });
  if (!hit) return null;
  const row = await db.query.projects.findFirst({ where: and(eq(projects.id, hit.projectId), eq(projects.status, 'live')), with: projectWith });
  if (!row) return null;
  const t = pickText(row.texts, lang)!;

  const parsed = row.story ? StorySchema.safeParse(row.story) : null;
  const story = parsed?.success ? parsed.data : null;
  const ids = story ? storyMedia(story) : [];
  const images = ids.length ? await db.select().from(media).where(inArray(media.id, ids)) : [];

  const live = await db.query.projects.findMany({ where: eq(projects.status, 'live'), orderBy: desc(projects.no), with: projectWith });
  const at = live.findIndex((p) => p.id === row.id);
  const after = live.length > 1 ? live[(at + 1) % live.length] : undefined;

  return {
    ...card(row, lang),
    summary: t.summary,
    client: t.client,
    siteUrl: row.siteUrl,
    slugs: Object.fromEntries(row.texts.map((x) => [x.lang, x.slug])),
    story,
    media: Object.fromEntries(images.map((m) => [m.id, mediaRef(m)!])),
    next: after?.texts.length ? card(after, lang) : null,
  };
}

/** The number the next project will get ("Your project could be layer 017"). */
export async function nextProjectNumber(db: Db): Promise<number> {
  const [row] = await db.select({ n: max(projects.no) }).from(projects);
  return (row?.n ?? 0) + 1;
}

/** Every live case page in both languages (sitemap). */
export async function caseSlugs(db: Db): Promise<Partial<Record<Lang, string>>[]> {
  const rows = await db.query.projects.findMany({ where: eq(projects.status, 'live'), orderBy: desc(projects.no), with: { texts: true } });
  return rows.map((r) => Object.fromEntries(r.texts.map((x) => [x.lang, x.slug])));
}

export interface NoteCard {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  textLang: Lang;
  /** Languages this note is written in. */
  langs: Lang[];
  author: { crew: Crew; name: string };
  tags: string[];
  publishedAt: Date;
}

export interface NotePage extends NoteCard {
  body: string;
  slugs: Partial<Record<Lang, string>>;
}

const noteWith = { texts: true, author: { columns: { crew: true, name: true } } } as const;

type NoteRow = typeof notes.$inferSelect & { texts: (typeof noteText.$inferSelect)[]; author: { crew: Crew; name: string } };

function noteCard(row: NoteRow, lang: Lang): NoteCard {
  const t = pickText(row.texts, lang);
  if (!t) throw new Error(`note ${row.id} has no text`);
  return {
    id: row.id,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    textLang: t.lang,
    langs: (['tr', 'en'] as const).filter((l) => row.texts.some((x) => x.lang === l)),
    author: row.author,
    tags: row.tags,
    publishedAt: row.publishedAt!,
  };
}

/** Published notes (scheduled ones appear once their date passes), newest first. */
export async function listNotes(db: Db, lang: Lang, now: Date, limit?: number): Promise<NoteCard[]> {
  const rows = await db.query.notes.findMany({
    where: and(isNotNull(notes.publishedAt), lte(notes.publishedAt, now)),
    orderBy: desc(notes.publishedAt),
    with: noteWith,
    limit,
  });
  return rows.filter((r) => r.texts.length).map((r) => noteCard(r, lang));
}

/** A note by its slug in this language. A note written only in the other language is not found here. */
export async function noteBySlug(db: Db, lang: Lang, slug: string, now: Date): Promise<NotePage | null> {
  const hit = await db.query.noteText.findFirst({ where: and(eq(noteText.lang, lang), eq(noteText.slug, slug)) });
  if (!hit) return null;
  const row = await db.query.notes.findFirst({
    where: and(eq(notes.id, hit.noteId), isNotNull(notes.publishedAt), lte(notes.publishedAt, now)),
    with: noteWith,
  });
  if (!row) return null;
  return { ...noteCard(row, lang), body: hit.body, slugs: Object.fromEntries(row.texts.map((x) => [x.lang, x.slug])) };
}

export interface Person {
  crew: Crew;
  name: string;
  keys: string[];
  role: string;
  usually: string;
  rightNow: string;
  keysDo: string;
  hello: string;
  portrait: MediaRef | null;
}

export async function listPeople(db: Db, lang: Lang): Promise<Person[]> {
  const rows = await db.query.people.findMany({ orderBy: asc(people.sort), with: { texts: true, portrait: true } });
  return rows.flatMap((r) => {
    const t = pickText(r.texts, lang);
    if (!t) return [];
    return [{ crew: r.crew, name: r.name, keys: r.keys, role: t.role, usually: t.usually, rightNow: t.rightNow, keysDo: t.keysDo, hello: t.hello, portrait: mediaRef(r.portrait) }];
  });
}
