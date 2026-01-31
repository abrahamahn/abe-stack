// modules/auth/src/config/jwt.ts
/**
 * JWT Rotation Configuration
 *
 * Supports key rotation by allowing a `previousSecret` to be configured.
 * This allows the server to validate tokens signed with the OLD key,
 * while signing new tokens with the NEW key/secret.
 *
 * @module config/jwt
 */

import type { JwtRotationConfig } from '@abe-stack/core/config';

/**
 * Load JWT Rotation Configuration.
 *
 * Supports key rotation by allowing a `previousSecret` to be configured.
 * This allows the server to Validate tokens signed with the OLD key,
 * while Signing new tokens with the NEW key/secret.
 *
 * @param env - Environment variable record
 * @returns JWT rotation configuration
 * @complexity O(1)
 */
export function loadJwtRotationConfig(env: Record<string, string | undefined>): JwtRotationConfig {
  const secret = env['JWT_SECRET'] ?? '';
  const previousSecret = env['JWT_SECRET_PREVIOUS'];

  return {
    secret,
    // Key rotation support: Tokens signed with the previous secret
    // are still accepted but will be re-issued with the new secret.
    ...(previousSecret != null && previousSecret !== '' && { previousSecret }),
  };
}

/**
 * Default JWT rotation configuration with empty secret.
 * Should be overridden by environment-specific configuration.
 */
export const DEFAULT_JWT_ROTATION_CONFIG: JwtRotationConfig = {
  secret: '',
};
