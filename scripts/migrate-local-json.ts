/**
 * One-time migration: data/auth-db.json → Postgres.
 * Run: npm run db:migrate-local
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  passwordResets,
  scheduleEntries,
  scorecards,
  sessions,
  teams,
  users,
} from "../drizzle/schema";

type LocalDb = {
  users?: Array<{
    id: string;
    email: string;
    name: string;
    role: "admin" | "member";
    passwordHash: string;
    createdAt: string;
  }>;
  sessions?: Array<{
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
  }>;
  passwordResets?: Array<{
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
  }>;
  teams?: Array<{ id: string; name: string; players: string[] }>;
  schedule?: Array<{
    id: string;
    title: string;
    course: string;
    date: string;
    notes?: string;
    createdAt: string;
  }>;
  scorecards?: Array<{
    id: string;
    course: string;
    date: string;
    players: { playerName: string; holes: number[] }[];
    createdAt: string;
  }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set DATABASE_URL before running this script.");
  }

  const filePath = path.join(process.cwd(), "data", "auth-db.json");
  const raw = await readFile(filePath, "utf8");
  const local = JSON.parse(raw) as LocalDb;

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  if (local.users?.length) {
    for (const user of local.users) {
      if (!isUuid(user.id)) {
        console.warn(`Skipping user with non-UUID id: ${user.email}`);
        continue;
      }
      await db
        .insert(users)
        .values({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role === "admin" ? "admin" : "member",
          passwordHash: user.passwordHash,
          createdAt: new Date(user.createdAt),
        })
        .onConflictDoNothing();
    }
  }

  if (local.sessions?.length) {
    for (const session of local.sessions) {
      if (!isUuid(session.id) || !isUuid(session.userId)) continue;
      await db
        .insert(sessions)
        .values({
          id: session.id,
          tokenHash: session.tokenHash,
          userId: session.userId,
          expiresAt: new Date(session.expiresAt),
          createdAt: new Date(session.createdAt),
        })
        .onConflictDoNothing();
    }
  }

  if (local.passwordResets?.length) {
    for (const reset of local.passwordResets) {
      if (!isUuid(reset.id) || !isUuid(reset.userId)) continue;
      await db
        .insert(passwordResets)
        .values({
          id: reset.id,
          tokenHash: reset.tokenHash,
          userId: reset.userId,
          expiresAt: new Date(reset.expiresAt),
          createdAt: new Date(reset.createdAt),
        })
        .onConflictDoNothing();
    }
  }

  if (local.teams?.length) {
    for (const team of local.teams) {
      const id = isUuid(team.id)
        ? team.id
        : crypto.randomUUID();
      await db
        .insert(teams)
        .values({ id, name: team.name, players: team.players })
        .onConflictDoNothing();
    }
  }

  if (local.schedule?.length) {
    for (const entry of local.schedule) {
      if (!isUuid(entry.id)) continue;
      await db
        .insert(scheduleEntries)
        .values({
          id: entry.id,
          title: entry.title,
          course: entry.course,
          date: entry.date,
          notes: entry.notes,
          createdAt: new Date(entry.createdAt),
        })
        .onConflictDoNothing();
    }
  }

  if (local.scorecards?.length) {
    for (const card of local.scorecards) {
      if (!isUuid(card.id)) continue;
      await db
        .insert(scorecards)
        .values({
          id: card.id,
          course: card.course,
          date: card.date,
          players: card.players,
          createdAt: new Date(card.createdAt),
        })
        .onConflictDoNothing();
    }
  }

  await client.end();
  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
