import { z } from 'zod';

/**
 * Comprehensive environment variable schema for server configuration
 * Validates all required and optional environment variables with proper types
 */
export const serverEnvSchema = z
  .object({
    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database Configuration
    POSTGRES_HOST: z.string().default('localhost'),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_DB: z.string().min(1, 'Database name is required'),
    POSTGRES_USER: z.string().min(1, 'Database user is required'),
    POSTGRES_PASSWORD: z.string().min(1, 'Database password is required'),
    DATABASE_URL: z.string().url().optional(),

    // Redis Configuration
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_URL: z.string().url().optional(),

    // Application Ports
    API_PORT: z.coerce.number().default(8080),
    APP_PORT: z.coerce.number().default(3000),
    PORT: z.coerce.number().default(8080),

    // Security - JWT & Sessions
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters for security'),

    // Optional External Services
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),

    // Host configuration
    HOST: z.string().default('0.0.0.0'),
  })
  .transform((env) => ({
    ...env,
    // Auto-construct DATABASE_URL if not provided
    DATABASE_URL:
      env.DATABASE_URL ||
      `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${String(env.POSTGRES_PORT)}/${env.POSTGRES_DB}`,

    REDIS_URL: env.REDIS_URL || `redis://${env.REDIS_HOST}:${String(env.REDIS_PORT)}`,
  }))
  .refine(
    (env) => {
      // In production, ensure secrets are not defaults
      if (env.NODE_ENV === 'production') {
        return !env.JWT_SECRET.includes('dev_') && !env.SESSION_SECRET.includes('dev_');
      }
      return true;
    },
    {
      message:
        'Production environment detected: JWT_SECRET and SESSION_SECRET must not use development values',
    },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Load and validate server environment variables
 * @param raw - Raw environment object (typically process.env)
 * @returns Validated and typed environment configuration
 * @throws Exits process with error code 1 if validation fails
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
