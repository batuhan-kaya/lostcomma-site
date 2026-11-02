/**
 * The content model. Column names are written in camelCase here and stored in snake_case
 * (drizzle `casing: 'snake_case'`). Text that changes per language lives in a `*_text` table
 * with one row per language: a note may exist in only one language · a project has both.
 *
 * Change this file · run `npm run db:generate` · commit the new SQL in drizzle/.
 * The test suite fails when the schema and the migrations drift apart.
 */
import { relations, sql } from 'drizzle-orm';
import { bigint, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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
    /** Our own note (panel). */
    note: text().notNull().default(''),
    /** The visit that sent it (docs/ISTATISTIK.md · "how they came"). */
    visitId: uuid().references(() => statsVisits.id, { onDelete: 'set null' }),
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
    /** Our own note (panel) · the visitor never sees it. */
    staffNote: text().notNull().default(''),
    cancelledAt: timestamp({ withTimezone: true }),
    /** The visit that booked it (docs/ISTATISTIK.md). */
    visitId: uuid().references(() => statsVisits.id, { onDelete: 'set null' }),
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

/* ---------------- the panel (src/server/panel · docs/PANEL.md) ---------------- */

/** The one person who can sign in. Always row 1. */
export const panelUser = pgTable(
  'panel_user',
  {
    id: smallint().primaryKey().default(1),
    /** scrypt$N$r$p$salt$hash (src/server/panel/auth.ts). */
    passwordHash: text().notNull(),
    /** Base32 TOTP secret · empty = two-step sign in is off. */
    totpSecret: text(),
    /** The last time step a code was accepted for (a code works once). */
    totpLastStep: bigint({ mode: 'number' }),
    /** A secret being set up · it becomes totpSecret once a code from it is confirmed. */
    totpPending: text(),
    updatedAt: updated(),
  },
  (t) => [check('panel_user_one', sql`${t.id} = 1`)],
);

/** Signed-in browsers. The cookie holds a random token · the row keeps only its sha256. */
export const panelSessions = pgTable(
  'panel_sessions',
  {
    id: text().primaryKey(),
    /** Sent back in every form (CSRF). */
    csrf: text().notNull(),
    ip: text().notNull().default(''),
    agent: text().notNull().default(''),
    createdAt: created(),
    seenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('panel_sessions_expires').on(t.expiresAt)],
);

/** Everything done in the panel. Content changes keep the before and after state (restore). */
export const audit = pgTable(
  'audit',
  {
    id: serial().primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** create · update · delete · restore · status · upload · cancel · signin · signin-failed · signout · … */
    action: text().notNull(),
    /** project · note · person · media · video · brief · booking · closure · outbox · settings · redirect · account */
    entity: text().notNull(),
    entityId: text(),
    summary: text().notNull().default(''),
    before: jsonb(),
    after: jsonb(),
    ip: text().notNull().default(''),
  },
  (t) => [index('audit_at').on(t.at), index('audit_entity').on(t.entity, t.entityId)],
);

/** Values filled from the panel (prices · the next free month · address · phone). */
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: updated(),
});

/** Days and hours we are not taking calls (Start). No times = the whole day. Minutes after midnight in Istanbul. */
export const closures = pgTable(
  'closures',
  {
    id: serial().primaryKey(),
    day: date({ mode: 'string' }).notNull(),
    fromMin: smallint(),
    toMin: smallint(),
    reason: text().notNull().default(''),
    createdAt: created(),
  },
  (t) => [
    index('closures_day').on(t.day),
    check('closures_times', sql`(${t.fromMin} is null and ${t.toMin} is null) or (${t.fromMin} >= 0 and ${t.toMin} <= 1440 and ${t.fromMin} < ${t.toMin})`),
  ],
);

/** Old addresses that moved (a slug changed in the panel). Looked at before a 404. */
export const redirects = pgTable('redirects', {
  from: text().primaryKey(),
  to: text().notNull(),
  hits: integer().notNull().default(0),
  createdAt: created(),
});

/*
 * Statistics (docs/ISTATISTIK.md). No cookies · no IP addresses. A visitor is a hash of the day's
 * salt with the address and the browser: the salt is deleted after a day so yesterday's rows can
 * never be traced back to anyone. Thirty quiet minutes end a visit.
 */
export const statsSalts = pgTable('stats_salts', {
  /** The day in Istanbul (YYYY-MM-DD). */
  day: date({ mode: 'string' }).primaryKey(),
  salt: text().notNull(),
});

export const statsVisits = pgTable(
  'stats_visits',
  {
    id: uuid().primaryKey(),
    /** 16 hex characters of sha256(salt · address · browser · host) · meaningless once the salt is gone. */
    visitor: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    lastAt: timestamp({ withTimezone: true }).notNull(),
    entry: text().notNull(),
    exit: text().notNull(),
    /** The site they came from (host without www · path without the query) · empty when typed or unknown. */
    refHost: text().notNull().default(''),
    refPath: text().notNull().default(''),
    utmSource: text().notNull().default(''),
    utmMedium: text().notNull().default(''),
    utmCampaign: text().notNull().default(''),
    /** ISO 3166 code (upper case) · empty when unknown. */
    country: text().notNull().default(''),
    city: text().notNull().default(''),
    /** phone · tablet · desktop */
    device: text().notNull().default('desktop'),
    os: text().notNull().default(''),
    browser: text().notNull().default(''),
    /** The site language they landed in. */
    lang: langEnum(),
    /** The browser's own language (en-GB · tr). */
    browserLang: text().notNull().default(''),
    tz: text().notNull().default(''),
    views: integer().notNull().default(0),
    /** Time with the page on screen · all views together. */
    engagedMs: integer().notNull().default(0),
  },
  (t) => [index('stats_visits_started').on(t.startedAt), index('stats_visits_visitor').on(t.visitor, t.lastAt), index('stats_visits_last').on(t.lastAt)],
);

export const statsViews = pgTable(
  'stats_views',
  {
    /** Made by the browser for this page view (lives in memory only). */
    id: uuid().primaryKey(),
    visitId: uuid()
      .notNull()
      .references(() => statsVisits.id, { onDelete: 'cascade' }),
    at: timestamp({ withTimezone: true }).notNull(),
    path: text().notNull(),
    /** The route (home · case · note · …). */
    page: text().notNull().default(''),
    lang: langEnum(),
    engagedMs: integer().notNull().default(0),
    /** How far down they saw · 0 to 100. */
    scroll: smallint().notNull().default(0),
    /** The viewport width in CSS pixels. */
    width: smallint().notNull().default(0),
  },
  (t) => [index('stats_views_visit').on(t.visitId), index('stats_views_at').on(t.at), index('stats_views_path').on(t.path, t.at)],
);

export const statsEvents = pgTable(
  'stats_events',
  {
    id: serial().primaryKey(),
    visitId: uuid()
      .notNull()
      .references(() => statsVisits.id, { onDelete: 'cascade' }),
    viewId: uuid(),
    at: timestamp({ withTimezone: true }).notNull(),
    /** click (inside the site) · out (another site) · contact (mail · phone) · event (brief · booking · …) */
    kind: text().notNull(),
    /** The label people saw · or the event's name. */
    name: text().notNull(),
    /** Where it went (a path · a host) or a detail. */
    target: text().notNull().default(''),
    /** Where on the page: across in thousandths of the viewport · down in CSS pixels from the top. */
    x: smallint(),
    y: integer(),
    width: smallint(),
  },
  (t) => [index('stats_events_visit').on(t.visitId), index('stats_events_view').on(t.viewId), index('stats_events_at').on(t.at)],
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
