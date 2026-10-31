CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"mp4_bytes" integer NOT NULL,
	"webm_bytes" integer,
	"poster_id" integer NOT NULL,
	"alt" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "loop_id" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_loop_id_videos_id_fk" FOREIGN KEY ("loop_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;