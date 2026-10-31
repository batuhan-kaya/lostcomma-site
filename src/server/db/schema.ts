/**
 * The content model. Column names are written in camelCase here and stored in snake_case
 * (drizzle `casing: 'snake_case'`). Text that changes per language lives in a `*_text` table
 * with one row per language: a note may exist in only one language · a project has both.
 *
 * Change this file · run `npm run db:generate` · commit the new SQL in drizzle/.
 * The test suite fails when the schema and the migrations drift apart.
 */
import { relations, sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { StoryInput } from './story';

export const langEnum = pgEnum('lang', ['tr', 'en']);
export const crewEnum = pgEnum('crew', ['design', 'code', 'motion']);
/** The four groups on the Work page (Layers panel) · the brief types use the same words. */
export const disciplineEnum = pgEnum('discipline', ['web', 'app', 'identity', 'motion']);
/** draft: only in the panel · live: public · nda: a locked layer (number · kind · year only). */
export const projectStatusEnum = pgEnum('project_status', ['draft', 'live', 'nda']);
export const briefStatusEnum = pgEnum('brief_status', ['new', 'read', 'answered', 'archived']);
export const bookingStatusEnum = pgEnum('booking_status', ['booked', 'cancelled']);
export const outboxStatusEnum = pgEnum('outbox_status', ['pending', 'sent', 'failed', 'skipped']);

export type Localized = Partial<Record<'tr' | 'en', string>>;

const created = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updated = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const SLUG = sql.raw(`'^[a-z0-9]+(-[a-z0-9]+)*$'`);

/** One uploaded image. Its AVIF and WebP variants live in DATA_DIR/media/<key>/<width>.<format>. */
export const media = pgTable(
  'media',
  {
    id: serial().primaryKey(),
    /** Content hash: the same file is stored once and its URLs never change (immutable caching). */
    key: text().notNull().unique(),
    width: integer().notNull(),
    height: integer().notNull(),
    /** Widths that exist on disk, smallest first. */
    widths: integer().array().notNull(),
    /** Dominant colour (#rrggbb) shown while the image loads. */
    color: text().notNull(),
    /** Default alt text per language. A page can override it. */
    alt: jsonb().$type<Localized>().notNull().default({}),
    /** Original file name, for the panel. */
    source: text().notNull(),
    bytes: integer().notNull(),
    createdAt: created(),
  },
  (t) => [check('media_key', sql`${t.key} ~ '^[0-9a-f]{16}$'`), check('media_color', sql`${t.color} ~ '^#[0-9a-f]{6}$'`)],
);

/** The team. One person per cursor. */
export const people = pgTable('people', {
  id: serial().primaryKey(),
  crew: crewEnum().notNull().unique(),
  name: text().notNull(),
  /** Favourite shortcut, one key per item (⌘ · ⇧ · P). */
  keys: text().array().notNull().default(sql`'{}'::text[]`),
  portraitId: integer().references(() => media.id, { onDelete: 'set null' }),
  sort: smallint().notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
});

export const peopleText = pgTable(
  'people_text',
  {
    personId: integer()
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    lang: langEnum().notNull(),
    role: text().notNull(),
    usually: text().notNull().default(''),
    rightNow: text().notNull().default(''),
    /** What the shortcut does. */
    keysDo: text().notNull().default(''),
    /** The bubble when you meet their cursor. */
    hello: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.personId, t.lang] })],
);

/**
 * Short silent loops (motion work). Delivered ready made (MP4 · H.264 · optional WebM) with a poster
 * image that goes through the image pipeline. Files live in DATA_DIR/media/<key>/loop.mp4 · loop.webm.
 */
export const videos = pgTable('videos', {
  id: serial().primaryKey(),
  /** Hash of the MP4: the same loop is stored once and its URLs never change. */
  key: text().notNull().unique(),
  width: integer().notNull(),
  height: integer().notNull(),
  durationMs: integer().notNull(),
  mp4Bytes: integer().notNull(),
  /** Empty = no WebM was given (the MP4 plays everywhere). */
  webmBytes: integer(),
  posterId: integer()
    .notNull()
    .references(() => media.id, { onDelete: 'restrict' }),
  alt: jsonb().$type<Localized>().notNull().default({}),
  source: text().notNull(),
  createdAt: created(),
});

