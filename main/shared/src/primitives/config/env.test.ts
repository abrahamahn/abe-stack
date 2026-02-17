// main/shared/src/primitives/config/env.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createSchema, parseString } from '../schema';

import { BaseEnvSchema, getRawEnv, validateEnv } from './env';

describe('env', () => {
  // ==========================================================================
  // BaseEnvSchema
  // ==========================================================================
  describe('BaseEnvSchema', () => {
    it('applies default NODE_ENV of development', () => {
      const result = BaseEnvSchema.parse({});
      expect(result.NODE_ENV).toBe('development');
    });

    it('accepts valid NODE_ENV values', () => {
      expect(BaseEnvSchema.parse({ NODE_ENV: 'production' }).NODE_ENV).toBe('production');
      expect(BaseEnvSchema.parse({ NODE_ENV: 'test' }).NODE_ENV).toBe('test');
      expect(BaseEnvSchema.parse({ NODE_ENV: 'development' }).NODE_ENV).toBe('development');
    });

    it('rejects invalid NODE_ENV values', () => {
      expect(() => BaseEnvSchema.parse({ NODE_ENV: 'staging' })).toThrow();
    });

    it('defaults PORT to 8080', () => {
      const result = BaseEnvSchema.parse({});
      expect(result.PORT).toBe(8080);
    });

    it('accepts a custom PORT', () => {
      const result = BaseEnvSchema.parse({ PORT: '3000' });
      expect(result.PORT).toBe(3000);
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
    it('throws Error for invalid env', () => {
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
        expect(() => validateEnv(schema)).toThrow(Error);
        expect(() => validateEnv(schema)).toThrow('Environment validation failed');
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

      const result = validateEnv(schema) as { NODE_ENV: string };
      expect(result.NODE_ENV).toBeDefined();
    });
  });
});
