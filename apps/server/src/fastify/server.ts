import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import dotenvFlow from "dotenv-flow";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

dotenvFlow.config();

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = "0.0.0.0";

function buildConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 5432);
  const database = process.env.DB_NAME || "postgres";

  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

export async function createFastifyServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet);

  const sqlClient = postgres(buildConnectionString(), {
    max: Number(process.env.DB_MAX_CONNECTIONS || 10),
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 30000),
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    ssl: process.env.DB_SSL === "true",
  });

  const db = drizzle(sqlClient);

  app.get(
    "/api",
    {
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => ({
      message: "Fastify adapter is running",
      timestamp: new Date().toISOString(),
    })
  );

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({
            status: z.enum(["ok", "degraded"]),
            database: z.boolean(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => {
      let dbHealthy = true;
      try {
        await db.execute(sql`select 1`);
      } catch (error) {
        dbHealthy = false;
        app.log.error({ err: error }, "Database health check failed");
      }

      return {
        status: dbHealthy ? "ok" : "degraded",
        database: dbHealthy,
        timestamp: new Date().toISOString(),
      };
    }
  );

  return { app, sqlClient };
}

async function start() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const host = process.env.HOST || DEFAULT_HOST;

  try {
    const { app, sqlClient } = await createFastifyServer();

    app.addHook("onClose", async () => {
      await sqlClient.end({ timeout: 5 });
    });

    await app.listen({ port, host });
    app.log.info(`Fastify server listening on http://${host}:${port}`);
  } catch (error) {
    console.error("Failed to start Fastify server", error);
    process.exit(1);
  }
}

start();
