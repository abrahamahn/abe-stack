// packages/shared/src/config/types/index.test.ts
/**
 * Configuration Types Tests
 *
 * Tests for composite configuration types and discriminated unions.
 * Verifies type structure, discriminated union behavior, and type safety.
 *
 * Note: This file tests the composite types defined in index.ts.
 * Individual type definitions from auth.ts, infra.ts, and services.ts
 * are validated through the env.schema.test.ts and env.loader.test.ts.
 */

import { describe, expect, it } from 'vitest';

import type { AppConfig, ElasticsearchSearchConfig, SearchConfig, SqlSearchConfig } from '.';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal valid AppConfig for testing.
 * Satisfies all required fields with sensible defaults.
 */
function createMinimalAppConfig(): AppConfig {
  return {
    env: 'development',
    server: {
      host: 'localhost',
      port: 8080,
      portFallbacks: [8081, 8082],
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      trustProxy: false,
      logLevel: 'info',
      maintenanceMode: false,
      appBaseUrl: 'http://localhost:3000',
      apiBaseUrl: 'http://localhost:8080',
      rateLimit: {
        windowMs: 60000,
        max: 100,
      },
    },
    database: {
      provider: 'sqlite',
      filePath: ':memory:',
      walMode: true,
      foreignKeys: true,
      timeout: 5000,
    },
    auth: {
      strategies: ['local'],
      jwt: {
        secret: 'test-secret-at-least-32-chars-long',
        accessTokenExpiry: '15m',
        issuer: 'test-issuer',
        audience: 'test-audience',
      },
      refreshToken: {
        expiryDays: 30,
        gracePeriodSeconds: 10,
      },
      argon2: {
        type: 2,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      },
      password: {
        minLength: 8,
        maxLength: 128,
        minZxcvbnScore: 3,
      },
      lockout: {
        maxAttempts: 5,
        lockoutDurationMs: 900000,
        progressiveDelay: true,
        baseDelayMs: 1000,
      },
      bffMode: false,
      proxy: {
        trustProxy: false,
        trustedProxies: [],
        maxProxyDepth: 1,
      },
      rateLimit: {
        login: { max: 5, windowMs: 900000 },
        register: { max: 3, windowMs: 3600000 },
        forgotPassword: { max: 3, windowMs: 3600000 },
        verifyEmail: { max: 5, windowMs: 3600000 },
      },
      cookie: {
        name: 'refresh_token',
        secret: 'cookie-secret-at-least-32-chars',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      },
      oauth: {},
      magicLink: {
        tokenExpiryMinutes: 15,
        maxAttempts: 3,
      },
      totp: {
        issuer: 'TestApp',
        window: 1,
      },
    },
    email: {
      provider: 'console',
      smtp: {
        host: 'localhost',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        socketTimeout: 10000,
      },
      from: {
        name: 'Test App',
        address: 'noreply@test.com',
      },
      replyTo: 'support@test.com',
    },
    storage: {
      provider: 'local',
      rootPath: './uploads',
    },
    billing: {
      enabled: false,
      provider: 'stripe',
      currency: 'usd',
      stripe: {
        secretKey: 'sk_test_mock',
        publishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_mock',
      },
      paypal: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        webhookId: 'test-webhook-id',
        sandbox: true,
      },
      plans: {},
      urls: {
        portalReturnUrl: 'http://localhost:3000/billing',
        checkoutSuccessUrl: 'http://localhost:3000/checkout/success',
        checkoutCancelUrl: 'http://localhost:3000/checkout/cancel',
      },
    },
    cache: {
      ttl: 3600000,
      maxSize: 1000,
      useExternalProvider: false,
    },
    queue: {
      provider: 'local',
      pollIntervalMs: 1000,
      concurrency: 5,
      defaultMaxAttempts: 3,
      backoffBaseMs: 1000,
      maxBackoffMs: 60000,
    },
    notifications: {
      enabled: false,
      provider: 'fcm',
      config: {
        credentials: '{}',
        projectId: 'test-project',
      },
    },
    search: {
      provider: 'sql',
      config: {
        defaultPageSize: 20,
        maxPageSize: 100,
      },
    },
    packageManager: {
      provider: 'pnpm',
      strictPeerDeps: true,
      frozenLockfile: true,
    },
  };
}

