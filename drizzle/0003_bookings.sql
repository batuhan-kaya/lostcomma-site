CREATE TYPE "public"."booking_status" AS ENUM('booked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"no" serial NOT NULL,
	"token" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"minutes" smallint DEFAULT 20 NOT NULL,
	"lang" "lang" NOT NULL,
	"tz" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"about" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "booking_status" DEFAULT 'booked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_no_unique" UNIQUE("no"),
	CONSTRAINT "bookings_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"to" text NOT NULL,
	"reply_to" text,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"ics" text,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"tries" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot" ON "bookings" USING btree ("starts_at") WHERE "bookings"."status" = 'booked';--> statement-breakpoint
CREATE INDEX "bookings_starts_at" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "outbox_status" ON "outbox" USING btree ("status");