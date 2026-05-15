CREATE TYPE "schedule_entry_kind" AS ENUM ('round', 'dinner');

ALTER TABLE "schedule_entries" ADD COLUMN IF NOT EXISTS "kind" "schedule_entry_kind" DEFAULT 'round' NOT NULL;
