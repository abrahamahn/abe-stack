// shared/core/src/config/types/notification.ts
import { z } from 'zod';

/**
 * Zod schema for OneSignal notification configuration
 */
export const OneSignalSchema = z.object({
  restApiKey: z.string().min(1, 'ONESIGNAL_REST_API_KEY is required'),
  userAuthKey: z.string().min(1, 'ONESIGNAL_USER_AUTH_KEY is required'),
  appId: z.string().min(1, 'ONESIGNAL_APP_ID is required'),
  settings: z
    .object({
      enableLogging: z.boolean().optional(),
    })
    .optional(),
});

export type OneSignalConfig = z.infer<typeof OneSignalSchema>;

/**
 * Zod schema for Courier notification configuration
 */
export const CourierSchema = z.object({
  apiKey: z.string().min(1, 'COURIER_API_KEY is required'),
  apiUrl: z.string().optional(),
  settings: z
    .object({
      enableLogging: z.boolean().optional(),
    })
    .optional(),
});

export type CourierConfig = z.infer<typeof CourierSchema>;

/**
 * Zod schema for Knock notification configuration
 */
export const KnockSchema = z.object({
  secretKey: z.string().min(1, 'KNOCK_SECRET_KEY is required'),
  apiUrl: z.string().optional(),
  settings: z
    .object({
      enableLogging: z.boolean().optional(),
    })
    .optional(),
});

export type KnockConfig = z.infer<typeof KnockSchema>;

/**
 * Zod schema for Firebase Cloud Messaging (FCM) configuration
 */
export const FcmSchema = z.object({
  credentials: z.string().min(1, 'FCM_CREDENTIALS is required'),
  projectId: z.string().min(1, 'FCM_PROJECT_ID is required'),
});

export type FcmConfig = z.infer<typeof FcmSchema>;

/**
 * Zod schema for Amazon SNS configuration
 */
export const SnsSchema = z.object({
  accessKeyId: z.string().min(1, 'AWS_SNS_ACCESS_KEY_ID is required'),
  secretAccessKey: z.string().min(1, 'AWS_SNS_SECRET_ACCESS_KEY is required'),
  region: z.string().min(1, 'AWS_SNS_REGION is required').default('us-east-1'),
  topicArn: z.string().optional(),
});

export type SnsConfig = z.infer<typeof SnsSchema>;

/**
 * Zod schema for Braze configuration
 */
export const BrazeSchema = z.object({
  apiKey: z.string().min(1, 'BRAZE_API_KEY is required'),
  apiUrl: z.string().min(1, 'BRAZE_API_URL is required'),
  settings: z
    .object({
      enableLogging: z.boolean().optional(),
    })
    .optional(),
});

export type BrazeConfig = z.infer<typeof BrazeSchema>;

/**
 * Union type for all possible notification configurations
 */
export const NotificationProviderSchema = z.union([
  z.literal('onesignal'),
  z.literal('fcm'),
  z.literal('courier'),
  z.literal('generic'),
]);

export type NotificationProvider = z.infer<typeof NotificationProviderSchema>;

/**
 * Main notification configuration schema
 */
export const NotificationConfigSchema = z.object({
  enabled: z.boolean(),
  provider: NotificationProviderSchema,
  config: z.unknown(), // Will be validated separately based on provider
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

/**
 * Environment variable schema for notifications
 */
export const NotificationEnvSchema = z.object({
  // General
  NOTIFICATIONS_PROVIDER: NotificationProviderSchema.optional(),

  // OneSignal
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  ONESIGNAL_USER_AUTH_KEY: z.string().optional(),
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),

  // Courier
  COURIER_API_KEY: z.string().optional(),
  COURIER_API_URL: z.string().optional(),
  COURIER_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),

  // Knock
  KNOCK_SECRET_KEY: z.string().optional(),
  KNOCK_API_URL: z.string().optional(),
  KNOCK_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),

  // FCM
  FCM_CREDENTIALS: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),

  // SNS
  AWS_SNS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SNS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SNS_REGION: z.string().optional(),
  AWS_SNS_TOPIC_ARN: z.string().optional(),

  // Braze
  BRAZE_API_KEY: z.string().optional(),
  BRAZE_API_URL: z.string().optional(),
  BRAZE_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),
});

export type NotificationEnv = z.infer<typeof NotificationEnvSchema>;
