import { asc, eq } from "drizzle-orm";
import { golfCourses } from "@/drizzle/schema";
import {
  normalizeHolePars,
  normalizeStrokeIndexes,
  totalPar,
  type GolfCourseLayout,
} from "@/lib/golf-course";
import { getDb } from "@/lib/db/client";
import { seedDatabaseIfEmpty } from "@/lib/db/seed";

let ready: Promise<void> | null = null;

async function ensureDatabaseReady(): Promise<void> {
  if (!ready) {
    ready = seedDatabaseIfEmpty();
  }
  await ready;
}

function mapCourse(row: typeof golfCourses.$inferSelect): GolfCourseLayout {
  const holePars = normalizeHolePars(row.holePars);
  const strokeIndexes = normalizeStrokeIndexes(row.strokeIndexes) ?? [];
  return {
    id: row.id,
    name: row.name,
    holePars,
    strokeIndexes,
    totalPar: totalPar(holePars),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listGolfCourses(): Promise<GolfCourseLayout[]> {
  await ensureDatabaseReady();
  const db = getDb();
  const rows = await db.select().from(golfCourses).orderBy(asc(golfCourses.name));
  return rows.map(mapCourse);
}

export async function getGolfCourseById(id: string): Promise<GolfCourseLayout | null> {
  await ensureDatabaseReady();
  const db = getDb();
  const [row] = await db.select().from(golfCourses).where(eq(golfCourses.id, id)).limit(1);
  return row ? mapCourse(row) : null;
}

export async function createGolfCourse(input: {
  name: string;
  holePars: number[];
  strokeIndexes: number[];
}): Promise<GolfCourseLayout> {
  await ensureDatabaseReady();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Course name is required.");
  }

  const holePars = normalizeHolePars(input.holePars);
  const strokeIndexes = normalizeStrokeIndexes(input.strokeIndexes);
  if (!strokeIndexes) {
    throw new Error("Each hole needs a unique handicap rank from 1 (hardest) to 18 (easiest).");
  }

  const db = getDb();
  const [row] = await db
    .insert(golfCourses)
    .values({
      name,
      holePars,
      strokeIndexes,
    })
    .returning();

  return mapCourse(row);
}
