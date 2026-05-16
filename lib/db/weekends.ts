import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  scheduleEntries,
  scorecards,
  teams as teamsTable,
  weekends,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db/client";
import { seedDatabaseIfEmpty } from "@/lib/db/seed";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

type DashboardTeam = {
  id: string;
  name: string;
  players: string[];
};

type ScheduleEntry = {
  id: string;
  kind: "round" | "dinner";
  title: string;
  course: string;
  courseId?: string;
  date: string;
  notes?: string;
  createdAt: string;
};

type Scorecard = {
  id: string;
  course: string;
  courseId?: string;
  date: string;
  players: { playerName: string; holes: number[] }[];
  createdAt: string;
};

let weekendsReady: Promise<void> | null = null;

async function ensureWeekendsReady(): Promise<void> {
  if (!weekendsReady) {
    weekendsReady = seedDatabaseIfEmpty();
  }
  await weekendsReady;
}

export type WeekendStatus = "active" | "completed";

export type WeekendSummary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  status: WeekendStatus;
  roundsScheduled: number;
  roundsCompleted: number;
  roundsLeft: number;
  createdAt: string;
};

const DEFAULT_TEAMS: DashboardTeam[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Team Idaho",
    players: ["MinJungKyu", "Dylpickle"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Team Oregon",
    players: ["PigTank", "PaulHawk"],
  },
];

function mapWeekendRow(
  row: typeof weekends.$inferSelect,
  roundsScheduled: number,
  roundsCompleted: number,
): WeekendSummary {
  return {
    id: row.id,
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    status: row.status,
    roundsScheduled,
    roundsCompleted,
    roundsLeft: Math.max(0, roundsScheduled - roundsCompleted),
    createdAt: row.createdAt.toISOString(),
  };
}

async function countRoundsForWeekend(weekendId: string): Promise<{
  roundsScheduled: number;
  roundsCompleted: number;
}> {
  const db = getDb();
  const [scheduleCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(scheduleEntries)
    .where(
      and(eq(scheduleEntries.weekendId, weekendId), eq(scheduleEntries.kind, "round")),
    );

  const [completedCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(scorecards)
    .where(eq(scorecards.weekendId, weekendId));

  return {
    roundsScheduled: scheduleCount?.value ?? 0,
    roundsCompleted: completedCount?.value ?? 0,
  };
}

export async function requireActiveWeekendId(): Promise<string> {
  const weekend = await getActiveWeekend();
  if (!weekend) {
    throw new Error("No active weekend configured.");
  }
  return weekend.id;
}

export async function getActiveWeekend(): Promise<WeekendSummary | null> {
  await ensureWeekendsReady();
  const db = getDb();

  const [row] = await db
    .select()
    .from(weekends)
    .where(eq(weekends.status, "active"))
    .limit(1);

  if (!row) {
    return null;
  }

  const counts = await countRoundsForWeekend(row.id);
  return mapWeekendRow(row, counts.roundsScheduled, counts.roundsCompleted);
}

export async function getWeekendById(weekendId: string): Promise<WeekendSummary | null> {
  await ensureWeekendsReady();
  const db = getDb();

  const [row] = await db.select().from(weekends).where(eq(weekends.id, weekendId)).limit(1);
  if (!row) {
    return null;
  }

  const counts = await countRoundsForWeekend(row.id);
  return mapWeekendRow(row, counts.roundsScheduled, counts.roundsCompleted);
}

export async function listWeekends(): Promise<WeekendSummary[]> {
  await ensureWeekendsReady();
  const db = getDb();

  const rows = await db.select().from(weekends).orderBy(desc(weekends.startDate));
  const summaries: WeekendSummary[] = [];

  for (const row of rows) {
    const counts = await countRoundsForWeekend(row.id);
    summaries.push(mapWeekendRow(row, counts.roundsScheduled, counts.roundsCompleted));
  }

  return summaries;
}

export async function getWeekendDashboardData(weekendId: string): Promise<{
  teams: DashboardTeam[];
  schedule: ScheduleEntry[];
  scorecards: Scorecard[];
}> {
  await ensureWeekendsReady();
  const db = getDb();

  const teamRows = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.weekendId, weekendId));

  const scheduleRows = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.weekendId, weekendId))
    .orderBy(asc(scheduleEntries.date), asc(scheduleEntries.createdAt));

  const scorecardRows = await db
    .select()
    .from(scorecards)
    .where(eq(scorecards.weekendId, weekendId))
    .orderBy(desc(scorecards.date));

  return {
    teams: teamRows.map((team) => ({
      id: team.id,
      name: team.name,
      players: team.players,
    })),
    schedule: scheduleRows.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      course: entry.course,
      courseId: entry.courseId ?? undefined,
      date: entry.date,
      notes: entry.notes ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    })),
    scorecards: scorecardRows.map((entry) => ({
      id: entry.id,
      course: entry.course,
      courseId: entry.courseId ?? undefined,
      date: entry.date,
      players: entry.players,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function endActiveWeekend(endDate?: string): Promise<WeekendSummary> {
  await ensureWeekendsReady();
  const db = getDb();

  const [active] = await db
    .select()
    .from(weekends)
    .where(eq(weekends.status, "active"))
    .limit(1);

  if (!active) {
    throw new Error("No active weekend to end.");
  }

  const resolvedEndDate = endDate?.trim() || todayDateString();

  const [updated] = await db
    .update(weekends)
    .set({ status: "completed", endDate: resolvedEndDate })
    .where(eq(weekends.id, active.id))
    .returning();

  const counts = await countRoundsForWeekend(updated.id);
  return mapWeekendRow(updated, counts.roundsScheduled, counts.roundsCompleted);
}

export async function startNewWeekend(input: {
  title: string;
  startDate: string;
  endDate?: string;
}): Promise<WeekendSummary> {
  await ensureWeekendsReady();
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx
      .update(weekends)
      .set({ status: "completed" })
      .where(eq(weekends.status, "active"));

    const [created] = await tx
      .insert(weekends)
      .values({
        title: input.title.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        status: "active",
      })
      .returning();

    const teamRows = DEFAULT_TEAMS.map((team) => ({
      id: randomUUID(),
      weekendId: created.id,
      name: team.name,
      players: team.players,
    }));

    await tx.insert(teamsTable).values(teamRows);

    return mapWeekendRow(created, 0, 0);
  });
}

export async function findScheduleEntryIdForScorecard(
  weekendId: string,
  date: string,
  course: string,
): Promise<string | null> {
  await ensureWeekendsReady();
  const db = getDb();

  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.weekendId, weekendId),
        eq(scheduleEntries.date, date),
        eq(scheduleEntries.kind, "round"),
      ),
    );

  if (entries.length === 0) {
    return null;
  }

  const courseMatch = entries.find(
    (entry) => entry.course.trim().toLowerCase() === course.trim().toLowerCase(),
  );
  return courseMatch?.id ?? entries[0].id;
}

export async function getCompletedScheduleEntryIds(weekendId: string): Promise<Set<string>> {
  await ensureWeekendsReady();
  const db = getDb();

  const rows = await db
    .select({ scheduleEntryId: scorecards.scheduleEntryId })
    .from(scorecards)
    .where(eq(scorecards.weekendId, weekendId));

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.scheduleEntryId) {
      ids.add(row.scheduleEntryId);
    }
  }
  return ids;
}

export function defaultTripPlayerNames(): string[] {
  return [...TRIP_PLAYERS];
}
