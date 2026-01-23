// apps/server/src//__tests__/server..test.ts
import { describe, expect, test } from 'vitest';

import { loadServer } from '@/server.';

describe('Server uration', () => {
  describe('loadServer', () => {
    test('should load default values when no env vars set', () => {
      const  = loadServer({});

      expect(.host).toBe('0.0.0.0');
      expect(.port).toBe(8080);
      expect(.cors.origin).toBe('http://localhost:5173');
      expect(.cors.credentials).toBe(true);
      expect(.cors.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']);
      expect(.trustProxy).toBe(false);
      expect(.logLevel).toBe('info');
    });

    test('should parse host from env', () => {
      const env = {
        HOST: '127.0.0.1',
      };

      const  = loadServer(env);

      expect(.host).toBe('127.0.0.1');
    });

    test('should parse port from API_PORT', () => {
      const env = {
        API_PORT: '3000',
      };

      const  = loadServer(env);

      expect(.port).toBe(3000);
    });

    test('should fallback to PORT when API_PORT not set', () => {
      const env = {
        PORT: '4000',
      };

      const  = loadServer(env);

      expect(.port).toBe(4000);
    });

    test('should prefer API_PORT over PORT', () => {
      const env = {
        API_PORT: '3000',
        PORT: '4000',
      };

      const  = loadServer(env);

      expect(.port).toBe(3000);
    });

    test('should include port fallbacks', () => {
      const  = loadServer({});

      expect(.portFallbacks).toEqual([8080, 8081, 8082, 8083]);
    });

    test('should parse CORS origin', () => {
      const env = {
        CORS_ORIGIN: 'https://example.com',
      };

      const  = loadServer(env);

      expect(.cors.origin).toBe('https://example.com');
    });

    test('should parse trust proxy setting', () => {
      const true = loadServer({ TRUST_PROXY: 'true' });
      const false = loadServer({ TRUST_PROXY: 'false' });
      const empty = loadServer({});

      expect(true.trustProxy).toBe(true);
      expect(false.trustProxy).toBe(false);
      expect(empty.trustProxy).toBe(false);
    });

    test('should parse log level', () => {
      const env = {
        LOG_LEVEL: 'debug',
      };

      const  = loadServer(env);

      expect(.logLevel).toBe('debug');
    });

    test('should handle all common log levels', () => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

      levels.forEach((level) => {
        const  = loadServer({ LOG_LEVEL: level });
        expect(.logLevel).toBe(level);
      });
    });

    test('should always have credentials enabled for CORS', () => {
      const  = loadServer({});

      expect(.cors.credentials).toBe(true);
    });

    test('should have all standard HTTP methods in CORS', () => {
      const  = loadServer({});

      expect(.cors.methods).toContain('GET');
      expect(.cors.methods).toContain('POST');
      expect(.cors.methods).toContain('PUT');
      expect(.cors.methods).toContain('DELETE');
      expect(.cors.methods).toContain('PATCH');
      expect(.cors.methods).toContain('OPTIONS');
    });

    test('should include default rate limiting uration', () => {
      const  = loadServer({});

      expect(.rateLimit).toBeDefined();
      expect(.rateLimit?.windowMs).toBe(60000); // 1 minute default
      expect(.rateLimit?.max).toBe(100);        // 100 requests default
    });

    test('should parse rate limiting uration from env vars', () => {
      const env = {
        RATE_LIMIT_WINDOW_MS: '30000',
        RATE_LIMIT_MAX: '50',
      };

      const  = loadServer(env);

      expect(.rateLimit?.windowMs).toBe(30000);
      expect(.rateLimit?.max).toBe(50);
    });

    test('should fallback to defaults when rate limiting env vars are invalid', () => {
      const env = {
        RATE_LIMIT_WINDOW_MS: 'invalid',
        RATE_LIMIT_MAX: 'also-invalid',
      };

      const  = loadServer(env);

      expect(.rateLimit?.windowMs).toBe(60000);
      expect(.rateLimit?.max).toBe(100);
    });
  });
});
