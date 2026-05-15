import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    const userCols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `;

    const hasPasswordHash = userCols.some((col) => col.column_name === "password_hash");
    const tableNames = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tables = new Set(tableNames.map((row) => row.table_name));

    if (tables.has("users") && !hasPasswordHash) {
      console.log("Removing incomplete legacy users table...");
      await sql.unsafe(`DROP TABLE IF EXISTS "users" CASCADE`);
    }

    const migrationPath = path.join(
      process.cwd(),
      "drizzle",
      "migrations",
      "0000_initial.sql",
    );
    const migrationSql = await readFile(migrationPath, "utf8");
    const statements = migrationSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already exists")) {
          continue;
        }
        throw error;
      }
    }

    console.log("Database schema is ready.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
