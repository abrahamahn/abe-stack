// apps/server/src/config/infra/server.test.ts
import { describe, expect, test } from 'vitest';

import { loadServerConfig } from './server';

import type { FullEnv } from '@abe-stack/core/config';

describe('Server Configuration', () => {
  describe('loadServerConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadServerConfig({} as unknown as FullEnv);

      expect(config.host).toBe('0.0.0.0');
      expect(config.port).toBe(8080);
      expect(config.cors.origin).toEqual(['http://localhost:5173']);
      expect(config.cors.credentials).toBe(true);
    });

    test('should resolve Discovery URLs with correct priority', () => {
      // App URL
      const appUrlConfig = loadServerConfig({
        PUBLIC_APP_URL: 'https://public.app',
        APP_URL: 'https://internal.app',
      } as unknown as FullEnv);
      expect(appUrlConfig.appBaseUrl).toBe('https://public.app');

      const appUrlConfigFallback = loadServerConfig({
        APP_URL: 'https://internal.app',
        APP_BASE_URL: 'https://base.app',
      } as unknown as FullEnv);
      expect(appUrlConfigFallback.appBaseUrl).toBe('https://internal.app');

      // API URL
      const apiUrlConfig = loadServerConfig({
        PUBLIC_API_URL: 'https://public.api',
        VITE_API_URL: 'https://vite.api',
      } as unknown as FullEnv);
      expect(apiUrlConfig.apiBaseUrl).toBe('https://public.api');

      const apiUrlConfigVite = loadServerConfig({
        VITE_API_URL: 'https://vite.api',
        API_BASE_URL: 'https://base.api',
      } as unknown as FullEnv);
      expect(apiUrlConfigVite.apiBaseUrl).toBe('https://vite.api');
    });

    test('should prefer API_PORT over PORT', () => {
      const config = loadServerConfig({
        API_PORT: 3000,
        PORT: 4000,
      } as unknown as FullEnv);

      expect(config.port).toBe(3000);
    });

    test('should include strategic port fallbacks', () => {
      const config = loadServerConfig({} as unknown as FullEnv);
      expect(config.portFallbacks).toEqual([8080, 3000, 5000, 8000]);
    });

    test('should handle production-specific defaults', () => {
      const prod = loadServerConfig({ NODE_ENV: 'production' } as unknown as FullEnv);

      expect(prod.trustProxy).toBe(true);
      expect(prod.rateLimit.max).toBe(100);
    });

    test('should parse CORS origins from both singular and plural env vars', () => {
      const configOrigin = loadServerConfig({
        CORS_ORIGIN: 'https://app.com, https://admin.com',
      } as unknown as FullEnv);
      expect(configOrigin.cors.origin).toEqual(['https://app.com', 'https://admin.com']);

      const configOrigins = loadServerConfig({
        CORS_ORIGINS: 'https://web.com, https://mobile.com',
      } as unknown as FullEnv);
      expect(configOrigins.cors.origin).toEqual(['https://web.com', 'https://mobile.com']);
    });

    test('should handle maintenance mode toggle', () => {
      const normal = loadServerConfig({} as unknown as FullEnv);
      const maintenance = loadServerConfig({ MAINTENANCE_MODE: 'true' } as unknown as FullEnv);

      expect(normal.maintenanceMode).toBe(false);
      expect(maintenance.maintenanceMode).toBe(true);
    });
  });
});
