import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  PORT: z.coerce.number().default(8080),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadServerEnv(raw: Record<string, unknown>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid server environment variables", parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}
