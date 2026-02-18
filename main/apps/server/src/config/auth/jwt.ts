// main/apps/server/src/config/auth/jwt.ts
import type { JwtRotationConfig } from '@bslt/shared/config';

/**
 * Load JWT Rotation Configuration.
 *
 * Supports key rotation by allowing a `previousSecret` to be configured.
 * This allows the server to Validate tokens signed with the OLD key,
 * while Signing new tokens with the NEW key/secret.
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

export const DEFAULT_JWT_ROTATION_CONFIG: JwtRotationConfig = {
  secret: '',
};
