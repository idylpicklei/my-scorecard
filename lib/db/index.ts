import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import {
  passwordResets,
  scheduleEntries,
  scorecards,
  sessions,
  teams as teamsTable,
  users,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db/client";
import { seedDatabaseIfEmpty } from "@/lib/db/seed";
import {
  endActiveWeekend,
  findScheduleEntryIdForScorecard,
  getActiveWeekend,
  getWeekendDashboardData,
  listWeekends,
  requireActiveWeekendId,
  startNewWeekend,
} from "@/lib/db/weekends";
import { hashPassword } from "@/lib/auth/password";
import { TRIP_PLAYERS, TRIP_PLAYER_HANDICAPS } from "@/lib/trip-roster";
import {
  isValidUsername,
  normalizeUsername,
  usernameFromName,
} from "@/lib/auth/username";

export type { WeekendSummary, WeekendStatus } from "@/lib/db/weekends";
export {
  endActiveWeekend,
  getActiveWeekend,
  getWeekendDashboardData,
  listWeekends,
  requireActiveWeekendId,
  startNewWeekend,
} from "@/lib/db/weekends";

export const SESSION_COOKIE_NAME = "myscorecard_session";

export type UserRole = "admin" | "member";

export type DashboardTeam = {
  id: string;
  name: string;
  players: string[];
};

export type ScheduleEntry = {
  id: string;
  title: string;
  course: string;
  date: string;
  notes?: string;
  createdAt: string;
};

export type PlayerScores = {
  playerName: string;
  holes: number[];
};

export type Scorecard = {
  id: string;
  course: string;
  date: string;
  players: PlayerScores[];
  createdAt: string;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  handicap: number;
  role: UserRole;
};

export type UserRecord = PublicUser & {
  passwordHash: string;
  createdAt: string;
};

let ready: Promise<void> | null = null;

export async function ensureDatabaseReady(): Promise<void> {
  if (!ready) {
    ready = seedDatabaseIfEmpty();
  }
  await ready;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    handicap: user.handicap,
    role: user.role,
  };
}

