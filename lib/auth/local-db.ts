import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "@/lib/auth/password";

export const SESSION_COOKIE_NAME = "myscorecard_session";

const AUTH_DB_DIR = path.join(process.cwd(), "data");
const AUTH_DB_PATH = path.join(AUTH_DB_DIR, "auth-db.json");

const DEFAULT_USER_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "friends@myscorecard.local";
const DEFAULT_USER_NAME = process.env.LOCAL_AUTH_NAME ?? "Weekend Golfer";
const DEFAULT_USER_PASSWORD = process.env.LOCAL_AUTH_PASSWORD ?? "golfweekend";
const DEFAULT_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@myscorecard.local";
const DEFAULT_ADMIN_NAME = process.env.LOCAL_ADMIN_NAME ?? "Trip Admin";
const DEFAULT_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? "adminweekend";

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

type AuthDb = {
  users: UserRecord[];
  sessions: SessionRecord[];
  teams: DashboardTeam[];
  schedule: ScheduleEntry[];
  scorecards: Scorecard[];
};

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
};

type SessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

let initialized = false;
let mutationQueue: Promise<void> = Promise.resolve();

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

const DEFAULT_TEAMS: DashboardTeam[] = [
  {
    id: "team-idaho-001",
    name: "Team Idaho",
    players: ["Kody", "Ty"],
  },
  {
    id: "team-oregon-001",
    name: "Team Oregon",
    players: ["Mitch", "Ryan"],
  },
];

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  {
    id: "schedule-001",
    title: "Friday Warmup Round",
    course: "Timberline Golf Club",
    date: "2026-05-22",
    notes: "Tee time at 1:10 PM",
    createdAt: new Date().toISOString(),
  },
  {
    id: "schedule-002",
    title: "Saturday Team Match",
    course: "River Bend Links",
    date: "2026-05-23",
    notes: "Idaho vs Oregon front/back Nassau",
    createdAt: new Date().toISOString(),
  },
];

function defaultTeams(): DashboardTeam[] {
  return DEFAULT_TEAMS.map((team) => ({ ...team }));
}

