// src/apps/server/src/config/services/notifications.test.ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NOTIFICATION_CONFIG,
  loadNotificationsConfig,
  validateNotificationsConfig,
} from './notifications';

import type { FullEnv, NotificationConfig, OneSignalConfig } from '@abe-stack/shared/config';

describe('Notifications Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {};
    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
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
    });
  });

  it('loads OneSignal configuration from environment variables', () => {
    const env = {
      ONESIGNAL_REST_API_KEY: 'rest-api-key-123',
      ONESIGNAL_USER_AUTH_KEY: 'user-auth-key-456',
      ONESIGNAL_APP_ID: 'app-id-789',
      ONESIGNAL_ENABLE_LOGGING: 'true',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
      enabled: true,
      provider: 'onesignal',
      config: {
        restApiKey: 'rest-api-key-123',
        userAuthKey: 'user-auth-key-456',
        appId: 'app-id-789',
        settings: {
          enableLogging: true,
        },
      },
    });
  });

  it('loads Courier configuration from environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'courier',
      COURIER_API_KEY: 'courier-api-key-123',
      COURIER_API_URL: 'https://custom-api.courier.com',
      COURIER_ENABLE_LOGGING: 'true',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
      enabled: true,
      provider: 'courier',
      config: {
        apiKey: 'courier-api-key-123',
        apiUrl: 'https://custom-api.courier.com',
        settings: {
          enableLogging: true,
        },
      },
    });
  });

  it('loads FCM configuration from environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'fcm',
      FCM_PROJECT_ID: 'my-firebase-project',
      FCM_CREDENTIALS: '{"type":"service_account","project_id":"my-firebase-project"}',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
      enabled: true,
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account","project_id":"my-firebase-project"}',
        projectId: 'my-firebase-project',
      },
    });
  });

  it('loads FCM configuration from environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'fcm',
      FCM_PROJECT_ID: 'my-firebase-project',
      FCM_CREDENTIALS: '{"type":"service_account","project_id":"my-firebase-project"}',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
      enabled: true,
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account","project_id":"my-firebase-project"}',
        projectId: 'my-firebase-project',
      },
    });
  });

  it('loads Courier configuration from environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'courier',
      COURIER_API_KEY: 'courier-api-key-123',
      COURIER_API_URL: 'https://custom-api.courier.com',
      COURIER_ENABLE_LOGGING: 'true',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config).toEqual({
      enabled: true,
      provider: 'courier',
      config: {
        apiKey: 'courier-api-key-123',
        apiUrl: 'https://custom-api.courier.com',
        settings: {
          enableLogging: true,
        },
      },
    });
  });

  it('prefers explicitly set notification provider', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'courier',
      ONESIGNAL_REST_API_KEY: 'rest-api-key-123',
      ONESIGNAL_USER_AUTH_KEY: 'user-auth-key-456',
      ONESIGNAL_APP_ID: 'app-id-789',
      COURIER_API_KEY: 'courier-api-key-456',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('courier'); // Should respect explicit setting
  });

  it('defaults to onesignal when multiple providers are available but no explicit provider is set', () => {
    const env = {
      ONESIGNAL_REST_API_KEY: 'rest-api-key-123',
      ONESIGNAL_USER_AUTH_KEY: 'user-auth-key-456',
      ONESIGNAL_APP_ID: 'app-id-789',
      COURIER_API_KEY: 'courier-api-key-456',
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('onesignal'); // OneSignal has priority
  });

  it('does not enable notifications when partial OneSignal configuration is provided', () => {
    const env = {
      ONESIGNAL_REST_API_KEY: 'rest-api-key-123',
      ONESIGNAL_USER_AUTH_KEY: 'user-auth-key-456',
      // ONESIGNAL_APP_ID is missing
    };

    const config = loadNotificationsConfig(env as unknown as FullEnv);

    expect(config.enabled).toBe(false);
    expect(config.provider).toBe('onesignal');
    const onesignal = config.config as OneSignalConfig;
    expect(onesignal.restApiKey).toBe('rest-api-key-123');
    expect(onesignal.userAuthKey).toBe('user-auth-key-456');
    expect(onesignal.appId).toBe(''); // Will be empty string
  });

  it('validateNotificationsConfig returns no errors for valid OneSignal configuration', () => {
    const config = {
      enabled: true,
      provider: 'onesignal',
      config: {
        restApiKey: 'rest-api-key-123',
        userAuthKey: 'user-auth-key-456',
        appId: 'app-id-789',
        settings: {
          enableLogging: true,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns no errors for valid Courier configuration', () => {
    const config = {
      enabled: true,
      provider: 'courier',
      config: {
        apiKey: 'courier-api-key-123',
        apiUrl: 'https://api.courier.com',
        settings: {
          enableLogging: true,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns no errors for valid Knock configuration', () => {
    const config = {
      enabled: true,
      provider: 'knock',
      config: {
        secretKey: 'knock-secret-key-123',
        apiUrl: 'https://api.knock.app',
        settings: {
          enableLogging: true,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns no errors for valid FCM configuration', () => {
    const config = {
      enabled: true,
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account","project_id":"my-firebase-project"}',
        projectId: 'my-firebase-project',
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns no errors for valid SNS configuration', () => {
    const config = {
      enabled: true,
      provider: 'sns',
      config: {
        accessKeyId: 'access-key-id',
        secretAccessKey: 'secret-access-key',
        region: 'us-west-2',
        topicArn: 'arn:aws:sns:us-west-2:123456789012:my-topic',
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns no errors for valid Braze configuration', () => {
    const config = {
      enabled: true,
      provider: 'braze',
      config: {
        apiKey: 'braze-api-key-123',
        apiUrl: 'https://rest.iad-01.braze.com',
        settings: {
          enableLogging: true,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validateNotificationsConfig returns errors for invalid OneSignal configuration', () => {
    const config = {
      enabled: true,
      provider: 'onesignal',
      config: {
        restApiKey: '', // Missing
        userAuthKey: 'user-auth-key-456',
        appId: 'app-id-789',
        settings: {
          enableLogging: false,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toContain('restApiKey: Required');
  });

  it('validateNotificationsConfig returns errors for invalid Courier configuration', () => {
    const config = {
      enabled: true,
      provider: 'courier',
      config: {
        apiKey: '', // Missing
        apiUrl: 'https://api.courier.com',
        settings: {
          enableLogging: false,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toContain('apiKey: Required');
  });

  it('validateNotificationsConfig returns errors for invalid FCM configuration', () => {
    const config = {
      enabled: true,
      provider: 'fcm',
      config: {
        credentials: '', // Missing
        projectId: 'my-project', // Present
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toContain('credentials: Required');
  });

  it('validateNotificationsConfig returns errors for invalid Courier configuration', () => {
    const config = {
      enabled: true,
      provider: 'courier',
      config: {
        apiKey: '', // Missing
        apiUrl: 'https://api.courier.com', // Present
        settings: {
          enableLogging: false,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toContain('apiKey: Required');
  });

  it('validateNotificationsConfig returns multiple errors for completely invalid OneSignal configuration', () => {
    const config = {
      enabled: true,
      provider: 'onesignal',
      config: {
        restApiKey: '', // Missing
        userAuthKey: '', // Missing
        appId: '', // Missing
        settings: {
          enableLogging: false,
        },
      },
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toContain('restApiKey: Required');
    expect(errors).toContain('userAuthKey: Required');
    expect(errors).toContain('appId: Required');
  });

  it('validateNotificationsConfig returns no errors when notifications are disabled', () => {
    const config = {
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
    } satisfies NotificationConfig;

    const errors = validateNotificationsConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('exports default configuration constants', () => {
    expect(DEFAULT_NOTIFICATION_CONFIG).toBeDefined();
    expect(DEFAULT_NOTIFICATION_CONFIG.enabled).toBe(false);
    expect(DEFAULT_NOTIFICATION_CONFIG.provider).toBe('onesignal');
    expect(DEFAULT_NOTIFICATION_CONFIG.config).toBeDefined();
    const onesignal = DEFAULT_NOTIFICATION_CONFIG.config as OneSignalConfig;
    expect(onesignal.restApiKey).toBe('');
    expect(onesignal.userAuthKey).toBe('');
    expect(onesignal.appId).toBe('');
    expect(onesignal.settings?.enableLogging).toBe(false);
  });
});
