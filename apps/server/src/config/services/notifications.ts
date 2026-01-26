// apps/server/src/config/services/notifications.ts
import type {
    CourierConfig,
    FcmConfig,
    FullEnv,
    NotificationConfig,
    NotificationProvider,
    OneSignalConfig,
} from '@abe-stack/core/config';

/**
 * Load Push Notification Configuration.
 *
 * **Supported Providers**:
 * - **OneSignal** (Recommended Default)
 * - **FCM** (Firebase Cloud Messaging)
 * - **Courier** (Multi-channel orchestration)
 * - **Generic** (For custom webhooks)
 *
 * Notifications are disabled if no valid provider credentials are found.
 *
 * @param env - Environment variable map
 * @returns Complete notification configuration
 *
 * @example OneSignal
 * ```env
 * NOTIFICATIONS_PROVIDER=onesignal
 * ONESIGNAL_REST_API_KEY=your-rest-api-key
 * ONESIGNAL_USER_AUTH_KEY=your-user-auth-key
 * ONESIGNAL_APP_ID=your-app-id
 * ```
 *
 * @example Courier
 * ```env
 * NOTIFICATIONS_PROVIDER=courier
 * COURIER_API_KEY=your-api-key
 * ```
 *
 * @example Knock
 * ```env
 * NOTIFICATIONS_PROVIDER=knock
 * KNOCK_SECRET_KEY=your-secret-key
 * ```
 *
 * @example FCM
 * ```env
 * NOTIFICATIONS_PROVIDER=fcm
 * FCM_PROJECT_ID=your-project-id
 * FCM_CREDENTIALS=your-service-account-json
 * ```
 *
 * @example SNS
 * ```env
 * NOTIFICATIONS_PROVIDER=sns
 * AWS_SNS_ACCESS_KEY_ID=your-access-key
 * AWS_SNS_SECRET_ACCESS_KEY=your-secret-key
 * AWS_SNS_REGION=us-east-1
 * ```
 *
 * @example Braze
 * ```env
 * NOTIFICATIONS_PROVIDER=braze
 * BRAZE_API_KEY=your-api-key
 * BRAZE_API_URL=https://rest.iad-01.braze.com
 * ```
 */
export function loadNotificationsConfig(env: FullEnv): NotificationConfig {
  // Check which provider keys are present
  const availability = {
    onesignal: (env.ONESIGNAL_REST_API_KEY != null && env.ONESIGNAL_REST_API_KEY !== '') && (env.ONESIGNAL_USER_AUTH_KEY != null && env.ONESIGNAL_USER_AUTH_KEY !== '') && (env.ONESIGNAL_APP_ID != null && env.ONESIGNAL_APP_ID !== ''),
    fcm: (env.FCM_PROJECT_ID != null && env.FCM_PROJECT_ID !== '') && (env.FCM_CREDENTIALS != null && env.FCM_CREDENTIALS !== ''),
    courier: (env.COURIER_API_KEY != null && env.COURIER_API_KEY !== ''),
  };

  // Resolve active provider (Explicit Choice > OneSignal > FCM > Courier)
  const provider = resolveActiveProvider(
    env.NOTIFICATIONS_PROVIDER as NotificationProvider | undefined,
    availability,
  );

  // Determine if notifications should be enabled based on valid credentials
  const isEnabled = Boolean(provider);

  // Build configuration based on what provider would be used (even if not enabled due to missing credentials)
  const effectiveProvider = provider ?? 'onesignal'; // Default to onesignal

  const config: NotificationConfig = {
    enabled: isEnabled,
    provider: effectiveProvider,
    config: {},
  };

  // Always build the config structure based on the provider that would be used,
  // regardless of whether it's enabled (to support partial configs)
  switch (effectiveProvider) {
    case 'onesignal':
      config.config = {
        restApiKey: env.ONESIGNAL_REST_API_KEY ?? '',
        userAuthKey: env.ONESIGNAL_USER_AUTH_KEY ?? '',
        appId: env.ONESIGNAL_APP_ID ?? '',
        settings: {
          enableLogging: env.ONESIGNAL_ENABLE_LOGGING === 'true',
        },
      };
      break;

    case 'fcm':
      config.config = {
        credentials: env.FCM_CREDENTIALS ?? '',
        projectId: env.FCM_PROJECT_ID ?? '',
      };
      break;

    case 'courier':
      config.config = {
        apiKey: env.COURIER_API_KEY ?? '',
        apiUrl: env.COURIER_API_URL ?? 'https://api.courier.com',
        settings: {
          enableLogging: env.COURIER_ENABLE_LOGGING === 'true',
        },
      };
      break;

    case 'generic':
    default:
      config.config = {};
      break;
  }

  if (config.enabled) {
    ensureValid(config);
  }

  return config;
}

function resolveActiveProvider(
  explicit: NotificationProvider | undefined,
  avail: { onesignal: boolean; fcm: boolean; courier: boolean },
): NotificationProvider | null {
  if (explicit === 'onesignal' && avail.onesignal) return 'onesignal';
  if (explicit === 'fcm' && avail.fcm) return 'fcm';
  if (explicit === 'courier' && avail.courier) return 'courier';
  if (explicit === 'generic') return 'generic';

  // Auto-detection logic if no explicit provider is set
  if (!explicit) {
    if (avail.onesignal) return 'onesignal';
    if (avail.fcm) return 'fcm';
    if (avail.courier) return 'courier';
  }
  return null;
}

/**
 * Validates notification configuration for production readiness.
 *
 * @param config - Notification configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateNotificationsConfig(config: NotificationConfig): string[] {
  const errors: string[] = [];

  // Only validate if notifications are enabled
  if (config.enabled) {
    switch (config.provider) {
      case 'onesignal': {
        const onesignal = config.config as OneSignalConfig;
        if (!onesignal.restApiKey) errors.push('restApiKey: Required');
        if (!onesignal.userAuthKey) errors.push('userAuthKey: Required');
        if (!onesignal.appId) errors.push('appId: Required');
        break;
      }

      case 'fcm': {
        const fcm = config.config as FcmConfig;
        if (!fcm.credentials) errors.push('credentials: Required');
        if (!fcm.projectId) errors.push('projectId: Required');
        break;
      }

      case 'courier': {
        const courier = config.config as CourierConfig;
        if (!courier.apiKey) errors.push('apiKey: Required');
        break;
      }

      case 'generic':
        // No validation for generic provider
        break;
    }
  }

  return errors;
}

function ensureValid(config: NotificationConfig): void {
  const errors = validateNotificationsConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Notification Configuration Failed:\n${errors.map((e) => ` - ${e}`).join('\n')}`,
    );
  }
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: false,
  provider: 'onesignal',
  config: {
    restApiKey: '',
    userAuthKey: '',
    appId: '',
    settings: {
      enableLogging: false,
    },
  },
};