function defaultSchedule(): ScheduleEntry[] {
  return DEFAULT_SCHEDULE.map((entry) => ({ ...entry }));
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getUtcIsoAfterDays(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function isExpired(isoTimestamp: string): boolean {
  return Date.parse(isoTimestamp) <= Date.now();
}

async function ensureDbFile(): Promise<void> {
  await mkdir(AUTH_DB_DIR, { recursive: true });

  try {
    await readFile(AUTH_DB_PATH, "utf8");
  } catch {
    const initialState: AuthDb = {
      users: [],
      sessions: [],
      teams: defaultTeams(),
      schedule: defaultSchedule(),
      scorecards: [],
    };
    await writeDb(initialState);
  }
}

async function readDb(): Promise<AuthDb> {
  const raw = await readFile(AUTH_DB_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<AuthDb>;

  return {
    users: Array.isArray(parsed.users)
      ? parsed.users.map((user) => ({
          ...user,
          role: user.role === "admin" ? "admin" : "member",
        }))
      : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    teams: Array.isArray(parsed.teams) ? parsed.teams : defaultTeams(),
    schedule: Array.isArray(parsed.schedule) ? parsed.schedule : defaultSchedule(),
    scorecards: Array.isArray(parsed.scorecards) ? parsed.scorecards : [],
  };
}

async function writeDb(db: AuthDb): Promise<void> {
  const tempPath = `${AUTH_DB_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await rename(tempPath, AUTH_DB_PATH);
}

async function queueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = mutationQueue.then(operation, operation);
  mutationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function ensureAuthStoreReady(): Promise<void> {
  if (initialized) {
    return;
  }

  await queueMutation(async () => {
    if (initialized) {
      return;
    }

    await ensureDbFile();
    const db = await readDb();

    if (db.users.length === 0) {
      const seededUser: UserRecord = {
        id: randomUUID(),
        email: DEFAULT_USER_EMAIL.trim().toLowerCase(),
        name: DEFAULT_USER_NAME.trim(),
        role: "member",
        passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
        createdAt: new Date().toISOString(),
      };

      db.users.push(seededUser);
    }

    const adminEmail = DEFAULT_ADMIN_EMAIL.trim().toLowerCase();
    const hasAdmin = db.users.some((user) => user.role === "admin");

    if (!hasAdmin) {
      db.users.push({
        id: randomUUID(),
        email: adminEmail,
        name: DEFAULT_ADMIN_NAME.trim(),
        role: "admin",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        createdAt: new Date().toISOString(),
      });
    }

    const hasSeededMember = db.users.some(
      (user) => user.email === DEFAULT_USER_EMAIL.trim().toLowerCase(),
    );

    if (!hasSeededMember) {
      db.users.push({
        id: randomUUID(),
        email: DEFAULT_USER_EMAIL.trim().toLowerCase(),
        name: DEFAULT_USER_NAME.trim(),
        role: "member",
        passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
        createdAt: new Date().toISOString(),
      });
    }

    if (db.teams.length === 0) {
      db.teams = defaultTeams();
    }

    if (db.schedule.length === 0) {
      db.schedule = defaultSchedule();
    }

    await writeDb(db);

    initialized = true;
  });
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureAuthStoreReady();
  const db = await readDb();
  const normalizedEmail = email.trim().toLowerCase();
  return db.users.find((user) => user.email === normalizedEmail) ?? null;
}

export async function createSessionForUser(userId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  await ensureAuthStoreReady();

  return queueMutation(async () => {
    const db = await readDb();
    const token = randomBytes(32).toString("hex");
    const expiresAt = getUtcIsoAfterDays(7);

    db.sessions = db.sessions.filter((session) => !isExpired(session.expiresAt));

    db.sessions.push({
      id: randomUUID(),
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    await writeDb(db);

    return {
      token,
      expiresAt,
    };
  });
}

export async function getUserBySessionToken(token: string): Promise<PublicUser | null> {
  await ensureAuthStoreReady();

  const db = await readDb();
  const tokenHash = hashSessionToken(token);
  const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);

  if (!session || isExpired(session.expiresAt)) {
    return null;
  }

  const user = db.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return null;
  }

  return toPublicUser(user);
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
}> {
  await ensureAuthStoreReady();
  const db = await readDb();

  return {
    teams: db.teams,
    schedule: db.schedule.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function setTeams(teams: DashboardTeam[]): Promise<DashboardTeam[]> {
  await ensureAuthStoreReady();

  return queueMutation(async () => {
    const db = await readDb();

    db.teams = teams;
    await writeDb(db);
    return db.teams;
  });
}

export async function addScheduleEntry(entry: {
  title: string;
  course: string;
  date: string;
  notes?: string;
}): Promise<ScheduleEntry> {
  await ensureAuthStoreReady();

  return queueMutation(async () => {
    const db = await readDb();

    const scheduleEntry: ScheduleEntry = {
      id: randomUUID(),
      title: entry.title,
      course: entry.course,
      date: entry.date,
      notes: entry.notes,
      createdAt: new Date().toISOString(),
    };

    db.schedule.push(scheduleEntry);
    db.schedule.sort((a, b) => a.date.localeCompare(b.date));
    await writeDb(db);

    return scheduleEntry;
  });
}

export async function saveScorecard(scorecard: {
  course: string;
  date: string;
  players: PlayerScores[];
}): Promise<Scorecard> {
  await ensureAuthStoreReady();

  return queueMutation(async () => {
    const db = await readDb();

    const newScorecard: Scorecard = {
      id: randomUUID(),
      course: scorecard.course,
      date: scorecard.date,
      players: scorecard.players,
      createdAt: new Date().toISOString(),
    };

    db.scorecards.push(newScorecard);
    await writeDb(db);

    return newScorecard;
  });
}

export async function getScorecards(): Promise<Scorecard[]> {
  await ensureAuthStoreReady();
  const db = await readDb();

  return db.scorecards.sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await ensureAuthStoreReady();

  await queueMutation(async () => {
    const db = await readDb();
    const tokenHash = hashSessionToken(token);

    db.sessions = db.sessions.filter((session) => {
      if (isExpired(session.expiresAt)) {
        return false;
      }

      return session.tokenHash !== tokenHash;
    });

    await writeDb(db);
  });
}
