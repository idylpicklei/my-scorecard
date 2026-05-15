ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;

UPDATE "users"
SET "username" = lower(regexp_replace("name", '\s+', '', 'g'))
WHERE "username" IS NULL AND "name" IS NOT NULL;

UPDATE "users"
SET "username" = split_part("email", '@', 1)
WHERE "username" IS NULL;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
