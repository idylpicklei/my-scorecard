import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    for (const table of [
      "users",
      "sessions",
      "teams",
      "schedule_entries",
      "scorecards",
    ]) {
      const [{ count }] = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`);
      console.log(`${table}: ${count}`);
    }
  } finally {
    await sql.end();
  }
}

main();
