import "dotenv/config";
import { eq } from "drizzle-orm";
import { teams as teamsTable, users, weekends } from "@/drizzle/schema";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { usernameFromName } from "@/lib/auth/username";
import { TRIP_PLAYER_HANDICAPS } from "@/lib/trip-roster";

const TRIP_USER_PASSWORD = process.env.TRIP_USER_PASSWORD ?? "golfweekend";

const TRIP_USERS = [
  {
    name: "MinJungKyu",
    username: "minjungkyu",
    email: "minjungkyu@myscorecard.local",
    handicap: TRIP_PLAYER_HANDICAPS.MinJungKyu,
    role: "admin" as const,
  },
  {
    name: "Dylpickle",
    username: "dylpickle",
    email: "dylpickle@myscorecard.local",
    handicap: TRIP_PLAYER_HANDICAPS.Dylpickle,
    role: "member" as const,
  },
  {
    name: "PigTank",
    username: "pigtank",
    email: "pigtank@myscorecard.local",
    handicap: TRIP_PLAYER_HANDICAPS.PigTank,
    role: "member" as const,
  },
  {
    name: "PaulHawk",
    username: "paulhawk",
    email: "paulhawk@myscorecard.local",
    handicap: TRIP_PLAYER_HANDICAPS.PaulHawk,
    role: "member" as const,
  },
];

const TRIP_TEAMS = [
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

async function main() {
  const db = getDb();
  const passwordHash = hashPassword(TRIP_USER_PASSWORD);

  for (const tripUser of TRIP_USERS) {
    const email = tripUser.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
      await db
        .update(users)
        .set({
          username: tripUser.username,
          name: tripUser.name,
          handicap: tripUser.handicap,
          role: tripUser.role,
          passwordHash,
        })
        .where(eq(users.id, existing.id));
      console.log(`Updated: ${tripUser.name} (@${tripUser.username})`);
    } else {
      await db.insert(users).values({
        username: tripUser.username,
        email,
        name: tripUser.name,
        handicap: tripUser.handicap,
        role: tripUser.role,
        passwordHash,
      });
      console.log(`Created: ${tripUser.name} (@${tripUser.username})`);
    }
  }

  const [activeWeekend] = await db
    .select({ id: weekends.id })
    .from(weekends)
    .where(eq(weekends.status, "active"))
    .limit(1);

  if (activeWeekend) {
    await db.delete(teamsTable).where(eq(teamsTable.weekendId, activeWeekend.id));
    await db.insert(teamsTable).values(
      TRIP_TEAMS.map((team) => ({
        ...team,
        weekendId: activeWeekend.id,
      })),
    );
    console.log("Updated teams for the active weekend.");
  } else {
    console.log("No active weekend found — run db:add-weekends first.");
  }

  console.log(`\nDefault password for all trip users: ${TRIP_USER_PASSWORD}`);
  console.log("(Override with TRIP_USER_PASSWORD in .env)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
