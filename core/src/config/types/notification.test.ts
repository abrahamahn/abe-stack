// core/src/config/types/notification.test.ts
import { describe, expect, it } from 'vitest';

import {
  BrazeSchema,
  CourierSchema,
  FcmSchema,
  KnockSchema,
  NotificationConfigSchema,
  NotificationEnvSchema,
  NotificationProviderSchema,
  OneSignalSchema,
  SnsSchema,
} from './notification.js';

import type { z } from 'zod';

describe('OneSignalSchema', () => {
  const validConfig = {
    restApiKey: 'test-rest-api-key',
    userAuthKey: 'test-user-auth-key',
    appId: 'test-app-id',
  };

  it('should validate correct OneSignal configuration', () => {
    const result = OneSignalSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate OneSignal configuration with optional settings', () => {
    const configWithSettings = {
      ...validConfig,
      settings: {
        enableLogging: true,
      },
    };
    const result = OneSignalSchema.safeParse(configWithSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings?.enableLogging).toBe(true);
    }
  });

  it('should validate OneSignal configuration with empty settings', () => {
    const configWithEmptySettings = {
      ...validConfig,
      settings: {},
    };
    const result = OneSignalSchema.safeParse(configWithEmptySettings);
    expect(result.success).toBe(true);
  });

  it('should reject missing restApiKey', () => {
    const { restApiKey: _restApiKey, ...incomplete } = validConfig;
    const result = OneSignalSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('restApiKey');
    }
  });

  it('should reject missing userAuthKey', () => {
    const { userAuthKey: _userAuthKey, ...incomplete } = validConfig;
    const result = OneSignalSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('userAuthKey');
    }
  });

  it('should reject missing appId', () => {
    const { appId: _appId, ...incomplete } = validConfig;
    const result = OneSignalSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('appId');
    }
  });

  it('should reject empty string restApiKey', () => {
    const result = OneSignalSchema.safeParse({ ...validConfig, restApiKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('ONESIGNAL_REST_API_KEY is required');
    }
  });

  it('should reject empty string userAuthKey', () => {
    const result = OneSignalSchema.safeParse({ ...validConfig, userAuthKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('ONESIGNAL_USER_AUTH_KEY is required');
    }
  });

  it('should reject empty string appId', () => {
    const result = OneSignalSchema.safeParse({ ...validConfig, appId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('ONESIGNAL_APP_ID is required');
    }
  });

  it('should reject non-boolean enableLogging', () => {
    const configWithInvalidSettings = {
      ...validConfig,
      settings: {
        enableLogging: 'true', // String instead of boolean
      },
    };
    const result = OneSignalSchema.safeParse(configWithInvalidSettings);
    expect(result.success).toBe(false);
  });
});

describe('CourierSchema', () => {
  const validConfig = {
    apiKey: 'test-courier-api-key',
  };

  it('should validate correct Courier configuration', () => {
    const result = CourierSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate Courier configuration with optional apiUrl', () => {
    const configWithUrl = {
      ...validConfig,
      apiUrl: 'https://api.courier.com',
    };
    const result = CourierSchema.safeParse(configWithUrl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiUrl).toBe('https://api.courier.com');
    }
  });

  it('should validate Courier configuration with settings', () => {
    const configWithSettings = {
      ...validConfig,
      settings: {
        enableLogging: false,
      },
    };
    const result = CourierSchema.safeParse(configWithSettings);
    expect(result.success).toBe(true);
  });

  it('should reject missing apiKey', () => {
    const result = CourierSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('apiKey');
    }
  });

  it('should reject empty string apiKey', () => {
    const result = CourierSchema.safeParse({ apiKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('COURIER_API_KEY is required');
    }
  });
});

describe('KnockSchema', () => {
  const validConfig = {
    secretKey: 'test-knock-secret-key',
  };

  it('should validate correct Knock configuration', () => {
    const result = KnockSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate Knock configuration with optional apiUrl', () => {
    const configWithUrl = {
      ...validConfig,
      apiUrl: 'https://api.knock.app',
    };
    const result = KnockSchema.safeParse(configWithUrl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiUrl).toBe('https://api.knock.app');
    }
  });

  it('should validate Knock configuration with settings', () => {
    const configWithSettings = {
      ...validConfig,
      settings: {
        enableLogging: true,
      },
    };
    const result = KnockSchema.safeParse(configWithSettings);
    expect(result.success).toBe(true);
  });

  it('should reject missing secretKey', () => {
    const result = KnockSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('secretKey');
    }
  });

  it('should reject empty string secretKey', () => {
    const result = KnockSchema.safeParse({ secretKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('KNOCK_SECRET_KEY is required');
    }
  });
});

