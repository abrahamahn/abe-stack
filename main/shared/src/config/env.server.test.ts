// main/shared/src/config/env.server.test.ts
import { describe, expect, it } from 'vitest';

import { ServerEnvSchema } from './env.server';

describe('ServerEnvSchema', () => {
  describe('defaults', () => {
    it('defaults HOST to 0.0.0.0', () => {
      const result = ServerEnvSchema.parse({});
      expect(result.HOST).toBe('0.0.0.0');
    });

    it('defaults PORT to 8080', () => {
      const result = ServerEnvSchema.parse({});
      expect(result.PORT).toBe(8080);
    });

    it('defaults HEALTH_PORT to 8081', () => {
      const result = ServerEnvSchema.parse({});
      expect(result.HEALTH_PORT).toBe(8081);
    });

    it('defaults LOG_LEVEL to info', () => {
      const result = ServerEnvSchema.parse({});
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('leaves optional fields undefined when absent', () => {
      const result = ServerEnvSchema.parse({});
      expect(result.API_PORT).toBeUndefined();
      expect(result.APP_PORT).toBeUndefined();
      expect(result.MAINTENANCE_MODE).toBeUndefined();
      expect(result.RATE_LIMIT_WINDOW_MS).toBeUndefined();
      expect(result.RATE_LIMIT_MAX).toBeUndefined();
      expect(result.PUBLIC_API_URL).toBeUndefined();
      expect(result.PUBLIC_APP_URL).toBeUndefined();
      expect(result.APP_URL).toBeUndefined();
      expect(result.API_BASE_URL).toBeUndefined();
      expect(result.APP_BASE_URL).toBeUndefined();
      expect(result.CORS_ORIGIN).toBeUndefined();
      expect(result.CORS_ORIGINS).toBeUndefined();
      expect(result.AUDIT_RETENTION_DAYS).toBeUndefined();
      expect(result.LOG_CLIENT_ERROR_LEVEL).toBeUndefined();
      expect(result.LOG_REQUEST_CONTEXT).toBeUndefined();
      expect(result.LOG_PRETTY_JSON).toBeUndefined();
    });
  });

  describe('HOST', () => {
    it('accepts a custom host', () => {
      expect(ServerEnvSchema.parse({ HOST: '127.0.0.1' }).HOST).toBe('127.0.0.1');
    });

    it('accepts a hostname', () => {
      expect(ServerEnvSchema.parse({ HOST: 'app.internal' }).HOST).toBe('app.internal');
    });

    it('rejects a non-string HOST', () => {
      expect(() => ServerEnvSchema.parse({ HOST: 12345 })).toThrow();
    });
  });

  describe('PORT', () => {
    it('accepts a custom port', () => {
      const result = ServerEnvSchema.parse({ PORT: 3000 });
      expect(result.PORT).toBe(3000);
    });

    it('coerces a string port', () => {
      const result = ServerEnvSchema.parse({ PORT: '4000' });
      expect(result.PORT).toBe(4000);
    });

    it('rejects a non-numeric string', () => {
      expect(() => ServerEnvSchema.parse({ PORT: 'http' })).toThrow();
    });

    it('accepts port 0 (no minimum enforced at schema level)', () => {
      const result = ServerEnvSchema.parse({ PORT: 0 });
      expect(result.PORT).toBe(0);
    });

    it('accepts port 65535 (no maximum enforced at schema level)', () => {
      const result = ServerEnvSchema.parse({ PORT: 65535 });
      expect(result.PORT).toBe(65535);
    });
  });

  describe('HEALTH_PORT', () => {
    it('accepts a custom health port', () => {
      const result = ServerEnvSchema.parse({ HEALTH_PORT: 9000 });
      expect(result.HEALTH_PORT).toBe(9000);
    });

    it('coerces a string health port', () => {
      const result = ServerEnvSchema.parse({ HEALTH_PORT: '9001' });
      expect(result.HEALTH_PORT).toBe(9001);
    });

    it('rejects an alphabetic health port', () => {
      expect(() => ServerEnvSchema.parse({ HEALTH_PORT: 'healthz' })).toThrow();
    });
  });

  describe('API_PORT and APP_PORT', () => {
    it('accepts optional API_PORT', () => {
      const result = ServerEnvSchema.parse({ API_PORT: 3001 });
      expect(result.API_PORT).toBe(3001);
    });

    it('accepts optional APP_PORT', () => {
      const result = ServerEnvSchema.parse({ APP_PORT: 3002 });
      expect(result.APP_PORT).toBe(3002);
    });

    it('coerces API_PORT from string', () => {
      const result = ServerEnvSchema.parse({ API_PORT: '3001' });
      expect(result.API_PORT).toBe(3001);
    });

    it('rejects non-numeric API_PORT', () => {
      expect(() => ServerEnvSchema.parse({ API_PORT: 'api' })).toThrow();
    });
  });

  describe('MAINTENANCE_MODE', () => {
    it('accepts true', () => {
      expect(ServerEnvSchema.parse({ MAINTENANCE_MODE: 'true' }).MAINTENANCE_MODE).toBe('true');
    });

    it('accepts false', () => {
      expect(ServerEnvSchema.parse({ MAINTENANCE_MODE: 'false' }).MAINTENANCE_MODE).toBe('false');
    });

    it('rejects 1', () => {
      expect(() => ServerEnvSchema.parse({ MAINTENANCE_MODE: '1' })).toThrow();
    });

    it('rejects a boolean value', () => {
      expect(() => ServerEnvSchema.parse({ MAINTENANCE_MODE: true })).toThrow();
    });

    it('rejects on', () => {
      expect(() => ServerEnvSchema.parse({ MAINTENANCE_MODE: 'on' })).toThrow();
    });
  });

  describe('LOG_LEVEL', () => {
    it('accepts debug', () => {
      expect(ServerEnvSchema.parse({ LOG_LEVEL: 'debug' }).LOG_LEVEL).toBe('debug');
    });

    it('accepts info', () => {
      expect(ServerEnvSchema.parse({ LOG_LEVEL: 'info' }).LOG_LEVEL).toBe('info');
    });

    it('accepts warn', () => {
      expect(ServerEnvSchema.parse({ LOG_LEVEL: 'warn' }).LOG_LEVEL).toBe('warn');
    });

    it('accepts error', () => {
      expect(ServerEnvSchema.parse({ LOG_LEVEL: 'error' }).LOG_LEVEL).toBe('error');
    });

    it('rejects trace (not in the four-value enum)', () => {
      expect(() => ServerEnvSchema.parse({ LOG_LEVEL: 'trace' })).toThrow();
    });

    it('rejects fatal', () => {
      expect(() => ServerEnvSchema.parse({ LOG_LEVEL: 'fatal' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => ServerEnvSchema.parse({ LOG_LEVEL: '' })).toThrow();
    });

    it('rejects uppercase DEBUG', () => {
      expect(() => ServerEnvSchema.parse({ LOG_LEVEL: 'DEBUG' })).toThrow();
    });
  });

  describe('LOG_CLIENT_ERROR_LEVEL', () => {
    it('accepts debug', () => {
      expect(
        ServerEnvSchema.parse({ LOG_CLIENT_ERROR_LEVEL: 'debug' }).LOG_CLIENT_ERROR_LEVEL,
      ).toBe('debug');
    });

    it('accepts warn', () => {
      expect(ServerEnvSchema.parse({ LOG_CLIENT_ERROR_LEVEL: 'warn' }).LOG_CLIENT_ERROR_LEVEL).toBe(
        'warn',
      );
    });

    it('rejects verbose', () => {
      expect(() => ServerEnvSchema.parse({ LOG_CLIENT_ERROR_LEVEL: 'verbose' })).toThrow();
    });

    it('rejects trace', () => {
      expect(() => ServerEnvSchema.parse({ LOG_CLIENT_ERROR_LEVEL: 'trace' })).toThrow();
    });
  });

  describe('URL fields', () => {
    it('accepts valid PUBLIC_API_URL', () => {
      const result = ServerEnvSchema.parse({ PUBLIC_API_URL: 'https://api.example.com' });
      expect(result.PUBLIC_API_URL).toBe('https://api.example.com');
    });

    it('accepts valid PUBLIC_APP_URL', () => {
      const result = ServerEnvSchema.parse({ PUBLIC_APP_URL: 'https://app.example.com' });
      expect(result.PUBLIC_APP_URL).toBe('https://app.example.com');
    });

    it('accepts valid APP_URL', () => {
      const result = ServerEnvSchema.parse({ APP_URL: 'https://myapp.example.com' });
      expect(result.APP_URL).toBe('https://myapp.example.com');
    });

    it('accepts valid API_BASE_URL', () => {
      const result = ServerEnvSchema.parse({ API_BASE_URL: 'https://api.example.com/v1' });
      expect(result.API_BASE_URL).toBe('https://api.example.com/v1');
    });

    it('accepts valid APP_BASE_URL', () => {
      const result = ServerEnvSchema.parse({ APP_BASE_URL: 'https://example.com' });
      expect(result.APP_BASE_URL).toBe('https://example.com');
    });

    it('rejects PUBLIC_API_URL without a protocol', () => {
      expect(() => ServerEnvSchema.parse({ PUBLIC_API_URL: 'api.example.com' })).toThrow();
    });

    it('rejects APP_URL without a protocol', () => {
      expect(() => ServerEnvSchema.parse({ APP_URL: 'myapp.example.com' })).toThrow();
    });

    it('rejects a non-string APP_URL', () => {
      expect(() => ServerEnvSchema.parse({ APP_URL: 8080 })).toThrow();
    });

    it('rejects an empty string URL', () => {
      expect(() => ServerEnvSchema.parse({ PUBLIC_APP_URL: '' })).toThrow();
    });
  });

  describe('CORS fields', () => {
    it('accepts a CORS_ORIGIN string', () => {
      const result = ServerEnvSchema.parse({ CORS_ORIGIN: 'https://app.example.com' });
      expect(result.CORS_ORIGIN).toBe('https://app.example.com');
    });

    it('accepts a comma-separated CORS_ORIGINS string', () => {
      const result = ServerEnvSchema.parse({
        CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
      });
      expect(result.CORS_ORIGINS).toBe('https://app.example.com,https://admin.example.com');
    });

    it('rejects a non-string CORS_ORIGIN', () => {
      expect(() => ServerEnvSchema.parse({ CORS_ORIGIN: ['https://app.example.com'] })).toThrow();
    });
  });

  describe('rate limit fields', () => {
    it('accepts RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX', () => {
      const result = ServerEnvSchema.parse({
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX: 100,
      });
      expect(result.RATE_LIMIT_WINDOW_MS).toBe(60000);
      expect(result.RATE_LIMIT_MAX).toBe(100);
    });

    it('coerces rate limit fields from strings', () => {
      const result = ServerEnvSchema.parse({
        RATE_LIMIT_WINDOW_MS: '30000',
        RATE_LIMIT_MAX: '50',
      });
      expect(result.RATE_LIMIT_WINDOW_MS).toBe(30000);
      expect(result.RATE_LIMIT_MAX).toBe(50);
    });

    it('rejects non-numeric RATE_LIMIT_WINDOW_MS', () => {
      expect(() => ServerEnvSchema.parse({ RATE_LIMIT_WINDOW_MS: 'minute' })).toThrow();
    });
  });

  describe('AUDIT_RETENTION_DAYS', () => {
    it('accepts a positive integer', () => {
      const result = ServerEnvSchema.parse({ AUDIT_RETENTION_DAYS: 90 });
      expect(result.AUDIT_RETENTION_DAYS).toBe(90);
    });

    it('coerces from string', () => {
      const result = ServerEnvSchema.parse({ AUDIT_RETENTION_DAYS: '365' });
      expect(result.AUDIT_RETENTION_DAYS).toBe(365);
    });

    it('rejects an alphabetic value', () => {
      expect(() => ServerEnvSchema.parse({ AUDIT_RETENTION_DAYS: 'forever' })).toThrow();
    });
  });

  describe('LOG_REQUEST_CONTEXT and LOG_PRETTY_JSON', () => {
    it('accepts true for LOG_REQUEST_CONTEXT', () => {
      expect(ServerEnvSchema.parse({ LOG_REQUEST_CONTEXT: 'true' }).LOG_REQUEST_CONTEXT).toBe(
        'true',
      );
    });

    it('accepts false for LOG_PRETTY_JSON', () => {
      expect(ServerEnvSchema.parse({ LOG_PRETTY_JSON: 'false' }).LOG_PRETTY_JSON).toBe('false');
    });

    it('rejects invalid LOG_REQUEST_CONTEXT value', () => {
      expect(() => ServerEnvSchema.parse({ LOG_REQUEST_CONTEXT: 'enabled' })).toThrow();
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => ServerEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => ServerEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => ServerEnvSchema.parse('info')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = ServerEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid LOG_LEVEL without throwing', () => {
      const result = ServerEnvSchema.safeParse({ LOG_LEVEL: 'verbose' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for a URL without protocol without throwing', () => {
      const result = ServerEnvSchema.safeParse({ APP_URL: 'myapp.example.com' });
      expect(result.success).toBe(false);
    });
  });
});
