import dotenvFlow from "dotenv-flow";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

dotenvFlow.config({ path: ".env" });
dotenvFlow.config({ path: "../../.env" });

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "postgres";
  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

async function main() {
  const url = buildConnectionString();
  const sql = postgres(url, {
    max: 2,
    ssl: process.env.DB_SSL === "true",
  });
  const db = drizzle(sql);

  try {
    // TODO: Add real seed data once schema is defined.
    console.log("Seed script connected. Add seed operations here.");
  } catch (error) {
    console.error("Seed script failed:", error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main();
