// shared/core/src/config/types/services.test.ts
/**
 * Unit tests for service configuration type definitions.
 *
 * Tests verify type structure, assignability, and constraints for:
 * - Billing configuration (Stripe, PayPal)
 * - Email configuration (SMTP)
 * - Push notification configuration (multiple providers)
 * - Search configuration (Elasticsearch, SQL)
 *
 * @complexity O(1) - Type-level tests executed at compile time
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  BillingUrlsConfig,
  BrazeConfig,
  CourierConfig,
  ElasticsearchProviderConfig,
  EmailConfig,
  FcmConfig,
  GenericNotificationConfig,
  KnockConfig,
  NotificationConfig,
  NotificationProvider,
  NotificationProviderConfig,
  OneSignalConfig,
  PayPalProviderConfig,
  SmtpConfig,
  SnsConfig,
  SqlColumnMapping,
  SqlSearchProviderConfig,
  SqlTableConfig,
  StripeProviderConfig,
} from './services';

// ============================================================================
// Billing Configuration Tests
// ============================================================================

describe('BillingProvider', () => {
  it('should only accept stripe or paypal', () => {
    expectTypeOf<BillingProvider>().toEqualTypeOf<'stripe' | 'paypal'>();
  });

  it('should accept valid provider values', () => {
    const stripe: BillingProvider = 'stripe';
    const paypal: BillingProvider = 'paypal';

    expect(stripe).toBe('stripe');
    expect(paypal).toBe('paypal');
  });

  it('should reject invalid provider values at compile time', () => {
    // @ts-expect-error - invalid provider
    const invalid: BillingProvider = 'braintree';
    expect(invalid).toBeDefined();
  });
});

describe('StripeProviderConfig', () => {
  it('should require all three keys', () => {
    const validConfig: StripeProviderConfig = {
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
      webhookSecret: 'whsec_123',
    };

    expect(validConfig.secretKey).toBe('sk_test_123');
    expect(validConfig.publishableKey).toBe('pk_test_123');
    expect(validConfig.webhookSecret).toBe('whsec_123');
  });

  it('should enforce all properties as required', () => {
    expectTypeOf<StripeProviderConfig>().toHaveProperty('secretKey').toBeString();
    expectTypeOf<StripeProviderConfig>().toHaveProperty('publishableKey').toBeString();
    expectTypeOf<StripeProviderConfig>().toHaveProperty('webhookSecret').toBeString();
  });

  it('should not accept partial configuration', () => {
    // @ts-expect-error - missing webhookSecret
    const incomplete: StripeProviderConfig = {
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    };
    expect(incomplete).toBeDefined();
  });
});

describe('PayPalProviderConfig', () => {
  it('should require all four properties', () => {
    const validConfig: PayPalProviderConfig = {
      clientId: 'client_123',
      clientSecret: 'secret_123',
      webhookId: 'webhook_123',
      sandbox: true,
    };

    expect(validConfig.clientId).toBe('client_123');
    expect(validConfig.clientSecret).toBe('secret_123');
    expect(validConfig.webhookId).toBe('webhook_123');
    expect(validConfig.sandbox).toBe(true);
  });

  it('should enforce sandbox as boolean', () => {
    expectTypeOf<PayPalProviderConfig>().toHaveProperty('sandbox').toBeBoolean();
  });

  it('should support both sandbox and production modes', () => {
    const sandboxConfig: PayPalProviderConfig = {
      clientId: 'client_123',
      clientSecret: 'secret_123',
      webhookId: 'webhook_123',
      sandbox: true,
    };

    const prodConfig: PayPalProviderConfig = {
      clientId: 'client_123',
      clientSecret: 'secret_123',
      webhookId: 'webhook_123',
      sandbox: false,
    };

    expect(sandboxConfig.sandbox).toBe(true);
    expect(prodConfig.sandbox).toBe(false);
  });
});

describe('BillingPlansConfig', () => {
  it('should allow all properties to be optional', () => {
    const emptyConfig: BillingPlansConfig = {};
    expect(emptyConfig).toEqual({});
  });

  it('should accept partial plan configurations', () => {
    const onlyPro: BillingPlansConfig = {
      pro: 'price_pro_123',
    };

    const proAndEnterprise: BillingPlansConfig = {
      pro: 'price_pro_123',
      enterprise: 'price_ent_123',
    };

    expect(onlyPro.pro).toBe('price_pro_123');
    expect(proAndEnterprise.pro).toBe('price_pro_123');
    expect(proAndEnterprise.enterprise).toBe('price_ent_123');
  });

  it('should accept all plan tiers', () => {
    const fullConfig: BillingPlansConfig = {
      free: 'price_free_123',
      pro: 'price_pro_123',
      enterprise: 'price_ent_123',
    };

    expect(fullConfig.free).toBe('price_free_123');
    expect(fullConfig.pro).toBe('price_pro_123');
    expect(fullConfig.enterprise).toBe('price_ent_123');
  });

  it('should enforce all plan properties as optional strings', () => {
    expectTypeOf<BillingPlansConfig>().toHaveProperty('free').toEqualTypeOf<string | undefined>();
    expectTypeOf<BillingPlansConfig>().toHaveProperty('pro').toEqualTypeOf<string | undefined>();
    expectTypeOf<BillingPlansConfig>()
      .toHaveProperty('enterprise')
      .toEqualTypeOf<string | undefined>();
  });
});

describe('BillingUrlsConfig', () => {
  it('should require all three URL properties', () => {
    const validConfig: BillingUrlsConfig = {
      portalReturnUrl: 'https://app.example.com/settings',
      checkoutSuccessUrl: 'https://app.example.com/success',
      checkoutCancelUrl: 'https://app.example.com/cancel',
    };

    expect(validConfig.portalReturnUrl).toBe('https://app.example.com/settings');
    expect(validConfig.checkoutSuccessUrl).toBe('https://app.example.com/success');
    expect(validConfig.checkoutCancelUrl).toBe('https://app.example.com/cancel');
  });

  it('should not accept partial configuration', () => {
    // @ts-expect-error - missing checkoutCancelUrl
    const incomplete: BillingUrlsConfig = {
      portalReturnUrl: 'https://app.example.com/settings',
      checkoutSuccessUrl: 'https://app.example.com/success',
    };
    expect(incomplete).toBeDefined();
  });

  it('should enforce all properties as required strings', () => {
    expectTypeOf<BillingUrlsConfig>().toHaveProperty('portalReturnUrl').toBeString();
    expectTypeOf<BillingUrlsConfig>().toHaveProperty('checkoutSuccessUrl').toBeString();
    expectTypeOf<BillingUrlsConfig>().toHaveProperty('checkoutCancelUrl').toBeString();
  });
});

describe('BillingConfig', () => {
  it('should require all nested configurations', () => {
    const validConfig: BillingConfig = {
      enabled: true,
      provider: 'stripe',
      currency: 'USD',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      },
      paypal: {
        clientId: 'client_123',
        clientSecret: 'secret_123',
        webhookId: 'webhook_123',
        sandbox: true,
      },
      plans: {
        pro: 'price_pro_123',
      },
      urls: {
        portalReturnUrl: 'https://app.example.com/settings',
        checkoutSuccessUrl: 'https://app.example.com/success',
        checkoutCancelUrl: 'https://app.example.com/cancel',
      },
    };

    expect(validConfig.enabled).toBe(true);
    expect(validConfig.provider).toBe('stripe');
    expect(validConfig.currency).toBe('USD');
  });

  it('should enforce enabled as boolean', () => {
    expectTypeOf<BillingConfig>().toHaveProperty('enabled').toBeBoolean();
  });

  it('should enforce provider type constraint', () => {
    expectTypeOf<BillingConfig>()
      .toHaveProperty('provider')
      .toEqualTypeOf<'stripe' | 'paypal'>();
  });

  it('should enforce currency as string', () => {
    expectTypeOf<BillingConfig>().toHaveProperty('currency').toBeString();
  });

  it('should support both stripe and paypal providers', () => {
    const stripeConfig: BillingConfig = {
      enabled: true,
      provider: 'stripe',
      currency: 'USD',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      },
      paypal: {
        clientId: 'client_123',
        clientSecret: 'secret_123',
        webhookId: 'webhook_123',
        sandbox: true,
      },
      plans: {},
      urls: {
        portalReturnUrl: 'https://app.example.com/settings',
        checkoutSuccessUrl: 'https://app.example.com/success',
        checkoutCancelUrl: 'https://app.example.com/cancel',
      },
    };

    const paypalConfig: BillingConfig = {
      ...stripeConfig,
      provider: 'paypal',
    };

    expect(stripeConfig.provider).toBe('stripe');
    expect(paypalConfig.provider).toBe('paypal');
  });

  it('should support disabled state', () => {
    const disabledConfig: BillingConfig = {
      enabled: false,
      provider: 'stripe',
      currency: 'USD',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      },
      paypal: {
        clientId: 'client_123',
        clientSecret: 'secret_123',
        webhookId: 'webhook_123',
        sandbox: true,
      },
      plans: {},
      urls: {
        portalReturnUrl: 'https://app.example.com/settings',
        checkoutSuccessUrl: 'https://app.example.com/success',
        checkoutCancelUrl: 'https://app.example.com/cancel',
      },
    };

    expect(disabledConfig.enabled).toBe(false);
  });
});

// ============================================================================
// Email Configuration Tests
// ============================================================================

describe('SmtpConfig', () => {
  it('should require all core SMTP properties', () => {
    const validConfig: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    expect(validConfig.host).toBe('smtp.gmail.com');
    expect(validConfig.port).toBe(587);
    expect(validConfig.secure).toBe(false);
    expect(validConfig.connectionTimeout).toBe(10000);
    expect(validConfig.socketTimeout).toBe(15000);
  });

  it('should allow optional auth credentials', () => {
    const withAuth: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@example.com',
        pass: 'password',
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    const withoutAuth: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    expect(withAuth.auth?.user).toBe('user@example.com');
    expect(withAuth.auth?.pass).toBe('password');
    expect(withoutAuth.auth).toBeUndefined();
  });

  it('should enforce port as number', () => {
    expectTypeOf<SmtpConfig>().toHaveProperty('port').toBeNumber();
  });

  it('should enforce secure as boolean', () => {
    expectTypeOf<SmtpConfig>().toHaveProperty('secure').toBeBoolean();
  });

  it('should enforce timeout properties as numbers', () => {
    expectTypeOf<SmtpConfig>().toHaveProperty('connectionTimeout').toBeNumber();
    expectTypeOf<SmtpConfig>().toHaveProperty('socketTimeout').toBeNumber();
  });

  it('should support common SMTP ports', () => {
    const starttls: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    const implicitTls: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    expect(starttls.port).toBe(587);
    expect(starttls.secure).toBe(false);
    expect(implicitTls.port).toBe(465);
    expect(implicitTls.secure).toBe(true);
  });
});

describe('EmailConfig', () => {
  it('should require all properties', () => {
    const validConfig: EmailConfig = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      },
      from: {
        name: 'App Name',
        address: 'noreply@example.com',
      },
      replyTo: 'support@example.com',
    };

    expect(validConfig.provider).toBe('smtp');
    expect(validConfig.from.name).toBe('App Name');
    expect(validConfig.from.address).toBe('noreply@example.com');
    expect(validConfig.replyTo).toBe('support@example.com');
  });

  it('should enforce provider type constraint', () => {
    expectTypeOf<EmailConfig>().toHaveProperty('provider').toEqualTypeOf<'console' | 'smtp'>();
  });

  it('should support console provider for development', () => {
    const consoleConfig: EmailConfig = {
      provider: 'console',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      },
      from: {
        name: 'App Name',
        address: 'noreply@example.com',
      },
      replyTo: 'support@example.com',
    };

    expect(consoleConfig.provider).toBe('console');
  });

  it('should support smtp provider for production', () => {
    const smtpConfig: EmailConfig = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      },
      from: {
        name: 'App Name',
        address: 'noreply@example.com',
      },
      replyTo: 'support@example.com',
    };

    expect(smtpConfig.provider).toBe('smtp');
  });

  it('should allow optional apiKey', () => {
    const withApiKey: EmailConfig = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      },
      apiKey: 'sendgrid_api_key',
      from: {
        name: 'App Name',
        address: 'noreply@example.com',
      },
      replyTo: 'support@example.com',
    };

    const withoutApiKey: EmailConfig = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      },
      from: {
        name: 'App Name',
        address: 'noreply@example.com',
      },
      replyTo: 'support@example.com',
    };

    expect(withApiKey.apiKey).toBe('sendgrid_api_key');
    expect(withoutApiKey.apiKey).toBeUndefined();
  });

  it('should enforce from structure with name and address', () => {
    expectTypeOf<EmailConfig>()
      .toHaveProperty('from')
      .toEqualTypeOf<{ name: string; address: string }>();
  });
});

// ============================================================================
// Push Notifications Configuration Tests
// ============================================================================

describe('NotificationProvider', () => {
  it('should support all notification providers', () => {
    expectTypeOf<NotificationProvider>().toEqualTypeOf<
      'onesignal' | 'courier' | 'knock' | 'fcm' | 'sns' | 'braze' | 'generic'
    >();
  });

  it('should accept valid provider values', () => {
    const providers: NotificationProvider[] = [
      'onesignal',
      'courier',
      'knock',
      'fcm',
      'sns',
      'braze',
      'generic',
    ];

    providers.forEach((provider) => {
      expect(provider).toBeDefined();
    });
  });
});

describe('OneSignalConfig', () => {
  it('should require all API credentials', () => {
    const validConfig: OneSignalConfig = {
      restApiKey: 'rest_key_123',
      userAuthKey: 'user_auth_123',
      appId: 'app_id_123',
    };

    expect(validConfig.restApiKey).toBe('rest_key_123');
    expect(validConfig.userAuthKey).toBe('user_auth_123');
    expect(validConfig.appId).toBe('app_id_123');
  });

  it('should allow optional settings', () => {
    const withSettings: OneSignalConfig = {
      restApiKey: 'rest_key_123',
      userAuthKey: 'user_auth_123',
      appId: 'app_id_123',
      settings: {
        enableLogging: true,
      },
    };

    const withoutSettings: OneSignalConfig = {
      restApiKey: 'rest_key_123',
      userAuthKey: 'user_auth_123',
      appId: 'app_id_123',
    };

    expect(withSettings.settings?.enableLogging).toBe(true);
    expect(withoutSettings.settings).toBeUndefined();
  });
});

describe('CourierConfig', () => {
  it('should require apiKey', () => {
    const validConfig: CourierConfig = {
      apiKey: 'courier_key_123',
    };

    expect(validConfig.apiKey).toBe('courier_key_123');
  });

  it('should allow optional apiUrl and settings', () => {
    const withOptionals: CourierConfig = {
      apiKey: 'courier_key_123',
      apiUrl: 'https://api.courier.com',
      settings: {
        enableLogging: true,
      },
    };

    const withoutOptionals: CourierConfig = {
      apiKey: 'courier_key_123',
    };

    expect(withOptionals.apiUrl).toBe('https://api.courier.com');
    expect(withOptionals.settings?.enableLogging).toBe(true);
    expect(withoutOptionals.apiUrl).toBeUndefined();
    expect(withoutOptionals.settings).toBeUndefined();
  });
});

describe('KnockConfig', () => {
  it('should require secretKey', () => {
    const validConfig: KnockConfig = {
      secretKey: 'knock_secret_123',
    };

    expect(validConfig.secretKey).toBe('knock_secret_123');
  });

  it('should allow optional apiUrl and settings', () => {
    const withOptionals: KnockConfig = {
      secretKey: 'knock_secret_123',
      apiUrl: 'https://api.knock.app',
      settings: {
        enableLogging: false,
      },
    };

    expect(withOptionals.apiUrl).toBe('https://api.knock.app');
    expect(withOptionals.settings?.enableLogging).toBe(false);
  });
});

describe('FcmConfig', () => {
  it('should require credentials and projectId', () => {
    const validConfig: FcmConfig = {
      credentials: '{"type":"service_account"}',
      projectId: 'my-firebase-project',
    };

    expect(validConfig.credentials).toBe('{"type":"service_account"}');
    expect(validConfig.projectId).toBe('my-firebase-project');
  });

  it('should not accept partial configuration', () => {
    // @ts-expect-error - missing projectId
    const incomplete: FcmConfig = {
      credentials: '{"type":"service_account"}',
    };
    expect(incomplete).toBeDefined();
  });
});

describe('SnsConfig', () => {
  it('should require AWS credentials and region', () => {
    const validConfig: SnsConfig = {
      accessKeyId: 'AKIA_ACCESS_KEY',
      secretAccessKey: 'secret_access_key',
      region: 'us-east-1',
    };

    expect(validConfig.accessKeyId).toBe('AKIA_ACCESS_KEY');
    expect(validConfig.secretAccessKey).toBe('secret_access_key');
    expect(validConfig.region).toBe('us-east-1');
  });

  it('should allow optional topicArn', () => {
    const withTopicArn: SnsConfig = {
      accessKeyId: 'AKIA_ACCESS_KEY',
      secretAccessKey: 'secret_access_key',
      region: 'us-east-1',
      topicArn: 'arn:aws:sns:us-east-1:123456789012:MyTopic',
    };

    const withoutTopicArn: SnsConfig = {
      accessKeyId: 'AKIA_ACCESS_KEY',
      secretAccessKey: 'secret_access_key',
      region: 'us-east-1',
    };

    expect(withTopicArn.topicArn).toBe('arn:aws:sns:us-east-1:123456789012:MyTopic');
    expect(withoutTopicArn.topicArn).toBeUndefined();
  });

  it('should support all AWS regions', () => {
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

    regions.forEach((region) => {
      const config: SnsConfig = {
        accessKeyId: 'AKIA_ACCESS_KEY',
        secretAccessKey: 'secret_access_key',
        region,
      };

      expect(config.region).toBe(region);
    });
  });
});

describe('BrazeConfig', () => {
  it('should require apiKey and apiUrl', () => {
    const validConfig: BrazeConfig = {
      apiKey: 'braze_key_123',
      apiUrl: 'https://rest.iad-01.braze.com',
    };

    expect(validConfig.apiKey).toBe('braze_key_123');
    expect(validConfig.apiUrl).toBe('https://rest.iad-01.braze.com');
  });

  it('should allow optional settings', () => {
    const withSettings: BrazeConfig = {
      apiKey: 'braze_key_123',
      apiUrl: 'https://rest.iad-01.braze.com',
      settings: {
        enableLogging: true,
      },
    };

    expect(withSettings.settings?.enableLogging).toBe(true);
  });

  it('should not accept partial configuration', () => {
    // @ts-expect-error - missing apiUrl
    const incomplete: BrazeConfig = {
      apiKey: 'braze_key_123',
    };
    expect(incomplete).toBeDefined();
  });
});

describe('GenericNotificationConfig', () => {
  it('should accept arbitrary key-value pairs', () => {
    const config: GenericNotificationConfig = {
      apiKey: 'custom_key',
      endpoint: 'https://api.custom.com',
      retries: 3,
      timeout: 5000,
      nested: {
        prop: 'value',
      },
    };

    expect(config['apiKey']).toBe('custom_key');
    expect(config['endpoint']).toBe('https://api.custom.com');
    expect(config['retries']).toBe(3);
    expect(config['timeout']).toBe(5000);
  });

  it('should allow empty configuration', () => {
    const emptyConfig: GenericNotificationConfig = {};
    expect(emptyConfig).toEqual({});
  });
});

describe('NotificationProviderConfig', () => {
  it('should create discriminated union for onesignal', () => {
    const config: NotificationProviderConfig = {
      provider: 'onesignal',
      config: {
        restApiKey: 'rest_key_123',
        userAuthKey: 'user_auth_123',
        appId: 'app_id_123',
      },
    };

    expect(config.provider).toBe('onesignal');
    if (config.provider === 'onesignal') {
      expect(config.config.appId).toBe('app_id_123');
    }
  });

  it('should create discriminated union for courier', () => {
    const config: NotificationProviderConfig = {
      provider: 'courier',
      config: {
        apiKey: 'courier_key_123',
      },
    };

    expect(config.provider).toBe('courier');
    if (config.provider === 'courier') {
      expect(config.config.apiKey).toBe('courier_key_123');
    }
  });

  it('should create discriminated union for knock', () => {
    const config: NotificationProviderConfig = {
      provider: 'knock',
      config: {
        secretKey: 'knock_secret_123',
      },
    };

    expect(config.provider).toBe('knock');
    if (config.provider === 'knock') {
      expect(config.config.secretKey).toBe('knock_secret_123');
    }
  });

  it('should create discriminated union for fcm', () => {
    const config: NotificationProviderConfig = {
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account"}',
        projectId: 'my-firebase-project',
      },
    };

    expect(config.provider).toBe('fcm');
    if (config.provider === 'fcm') {
      expect(config.config.projectId).toBe('my-firebase-project');
    }
  });

  it('should create discriminated union for sns', () => {
    const config: NotificationProviderConfig = {
      provider: 'sns',
      config: {
        accessKeyId: 'AKIA_ACCESS_KEY',
        secretAccessKey: 'secret_access_key',
        region: 'us-east-1',
      },
    };

    expect(config.provider).toBe('sns');
    if (config.provider === 'sns') {
      expect(config.config.region).toBe('us-east-1');
    }
  });

  it('should create discriminated union for braze', () => {
    const config: NotificationProviderConfig = {
      provider: 'braze',
      config: {
        apiKey: 'braze_key_123',
        apiUrl: 'https://rest.iad-01.braze.com',
      },
    };

    expect(config.provider).toBe('braze');
    if (config.provider === 'braze') {
      expect(config.config.apiUrl).toBe('https://rest.iad-01.braze.com');
    }
  });

  it('should create discriminated union for generic', () => {
    const config: NotificationProviderConfig = {
      provider: 'generic',
      config: {
        customProp: 'value',
      },
    };

    expect(config.provider).toBe('generic');
    if (config.provider === 'generic') {
      expect(config.config['customProp']).toBe('value');
    }
  });

  it('should narrow config type based on provider discriminant', () => {
    const config: NotificationProviderConfig = {
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account"}',
        projectId: 'my-firebase-project',
      },
    };

    // Type narrowing should work
    if (config.provider === 'fcm') {
      expectTypeOf(config.config).toEqualTypeOf<FcmConfig>();
    }
  });
});

describe('NotificationConfig', () => {
  it('should require enabled, provider, and config', () => {
    const validConfig: NotificationConfig = {
      enabled: true,
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account"}',
        projectId: 'my-firebase-project',
      },
    };

    expect(validConfig.enabled).toBe(true);
    expect(validConfig.provider).toBe('fcm');
  });

  it('should support disabled state', () => {
    const disabledConfig: NotificationConfig = {
      enabled: false,
      provider: 'fcm',
      config: {
        credentials: '{"type":"service_account"}',
        projectId: 'my-firebase-project',
      },
    };

    expect(disabledConfig.enabled).toBe(false);
  });

  it('should enforce enabled as boolean', () => {
    expectTypeOf<NotificationConfig>().toHaveProperty('enabled').toBeBoolean();
  });

  it('should support all notification providers', () => {
    const providers: NotificationProvider[] = [
      'onesignal',
      'courier',
      'knock',
      'fcm',
      'sns',
      'braze',
      'generic',
    ];

    providers.forEach((provider) => {
      const config: NotificationConfig = {
        enabled: true,
        provider,
        config: {},
      };

      expect(config.provider).toBe(provider);
    });
  });
});

// ============================================================================
// Search Configuration Tests
// ============================================================================

describe('ElasticsearchProviderConfig', () => {
  it('should require node and index', () => {
    const validConfig: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
    };

    expect(validConfig.node).toBe('https://localhost:9200');
    expect(validConfig.index).toBe('my-search-index');
  });

  it('should allow basic auth credentials', () => {
    const withAuth: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    };

    expect(withAuth.auth?.username).toBe('elastic');
    expect(withAuth.auth?.password).toBe('changeme');
  });

  it('should allow apiKey authentication', () => {
    const withApiKey: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      apiKey: 'base64_encoded_api_key',
    };

    expect(withApiKey.apiKey).toBe('base64_encoded_api_key');
  });

  it('should allow TLS configuration', () => {
    const withTls: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      tls: true,
    };

    const withoutTls: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      tls: false,
    };

    expect(withTls.tls).toBe(true);
    expect(withoutTls.tls).toBe(false);
  });

  it('should allow request timeout configuration', () => {
    const withTimeout: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      requestTimeout: 30000,
    };

    expect(withTimeout.requestTimeout).toBe(30000);
  });

  it('should support both auth methods independently', () => {
    const basicAuth: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    };

    const apiKeyAuth: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-search-index',
      apiKey: 'base64_encoded_api_key',
    };

    expect(basicAuth.auth).toBeDefined();
    expect(basicAuth.apiKey).toBeUndefined();
    expect(apiKeyAuth.apiKey).toBeDefined();
    expect(apiKeyAuth.auth).toBeUndefined();
  });
});

describe('SqlSearchProviderConfig', () => {
  it('should require pagination settings', () => {
    const validConfig: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
    };

    expect(validConfig.defaultPageSize).toBe(20);
    expect(validConfig.maxPageSize).toBe(100);
  });

  it('should allow optional security constraints', () => {
    const withConstraints: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
      maxQueryDepth: 5,
      maxConditions: 10,
    };

    const withoutConstraints: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
    };

    expect(withConstraints.maxQueryDepth).toBe(5);
    expect(withConstraints.maxConditions).toBe(10);
    expect(withoutConstraints.maxQueryDepth).toBeUndefined();
    expect(withoutConstraints.maxConditions).toBeUndefined();
  });

  it('should allow optional logging and timeout', () => {
    const withOptionals: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
      logging: true,
      timeout: 5000,
    };

    expect(withOptionals.logging).toBe(true);
    expect(withOptionals.timeout).toBe(5000);
  });

  it('should enforce pagination properties as numbers', () => {
    expectTypeOf<SqlSearchProviderConfig>().toHaveProperty('defaultPageSize').toBeNumber();
    expectTypeOf<SqlSearchProviderConfig>().toHaveProperty('maxPageSize').toBeNumber();
  });

  it('should support DoS prevention settings', () => {
    const dosPreventionConfig: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
      maxQueryDepth: 3,
      maxConditions: 20,
      timeout: 10000,
    };

    expect(dosPreventionConfig.maxQueryDepth).toBe(3);
    expect(dosPreventionConfig.maxConditions).toBe(20);
    expect(dosPreventionConfig.timeout).toBe(10000);
  });
});

describe('SqlColumnMapping', () => {
  it('should require field and column', () => {
    const validMapping: SqlColumnMapping = {
      field: 'userName',
      column: 'user_name',
    };

    expect(validMapping.field).toBe('userName');
    expect(validMapping.column).toBe('user_name');
  });

  it('should allow optional type specification', () => {
    const withType: SqlColumnMapping = {
      field: 'createdAt',
      column: 'created_at',
      type: 'date',
    };

    const withoutType: SqlColumnMapping = {
      field: 'userName',
      column: 'user_name',
    };

    expect(withType.type).toBe('date');
    expect(withoutType.type).toBeUndefined();
  });

  it('should support all column types', () => {
    const types: Array<'string' | 'number' | 'boolean' | 'date' | 'json' | 'array'> = [
      'string',
      'number',
      'boolean',
      'date',
      'json',
      'array',
    ];

    types.forEach((type) => {
      const mapping: SqlColumnMapping = {
        field: 'field',
        column: 'column',
        type,
      };

      expect(mapping.type).toBe(type);
    });
  });

  it('should allow sortable and filterable flags', () => {
    const sortableMapping: SqlColumnMapping = {
      field: 'createdAt',
      column: 'created_at',
      sortable: true,
    };

    const filterableMapping: SqlColumnMapping = {
      field: 'status',
      column: 'status',
      filterable: true,
    };

    const bothFlags: SqlColumnMapping = {
      field: 'userName',
      column: 'user_name',
      sortable: true,
      filterable: true,
    };

    expect(sortableMapping.sortable).toBe(true);
    expect(filterableMapping.filterable).toBe(true);
    expect(bothFlags.sortable).toBe(true);
    expect(bothFlags.filterable).toBe(true);
  });

  it('should allow custom SQL expression', () => {
    const withExpression: SqlColumnMapping = {
      field: 'fullName',
      column: 'full_name',
      expression: "CONCAT(first_name, ' ', last_name)",
    };

    expect(withExpression.expression).toBe("CONCAT(first_name, ' ', last_name)");
  });

  it('should enforce type as optional union', () => {
    expectTypeOf<SqlColumnMapping>()
      .toHaveProperty('type')
      .toEqualTypeOf<'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | undefined>();
  });
});

describe('SqlTableConfig', () => {
  it('should require table, primaryKey, and columns', () => {
    const validConfig: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [
        { field: 'id', column: 'id' },
        { field: 'userName', column: 'user_name' },
      ],
    };

    expect(validConfig.table).toBe('users');
    expect(validConfig.primaryKey).toBe('id');
    expect(validConfig.columns).toHaveLength(2);
  });

  it('should support composite primary keys', () => {
    const compositeKey: SqlTableConfig = {
      table: 'user_roles',
      primaryKey: ['user_id', 'role_id'],
      columns: [
        { field: 'userId', column: 'user_id' },
        { field: 'roleId', column: 'role_id' },
      ],
    };

    expect(Array.isArray(compositeKey.primaryKey)).toBe(true);
    expect(compositeKey.primaryKey).toHaveLength(2);
  });

  it('should allow optional searchColumns', () => {
    const withSearch: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'userName', column: 'user_name' }],
      searchColumns: ['user_name', 'email', 'full_name'],
    };

    const withoutSearch: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'userName', column: 'user_name' }],
    };

    expect(withSearch.searchColumns).toHaveLength(3);
    expect(withoutSearch.searchColumns).toBeUndefined();
  });

  it('should allow optional defaultSort', () => {
    const withSort: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'createdAt', column: 'created_at' }],
      defaultSort: { column: 'created_at', order: 'desc' },
    };

    const withoutSort: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'userName', column: 'user_name' }],
    };

    expect(withSort.defaultSort?.column).toBe('created_at');
    expect(withSort.defaultSort?.order).toBe('desc');
    expect(withoutSort.defaultSort).toBeUndefined();
  });

  it('should enforce sort order as asc or desc', () => {
    const ascSort: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'userName', column: 'user_name' }],
      defaultSort: { column: 'user_name', order: 'asc' },
    };

    const descSort: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'createdAt', column: 'created_at' }],
      defaultSort: { column: 'created_at', order: 'desc' },
    };

    expect(ascSort.defaultSort?.order).toBe('asc');
    expect(descSort.defaultSort?.order).toBe('desc');
  });

  it('should support complex column mappings', () => {
    const complexConfig: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [
        { field: 'id', column: 'id', type: 'number', sortable: true },
        {
          field: 'userName',
          column: 'user_name',
          type: 'string',
          sortable: true,
          filterable: true,
        },
        {
          field: 'fullName',
          column: 'full_name',
          type: 'string',
          expression: "CONCAT(first_name, ' ', last_name)",
        },
        { field: 'createdAt', column: 'created_at', type: 'date', sortable: true },
        { field: 'metadata', column: 'metadata', type: 'json', filterable: false },
      ],
      searchColumns: ['user_name', 'email'],
      defaultSort: { column: 'created_at', order: 'desc' },
    };

    expect(complexConfig.columns).toHaveLength(5);
    expect(complexConfig.columns[0]?.type).toBe('number');
    expect(complexConfig.columns[1]?.filterable).toBe(true);
    expect(complexConfig.columns[2]?.expression).toContain('CONCAT');
    expect(complexConfig.columns[4]?.type).toBe('json');
  });

  it('should enforce primaryKey as string or string array', () => {
    expectTypeOf<SqlTableConfig>()
      .toHaveProperty('primaryKey')
      .toEqualTypeOf<string | string[]>();
  });
});

// ============================================================================
// Edge Cases and Type Safety Tests
// ============================================================================

describe('Type Safety', () => {
  it('should enforce strict types for provider discriminants', () => {
    // @ts-expect-error - invalid billing provider
    const invalidBilling: BillingProvider = 'braintree';
    expect(invalidBilling).toBeDefined();

    // @ts-expect-error - invalid email provider
    const invalidEmail: EmailConfig['provider'] = 'mailgun';
    expect(invalidEmail).toBeDefined();

    // @ts-expect-error - invalid notification provider
    const invalidNotification: NotificationProvider = 'pushover';
    expect(invalidNotification).toBeDefined();
  });

  it('should enforce required properties in nested configs', () => {
    // @ts-expect-error - missing webhookSecret
    const invalidStripe: StripeProviderConfig = {
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    };
    expect(invalidStripe).toBeDefined();

    // @ts-expect-error - missing sandbox
    const invalidPayPal: PayPalProviderConfig = {
      clientId: 'client_123',
      clientSecret: 'secret_123',
      webhookId: 'webhook_123',
    };
    expect(invalidPayPal).toBeDefined();

    // @ts-expect-error - missing projectId
    const invalidFcm: FcmConfig = {
      credentials: '{"type":"service_account"}',
    };
    expect(invalidFcm).toBeDefined();
  });

  it('should allow optional properties to be omitted', () => {
    const minimalSmtp: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    };

    const minimalElasticsearch: ElasticsearchProviderConfig = {
      node: 'https://localhost:9200',
      index: 'my-index',
    };

    const minimalSql: SqlSearchProviderConfig = {
      defaultPageSize: 20,
      maxPageSize: 100,
    };

    expect(minimalSmtp.auth).toBeUndefined();
    expect(minimalElasticsearch.auth).toBeUndefined();
    expect(minimalSql.maxQueryDepth).toBeUndefined();
  });

  it('should prevent type mismatches in discriminated unions', () => {
    // Test that FCM config validates correctly
    const validFcm: NotificationProviderConfig = {
      provider: 'fcm',
      config: {
        credentials: 'service_account_json',
        projectId: 'my-project',
      },
    };
    expect(validFcm).toBeDefined();
  });
});

describe('Boundary Cases', () => {
  it('should handle empty optional objects', () => {
    const emptyPlans: BillingPlansConfig = {};
    const emptyGenericNotification: GenericNotificationConfig = {};

    expect(Object.keys(emptyPlans)).toHaveLength(0);
    expect(Object.keys(emptyGenericNotification)).toHaveLength(0);
  });

  it('should handle maximum nested configurations', () => {
    const maxConfig: BillingConfig = {
      enabled: true,
      provider: 'stripe',
      currency: 'USD',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      },
      paypal: {
        clientId: 'client_123',
        clientSecret: 'secret_123',
        webhookId: 'webhook_123',
        sandbox: true,
      },
      plans: {
        free: 'price_free_123',
        pro: 'price_pro_123',
        enterprise: 'price_ent_123',
      },
      urls: {
        portalReturnUrl: 'https://app.example.com/settings',
        checkoutSuccessUrl: 'https://app.example.com/success',
        checkoutCancelUrl: 'https://app.example.com/cancel',
      },
    };

    expect(maxConfig).toBeDefined();
    expect(maxConfig.plans.free).toBe('price_free_123');
    expect(maxConfig.plans.pro).toBe('price_pro_123');
    expect(maxConfig.plans.enterprise).toBe('price_ent_123');
  });

  it('should handle SQL table with minimal configuration', () => {
    const minimalTable: SqlTableConfig = {
      table: 'users',
      primaryKey: 'id',
      columns: [{ field: 'id', column: 'id' }],
    };

    expect(minimalTable.columns).toHaveLength(1);
    expect(minimalTable.searchColumns).toBeUndefined();
    expect(minimalTable.defaultSort).toBeUndefined();
  });

  it('should handle SQL table with maximum configuration', () => {
    const maximalTable: SqlTableConfig = {
      table: 'users',
      primaryKey: ['user_id', 'tenant_id'],
      columns: [
        {
          field: 'userId',
          column: 'user_id',
          type: 'number',
          sortable: true,
          filterable: true,
        },
        {
          field: 'fullName',
          column: 'full_name',
          type: 'string',
          sortable: true,
          filterable: true,
          expression: "CONCAT(first_name, ' ', last_name)",
        },
      ],
      searchColumns: ['user_name', 'email', 'full_name'],
      defaultSort: { column: 'created_at', order: 'desc' },
    };

    expect(maximalTable.columns).toHaveLength(2);
    expect(maximalTable.searchColumns).toHaveLength(3);
    expect(maximalTable.defaultSort?.order).toBe('desc');
  });
});
