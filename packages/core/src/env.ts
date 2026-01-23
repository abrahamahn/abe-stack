// packages/core/src/env.ts
/**
 * Environment Variable Validation
 *
 * Comprehensive environment variable validation for server configuration.
 * Validates all required and optional environment variables with proper types.
 */

// ============================================================================
// Types
// ============================================================================

export interface ServerEnv {
  // Node Environment
  NODE_ENV: 'development' | 'production' | 'test';

  // Database Configuration
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  DATABASE_URL: string;

  // Application Ports
  API_PORT: number;
  APP_PORT: number;
  PORT: number;

  // Security - JWT & Sessions
  JWT_SECRET: string;
  SESSION_SECRET: string;

  // Optional External Services
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  SENDGRID_API_KEY?: string;

  // Host configuration
  HOST: string;

  // Email Configuration
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_PROVIDER: 'console' | 'smtp';
  EMAIL_FROM_NAME: string;
  EMAIL_FROM_ADDRESS?: string;

  // Storage
  STORAGE_PROVIDER: 'local' | 's3';
  STORAGE_ROOT_PATH: string;
  STORAGE_PUBLIC_BASE_URL?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_PRESIGN_EXPIRES_IN_SECONDS?: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

function getString(
  obj: Record<string, unknown>,
  key: string,
  defaultValue?: string,
): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error(`${key} must be a string, number, or boolean`);
}

function getRequiredString(obj: Record<string, unknown>, key: string, minLength = 1): string {
  const value = getString(obj, key);
  if (value === undefined || value.length < minLength) {
    throw new Error(`${key} is required and must be at least ${String(minLength)} characters`);
  }
  return value;
}

function getNumber(obj: Record<string, unknown>, key: string, defaultValue: number): number {
  const value = obj[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${key} must be a valid number`);
  }
  return num;
}

function getBoolean(obj: Record<string, unknown>, key: string, defaultValue: boolean): boolean {
  const value = obj[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === true;
}

function getEnum<T extends string>(
  obj: Record<string, unknown>,
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  const value = getString(obj, key, defaultValue);
  if (value === undefined) {
    return defaultValue;
  }
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${key} must be one of: ${allowedValues.join(', ')}`);
  }
  return value as T;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Schema Definition
// ============================================================================

interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

interface SafeParseError {
  success: false;
  error: Error;
}

