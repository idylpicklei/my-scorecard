CREATE TYPE "weekend_status" AS ENUM ('active', 'completed');

CREATE TABLE "weekends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "status" "weekend_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

INSERT INTO "weekends" ("id", "title", "start_date", "end_date", "status")
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Golf Weekend',
  CURRENT_DATE,
  NULL,
  'active'
);

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "weekend_id" uuid;
UPDATE "teams" SET "weekend_id" = '00000000-0000-4000-8000-000000000010' WHERE "weekend_id" IS NULL;
ALTER TABLE "teams" ALTER COLUMN "weekend_id" SET NOT NULL;
ALTER TABLE "teams" ADD CONSTRAINT "teams_weekend_id_weekends_id_fk"
  FOREIGN KEY ("weekend_id") REFERENCES "weekends"("id") ON DELETE cascade;

ALTER TABLE "schedule_entries" ADD COLUMN IF NOT EXISTS "weekend_id" uuid;
UPDATE "schedule_entries" SET "weekend_id" = '00000000-0000-4000-8000-000000000010' WHERE "weekend_id" IS NULL;
ALTER TABLE "schedule_entries" ALTER COLUMN "weekend_id" SET NOT NULL;
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_weekend_id_weekends_id_fk"
  FOREIGN KEY ("weekend_id") REFERENCES "weekends"("id") ON DELETE cascade;

ALTER TABLE "scorecards" ADD COLUMN IF NOT EXISTS "weekend_id" uuid;
UPDATE "scorecards" SET "weekend_id" = '00000000-0000-4000-8000-000000000010' WHERE "weekend_id" IS NULL;
ALTER TABLE "scorecards" ALTER COLUMN "weekend_id" SET NOT NULL;
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_weekend_id_weekends_id_fk"
  FOREIGN KEY ("weekend_id") REFERENCES "weekends"("id") ON DELETE cascade;

ALTER TABLE "scorecards" ADD COLUMN IF NOT EXISTS "schedule_entry_id" uuid;
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_schedule_entry_id_schedule_entries_id_fk"
  FOREIGN KEY ("schedule_entry_id") REFERENCES "schedule_entries"("id") ON DELETE set null;

CREATE UNIQUE INDEX IF NOT EXISTS "weekends_one_active"
  ON "weekends" ("status")
  WHERE "status" = 'active';
