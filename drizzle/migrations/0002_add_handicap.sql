ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "handicap" real DEFAULT 0 NOT NULL;

UPDATE "users"
SET "handicap" = 8
WHERE lower("name") = 'minjungkyu' OR lower("username") = 'minjungkyu';

UPDATE "users"
SET "handicap" = 14
WHERE lower("name") = 'dylpickle' OR lower("username") = 'dylpickle';

UPDATE "users"
SET "handicap" = 18
WHERE lower("name") = 'pigtank' OR lower("username") = 'pigtank';

UPDATE "users"
SET "handicap" = 11
WHERE lower("name") = 'paulhawk' OR lower("username") = 'paulhawk';
