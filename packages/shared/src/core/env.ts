/**
 * Environment Configuration Utilities
 *
 * Zod-based validation for environment variables.
 * Provides a single point of failure at startup if .env is misconfigured.
 */

import { z } from 'zod';

import { ConfigurationError } from '../core/errors';

/**
 * Base schema for commonly used environment variables.
 * Includes standard NODE_ENV and public keys.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/**
 * Helper to get raw environment variables.
 * Can be overridden if the runtime doesn't use process.env (e.g. Cloudflare Workers).
 */
export function getRawEnv(): Record<string, string | undefined> {
  return typeof process !== 'undefined' ? process.env : {};
}

/**
 * Validates environment variables against a Zod schema.
 *
 * @param schema - Zod schema to validate against
 * @returns Validated environment object
 * @throws ConfigurationError if validation fails
 */
export function validateEnv<T extends z.ZodSchema>(schema: T): z.infer<T> {
  const result = schema.safeParse(getRawEnv());

  if (!result.success) {
    const error = result.error.errors[0];
    if (error === undefined) {
      throw new ConfigurationError('unknown', 'Unknown environment validation error');
    }
    const path = error.path.join('_');
    const message = `Environment validation failed: ${path} - ${error.message}`;
    throw new ConfigurationError(path, message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.data as z.infer<T>;
}
