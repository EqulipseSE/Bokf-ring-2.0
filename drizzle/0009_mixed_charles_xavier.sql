ALTER TABLE "time_entries" ADD COLUMN "start_time" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "summary" text DEFAULT '' NOT NULL;