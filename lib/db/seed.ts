import { count, eq } from "drizzle-orm";
import {
  scheduleEntries,
  teams as teamsTable,
  users,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const DEFAULT_USER_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "friends@myscorecard.local";
const DEFAULT_USER_NAME = process.env.LOCAL_AUTH_NAME ?? "Weekend Golfer";
const DEFAULT_USER_PASSWORD = process.env.LOCAL_AUTH_PASSWORD ?? "golfweekend";
const DEFAULT_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@myscorecard.local";
const DEFAULT_ADMIN_NAME = process.env.LOCAL_ADMIN_NAME ?? "Trip Admin";
const DEFAULT_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? "adminweekend";

const DEFAULT_TEAMS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Team MinJungKyu & Dylpickle",
    players: ["MinJungKyu", "Dylpickle"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Team PigTank & PaulHawk",
    players: ["PigTank", "PaulHawk"],
  },
];

const DEFAULT_SCHEDULE = [
  {
    title: "Friday Warmup Round",
    course: "Timberline Golf Club",
    date: "2026-05-22",
    notes: "Tee time at 1:10 PM",
  },
  {
    title: "Saturday Team Match",
    course: "River Bend Links",
    date: "2026-05-23",
    notes: "Idaho vs Oregon front/back Nassau",
  },
];

export async function seedDatabaseIfEmpty(): Promise<void> {
  const db = getDb();

  const [{ value: userCount }] = await db.select({ value: count() }).from(users);

  if (userCount === 0) {
    await db.insert(users).values({
      email: DEFAULT_USER_EMAIL.trim().toLowerCase(),
      name: DEFAULT_USER_NAME.trim(),
      role: "member",
      passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
    });
  }

  const adminEmail = DEFAULT_ADMIN_EMAIL.trim().toLowerCase();
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      name: DEFAULT_ADMIN_NAME.trim(),
      role: "admin",
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    });
  }

  const [existingMember] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEFAULT_USER_EMAIL.trim().toLowerCase()))
    .limit(1);

  if (!existingMember) {
    await db.insert(users).values({
      email: DEFAULT_USER_EMAIL.trim().toLowerCase(),
      name: DEFAULT_USER_NAME.trim(),
      role: "member",
      passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
    });
  }

  const [{ value: teamCount }] = await db.select({ value: count() }).from(teamsTable);
  if (teamCount === 0) {
    await db.insert(teamsTable).values(DEFAULT_TEAMS);
  }

  const [{ value: scheduleCount }] = await db
    .select({ value: count() })
    .from(scheduleEntries);

  if (scheduleCount === 0) {
    await db.insert(scheduleEntries).values(DEFAULT_SCHEDULE);
  }
}
