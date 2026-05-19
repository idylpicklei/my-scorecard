ALTER TABLE "schedule_entries" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
