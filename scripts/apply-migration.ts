import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const migrationPath = path.join(
    process.cwd(),
    "drizzle",
    "migrations",
    "0000_initial.sql",
  );
  const sqlText = await readFile(migrationPath, "utf8");
  const statements = sqlText
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    console.log(`Applied ${statements.length} migration statements.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
