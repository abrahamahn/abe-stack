// packages/core/src/env.ts
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

    // Email Configuration
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_PROVIDER: z.enum(['console', 'smtp']).optional().default('console'),
    EMAIL_FROM_NAME: z.string().optional().default('ABE Stack'),
    EMAIL_FROM_ADDRESS: z.string().optional(),

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

export const envSchema = serverEnvSchema;

/**
 * Load and validate server environment variables
 * @param raw - Raw environment object (typically process.env)
 * @returns Validated and typed environment configuration
 * @throws Exits process with error code 1 if validation fails
 */
export function loadServerEnv(raw: Record<string, unknown>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    process.exit(1);
  }
  return parsed.data;
}

export function validateEnvironment(raw: Record<string, unknown>): ServerEnv {
  return envSchema.parse(raw);
}

export function validateEnvironmentSafe(
  raw: Record<string, unknown>,
): z.SafeParseReturnType<unknown, ServerEnv> {
  return envSchema.safeParse(raw);
}

export function validateDatabaseEnv(raw: Record<string, unknown>): ServerEnv {
  return validateEnvironment(raw);
}

export function validateSecurityEnv(raw: Record<string, unknown>): ServerEnv {
  return validateEnvironment(raw);
}

export function validateStorageEnv(raw: Record<string, unknown>): ServerEnv {
  return validateEnvironment(raw);
}

export function validateEmailEnv(raw: Record<string, unknown>): ServerEnv {
  return validateEnvironment(raw);
}

export function validateDevelopmentEnv(raw: Record<string, unknown>): ServerEnv {
  const env = validateEnvironment(raw);
  if (env.NODE_ENV !== 'development') {
    throw new Error('NODE_ENV must be development');
  }
  return env;
}

export function validateProductionEnv(raw: Record<string, unknown>): ServerEnv {
  const env = validateEnvironment(raw);
  if (env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV must be production');
  }
  return env;
}

export function getEnvValidator(
  schema: typeof envSchema = envSchema,
): (raw: z.input<typeof envSchema>) => ServerEnv {
  return (raw: z.input<typeof envSchema>) => schema.parse(raw);
}