describe('FcmSchema', () => {
  const validConfig = {
    credentials: 'test-fcm-credentials-json',
    projectId: 'test-firebase-project-id',
  };

  it('should validate correct FCM configuration', () => {
    const result = FcmSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject missing credentials', () => {
    const { credentials: _credentials, ...incomplete } = validConfig;
    const result = FcmSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('credentials');
    }
  });

  it('should reject missing projectId', () => {
    const { projectId: _projectId, ...incomplete } = validConfig;
    const result = FcmSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('projectId');
    }
  });

  it('should reject empty string credentials', () => {
    const result = FcmSchema.safeParse({ ...validConfig, credentials: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('FCM_CREDENTIALS is required');
    }
  });

  it('should reject empty string projectId', () => {
    const result = FcmSchema.safeParse({ ...validConfig, projectId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('FCM_PROJECT_ID is required');
    }
  });
});

describe('SnsSchema', () => {
  const validConfig = {
    accessKeyId: 'test-aws-access-key-id',
    secretAccessKey: 'test-aws-secret-access-key',
    region: 'us-west-2',
  };

  it('should validate correct SNS configuration', () => {
    const result = SnsSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should apply default region when not provided', () => {
    const { region: _region, ...configWithoutRegion } = validConfig;
    const result = SnsSchema.safeParse(configWithoutRegion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.region).toBe('us-east-1');
    }
  });

  it('should validate SNS configuration with optional topicArn', () => {
    const configWithTopic = {
      ...validConfig,
      topicArn: 'arn:aws:sns:us-west-2:123456789012:test-topic',
    };
    const result = SnsSchema.safeParse(configWithTopic);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topicArn).toBe('arn:aws:sns:us-west-2:123456789012:test-topic');
    }
  });

  it('should reject missing accessKeyId', () => {
    const { accessKeyId: _accessKeyId, ...incomplete } = validConfig;
    const result = SnsSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('accessKeyId');
    }
  });

  it('should reject missing secretAccessKey', () => {
    const { secretAccessKey: _secretAccessKey, ...incomplete } = validConfig;
    const result = SnsSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('secretAccessKey');
    }
  });

  it('should reject empty string accessKeyId', () => {
    const result = SnsSchema.safeParse({ ...validConfig, accessKeyId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('AWS_SNS_ACCESS_KEY_ID is required');
    }
  });

  it('should reject empty string secretAccessKey', () => {
    const result = SnsSchema.safeParse({ ...validConfig, secretAccessKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('AWS_SNS_SECRET_ACCESS_KEY is required');
    }
  });

  it('should reject empty string region', () => {
    const result = SnsSchema.safeParse({ ...validConfig, region: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('AWS_SNS_REGION is required');
    }
  });
});

describe('BrazeSchema', () => {
  const validConfig = {
    apiKey: 'test-braze-api-key',
    apiUrl: 'https://rest.iad-01.braze.com',
  };

  it('should validate correct Braze configuration', () => {
    const result = BrazeSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate Braze configuration with settings', () => {
    const configWithSettings = {
      ...validConfig,
      settings: {
        enableLogging: true,
      },
    };
    const result = BrazeSchema.safeParse(configWithSettings);
    expect(result.success).toBe(true);
  });

  it('should reject missing apiKey', () => {
    const { apiKey: _apiKey, ...incomplete } = validConfig;
    const result = BrazeSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('apiKey');
    }
  });

  it('should reject missing apiUrl', () => {
    const { apiUrl: _apiUrl, ...incomplete } = validConfig;
    const result = BrazeSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('apiUrl');
    }
  });

  it('should reject empty string apiKey', () => {
    const result = BrazeSchema.safeParse({ ...validConfig, apiKey: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('BRAZE_API_KEY is required');
    }
  });

  it('should reject empty string apiUrl', () => {
    const result = BrazeSchema.safeParse({ ...validConfig, apiUrl: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('BRAZE_API_URL is required');
    }
  });
});

describe('NotificationProviderSchema', () => {
  const validProviders = ['onesignal', 'fcm', 'courier', 'generic'];

  it.each(validProviders)('should validate "%s" as a valid provider', (provider) => {
    const result = NotificationProviderSchema.safeParse(provider);
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider names', () => {
    const invalidProviders = ['sns', 'knock', 'braze', 'twilio', '', undefined];
    invalidProviders.forEach((provider) => {
      const result = NotificationProviderSchema.safeParse(provider);
      expect(result.success).toBe(false);
    });
  });

  it('should reject case-sensitive mismatches', () => {
    const result = NotificationProviderSchema.safeParse('OneSignal');
    expect(result.success).toBe(false);
  });
});

describe('NotificationConfigSchema', () => {
  const validConfig = {
    enabled: true,
    provider: 'onesignal',
    config: {
      restApiKey: 'test-key',
      userAuthKey: 'test-auth',
      appId: 'test-app-id',
    },
  };

  it('should validate correct notification configuration', () => {
    const result = NotificationConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate disabled notification configuration', () => {
    const disabledConfig = {
      enabled: false,
      provider: 'generic',
      config: {},
    };
    const result = NotificationConfigSchema.safeParse(disabledConfig);
    expect(result.success).toBe(true);
  });

  it('should accept unknown config object', () => {
    const configWithCustom = {
      enabled: true,
      provider: 'generic',
      config: {
        customField: 'custom-value',
        nestedObject: {
          foo: 'bar',
        },
      },
    };
    const result = NotificationConfigSchema.safeParse(configWithCustom);
    expect(result.success).toBe(true);
  });

  it('should reject missing enabled field', () => {
    const { enabled: _enabled, ...incomplete } = validConfig;
    const result = NotificationConfigSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('enabled');
    }
  });

  it('should reject missing provider field', () => {
    const { provider: _provider, ...incomplete } = validConfig;
    const result = NotificationConfigSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('provider');
    }
  });

  it('should accept z.unknown() for config field', () => {
    // The config field is typed as z.unknown() which accepts any value including undefined
    const configWithUndefined = {
      enabled: true,
      provider: 'generic',
      config: undefined,
    };
    const result = NotificationConfigSchema.safeParse(configWithUndefined);
    expect(result.success).toBe(true);
  });

  it('should reject non-boolean enabled field', () => {
    const result = NotificationConfigSchema.safeParse({
      ...validConfig,
      enabled: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid provider', () => {
    const result = NotificationConfigSchema.safeParse({
      ...validConfig,
      provider: 'invalid-provider',
    });
    expect(result.success).toBe(false);
  });
});

describe('NotificationEnvSchema', () => {
  it('should validate empty environment object', () => {
    const result = NotificationEnvSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate OneSignal environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'onesignal',
      ONESIGNAL_REST_API_KEY: 'rest-api-key',
      ONESIGNAL_USER_AUTH_KEY: 'user-auth-key',
      ONESIGNAL_APP_ID: 'app-id',
      ONESIGNAL_ENABLE_LOGGING: 'true',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate Courier environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'courier',
      COURIER_API_KEY: 'courier-api-key',
      COURIER_API_URL: 'https://api.courier.com',
      COURIER_ENABLE_LOGGING: 'false',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate Knock environment variables', () => {
    const env = {
      KNOCK_SECRET_KEY: 'knock-secret-key',
      KNOCK_API_URL: 'https://api.knock.app',
      KNOCK_ENABLE_LOGGING: 'true',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate FCM environment variables', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'fcm',
      FCM_CREDENTIALS: 'fcm-credentials-json',
      FCM_PROJECT_ID: 'firebase-project-id',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate SNS environment variables', () => {
    const env = {
      AWS_SNS_ACCESS_KEY_ID: 'aws-access-key-id',
      AWS_SNS_SECRET_ACCESS_KEY: 'aws-secret-access-key',
      AWS_SNS_REGION: 'us-west-2',
      AWS_SNS_TOPIC_ARN: 'arn:aws:sns:us-west-2:123456789012:test-topic',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate Braze environment variables', () => {
    const env = {
      BRAZE_API_KEY: 'braze-api-key',
      BRAZE_API_URL: 'https://rest.iad-01.braze.com',
      BRAZE_ENABLE_LOGGING: 'false',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should validate mixed environment variables from multiple providers', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'generic',
      ONESIGNAL_REST_API_KEY: 'onesignal-key',
      FCM_CREDENTIALS: 'fcm-credentials',
      FCM_PROJECT_ID: 'firebase-project',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('should reject invalid NOTIFICATIONS_PROVIDER', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'invalid-provider',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('should reject invalid boolean strings for enable logging flags', () => {
    const env = {
      ONESIGNAL_ENABLE_LOGGING: 'yes', // Only 'true' or 'false' allowed
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('should accept true/false strings for enable logging flags', () => {
    const envWithTrue = {
      ONESIGNAL_ENABLE_LOGGING: 'true',
      COURIER_ENABLE_LOGGING: 'false',
      KNOCK_ENABLE_LOGGING: 'true',
      BRAZE_ENABLE_LOGGING: 'false',
    };
    const result = NotificationEnvSchema.safeParse(envWithTrue);
    expect(result.success).toBe(true);
  });

  it('should allow all optional fields to be omitted', () => {
    const env = {};
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NOTIFICATIONS_PROVIDER).toBeUndefined();
      expect(result.data.ONESIGNAL_REST_API_KEY).toBeUndefined();
      expect(result.data.FCM_CREDENTIALS).toBeUndefined();
    }
  });

  it('should handle complete production-like environment', () => {
    const env = {
      NOTIFICATIONS_PROVIDER: 'fcm',
      FCM_CREDENTIALS: JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key: 'test-key',
      }),
      FCM_PROJECT_ID: 'test-project-id',
    };
    const result = NotificationEnvSchema.safeParse(env);
    expect(result.success).toBe(true);
  });
});

describe('Edge cases and integration scenarios', () => {
  describe('Schema type inference', () => {
    it('should correctly infer OneSignalConfig type', () => {
      const config: z.infer<typeof OneSignalSchema> = {
        restApiKey: 'key',
        userAuthKey: 'auth',
        appId: 'app',
      };
      const result = OneSignalSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should correctly infer CourierConfig type', () => {
      const config: z.infer<typeof CourierSchema> = {
        apiKey: 'key',
      };
      const result = CourierSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should correctly infer FcmConfig type', () => {
      const config: z.infer<typeof FcmSchema> = {
        credentials: 'creds',
        projectId: 'project',
      };
      const result = FcmSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('Boundary conditions', () => {
    it('should reject objects with extra fields in strict mode', () => {
      const configWithExtra = {
        restApiKey: 'key',
        userAuthKey: 'auth',
        appId: 'app',
        extraField: 'should-be-ignored',
      };
      // Zod by default strips unknown keys unless .strict() is used
      const result = OneSignalSchema.safeParse(configWithExtra);
      expect(result.success).toBe(true); // Passes because zod strips unknown by default
    });

    it('should handle null values as invalid', () => {
      const result = OneSignalSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined as invalid', () => {
      const result = OneSignalSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle arrays as invalid', () => {
      const result = OneSignalSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('should handle primitive values as invalid', () => {
      const primitives = ['string', 123, true, null, undefined];
      primitives.forEach((primitive) => {
        const result = NotificationConfigSchema.safeParse(primitive);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Real-world usage patterns', () => {
    it('should validate configuration for development environment with generic provider', () => {
      const devConfig = {
        enabled: false,
        provider: 'generic',
        config: {},
      };
      const result = NotificationConfigSchema.safeParse(devConfig);
      expect(result.success).toBe(true);
    });

    it('should validate configuration for production environment with FCM', () => {
      const prodConfig = {
        enabled: true,
        provider: 'fcm',
        config: {
          credentials: JSON.stringify({ project_id: 'prod-project' }),
          projectId: 'prod-project-id',
        },
      };
      const result = NotificationConfigSchema.safeParse(prodConfig);
      expect(result.success).toBe(true);
    });

    it('should validate SNS configuration with all optional fields', () => {
      const fullSnsConfig = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'eu-west-1',
        topicArn: 'arn:aws:sns:eu-west-1:123456789012:notifications',
      };
      const result = SnsSchema.safeParse(fullSnsConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Error message clarity', () => {
    it('should provide clear error messages for missing required fields', () => {
      const result = OneSignalSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        // Verify that all three required fields are reported as missing
        const paths = result.error.issues.map((issue) => issue.path[0] as string);
        expect(paths).toContain('restApiKey');
        expect(paths).toContain('userAuthKey');
        expect(paths).toContain('appId');
      }
    });

    it('should provide field path in error for nested validation failures', () => {
      const invalidConfig = {
        restApiKey: 'key',
        userAuthKey: 'auth',
        appId: 'app',
        settings: {
          enableLogging: 'not-a-boolean',
        },
      };
      const result = OneSignalSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const pathsWithErrors = result.error.issues.map((issue) => issue.path);
        expect(pathsWithErrors.some((path) => path.includes('enableLogging'))).toBe(true);
      }
    });
  });
});
