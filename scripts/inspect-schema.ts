import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log("Tables:", tables.map((t) => t.table_name).join(", ") || "(none)");

    const userCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    if (userCols.length) {
      console.log("users columns:", userCols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
    }
  } finally {
    await sql.end();
  }
}

main();
