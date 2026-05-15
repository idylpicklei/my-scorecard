import "dotenv/config";
import { eq } from "drizzle-orm";
import { teams as teamsTable, users } from "@/drizzle/schema";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const TRIP_USER_PASSWORD = process.env.TRIP_USER_PASSWORD ?? "golfweekend";

const TRIP_USERS = [
  { name: "MinJungKyu", email: "minjungkyu@myscorecard.local", role: "admin" as const },
  { name: "Dylpickle", email: "dylpickle@myscorecard.local", role: "member" as const },
  { name: "PigTank", email: "pigtank@myscorecard.local", role: "member" as const },
  { name: "PaulHawk", email: "paulhawk@myscorecard.local", role: "member" as const },
];

const TRIP_TEAMS = [
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
          name: tripUser.name,
          role: tripUser.role,
          passwordHash,
        })
        .where(eq(users.id, existing.id));
      console.log(`Updated: ${tripUser.name} (${email})`);
    } else {
      await db.insert(users).values({
        email,
        name: tripUser.name,
        role: tripUser.role,
        passwordHash,
      });
      console.log(`Created: ${tripUser.name} (${email})`);
    }
  }

  await db.delete(teamsTable);
  await db.insert(teamsTable).values(TRIP_TEAMS);
  console.log("Updated teams for the trip roster.");

  console.log(`\nDefault password for all trip users: ${TRIP_USER_PASSWORD}`);
  console.log("(Override with TRIP_USER_PASSWORD in .env)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
