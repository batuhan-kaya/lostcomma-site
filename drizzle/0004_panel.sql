CREATE TABLE "audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"summary" text DEFAULT '' NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"ip" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"from_min" smallint,
	"to_min" smallint,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "closures_times" CHECK (("closures"."from_min" is null and "closures"."to_min" is null) or ("closures"."from_min" >= 0 and "closures"."to_min" <= 1440 and "closures"."from_min" < "closures"."to_min"))
);
--> statement-breakpoint
CREATE TABLE "panel_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"csrf" text NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "panel_user" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret" text,
	"totp_last_step" bigint,
	"totp_pending" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "panel_user_one" CHECK ("panel_user"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"from" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "staff_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "note" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_at" ON "audit" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "closures_day" ON "closures" USING btree ("day");--> statement-breakpoint
CREATE INDEX "panel_sessions_expires" ON "panel_sessions" USING btree ("expires_at");