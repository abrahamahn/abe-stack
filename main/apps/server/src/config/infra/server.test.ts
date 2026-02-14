// main/apps/server/src/config/infra/server.test.ts
import { describe, expect, test } from 'vitest';

import { loadServerConfig } from './server';

import type { FullEnv } from '@abe-stack/shared/config';

/**
 * Creates a base environment with server-related defaults (as applied by Zod schema).
 * Used to simulate properly parsed FullEnv in tests.
 */
function createBaseEnv(overrides: Partial<FullEnv> = {}): FullEnv {
  return {
    HOST: '0.0.0.0',
    PORT: 8080,
    APP_PORT: 5173,
    LOG_LEVEL: 'info',
    ...overrides,
  } as unknown as FullEnv;
}

describe('Server Configuration', () => {
  describe('loadServerConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadServerConfig(createBaseEnv());

      expect(config.host).toBe('0.0.0.0');
      expect(config.port).toBe(8080);
      expect(config.cors.origin).toEqual(['http://localhost:5173']);
      expect(config.cors.credentials).toBe(true);
    });

    test('should resolve Discovery URLs with correct priority', () => {
      // App URL
      const appUrlConfig = loadServerConfig(
        createBaseEnv({
          PUBLIC_APP_URL: 'https://public.app',
          APP_URL: 'https://internal.app',
        }),
      );
      expect(appUrlConfig.appBaseUrl).toBe('https://public.app');

      const appUrlConfigFallback = loadServerConfig(
        createBaseEnv({
          APP_URL: 'https://internal.app',
          APP_BASE_URL: 'https://base.app',
        }),
      );
      expect(appUrlConfigFallback.appBaseUrl).toBe('https://internal.app');

      // API URL
      const apiUrlConfig = loadServerConfig(
        createBaseEnv({
          PUBLIC_API_URL: 'https://public.api',
          VITE_API_URL: 'https://vite.api',
        }),
      );
      expect(apiUrlConfig.apiBaseUrl).toBe('https://public.api');

      const apiUrlConfigVite = loadServerConfig(
        createBaseEnv({
          VITE_API_URL: 'https://vite.api',
          API_BASE_URL: 'https://base.api',
        }),
      );
      expect(apiUrlConfigVite.apiBaseUrl).toBe('https://vite.api');
    });

    test('should prefer API_PORT over PORT', () => {
      const config = loadServerConfig(
        createBaseEnv({
          API_PORT: 3000,
          PORT: 4000,
        }),
      );

      expect(config.port).toBe(3000);
    });

    test('should include strategic port fallbacks', () => {
      const config = loadServerConfig(createBaseEnv());
      expect(config.portFallbacks).toEqual([8080, 3000, 5000, 8000]);
    });

    test('should handle production-specific defaults', () => {
      const prod = loadServerConfig(createBaseEnv({ NODE_ENV: 'production' }));

      expect(prod.trustProxy).toBe(true);
      expect(prod.rateLimit.max).toBe(100);
      expect(prod.logging.prettyJson).toBe(false);
    });

    test('should default pretty JSON logs to enabled in non-production', () => {
      const dev = loadServerConfig(createBaseEnv({ NODE_ENV: 'development' }));
      expect(dev.logging.prettyJson).toBe(true);
    });

    test('should honor LOG_PRETTY_JSON override', () => {
      const forcedOff = loadServerConfig(createBaseEnv({ NODE_ENV: 'development', LOG_PRETTY_JSON: 'false' }));
      const forcedOn = loadServerConfig(createBaseEnv({ NODE_ENV: 'production', LOG_PRETTY_JSON: 'true' }));

      expect(forcedOff.logging.prettyJson).toBe(false);
      expect(forcedOn.logging.prettyJson).toBe(true);
    });

    test('should parse CORS origins from both singular and plural env vars', () => {
      const configOrigin = loadServerConfig(
        createBaseEnv({
          CORS_ORIGIN: 'https://app.com, https://admin.com',
        }),
      );
      expect(configOrigin.cors.origin).toEqual(['https://app.com', 'https://admin.com']);

      const configOrigins = loadServerConfig(
        createBaseEnv({
          CORS_ORIGINS: 'https://web.com, https://mobile.com',
        }),
      );
      expect(configOrigins.cors.origin).toEqual(['https://web.com', 'https://mobile.com']);
    });

    test('should handle maintenance mode toggle', () => {
      const normal = loadServerConfig(createBaseEnv());
      const maintenance = loadServerConfig(createBaseEnv({ MAINTENANCE_MODE: 'true' }));

      expect(normal.maintenanceMode).toBe(false);
      expect(maintenance.maintenanceMode).toBe(true);
    });

    test('should default audit retention to 90 days', () => {
      const config = loadServerConfig(createBaseEnv());
      expect(config.auditRetentionDays).toBe(90);
    });

    test('should use custom audit retention when set', () => {
      const config = loadServerConfig(createBaseEnv({ AUDIT_RETENTION_DAYS: 30 }));
      expect(config.auditRetentionDays).toBe(30);
    });

    test('should allow 0 for unlimited audit retention', () => {
      const config = loadServerConfig(createBaseEnv({ AUDIT_RETENTION_DAYS: 0 }));
      expect(config.auditRetentionDays).toBe(0);
    });
  });
});
