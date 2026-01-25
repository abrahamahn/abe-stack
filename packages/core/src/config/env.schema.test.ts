// packages/core/src/config/schema/__tests__/env.schema.test.ts
import { describe, expect, it } from 'vitest';
import { EnvSchema } from './env.schema';

describe('EnvSchema', () => {
  const baseValidEnv = {
    NODE_ENV: 'development',
    JWT_SECRET: 'super-secret-key-at-least-32-chars-long-reference',
    DATABASE_PROVIDER: 'sqlite',
    SQLITE_FILE_PATH: 'test.db',
  };

  it('should validate a correct development environment', () => {
    const result = EnvSchema.safeParse(baseValidEnv);
    expect(result.success).toBe(true);
  });

  describe('Production Hard-Guards', () => {
    it('should fail if JWT_SECRET is too short in production', () => {
      const prodEnv = {
        ...baseValidEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      };
      const result = EnvSchema.safeParse(prodEnv);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('at least 32 characters');
      }
    });

    it('should fail if a common weak secret is used in production', () => {
      const prodEnv = {
        ...baseValidEnv,
        NODE_ENV: 'production' as const,
        JWT_SECRET: 'jwt_secret_must_be_long_but_not_obvious_password',
      };
      // Password is in weakSecrets list
      const result = EnvSchema.safeParse({
        ...prodEnv,
        JWT_SECRET: 'password'.repeat(4), // making it long enough but still weak
      });
      expect(result.success).toBe(false);

      const weakResult = EnvSchema.safeParse({
        ...prodEnv,
        JWT_SECRET: 'secret'.repeat(10),
      });
      expect(weakResult.success).toBe(false);
    });

    it('should fail if no database is configured in production', () => {
      const prodEnv = {
        ...baseValidEnv,
        NODE_ENV: 'production' as const,
        DATABASE_PROVIDER: 'postgresql' as const,
        // Missing connection info
      };
      // We need to delete other providers to trigger the "no database" error
      const { SQLITE_FILE_PATH, ...rest } = prodEnv;
      const result = EnvSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i: { message: string }) =>
            i.message.includes('valid database configuration'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('Consistency Guards', () => {
    it('should fail if PUBLIC_API_URL and VITE_API_URL mismatch', () => {
      const env = {
        ...baseValidEnv,
        PUBLIC_API_URL: 'https://api.example.com',
        VITE_API_URL: 'https://api.wrong.com',
      };
      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('must match');
      }
    });

    it('should pass if URLs match', () => {
      const env = {
        ...baseValidEnv,
        PUBLIC_API_URL: 'https://api.example.com',
        VITE_API_URL: 'https://api.example.com',
      };
      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(true);
    });
  });
});
