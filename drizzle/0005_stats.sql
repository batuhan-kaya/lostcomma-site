CREATE TABLE "stats_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" uuid NOT NULL,
	"view_id" uuid,
	"at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"x" smallint,
	"y" integer,
	"width" smallint
);
--> statement-breakpoint
CREATE TABLE "stats_salts" (
	"day" date PRIMARY KEY NOT NULL,
	"salt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"visit_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"path" text NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"lang" "lang",
	"engaged_ms" integer DEFAULT 0 NOT NULL,
	"scroll" smallint DEFAULT 0 NOT NULL,
	"width" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats_visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"visitor" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	"entry" text NOT NULL,
	"exit" text NOT NULL,
	"ref_host" text DEFAULT '' NOT NULL,
	"ref_path" text DEFAULT '' NOT NULL,
	"utm_source" text DEFAULT '' NOT NULL,
	"utm_medium" text DEFAULT '' NOT NULL,
	"utm_campaign" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"device" text DEFAULT 'desktop' NOT NULL,
	"os" text DEFAULT '' NOT NULL,
	"browser" text DEFAULT '' NOT NULL,
	"lang" "lang",
	"browser_lang" text DEFAULT '' NOT NULL,
	"tz" text DEFAULT '' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"engaged_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "stats_events" ADD CONSTRAINT "stats_events_visit_id_stats_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."stats_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stats_views" ADD CONSTRAINT "stats_views_visit_id_stats_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."stats_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stats_events_visit" ON "stats_events" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "stats_events_view" ON "stats_events" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "stats_events_at" ON "stats_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "stats_views_visit" ON "stats_views" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "stats_views_at" ON "stats_views" USING btree ("at");--> statement-breakpoint
CREATE INDEX "stats_views_path" ON "stats_views" USING btree ("path","at");--> statement-breakpoint
CREATE INDEX "stats_visits_started" ON "stats_visits" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "stats_visits_visitor" ON "stats_visits" USING btree ("visitor","last_at");--> statement-breakpoint
CREATE INDEX "stats_visits_last" ON "stats_visits" USING btree ("last_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_visit_id_stats_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."stats_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_visit_id_stats_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."stats_visits"("id") ON DELETE set null ON UPDATE no action;