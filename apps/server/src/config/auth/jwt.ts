import type { JwtRotationConfig } from '@abe-stack/core/contracts/config';

/**
 * Loads JWT configuration specifically for rotation-aware services.
 * This is used by the Auth logic but can be exported independently.
 */
export function loadJwtRotationConfig(env: Record<string, string | undefined>): JwtRotationConfig {
  const secret = env.JWT_SECRET || '';

  return {
    secret,
    // Key rotation support: Tokens signed with the previous secret
    // are still accepted but will be re-issued with the new secret.
    previousSecret: env.JWT_SECRET_PREVIOUS || undefined,
  };
}

export const DEFAULT_JWT_ROTATION_CONFIG: JwtRotationConfig = {
  secret: '',
  previousSecret: undefined,
};
