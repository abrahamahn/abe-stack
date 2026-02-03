// shared/src/core/env.test.ts
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ConfigurationError } from '../core/errors';

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
      const schema = z.object({
        REQUIRED_VAR: z.string().min(1),
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
      const schema = z.object({
        NODE_ENV: z.string().default('test'),
      });

      const result = validateEnv(schema);
      expect(result.NODE_ENV).toBeDefined();
    });
  });
});
