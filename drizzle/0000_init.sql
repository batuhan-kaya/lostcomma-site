CREATE TYPE "public"."brief_status" AS ENUM('new', 'read', 'answered', 'archived');--> statement-breakpoint
CREATE TYPE "public"."crew" AS ENUM('design', 'code', 'motion');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('web', 'app', 'identity', 'motion');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('tr', 'en');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'live', 'nda');--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"lang" "lang" NOT NULL,
	"types" text[] NOT NULL,
	"time" text,
	"budget" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"status" "brief_status" DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"widths" integer[] NOT NULL,
	"color" text NOT NULL,
	"alt" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key"),
	CONSTRAINT "media_key" CHECK ("media"."key" ~ '^[0-9a-f]{16}$'),
	CONSTRAINT "media_color" CHECK ("media"."color" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "note_text" (
	"note_id" integer NOT NULL,
	"lang" "lang" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	CONSTRAINT "note_text_note_id_lang_pk" PRIMARY KEY("note_id","lang"),
	CONSTRAINT "note_text_slug_format" CHECK ("note_text"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"crew" "crew" NOT NULL,
	"name" text NOT NULL,
	"keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"portrait_id" integer,
	"sort" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_crew_unique" UNIQUE("crew")
);
--> statement-breakpoint
CREATE TABLE "people_text" (
	"person_id" integer NOT NULL,
	"lang" "lang" NOT NULL,
	"role" text NOT NULL,
	"usually" text DEFAULT '' NOT NULL,
	"right_now" text DEFAULT '' NOT NULL,
	"keys_do" text DEFAULT '' NOT NULL,
	"hello" text DEFAULT '' NOT NULL,
	CONSTRAINT "people_text_person_id_lang_pk" PRIMARY KEY("person_id","lang")
);
--> statement-breakpoint
CREATE TABLE "project_text" (
	"project_id" integer NOT NULL,
	"lang" "lang" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"client" text DEFAULT '' NOT NULL,
	CONSTRAINT "project_text_project_id_lang_pk" PRIMARY KEY("project_id","lang"),
	CONSTRAINT "project_text_slug_format" CHECK ("project_text"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"no" smallint NOT NULL,
	"discipline" "discipline" NOT NULL,
	"year" smallint NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"board_slot" smallint,
	"art" text,
	"cover_id" integer,
	"site_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_no_unique" UNIQUE("no"),
	CONSTRAINT "projects_boardSlot_unique" UNIQUE("board_slot"),
	CONSTRAINT "projects_board_slot" CHECK ("projects"."board_slot" between 0 and 6),
	CONSTRAINT "projects_year" CHECK ("projects"."year" between 2000 and 2100)
);
--> statement-breakpoint
ALTER TABLE "note_text" ADD CONSTRAINT "note_text_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_people_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people_text" ADD CONSTRAINT "people_text_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_text" ADD CONSTRAINT "project_text_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "briefs_created_at" ON "briefs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "note_text_slug" ON "note_text" USING btree ("lang","slug");--> statement-breakpoint
CREATE INDEX "notes_published_at" ON "notes" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_text_slug" ON "project_text" USING btree ("lang","slug");