export const projects = pgTable(
  'projects',
  {
    id: serial().primaryKey(),
    /** The running number (14 → "014"). Locked NDA projects keep their place in the count. */
    no: smallint().notNull().unique(),
    discipline: disciplineEnum().notNull(),
    year: smallint().notNull(),
    status: projectStatusEnum().notNull().default('draft'),
    /** Frame 0–6 on the homepage board (each frame has its own shape). Empty = not on the board. */
    boardSlot: smallint().unique(),
    /** The drawn illustration shown until a cover image arrives. */
    art: text(),
    coverId: integer().references(() => media.id, { onDelete: 'set null' }),
    /** A short silent loop (motion work): shown on the Motion reel and in the homepage motion frame. */
    loopId: integer().references(() => videos.id, { onDelete: 'set null' }),
    siteUrl: text(),
    /** The case study (src/server/db/story.ts · validated with zod). Empty = a short case page. */
    story: jsonb().$type<StoryInput>(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [check('projects_board_slot', sql`${t.boardSlot} between 0 and 6`), check('projects_year', sql`${t.year} between 2000 and 2100`)],
);

export const projectText = pgTable(
  'project_text',
  {
    projectId: integer()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    lang: langEnum().notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    /** What we made, short: "Website and app". */
    kind: text().notNull(),
    summary: text().notNull().default(''),
    client: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.lang] }), uniqueIndex('project_text_slug').on(t.lang, t.slug), check('project_text_slug_format', sql`${t.slug} ~ ${SLUG}`)],
);

export const notes = pgTable(
  'notes',
  {
    id: serial().primaryKey(),
    authorId: integer()
      .notNull()
      .references(() => people.id, { onDelete: 'restrict' }),
    /** Tag keys (code · design · motion · type · i18n · tooling · studio · performance · a11y). Labels come from t(). */
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    coverId: integer().references(() => media.id, { onDelete: 'set null' }),
    /** Empty = draft. A date in the future = scheduled. */
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index('notes_published_at').on(t.publishedAt)],
);

export const noteText = pgTable(
  'note_text',
  {
    noteId: integer()
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    lang: langEnum().notNull(),
    slug: text().notNull(),
    title: text().notNull(),
    excerpt: text().notNull().default(''),
    /** Markdown. */
    body: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.lang] }), uniqueIndex('note_text_slug').on(t.lang, t.slug), check('note_text_slug_format', sql`${t.slug} ~ ${SLUG}`)],
);

/** Project requests from the homepage brief (and the Start page from phase 9). */
export const briefs = pgTable(
  'briefs',
  {
    id: uuid().primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
    lang: langEnum().notNull(),
    types: text().array().notNull(),
    time: text(),
    budget: text(),
    name: text().notNull(),
    email: text().notNull(),
    message: text().notNull(),
    status: briefStatusEnum().notNull().default('new'),
  },
  (t) => [index('briefs_created_at').on(t.createdAt)],
);

/**
 * Twenty minute calls booked on the Start page. One booked call per slot (a partial unique index ·
 * a cancelled call frees its slot). The token is the ticket's private address.
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid().primaryKey(),
    /** The ticket number people see ("No. 0017"). */
    no: serial().notNull().unique(),
    token: text().notNull().unique(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    minutes: smallint().notNull().default(20),
    lang: langEnum().notNull(),
    /** The visitor's time zone when they booked (IANA name). */
    tz: text().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    /** website · app · identity · motion · unsure */
    about: text().array().notNull().default(sql`'{}'::text[]`),
    note: text().notNull().default(''),
    status: bookingStatusEnum().notNull().default('booked'),
    createdAt: created(),
  },
  (t) => [uniqueIndex('bookings_slot').on(t.startsAt).where(sql`${t.status} = 'booked'`), index('bookings_starts_at').on(t.startsAt)],
);

/**
 * Mail waiting to go out (src/server/mail): the studio hears about every brief and booking ·
 * the visitor gets a confirmation with a calendar file. Kept after sending as a log.
 */
export const outbox = pgTable(
  'outbox',
  {
    id: serial().primaryKey(),
    /** brief · booking · booking-guest */
    kind: text().notNull(),
    to: text().notNull(),
    replyTo: text(),
    subject: text().notNull(),
    text: text().notNull(),
    /** A calendar invitation (text/calendar) sent along. */
    ics: text(),
    status: outboxStatusEnum().notNull().default('pending'),
    tries: smallint().notNull().default(0),
    lastError: text(),
    createdAt: created(),
    sentAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('outbox_status').on(t.status)],
);

export const mediaRelations = relations(media, () => ({}));

export const peopleRelations = relations(people, ({ many, one }) => ({
  texts: many(peopleText),
  portrait: one(media, { fields: [people.portraitId], references: [media.id] }),
}));

export const peopleTextRelations = relations(peopleText, ({ one }) => ({
  person: one(people, { fields: [peopleText.personId], references: [people.id] }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  texts: many(projectText),
  cover: one(media, { fields: [projects.coverId], references: [media.id] }),
  loop: one(videos, { fields: [projects.loopId], references: [videos.id] }),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  poster: one(media, { fields: [videos.posterId], references: [media.id] }),
}));

export const projectTextRelations = relations(projectText, ({ one }) => ({
  project: one(projects, { fields: [projectText.projectId], references: [projects.id] }),
}));

export const notesRelations = relations(notes, ({ many, one }) => ({
  texts: many(noteText),
  author: one(people, { fields: [notes.authorId], references: [people.id] }),
  cover: one(media, { fields: [notes.coverId], references: [media.id] }),
}));

export const noteTextRelations = relations(noteText, ({ one }) => ({
  note: one(notes, { fields: [noteText.noteId], references: [notes.id] }),
}));