type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export const serverEnvSchema = {
  parse(raw: Record<string, unknown>): ServerEnv {
    // Node Environment
    const NODE_ENV = getEnum(raw, 'NODE_ENV', ['development', 'production', 'test'], 'development');

    // Database Configuration
    const POSTGRES_HOST = getString(raw, 'POSTGRES_HOST', 'localhost') ?? 'localhost';
    const POSTGRES_PORT = getNumber(raw, 'POSTGRES_PORT', 5432);
    const POSTGRES_DB = getRequiredString(raw, 'POSTGRES_DB');
    const POSTGRES_USER = getRequiredString(raw, 'POSTGRES_USER');
    const POSTGRES_PASSWORD = getRequiredString(raw, 'POSTGRES_PASSWORD');

    // Application Ports
    const API_PORT = getNumber(raw, 'API_PORT', 8080);
    const APP_PORT = getNumber(raw, 'APP_PORT', 3000);
    const PORT = getNumber(raw, 'PORT', 8080);

    // Security - JWT & Sessions
    const JWT_SECRET = getRequiredString(raw, 'JWT_SECRET', 32);
    const SESSION_SECRET = getRequiredString(raw, 'SESSION_SECRET', 32);

    // Optional External Services
    const AWS_ACCESS_KEY_ID = getString(raw, 'AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = getString(raw, 'AWS_SECRET_ACCESS_KEY');
    const STRIPE_SECRET_KEY = getString(raw, 'STRIPE_SECRET_KEY');
    const SENDGRID_API_KEY = getString(raw, 'SENDGRID_API_KEY');

    // Host configuration
    const HOST = getString(raw, 'HOST', '0.0.0.0') ?? '0.0.0.0';

    // Email Configuration
    const SMTP_HOST = getString(raw, 'SMTP_HOST');
    const SMTP_PORT = getNumber(raw, 'SMTP_PORT', 587);
    const SMTP_SECURE = getBoolean(raw, 'SMTP_SECURE', false);
    const SMTP_USER = getString(raw, 'SMTP_USER');
    const SMTP_PASS = getString(raw, 'SMTP_PASS');
    const EMAIL_PROVIDER = getEnum(raw, 'EMAIL_PROVIDER', ['console', 'smtp'], 'console');
    const EMAIL_FROM_NAME = getString(raw, 'EMAIL_FROM_NAME', 'ABE Stack') ?? 'ABE Stack';
    const EMAIL_FROM_ADDRESS = getString(raw, 'EMAIL_FROM_ADDRESS');

    // Storage
    const STORAGE_PROVIDER = getEnum(raw, 'STORAGE_PROVIDER', ['local', 's3'], 'local');
    const STORAGE_ROOT_PATH = getString(raw, 'STORAGE_ROOT_PATH', './uploads') ?? './uploads';
    const STORAGE_PUBLIC_BASE_URL = getString(raw, 'STORAGE_PUBLIC_BASE_URL');
    const S3_BUCKET = getString(raw, 'S3_BUCKET');
    const S3_REGION = getString(raw, 'S3_REGION');
    const S3_ACCESS_KEY_ID = getString(raw, 'S3_ACCESS_KEY_ID');
    const S3_SECRET_ACCESS_KEY = getString(raw, 'S3_SECRET_ACCESS_KEY');
    const S3_ENDPOINT = getString(raw, 'S3_ENDPOINT');
    const S3_FORCE_PATH_STYLE = getBoolean(raw, 'S3_FORCE_PATH_STYLE', false);
    const S3_PRESIGN_EXPIRES_IN_SECONDS_RAW = getString(raw, 'S3_PRESIGN_EXPIRES_IN_SECONDS');
    const S3_PRESIGN_EXPIRES_IN_SECONDS = S3_PRESIGN_EXPIRES_IN_SECONDS_RAW
      ? Number(S3_PRESIGN_EXPIRES_IN_SECONDS_RAW)
      : undefined;

    // Auto-construct DATABASE_URL if not provided
    let DATABASE_URL = getString(raw, 'DATABASE_URL');
    if (!DATABASE_URL) {
      DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${String(POSTGRES_PORT)}/${POSTGRES_DB}`;
    }

    // Validate DATABASE_URL is a valid URL
    if (!isValidUrl(DATABASE_URL)) {
      throw new Error('DATABASE_URL must be a valid URL');
    }

    // Production validation
    if (NODE_ENV === 'production') {
      if (JWT_SECRET.includes('dev_') || SESSION_SECRET.includes('dev_')) {
        throw new Error(
          'Production environment detected: JWT_SECRET and SESSION_SECRET must not use development values',
        );
      }
    }

    return {
      NODE_ENV,
      POSTGRES_HOST,
      POSTGRES_PORT,
      POSTGRES_DB,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      DATABASE_URL,
      API_PORT,
      APP_PORT,
      PORT,
      JWT_SECRET,
      SESSION_SECRET,
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      STRIPE_SECRET_KEY,
      SENDGRID_API_KEY,
      HOST,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      EMAIL_PROVIDER,
      EMAIL_FROM_NAME,
      EMAIL_FROM_ADDRESS,
      STORAGE_PROVIDER,
      STORAGE_ROOT_PATH,
      STORAGE_PUBLIC_BASE_URL,
      S3_BUCKET,
      S3_REGION,
      S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY,
      S3_ENDPOINT,
      S3_FORCE_PATH_STYLE,
      S3_PRESIGN_EXPIRES_IN_SECONDS,
    };
  },

  safeParse(raw: Record<string, unknown>): SafeParseResult<ServerEnv> {
    try {
      const data = this.parse(raw);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
};

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

export function validateEnvironmentSafe(raw: Record<string, unknown>): SafeParseResult<ServerEnv> {
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
): (raw: Record<string, unknown>) => ServerEnv {
  return (raw: Record<string, unknown>) => schema.parse(raw);
}
