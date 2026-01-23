// apps/server/src/config/services/notifications.ts
import type { FcmConfig } from '@abe-stack/core/contracts/config';

/**
 * Loads Firebase Cloud Messaging (FCM) configuration from environment variables.
 *
 * FCM credentials should be the stringified JSON of your Firebase service account.
 * Get this from: Firebase Console → Project Settings → Service Accounts → Generate Key.
 *
 * @param env - Environment variable map
 * @returns FCM configuration (credentials as string, parsed by infrastructure layer)
 *
 * @example
 * ```env
 * FCM_PROJECT_ID=my-firebase-project
 * FCM_CREDENTIALS={"type":"service_account",...}
 * ```
 */
export function loadFcmConfig(env: Record<string, string | undefined>): FcmConfig {
  const credentials = env.FCM_CREDENTIALS || '';

  return {
    // We keep it as a string here; the Infrastructure layer will parse it
    credentials,
    projectId: env.FCM_PROJECT_ID || '',
  };
}

/**
 * Validates FCM configuration for production readiness.
 *
 * Only validates if notifications appear to be enabled (projectId or credentials present).
 * Checks that both required fields are provided and credentials are valid JSON.
 *
 * @param config - FCM configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateFcmConfig(config: FcmConfig): string[] {
  const errors: string[] = [];

  // Only validate if a project ID is provided (implying the user wants notifications)
  if (config.projectId || config.credentials) {
    if (!config.projectId) errors.push('FCM_PROJECT_ID is missing');
    if (!config.credentials) errors.push('FCM_CREDENTIALS (JSON string) is missing');

    // Quick sanity check for JSON format
    if (config.credentials && !config.credentials.trim().startsWith('{')) {
      errors.push('FCM_CREDENTIALS must be a valid JSON string');
    }
  }

  return errors;
}

export const DEFAULT_FCM_CONFIG: FcmConfig = {
  credentials: '',
  projectId: '',
};