function mapUser(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    handicap: row.handicap,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTripPlayerHandicaps(): Promise<Record<string, number>> {
  await ensureDatabaseReady();
  const db = getDb();
  const rows = await db.select().from(users);
  const handicaps: Record<string, number> = { ...TRIP_PLAYER_HANDICAPS };

  for (const player of TRIP_PLAYERS) {
    const playerKey = player.toLowerCase();
    const match = rows.find(
      (row) =>
        row.name.toLowerCase() === playerKey ||
        row.username.toLowerCase() === playerKey,
    );
    if (match) {
      handicaps[player] = match.handicap;
    }
  }

  return handicaps;
}

function mapSchedule(row: typeof scheduleEntries.$inferSelect): ScheduleEntry {
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapScorecard(row: typeof scorecards.$inferSelect): Scorecard {
  return {
    id: row.id,
    course: row.course,
    date: row.date,
    players: row.players,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row ? mapUser(row) : null;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .limit(1);
  return row ? mapUser(row) : null;
}

export async function findUserByLogin(login: string): Promise<UserRecord | null> {
  const trimmed = login.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    return findUserByEmail(trimmed);
  }

  return findUserByUsername(trimmed);
}

export async function createUser(input: {
  username: string;
  email: string;
  name: string;
  password: string;
  handicap?: number;
}): Promise<PublicUser | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const username = normalizeUsername(input.username);

  if (!normalizedEmail || !name || !isValidUsername(username)) {
    return null;
  }

  if (await findUserByEmail(normalizedEmail)) {
    return null;
  }

  if (await findUserByUsername(username)) {
    return null;
  }

  const [row] = await db
    .insert(users)
    .values({
      username,
      email: normalizedEmail,
      name,
      handicap: input.handicap ?? 0,
      role: "member",
      passwordHash: hashPassword(input.password),
    })
    .returning();

  return row ? toPublicUser(mapUser(row)) : null;
}

export async function createSessionForUser(userId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  await ensureDatabaseReady();
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  await db.insert(sessions).values({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getUserBySessionToken(token: string): Promise<PublicUser | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const tokenHash = hashSessionToken(token);

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row ? toPublicUser(mapUser(row.user)) : null;
}

export async function getAuthUserFromRequestToken(
  token?: string,
): Promise<PublicUser | null> {
  if (!token) {
    return null;
  }
  return getUserBySessionToken(token);
}

export async function getDashboardConfiguration(): Promise<{
  teams: DashboardTeam[];
  schedule: ScheduleEntry[];
  activeWeekend: Awaited<ReturnType<typeof getActiveWeekend>>;
}> {
  await ensureDatabaseReady();
  const activeWeekend = await getActiveWeekend();

  if (!activeWeekend) {
    return { teams: [], schedule: [], activeWeekend: null };
  }

  const data = await getWeekendDashboardData(activeWeekend.id);
  return {
    teams: data.teams,
    schedule: data.schedule,
    activeWeekend,
  };
}

export async function setTeams(teams: DashboardTeam[]): Promise<DashboardTeam[]> {
  await ensureDatabaseReady();
  const weekendId = await requireActiveWeekendId();
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.delete(teamsTable).where(eq(teamsTable.weekendId, weekendId));
    if (teams.length > 0) {
      await tx.insert(teamsTable).values(
        teams.map((team) => ({
          id: team.id,
          weekendId,
          name: team.name,
          players: team.players,
        })),
      );
    }
  });

  return teams;
}

export async function addScheduleEntry(entry: {
  title: string;
  course: string;
  date: string;
  notes?: string;
}): Promise<ScheduleEntry> {
  await ensureDatabaseReady();
  const weekendId = await requireActiveWeekendId();
  const db = getDb();

  const [row] = await db
    .insert(scheduleEntries)
    .values({
      weekendId,
      title: entry.title,
      course: entry.course,
      date: entry.date,
      notes: entry.notes,
    })
    .returning();

  return mapSchedule(row);
}

export async function saveScorecard(scorecard: {
  course: string;
  date: string;
  players: PlayerScores[];
}): Promise<Scorecard> {
  await ensureDatabaseReady();
  const weekendId = await requireActiveWeekendId();
  const scheduleEntryId = await findScheduleEntryIdForScorecard(
    weekendId,
    scorecard.date,
    scorecard.course,
  );
  const db = getDb();

  const [row] = await db
    .insert(scorecards)
    .values({
      weekendId,
      scheduleEntryId,
      course: scorecard.course,
      date: scorecard.date,
      players: scorecard.players,
    })
    .returning();

  return mapScorecard(row);
}

export async function getScorecards(): Promise<Scorecard[]> {
  await ensureDatabaseReady();
  const weekendId = await requireActiveWeekendId();
  const data = await getWeekendDashboardData(weekendId);
  return data.scorecards;
}

export async function getScorecardsForWeekend(weekendId: string): Promise<Scorecard[]> {
  await ensureDatabaseReady();
  const data = await getWeekendDashboardData(weekendId);
  return data.scorecards;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await ensureDatabaseReady();
  const db = getDb();
  const tokenHash = hashSessionToken(token);

  await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, new Date()), eq(sessions.tokenHash, tokenHash)));
}

const PASSWORD_RESET_HOURS = 1;

export async function createPasswordResetToken(
  login: string,
): Promise<{ token: string; expiresAt: string } | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const user = await findUserByLogin(login);

  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setUTCHours(expiresAt.getUTCHours() + PASSWORD_RESET_HOURS);

  await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));

  await db.insert(passwordResets).values({
    tokenHash: hashSessionToken(token),
    userId: user.id,
    expiresAt,
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  await ensureDatabaseReady();
  const db = getDb();
  const tokenHash = hashSessionToken(token);

  const [resetRecord] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, tokenHash), gt(passwordResets.expiresAt, new Date())))
    .limit(1);

  if (!resetRecord) {
    return false;
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(users.id, resetRecord.userId));

  await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));
  await db.delete(sessions).where(eq(sessions.userId, resetRecord.userId));

  return true;
}

/** @deprecated Use ensureDatabaseReady */
export const ensureAuthStoreReady = ensureDatabaseReady;