// ============================================================================
// SqlSearchConfig Tests
// ============================================================================

describe('SqlSearchConfig', () => {
  describe('structure validation', () => {
    it('should accept valid SQL search configuration', () => {
      const config: SqlSearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 20,
          maxPageSize: 100,
        },
      };

      expect(config.provider).toBe('sql');
      expect(config.config.defaultPageSize).toBe(20);
      expect(config.config.maxPageSize).toBe(100);
    });

    it('should accept SQL search config with all optional fields', () => {
      const config: SqlSearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 50,
          maxPageSize: 200,
          maxQueryDepth: 5,
          maxConditions: 10,
          logging: true,
          timeout: 5000,
        },
      };

      expect(config.config.maxQueryDepth).toBe(5);
      expect(config.config.maxConditions).toBe(10);
      expect(config.config.logging).toBe(true);
      expect(config.config.timeout).toBe(5000);
    });
  });

  describe('type discrimination', () => {
    it('should have provider as discriminant', () => {
      const config: SqlSearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 20,
          maxPageSize: 100,
        },
      };

      // TypeScript should narrow the type based on provider
      if (config.provider === 'sql') {
        expect(config.config.defaultPageSize).toBeDefined();
        expect(config.config.maxPageSize).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle boundary values for page sizes', () => {
      const config: SqlSearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 1,
          maxPageSize: 1000,
        },
      };

      expect(config.config.defaultPageSize).toBe(1);
      expect(config.config.maxPageSize).toBe(1000);
    });

    it('should handle undefined optional fields', () => {
      const config: SqlSearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 20,
          maxPageSize: 100,
        },
      };

      expect(config.config.maxQueryDepth).toBeUndefined();
      expect(config.config.maxConditions).toBeUndefined();
      expect(config.config.logging).toBeUndefined();
      expect(config.config.timeout).toBeUndefined();
    });
  });
});

// ============================================================================
// ElasticsearchSearchConfig Tests
// ============================================================================

describe('ElasticsearchSearchConfig', () => {
  describe('structure validation', () => {
    it('should accept valid Elasticsearch configuration', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'http://localhost:9200',
          index: 'test-index',
        },
      };

      expect(config.provider).toBe('elasticsearch');
      expect(config.config.node).toBe('http://localhost:9200');
      expect(config.config.index).toBe('test-index');
    });

    it('should accept Elasticsearch config with basic auth', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'https://es.example.com',
          index: 'production-index',
          auth: {
            username: 'elastic',
            password: 'secure-password',
          },
        },
      };

      expect(config.config.auth?.username).toBe('elastic');
      expect(config.config.auth?.password).toBe('secure-password');
    });

    it('should accept Elasticsearch config with API key', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'https://es.example.com',
          index: 'production-index',
          apiKey: 'base64-encoded-key',
        },
      };

      expect(config.config.apiKey).toBe('base64-encoded-key');
    });

    it('should accept Elasticsearch config with all optional fields', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'https://es.example.com:9243',
          index: 'production-index',
          auth: {
            username: 'user',
            password: 'pass',
          },
          apiKey: 'api-key',
          tls: true,
          requestTimeout: 30000,
        },
      };

      expect(config.config.tls).toBe(true);
      expect(config.config.requestTimeout).toBe(30000);
    });
  });

  describe('type discrimination', () => {
    it('should have provider as discriminant', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'http://localhost:9200',
          index: 'test-index',
        },
      };

      if (config.provider === 'elasticsearch') {
        expect(config.config.node).toBeDefined();
        expect(config.config.index).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle various URL formats', () => {
      const configs: ElasticsearchSearchConfig[] = [
        {
          provider: 'elasticsearch',
          config: {
            node: 'http://localhost:9200',
            index: 'idx',
          },
        },
        {
          provider: 'elasticsearch',
          config: {
            node: 'https://es.example.com:9243',
            index: 'idx',
          },
        },
        {
          provider: 'elasticsearch',
          config: {
            node: 'http://192.168.1.1:9200',
            index: 'idx',
          },
        },
      ];

      configs.forEach((config) => {
        expect(config.config.node).toBeTruthy();
        expect(config.config.index).toBeTruthy();
      });
    });

    it('should handle undefined optional fields', () => {
      const config: ElasticsearchSearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'http://localhost:9200',
          index: 'test',
        },
      };

      expect(config.config.auth).toBeUndefined();
      expect(config.config.apiKey).toBeUndefined();
      expect(config.config.tls).toBeUndefined();
      expect(config.config.requestTimeout).toBeUndefined();
    });
  });
});

