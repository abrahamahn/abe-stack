// main/shared/src/system/env/env.test.ts
import { describe, expect, it, vi } from 'vitest';

import { ConfigurationError } from '../errors';
import { createSchema, parseString } from '../../primitives/schema';

import { baseEnvSchema, getRawEnv, validateEnv } from './env';

describe('env', () => {
  // ==========================================================================
  // baseEnvSchema
  // ==========================================================================
  describe('baseEnvSchema', () => {
    it('applies default NODE_ENV of development', () => {
      const result = baseEnvSchema.parse({});
      expect(result.NODE_ENV).toBe('development');
    });

    it('accepts valid NODE_ENV values', () => {
      expect(baseEnvSchema.parse({ NODE_ENV: 'production' }).NODE_ENV).toBe('production');
      expect(baseEnvSchema.parse({ NODE_ENV: 'test' }).NODE_ENV).toBe('test');
      expect(baseEnvSchema.parse({ NODE_ENV: 'development' }).NODE_ENV).toBe('development');
    });

    it('rejects invalid NODE_ENV values', () => {
      expect(() => baseEnvSchema.parse({ NODE_ENV: 'staging' })).toThrow();
    });

    it('accepts optional NEXT_PUBLIC_APP_URL', () => {
      const result = baseEnvSchema.parse({ NEXT_PUBLIC_APP_URL: 'https://example.com' });
      expect(result.NEXT_PUBLIC_APP_URL).toBe('https://example.com');
    });

    it('rejects invalid NEXT_PUBLIC_APP_URL', () => {
      expect(() => baseEnvSchema.parse({ NEXT_PUBLIC_APP_URL: 'not-a-url' })).toThrow();
    });
  });

  // ==========================================================================
  // getRawEnv
  // ==========================================================================
  describe('getRawEnv', () => {
    it('returns process.env when available', () => {
      const result = getRawEnv();
      expect(typeof result).toBe('object');
      expect(result).toBe(process.env);
    });
  });

  // ==========================================================================
  // validateEnv
  // ==========================================================================
  describe('validateEnv', () => {
    it('throws ConfigurationError for invalid env', () => {
      const schema = createSchema((data: unknown) => {
        const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        return { REQUIRED_VAR: parseString(obj['REQUIRED_VAR'], 'REQUIRED_VAR', { min: 1 }) };
      });

      // Mock process.env to not have the required variable
      const originalEnv = process.env;
      vi.stubGlobal('process', { env: {} });

      try {
        expect(() => validateEnv(schema)).toThrow(ConfigurationError);
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('returns validated env for valid input', () => {
      const schema = createSchema((data: unknown) => {
        const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        const nodeEnv = obj['NODE_ENV'];
        return { NODE_ENV: typeof nodeEnv === 'string' ? nodeEnv : 'test' };
      });

      const result = validateEnv(schema);
      expect(result.NODE_ENV).toBeDefined();
    });
  });

  // ==========================================================================
  // Adversarial: baseEnvSchema edge cases
  // ==========================================================================
  describe('adversarial: baseEnvSchema edge cases', () => {
    it('rejects NODE_ENV as empty string', () => {
      expect(() => baseEnvSchema.parse({ NODE_ENV: '' })).toThrow();
    });

    it('rejects NODE_ENV with wrong casing (Production vs production)', () => {
      expect(() => baseEnvSchema.parse({ NODE_ENV: 'Production' })).toThrow();
      expect(() => baseEnvSchema.parse({ NODE_ENV: 'DEVELOPMENT' })).toThrow();
      expect(() => baseEnvSchema.parse({ NODE_ENV: 'TEST' })).toThrow();
    });

    it('rejects NODE_ENV as a number', () => {
      expect(() => baseEnvSchema.parse({ NODE_ENV: 1 })).toThrow();
    });

    it('rejects NODE_ENV as null', () => {
      expect(() => baseEnvSchema.parse({ NODE_ENV: null })).toThrow();
    });

    it('treats null input as empty object (applies defaults)', () => {
      // The schema coerces null to {} and then applies defaults
      const result = baseEnvSchema.parse(null);
      expect(result.NODE_ENV).toBe('development');
    });

    it('treats non-object primitive as empty object (applies defaults)', () => {
      const result = baseEnvSchema.parse(42);
      expect(result.NODE_ENV).toBe('development');
    });

    it('omitting NEXT_PUBLIC_APP_URL leaves it undefined', () => {
      const result = baseEnvSchema.parse({ NODE_ENV: 'test' });
      expect(result.NEXT_PUBLIC_APP_URL).toBeUndefined();
    });

    it('rejects NEXT_PUBLIC_APP_URL with only whitespace', () => {
      expect(() => baseEnvSchema.parse({ NEXT_PUBLIC_APP_URL: '   ' })).toThrow();
    });

    it('rejects NEXT_PUBLIC_APP_URL as ftp:// (not http/https)', () => {
      expect(() => baseEnvSchema.parse({ NEXT_PUBLIC_APP_URL: 'ftp://example.com' })).toThrow();
    });

    it('accepts NEXT_PUBLIC_APP_URL with path and query string', () => {
      const result = baseEnvSchema.parse({
        NEXT_PUBLIC_APP_URL: 'https://example.com/app?foo=bar',
      });
      expect(result.NEXT_PUBLIC_APP_URL).toBe('https://example.com/app?foo=bar');
    });

    it('ignores unknown keys in input (does not throw)', () => {
      const result = baseEnvSchema.parse({
        NODE_ENV: 'production',
        UNKNOWN_KEY: 'some-value',
        ANOTHER_UNKNOWN: 123,
      });
      expect(result.NODE_ENV).toBe('production');
    });
  });

  // ==========================================================================
  // Adversarial: validateEnv edge cases
  // ==========================================================================
  describe('adversarial: validateEnv edge cases', () => {
    it('ConfigurationError message contains "Environment validation failed"', () => {
      const schema = createSchema((data: unknown) => {
        const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        return { MUST_EXIST: parseString(obj['MUST_EXIST'], 'MUST_EXIST', { min: 1 }) };
      });

      const originalEnv = process.env;
      vi.stubGlobal('process', { env: {} });

      try {
        let caught: unknown;
        try {
          validateEnv(schema);
        } catch (e) {
          caught = e;
        }
        expect(caught).toBeInstanceOf(ConfigurationError);
        expect((caught as ConfigurationError).message).toContain('Environment validation failed');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('validateEnv ConfigurationError has variable set to "env"', () => {
      const schema = createSchema((data: unknown) => {
        const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        return { X: parseString(obj['X'], 'X', { min: 1 }) };
      });

      const originalEnv = process.env;
      vi.stubGlobal('process', { env: {} });

      try {
        let caught: unknown;
        try {
          validateEnv(schema);
        } catch (e) {
          caught = e;
        }
        expect((caught as ConfigurationError).variable).toBe('env');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('validateEnv passes through a passthrough schema unchanged', () => {
      const schema = createSchema((data: unknown) => {
        return { raw: data };
      });

      const result = validateEnv(schema);
      expect(result.raw).toBe(process.env);
    });

    it('validateEnv with a schema that always throws wraps correctly as ConfigurationError', () => {
      const schema = createSchema((_data: unknown) => {
        throw new Error('always fails');
      });

      expect(() => validateEnv(schema)).toThrow(ConfigurationError);
    });

    it('numeric string values are preserved as strings by getRawEnv', () => {
      const originalEnv = process.env;
      vi.stubGlobal('process', { env: { PORT: '3000', WORKERS: '4' } });

      try {
        const raw = getRawEnv();
        expect(raw['PORT']).toBe('3000');
        expect(raw['WORKERS']).toBe('4');
        expect(typeof raw['PORT']).toBe('string');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('boolean-like string values are preserved as strings by getRawEnv', () => {
      const originalEnv = process.env;
      vi.stubGlobal('process', { env: { DEBUG: 'true', VERBOSE: 'false' } });

      try {
        const raw = getRawEnv();
        expect(raw['DEBUG']).toBe('true');
        expect(raw['VERBOSE']).toBe('false');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('whitespace-only env values are preserved as-is by getRawEnv', () => {
      const originalEnv = process.env;
      vi.stubGlobal('process', { env: { BLANK: '   ' } });

      try {
        const raw = getRawEnv();
        expect(raw['BLANK']).toBe('   ');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });

    it('special characters in env values are preserved', () => {
      const originalEnv = process.env;
      vi.stubGlobal('process', {
        env: { SECRET: 'p@$$w0rd!#&=+?<>{}[]|\\^~`' },
      });

      try {
        const raw = getRawEnv();
        expect(raw['SECRET']).toBe('p@$$w0rd!#&=+?<>{}[]|\\^~`');
      } finally {
        vi.stubGlobal('process', { env: originalEnv });
      }
    });
  });
});
