/**
 * Server Environment - Backend Only
 * Zod validation for all server-side env vars
 */
import { z } from 'zod';

export const serverEnvSchema = z
  .object({
    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    POSTGRES_HOST: z.string().default('localhost'),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_DB: z.string().min(1, 'Database name is required'),
    POSTGRES_USER: z.string().min(1, 'Database user is required'),
    POSTGRES_PASSWORD: z.string().min(1, 'Database password is required'),
    DATABASE_URL: z.string().url().optional(),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_URL: z.string().url().optional(),

    // Ports
    API_PORT: z.coerce.number().default(8080),
    APP_PORT: z.coerce.number().default(3000),
    PORT: z.coerce.number().default(8080),

    // Security
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

    // Host
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGIN: z.string().optional(),

    // Storage
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    STORAGE_ROOT_PATH: z.string().default('./uploads'),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    S3_PRESIGN_EXPIRES_IN_SECONDS: z.coerce.number().optional(),

    // Optional Services
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
  })
  .transform((env) => ({
    ...env,
    DATABASE_URL:
      env.DATABASE_URL ||
      `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${String(env.POSTGRES_PORT)}/${env.POSTGRES_DB}`,
    REDIS_URL: env.REDIS_URL || `redis://${env.REDIS_HOST}:${String(env.REDIS_PORT)}`,
  }))
  .refine(
    (env) => {
      if (env.NODE_ENV === 'production') {
        return !env.JWT_SECRET.includes('dev_') && !env.SESSION_SECRET.includes('dev_');
      }
      return true;
    },
    { message: 'Production: JWT_SECRET and SESSION_SECRET must not use dev values' },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Load and validate server environment
 * Call once at server startup
 */
export function loadServerEnv(raw: Record<string, unknown>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid server environment variables:');
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    // eslint-disable-next-line no-console
    console.error('\n💡 Tip: Check your .env files in the config/ directory');
    process.exit(1);
  }
  return parsed.data;
}
