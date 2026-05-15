import { count, eq } from "drizzle-orm";

import {

  scheduleEntries,

  teams as teamsTable,

  users,

  weekends,

} from "@/drizzle/schema";

import { getDb } from "@/lib/db/client";

import { hashPassword } from "@/lib/auth/password";

import { usernameFromName } from "@/lib/auth/username";



const DEFAULT_WEEKEND_ID = "00000000-0000-4000-8000-000000000010";



const DEFAULT_USER_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "friends@myscorecard.local";

const DEFAULT_USER_NAME = process.env.LOCAL_AUTH_NAME ?? "Weekend Golfer";

const DEFAULT_USER_PASSWORD = process.env.LOCAL_AUTH_PASSWORD ?? "golfweekend";

const DEFAULT_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@myscorecard.local";

const DEFAULT_ADMIN_NAME = process.env.LOCAL_ADMIN_NAME ?? "Trip Admin";

const DEFAULT_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? "adminweekend";



const DEFAULT_TEAMS = [

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



type ScheduleSeedEntry = {
  title: string;
  course: string;
  date: string;
  notes?: string;
};

const DEFAULT_SCHEDULE: ScheduleSeedEntry[] = [];



function todayDateString(): string {

  return new Date().toISOString().slice(0, 10);

}



export async function seedDatabaseIfEmpty(): Promise<void> {

  const db = getDb();



  const [{ value: userCount }] = await db.select({ value: count() }).from(users);



  if (userCount === 0) {

    await db.insert(users).values({

      username: usernameFromName(DEFAULT_USER_NAME),

      email: DEFAULT_USER_EMAIL.trim().toLowerCase(),

      name: DEFAULT_USER_NAME.trim(),

      handicap: 0,

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

      username: usernameFromName(DEFAULT_ADMIN_NAME),

      email: adminEmail,

      name: DEFAULT_ADMIN_NAME.trim(),

      handicap: 0,

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

      username: usernameFromName(DEFAULT_USER_NAME),

      email: DEFAULT_USER_EMAIL.trim().toLowerCase(),

      name: DEFAULT_USER_NAME.trim(),

      handicap: 0,

      role: "member",

      passwordHash: hashPassword(DEFAULT_USER_PASSWORD),

    });

  }



  const [{ value: weekendCount }] = await db.select({ value: count() }).from(weekends);



  if (weekendCount === 0) {

    await db.insert(weekends).values({

      id: DEFAULT_WEEKEND_ID,

      title: "Golf Weekend",

      startDate: todayDateString(),

      status: "active",

    });

  }



  const [activeWeekend] = await db

    .select({ id: weekends.id })

    .from(weekends)

    .where(eq(weekends.status, "active"))

    .limit(1);



  const weekendId = activeWeekend?.id ?? DEFAULT_WEEKEND_ID;



  const [{ value: teamCount }] = await db

    .select({ value: count() })

    .from(teamsTable)

    .where(eq(teamsTable.weekendId, weekendId));



  if (teamCount === 0) {

    await db.insert(teamsTable).values(

      DEFAULT_TEAMS.map((team) => ({

        id: team.id,

        weekendId,

        name: team.name,

        players: team.players,

      })),

    );

  }



  const [{ value: scheduleCount }] = await db

    .select({ value: count() })

    .from(scheduleEntries)

    .where(eq(scheduleEntries.weekendId, weekendId));



  if (scheduleCount === 0 && DEFAULT_SCHEDULE.length > 0) {

    await db.insert(scheduleEntries).values(

      DEFAULT_SCHEDULE.map((entry) => ({

        weekendId,

        title: entry.title,

        course: entry.course,

        date: entry.date,

        notes: entry.notes,

      })),

    );

  }

}


