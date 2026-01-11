// apps/server/src/scripts/dbHealthCheck.ts
import { buildConnectionString } from "@db";
import dotenvFlow from "dotenv-flow";
import postgres from "postgres";

dotenvFlow.config({ path: ".env" });
dotenvFlow.config({ path: "../../.env" });

async function main(): Promise<void> {
  const url = buildConnectionString(process.env);
  const sql = postgres(url, { max: 1, ssl: process.env.DB_SSL === "true" });

  try {
    await sql`select 1`;
    console.log("Database health check: OK");
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch (error) {
    console.error("Database health check failed:", error);
    await sql.end({ timeout: 1 });
    process.exit(1);
  }
}

void main();
