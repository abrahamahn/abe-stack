// main/shared/src/config/env.validation.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createSchema, parseString } from '../primitives/schema';

import { getRawEnv, validateEnv } from './env.validation';

describe('env.validation', () => {
  describe('getRawEnv', () => {
    it('returns process.env when available', () => {
      const result = getRawEnv();
      expect(typeof result).toBe('object');
      expect(result).toBe(process.env);
    });
  });

  describe('validateEnv', () => {
    it('throws Error for invalid env', () => {
      const schema = createSchema((data: unknown) => {
        const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        return { REQUIRED_VAR: parseString(obj['REQUIRED_VAR'], 'REQUIRED_VAR', { min: 1 }) };
      });

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
