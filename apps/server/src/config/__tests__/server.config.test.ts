// apps/server/src/config/__tests__/server.config.test.ts
import { describe, expect, test } from 'vitest';

import { loadServerConfig } from '@config/server.config';

describe('Server Configuration', () => {
  describe('loadServerConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadServerConfig({});

      expect(config.host).toBe('0.0.0.0');
      expect(config.port).toBe(8080);
      expect(config.cors.origin).toBe('http://localhost:5173,http://localhost:3000');
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']);
      expect(config.trustProxy).toBe(false);
      expect(config.logLevel).toBe('info');
    });

    test('should parse host from env', () => {
      const env = {
        HOST: '127.0.0.1',
      };

      const config = loadServerConfig(env);

      expect(config.host).toBe('127.0.0.1');
    });

    test('should parse port from API_PORT', () => {
      const env = {
        API_PORT: '3000',
      };

      const config = loadServerConfig(env);

      expect(config.port).toBe(3000);
    });

    test('should fallback to PORT when API_PORT not set', () => {
      const env = {
        PORT: '4000',
      };

      const config = loadServerConfig(env);

      expect(config.port).toBe(4000);
    });

    test('should prefer API_PORT over PORT', () => {
      const env = {
        API_PORT: '3000',
        PORT: '4000',
      };

      const config = loadServerConfig(env);

      expect(config.port).toBe(3000);
    });

    test('should include port fallbacks', () => {
      const config = loadServerConfig({});

      expect(config.portFallbacks).toEqual([8080, 8081, 8082, 8083]);
    });

    test('should parse CORS origin', () => {
      const env = {
        CORS_ORIGIN: 'https://example.com',
      };

      const config = loadServerConfig(env);

      expect(config.cors.origin).toBe('https://example.com');
    });

    test('should parse trust proxy setting', () => {
      const trueConfig = loadServerConfig({ TRUST_PROXY: 'true' });
      const falseConfig = loadServerConfig({ TRUST_PROXY: 'false' });
      const emptyConfig = loadServerConfig({});

      expect(trueConfig.trustProxy).toBe(true);
      expect(falseConfig.trustProxy).toBe(false);
      expect(emptyConfig.trustProxy).toBe(false);
    });

    test('should parse log level', () => {
      const env = {
        LOG_LEVEL: 'debug',
      };

      const config = loadServerConfig(env);

      expect(config.logLevel).toBe('debug');
    });

    test('should handle all common log levels', () => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

      levels.forEach((level) => {
        const config = loadServerConfig({ LOG_LEVEL: level });
        expect(config.logLevel).toBe(level);
      });
    });

    test('should always have credentials enabled for CORS', () => {
      const config = loadServerConfig({});

      expect(config.cors.credentials).toBe(true);
    });

    test('should have all standard HTTP methods in CORS', () => {
      const config = loadServerConfig({});

      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
      expect(config.cors.methods).toContain('PUT');
      expect(config.cors.methods).toContain('DELETE');
      expect(config.cors.methods).toContain('PATCH');
      expect(config.cors.methods).toContain('OPTIONS');
    });
  });
});
