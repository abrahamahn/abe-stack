// packages/core/src/env/schema.ts
import { FullEnvSchema, type FullEnv } from '../contracts/config/environment';
import { initEnv } from './load';

// Re-export the schema for backward compatibility
export const serverEnvSchema = FullEnvSchema;
export const envSchema = FullEnvSchema;

/**
 * Validates the environment against the central Zod schema.
 * This is the "Gatekeeper" for the server.
 */
export function loadServerEnv(): FullEnv {
  // 1. Load the files into process.env
  initEnv();

  // 2. Validate using the existing Zod Contract
  const result = FullEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ ABE-STACK: Environment Validation Failed');

    // Log the full error message
    console.error(`   ↳ ${result.error.message}`);

    process.exit(1);
  }

  // 3. Production Sanity Checks (Domain Logic)
  const env = result.data;
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.length < 32) {
      console.error('❌ SECURITY RISK: JWT_SECRET must be 32+ chars in production.');
      process.exit(1);
    }
  }

  return env;
}

/**
 * Load and validate server environment variables
 * @param raw - Raw environment object (typically process.env)
 * @returns Validated and typed environment configuration
 * @throws Exits process with error code 1 if validation fails
 */
export function validateEnvironment(raw: Record<string, unknown> = process.env): FullEnv {
  const parsed = FullEnvSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('Environment Validation Failed:', parsed.error.message);
    process.exit(1);
  }
  return parsed.data;
}

export function validateEnvironmentSafe(
  raw: Record<string, unknown> = process.env,
): ReturnType<typeof FullEnvSchema.safeParse> {
  return FullEnvSchema.safeParse(raw);
}

export function validateDatabaseEnv(raw: Record<string, unknown> = process.env): FullEnv {
  return validateEnvironment(raw);
}

export function validateSecurityEnv(raw: Record<string, unknown> = process.env): FullEnv {
  return validateEnvironment(raw);
}

export function validateStorageEnv(raw: Record<string, unknown> = process.env): FullEnv {
  return validateEnvironment(raw);
}

export function validateEmailEnv(raw: Record<string, unknown> = process.env): FullEnv {
  return validateEnvironment(raw);
}

export function validateDevelopmentEnv(raw: Record<string, unknown> = process.env): FullEnv {
  const env = validateEnvironment(raw);
  if (env.NODE_ENV !== 'development') {
    throw new Error('NODE_ENV must be development');
  }
  return env;
}

export function validateProductionEnv(raw: Record<string, unknown> = process.env): FullEnv {
  const env = validateEnvironment(raw);
  if (env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV must be production');
  }
  return env;
}

export function getEnvValidator(
  schema: typeof FullEnvSchema = FullEnvSchema,
): (raw: Record<string, unknown>) => FullEnv {
  return (raw: Record<string, unknown>) => schema.parse(raw);
}

// Export the type for backward compatibility
export type { FullEnv as ServerEnv };
