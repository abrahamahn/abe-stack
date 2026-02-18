// main/shared/src/config/env.notification.ts
/**
 * Notification Environment Configuration
 *
 * Notification types, provider schemas, env interface, and validation schema.
 * Merged from config/types/services.ts (notification section),
 * config/types/notification.ts, and config/env.ts.
 *
 * @module config/env.notification
 */

import {
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * OneSignal push notification configuration.
 * Used for mobile and web push notifications.
 */
export interface OneSignalConfig {
  /** OneSignal REST API key */
  restApiKey: string;
  /** OneSignal user authentication key */
  userAuthKey: string;
  /** OneSignal app ID */
  appId: string;
  /** Optional: Additional settings */
  settings?:
    | {
        /** Whether to enable logging */
        enableLogging?: boolean | undefined;
      }
    | undefined;
}

/**
 * Courier push notification configuration.
 * Used for multi-channel notifications via Courier platform.
 */
export interface CourierConfig {
  /** Courier API key */
  apiKey: string;
  /** Courier API URL */
  apiUrl?: string | undefined;
  /** Optional: Additional settings */
  settings?:
    | {
        /** Whether to enable logging */
        enableLogging?: boolean | undefined;
      }
    | undefined;
}

/**
 * Knock push notification configuration.
 * Used for multi-channel notifications via Knock platform.
 */
export interface KnockConfig {
  /** Knock secret key */
  secretKey: string;
  /** Knock API URL */
  apiUrl?: string | undefined;
  /** Optional: Additional settings */
  settings?:
    | {
        /** Whether to enable logging */
        enableLogging?: boolean | undefined;
      }
    | undefined;
}

/**
 * Firebase Cloud Messaging (FCM) configuration.
 * Used for mobile and web push notifications.
 */
export interface FcmConfig {
  /** Service account credentials JSON (stringified) */
  credentials: string;
  /** Firebase project ID */
  projectId: string;
}

/**
 * Amazon SNS configuration.
 * Used for high-volume push notifications.
 */
export interface SnsConfig {
  /** AWS Access Key ID */
  accessKeyId: string;
  /** AWS Secret Access Key */
  secretAccessKey: string;
  /** AWS Region */
  region: string;
  /** SNS Topic ARN (optional) */
  topicArn?: string | undefined;
}

/**
 * Braze configuration.
 * Used for marketing and engagement notifications.
 */
export interface BrazeConfig {
  /** Braze API key */
  apiKey: string;
  /** Braze API URL */
  apiUrl: string;
  /** Optional: Additional settings */
  settings?:
    | {
        /** Whether to enable logging */
        enableLogging?: boolean | undefined;
      }
    | undefined;
}

/**
 * Generic push notification configuration.
 * Used for custom notification implementations.
 */
export interface GenericNotificationConfig {
  /** Provider-specific configuration */
  [key: string]: unknown;
}

/** Push notification provider type. */
export type NotificationProvider =
  | 'onesignal'
  | 'courier'
  | 'knock'
  | 'fcm'
  | 'sns'
  | 'braze'
  | 'generic';

/** Union type for all possible notification configurations. */
export type NotificationProviderConfig =
  | { provider: 'onesignal'; config: OneSignalConfig }
  | { provider: 'courier'; config: CourierConfig }
  | { provider: 'knock'; config: KnockConfig }
  | { provider: 'fcm'; config: FcmConfig }
  | { provider: 'sns'; config: SnsConfig }
  | { provider: 'braze'; config: BrazeConfig }
  | { provider: 'generic'; config: GenericNotificationConfig };

/**
 * Push notifications configuration.
 * Supports multiple providers for flexibility.
 */
export interface NotificationConfig {
  /** Enable push notifications */
  enabled: boolean;
  /** Active push notification provider */
  provider: NotificationProvider;
  /** Provider-specific configuration */
  config:
    | OneSignalConfig
    | CourierConfig
    | KnockConfig
    | FcmConfig
    | SnsConfig
    | BrazeConfig
    | GenericNotificationConfig;
}

// ============================================================================
// Provider Config Schemas
// ============================================================================

export const OneSignalSchema: Schema<OneSignalConfig> = createSchema<OneSignalConfig>(
  (data: unknown) => {
    const obj = parseObject(data, 'OneSignalConfig');
    return {
      restApiKey: parseString(obj['restApiKey'], 'restApiKey', { min: 1 }),
      userAuthKey: parseString(obj['userAuthKey'], 'userAuthKey', { min: 1 }),
      appId: parseString(obj['appId'], 'appId', { min: 1 }),
      settings: parseOptional(obj['settings'], (v) => {
        const s = parseObject(v, 'settings');
        return {
          enableLogging: parseOptional(s['enableLogging'], (val) =>
            parseBoolean(val, 'enableLogging'),
          ),
        };
      }),
    };
  },
);

export const CourierSchema: Schema<CourierConfig> = createSchema<CourierConfig>((data: unknown) => {
  const obj = parseObject(data, 'CourierConfig');
  return {
    apiKey: parseString(obj['apiKey'], 'apiKey', { min: 1 }),
    apiUrl: parseOptional(obj['apiUrl'], (v) => parseString(v, 'apiUrl')),
    settings: parseOptional(obj['settings'], (v) => {
      const s = parseObject(v, 'settings');
      return {
        enableLogging: parseOptional(s['enableLogging'], (val) =>
          parseBoolean(val, 'enableLogging'),
        ),
      };
    }),
  };
});

export const KnockSchema: Schema<KnockConfig> = createSchema<KnockConfig>((data: unknown) => {
  const obj = parseObject(data, 'KnockConfig');
  return {
    secretKey: parseString(obj['secretKey'], 'secretKey', { min: 1 }),
    apiUrl: parseOptional(obj['apiUrl'], (v) => parseString(v, 'apiUrl')),
    settings: parseOptional(obj['settings'], (v) => {
      const s = parseObject(v, 'settings');
      return {
        enableLogging: parseOptional(s['enableLogging'], (val) =>
          parseBoolean(val, 'enableLogging'),
        ),
      };
    }),
  };
});

export const FcmSchema: Schema<FcmConfig> = createSchema<FcmConfig>((data: unknown) => {
  const obj = parseObject(data, 'FcmConfig');
  return {
    credentials: parseString(obj['credentials'], 'credentials', { min: 1 }),
    projectId: parseString(obj['projectId'], 'projectId', { min: 1 }),
  };
});

export const SnsSchema: Schema<SnsConfig> = createSchema<SnsConfig>((data: unknown) => {
  const obj = parseObject(data, 'SnsConfig');
  return {
    accessKeyId: parseString(obj['accessKeyId'], 'accessKeyId', { min: 1 }),
    secretAccessKey: parseString(obj['secretAccessKey'], 'secretAccessKey', { min: 1 }),
    region: parseString(withDefault(obj['region'], 'us-east-1'), 'region', { min: 1 }),
    topicArn: parseOptional(obj['topicArn'], (v) => parseString(v, 'topicArn')),
  };
});

export const BrazeSchema: Schema<BrazeConfig> = createSchema<BrazeConfig>((data: unknown) => {
  const obj = parseObject(data, 'BrazeConfig');
  return {
    apiKey: parseString(obj['apiKey'], 'apiKey', { min: 1 }),
    apiUrl: parseString(obj['apiUrl'], 'apiUrl', { min: 1 }),
    settings: parseOptional(obj['settings'], (v) => {
      const s = parseObject(v, 'settings');
      return {
        enableLogging: parseOptional(s['enableLogging'], (val) =>
          parseBoolean(val, 'enableLogging'),
        ),
      };
    }),
  };
});

// ============================================================================
// Notification Provider Schema
// ============================================================================

/** Valid notification provider values for schema-level validation */
const NOTIFICATION_SCHEMA_PROVIDERS = ['onesignal', 'fcm', 'courier', 'generic'] as const;

export type NotificationSchemaProvider = (typeof NOTIFICATION_SCHEMA_PROVIDERS)[number];

export const NotificationProviderSchema: Schema<NotificationSchemaProvider> =
  createEnumSchema<NotificationSchemaProvider>(
    NOTIFICATION_SCHEMA_PROVIDERS,
    'NOTIFICATIONS_PROVIDER',
  );

// ============================================================================
// Notification Config Schema
// ============================================================================

/** Validated notification configuration shape. */
export interface NotificationConfigValidated {
  enabled: boolean;
  provider: NotificationSchemaProvider;
  config: unknown;
}

export const NotificationConfigSchema: Schema<NotificationConfigValidated> =
  createSchema<NotificationConfigValidated>((data: unknown) => {
    const obj = parseObject(data, 'NotificationConfig');
    return {
      enabled: parseBoolean(obj['enabled'], 'enabled'),
      provider: NotificationProviderSchema.parse(obj['provider']),
      config: obj['config'],
    };
  });

// ============================================================================
// Env Interface
// ============================================================================

/** Valid notification env provider values (superset including all providers) */
const NOTIFICATION_ENV_PROVIDERS = [
  'onesignal',
  'fcm',
  'courier',
  'knock',
  'sns',
  'braze',
  'generic',
] as const;

type NotificationEnvProvider = (typeof NOTIFICATION_ENV_PROVIDERS)[number];

/** Parsed notification environment variables. */
export interface NotificationEnv {
  NOTIFICATIONS_PROVIDER?: NotificationEnvProvider | undefined;
  ONESIGNAL_REST_API_KEY?: string | undefined;
  ONESIGNAL_USER_AUTH_KEY?: string | undefined;
  ONESIGNAL_APP_ID?: string | undefined;
  ONESIGNAL_ENABLE_LOGGING?: 'true' | 'false' | undefined;
  COURIER_API_KEY?: string | undefined;
  COURIER_API_URL?: string | undefined;
  COURIER_ENABLE_LOGGING?: 'true' | 'false' | undefined;
  KNOCK_SECRET_KEY?: string | undefined;
  KNOCK_API_URL?: string | undefined;
  KNOCK_ENABLE_LOGGING?: 'true' | 'false' | undefined;
  FCM_CREDENTIALS?: string | undefined;
  FCM_PROJECT_ID?: string | undefined;
  AWS_SNS_ACCESS_KEY_ID?: string | undefined;
  AWS_SNS_SECRET_ACCESS_KEY?: string | undefined;
  AWS_SNS_REGION?: string | undefined;
  AWS_SNS_TOPIC_ARN?: string | undefined;
  BRAZE_API_KEY?: string | undefined;
  BRAZE_API_URL?: string | undefined;
  BRAZE_ENABLE_LOGGING?: 'true' | 'false' | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

/**
 * Schema for notification environment variables.
 * All fields are optional since the notification system is opt-in.
 */
export const NotificationEnvSchema: Schema<NotificationEnv> = createSchema<NotificationEnv>(
  (data: unknown) => {
    const obj = parseObject(data, 'NotificationEnv');
    return {
      NOTIFICATIONS_PROVIDER: parseOptional(obj['NOTIFICATIONS_PROVIDER'], (v) =>
        createEnumSchema<NotificationEnvProvider>(
          NOTIFICATION_ENV_PROVIDERS,
          'NOTIFICATIONS_PROVIDER',
        ).parse(v),
      ),
      ONESIGNAL_REST_API_KEY: parseOptional(obj['ONESIGNAL_REST_API_KEY'], (v) =>
        parseString(v, 'ONESIGNAL_REST_API_KEY'),
      ),
      ONESIGNAL_USER_AUTH_KEY: parseOptional(obj['ONESIGNAL_USER_AUTH_KEY'], (v) =>
        parseString(v, 'ONESIGNAL_USER_AUTH_KEY'),
      ),
      ONESIGNAL_APP_ID: parseOptional(obj['ONESIGNAL_APP_ID'], (v) =>
        parseString(v, 'ONESIGNAL_APP_ID'),
      ),
      ONESIGNAL_ENABLE_LOGGING: parseOptional(obj['ONESIGNAL_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
      COURIER_API_KEY: parseOptional(obj['COURIER_API_KEY'], (v) =>
        parseString(v, 'COURIER_API_KEY'),
      ),
      COURIER_API_URL: parseOptional(obj['COURIER_API_URL'], (v) =>
        parseString(v, 'COURIER_API_URL'),
      ),
      COURIER_ENABLE_LOGGING: parseOptional(obj['COURIER_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
      KNOCK_SECRET_KEY: parseOptional(obj['KNOCK_SECRET_KEY'], (v) =>
        parseString(v, 'KNOCK_SECRET_KEY'),
      ),
      KNOCK_API_URL: parseOptional(obj['KNOCK_API_URL'], (v) => parseString(v, 'KNOCK_API_URL')),
      KNOCK_ENABLE_LOGGING: parseOptional(obj['KNOCK_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
      FCM_CREDENTIALS: parseOptional(obj['FCM_CREDENTIALS'], (v) =>
        parseString(v, 'FCM_CREDENTIALS'),
      ),
      FCM_PROJECT_ID: parseOptional(obj['FCM_PROJECT_ID'], (v) => parseString(v, 'FCM_PROJECT_ID')),
      AWS_SNS_ACCESS_KEY_ID: parseOptional(obj['AWS_SNS_ACCESS_KEY_ID'], (v) =>
        parseString(v, 'AWS_SNS_ACCESS_KEY_ID'),
      ),
      AWS_SNS_SECRET_ACCESS_KEY: parseOptional(obj['AWS_SNS_SECRET_ACCESS_KEY'], (v) =>
        parseString(v, 'AWS_SNS_SECRET_ACCESS_KEY'),
      ),
      AWS_SNS_REGION: parseOptional(obj['AWS_SNS_REGION'], (v) => parseString(v, 'AWS_SNS_REGION')),
      AWS_SNS_TOPIC_ARN: parseOptional(obj['AWS_SNS_TOPIC_ARN'], (v) =>
        parseString(v, 'AWS_SNS_TOPIC_ARN'),
      ),
      BRAZE_API_KEY: parseOptional(obj['BRAZE_API_KEY'], (v) => parseString(v, 'BRAZE_API_KEY')),
      BRAZE_API_URL: parseOptional(obj['BRAZE_API_URL'], (v) => parseString(v, 'BRAZE_API_URL')),
      BRAZE_ENABLE_LOGGING: parseOptional(obj['BRAZE_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
    };
  },
);
