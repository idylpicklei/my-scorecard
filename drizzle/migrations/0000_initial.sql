CREATE TYPE "user_role" AS ENUM ('admin', 'member');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "user_role" DEFAULT 'member' NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email"),
  CONSTRAINT "users_username_unique" UNIQUE("username")
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE "password_resets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "players" jsonb DEFAULT '[]'::jsonb NOT NULL
);

CREATE TABLE "schedule_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "course" text NOT NULL,
  "date" date NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "scorecards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course" text NOT NULL,
  "date" date NOT NULL,
  "players" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