// ============================================================================
// SearchConfig Union Type Tests
// ============================================================================

describe('SearchConfig', () => {
  describe('discriminated union', () => {
    it('should accept SQL search config', () => {
      const config: SearchConfig = {
        provider: 'sql',
        config: {
          defaultPageSize: 20,
          maxPageSize: 100,
        },
      };

      expect(config.provider).toBe('sql');
    });

    it('should accept Elasticsearch search config', () => {
      const config: SearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'http://localhost:9200',
          index: 'test-index',
        },
      };

      expect(config.provider).toBe('elasticsearch');
    });

    it('should narrow type based on provider discriminant', () => {
      const configs: SearchConfig[] = [
        {
          provider: 'sql',
          config: {
            defaultPageSize: 20,
            maxPageSize: 100,
          },
        },
        {
          provider: 'elasticsearch',
          config: {
            node: 'http://localhost:9200',
            index: 'test-index',
          },
        },
      ];

      configs.forEach((config) => {
        if (config.provider === 'sql') {
          expect(config.config.defaultPageSize).toBeDefined();
          expect(config.config.maxPageSize).toBeDefined();
        } else if (config.provider === 'elasticsearch') {
          expect(config.config.node).toBeDefined();
          expect(config.config.index).toBeDefined();
        }
      });
    });
  });

  describe('type safety', () => {
    it('should handle SQL provider correctly', () => {
      const handleSearchConfig = (config: SearchConfig): number | string => {
        if (config.provider === 'sql') {
          return config.config.defaultPageSize;
        }
        // Exhaustive check: config must be ElasticsearchSearchConfig
        const esConfig = config;
        return esConfig.config.node;
      };

      const sqlConfig: SearchConfig = {
        provider: 'sql',
        config: { defaultPageSize: 50, maxPageSize: 200 },
      };

      expect(handleSearchConfig(sqlConfig)).toBe(50);
    });

    it('should handle Elasticsearch provider correctly', () => {
      const handleSearchConfig = (config: SearchConfig): number | string => {
        if (config.provider === 'elasticsearch') {
          return config.config.node;
        }
        // Exhaustive check: config must be SqlSearchConfig
        const sqlConfig = config;
        return sqlConfig.config.defaultPageSize;
      };

      const esConfig: SearchConfig = {
        provider: 'elasticsearch',
        config: {
          node: 'http://es.local:9200',
          index: 'prod',
        },
      };

      expect(handleSearchConfig(esConfig)).toBe('http://es.local:9200');
    });
  });
});

// ============================================================================
// AppConfig Interface Tests
// ============================================================================

