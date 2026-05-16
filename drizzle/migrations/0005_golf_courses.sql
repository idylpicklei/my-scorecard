CREATE TABLE IF NOT EXISTS "golf_courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "hole_pars" jsonb NOT NULL,
  "stroke_indexes" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "golf_courses_name_unique" UNIQUE("name")
);

ALTER TABLE "schedule_entries" ADD COLUMN IF NOT EXISTS "course_id" uuid;

ALTER TABLE "scorecards" ADD COLUMN IF NOT EXISTS "course_id" uuid;

ALTER TABLE "schedule_entries"
  ADD CONSTRAINT "schedule_entries_course_id_golf_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "public"."golf_courses"("id") ON DELETE SET NULL;

ALTER TABLE "scorecards"
  ADD CONSTRAINT "scorecards_course_id_golf_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "public"."golf_courses"("id") ON DELETE SET NULL;