describe('AppConfig', () => {
  describe('structure validation', () => {
    it('should accept minimal valid configuration', () => {
      const config = createMinimalAppConfig();

      expect(config.env).toBe('development');
      expect(config.server).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.email).toBeDefined();
      expect(config.storage).toBeDefined();
      expect(config.billing).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.queue).toBeDefined();
      expect(config.notifications).toBeDefined();
      expect(config.search).toBeDefined();
      expect(config.packageManager).toBeDefined();
    });

    it('should accept development environment', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        env: 'development',
      };

      expect(config.env).toBe('development');
    });

    it('should accept production environment', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        env: 'production',
      };

      expect(config.env).toBe('production');
    });

    it('should accept test environment', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        env: 'test',
      };

      expect(config.env).toBe('test');
    });
  });

  describe('nested configuration validation', () => {
    it('should have valid server configuration', () => {
      const config = createMinimalAppConfig();

      expect(config.server.host).toBe('localhost');
      expect(config.server.port).toBe(8080);
      expect(config.server.cors).toBeDefined();
      expect(config.server.cors.origin).toBeInstanceOf(Array);
      expect(config.server.logLevel).toBe('info');
    });

    it('should have valid database configuration', () => {
      const config = createMinimalAppConfig();

      expect(config.database.provider).toBe('sqlite');
      expect(config.database).toHaveProperty('filePath');
    });

    it('should have valid auth configuration', () => {
      const config = createMinimalAppConfig();

      expect(config.auth.strategies).toBeInstanceOf(Array);
      expect(config.auth.jwt).toBeDefined();
      expect(config.auth.jwt.secret).toBeTruthy();
      expect(config.auth.refreshToken).toBeDefined();
      expect(config.auth.password).toBeDefined();
      expect(config.auth.lockout).toBeDefined();
    });

    it('should have valid search configuration', () => {
      const config = createMinimalAppConfig();

      expect(config.search.provider).toBe('sql');
      if (config.search.provider === 'sql') {
        expect(config.search.config.defaultPageSize).toBe(20);
        expect(config.search.config.maxPageSize).toBe(100);
      }
    });
  });

  describe('database provider variations', () => {
    it('should accept PostgreSQL database config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        database: {
          provider: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          user: 'testuser',
          password: 'testpass',
          maxConnections: 10,
          portFallbacks: [5433],
          ssl: false,
        },
      };

      expect(config.database.provider).toBe('postgresql');
    });

    it('should accept SQLite database config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        database: {
          provider: 'sqlite',
          filePath: './test.db',
          walMode: true,
          foreignKeys: true,
          timeout: 5000,
        },
      };

      expect(config.database.provider).toBe('sqlite');
    });

    it('should accept MongoDB database config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        database: {
          provider: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          database: 'testdb',
        },
      };

      expect(config.database.provider).toBe('mongodb');
    });

    it('should accept JSON database config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        database: {
          provider: 'json',
          filePath: './data.json',
          persistOnWrite: true,
        },
      };

      expect(config.database.provider).toBe('json');
    });
  });

  describe('storage provider variations', () => {
    it('should accept local storage config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        storage: {
          provider: 'local',
          rootPath: './uploads',
          publicBaseUrl: 'http://localhost:8080/uploads',
        },
      };

      expect(config.storage.provider).toBe('local');
    });

    it('should accept S3 storage config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        storage: {
          provider: 's3',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1',
          bucket: 'test-bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 3600,
        },
      };

      expect(config.storage.provider).toBe('s3');
    });
  });

  describe('package manager variations', () => {
    it('should accept npm package manager config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        packageManager: {
          provider: 'npm',
          audit: true,
          legacyPeerDeps: false,
        },
      };

      expect(config.packageManager.provider).toBe('npm');
    });

    it('should accept pnpm package manager config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        packageManager: {
          provider: 'pnpm',
          strictPeerDeps: true,
          frozenLockfile: true,
        },
      };

      expect(config.packageManager.provider).toBe('pnpm');
    });

    it('should accept yarn package manager config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        packageManager: {
          provider: 'yarn',
          audit: true,
          frozenLockfile: true,
        },
      };

      expect(config.packageManager.provider).toBe('yarn');
    });
  });

  describe('search provider variations', () => {
    it('should accept SQL search config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        search: {
          provider: 'sql',
          config: {
            defaultPageSize: 25,
            maxPageSize: 150,
            maxQueryDepth: 3,
          },
        },
      };

      expect(config.search.provider).toBe('sql');
    });

    it('should accept Elasticsearch search config', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        search: {
          provider: 'elasticsearch',
          config: {
            node: 'http://localhost:9200',
            index: 'app-data',
            tls: false,
          },
        },
      };

      expect(config.search.provider).toBe('elasticsearch');
    });
  });

  describe('billing provider variations', () => {
    it('should accept Stripe billing provider', () => {
      const config = createMinimalAppConfig();
      config.billing.provider = 'stripe';

      expect(config.billing.provider).toBe('stripe');
      expect(config.billing.stripe).toBeDefined();
    });

    it('should accept PayPal billing provider', () => {
      const config = createMinimalAppConfig();
      config.billing.provider = 'paypal';

      expect(config.billing.provider).toBe('paypal');
      expect(config.billing.paypal).toBeDefined();
    });
  });

  describe('auth strategies variations', () => {
    it('should accept single auth strategy', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        auth: {
          ...createMinimalAppConfig().auth,
          strategies: ['local'],
        },
      };

      expect(config.auth.strategies).toHaveLength(1);
      expect(config.auth.strategies).toContain('local');
    });

    it('should accept multiple auth strategies', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        auth: {
          ...createMinimalAppConfig().auth,
          strategies: ['local', 'google', 'github'],
        },
      };

      expect(config.auth.strategies).toHaveLength(3);
      expect(config.auth.strategies).toContain('local');
      expect(config.auth.strategies).toContain('google');
      expect(config.auth.strategies).toContain('github');
    });

    it('should accept all supported auth strategies', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        auth: {
          ...createMinimalAppConfig().auth,
          strategies: [
            'local',
            'magic',
            'webauthn',
            'google',
            'github',
            'facebook',
            'microsoft',
            'apple',
          ],
        },
      };

      expect(config.auth.strategies).toHaveLength(8);
    });
  });

  describe('notification provider variations', () => {
    it('should accept FCM notification provider', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        notifications: {
          enabled: true,
          provider: 'fcm',
          config: {
            credentials: '{"key": "value"}',
            projectId: 'firebase-project',
          },
        },
      };

      expect(config.notifications.provider).toBe('fcm');
    });

    it('should accept OneSignal notification provider', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        notifications: {
          enabled: true,
          provider: 'onesignal',
          config: {
            restApiKey: 'rest-key',
            userAuthKey: 'auth-key',
            appId: 'app-id',
          },
        },
      };

      expect(config.notifications.provider).toBe('onesignal');
    });

    it('should accept disabled notifications', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        notifications: {
          enabled: false,
          provider: 'fcm',
          config: {
            credentials: '{}',
            projectId: 'test',
          },
        },
      };

      expect(config.notifications.enabled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle BFF mode enabled', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        auth: {
          ...createMinimalAppConfig().auth,
          bffMode: true,
        },
      };

      expect(config.auth.bffMode).toBe(true);
    });

    it('should handle maintenance mode enabled', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        server: {
          ...createMinimalAppConfig().server,
          maintenanceMode: true,
        },
      };

      expect(config.server.maintenanceMode).toBe(true);
    });

    it('should handle external cache provider', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        cache: {
          ttl: 7200000,
          maxSize: 5000,
          useExternalProvider: true,
          externalConfig: {
            host: 'redis.local',
            port: 6379,
          },
        },
      };

      expect(config.cache.useExternalProvider).toBe(true);
      expect(config.cache.externalConfig?.host).toBe('redis.local');
    });

    it('should handle empty auth strategies', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        auth: {
          ...createMinimalAppConfig().auth,
          strategies: [],
        },
      };

      expect(config.auth.strategies).toHaveLength(0);
    });

    it('should handle multiple port fallbacks', () => {
      const config: AppConfig = {
        ...createMinimalAppConfig(),
        server: {
          ...createMinimalAppConfig().server,
          portFallbacks: [8081, 8082, 8083, 8084, 8085],
        },
      };

      expect(config.server.portFallbacks).toHaveLength(5);
    });
  });

  describe('type completeness', () => {
    it('should require all top-level configuration keys', () => {
      // This test verifies compile-time type safety
      // If any required field is missing, TypeScript compilation will fail
      const config: AppConfig = createMinimalAppConfig();

      const requiredKeys: (keyof AppConfig)[] = [
        'env',
        'server',
        'database',
        'auth',
        'email',
        'storage',
        'billing',
        'cache',
        'queue',
        'notifications',
        'search',
        'packageManager',
      ];

      requiredKeys.forEach((key) => {
        expect(config[key]).toBeDefined();
      });
    });

    it('should have consistent environment values', () => {
      const validEnvs: Array<AppConfig['env']> = ['development', 'production', 'test'];

      validEnvs.forEach((env) => {
        const config: AppConfig = {
          ...createMinimalAppConfig(),
          env,
        };

        expect(config.env).toBe(env);
      });
    });
  });
});
