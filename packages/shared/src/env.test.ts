import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { loadServerEnv, serverEnvSchema } from './env';

describe('Environment Validation', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('serverEnvSchema', () => {
    it('should validate a complete valid environment', () => {
      const validEnv = {
        NODE_ENV: 'development',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        API_PORT: '8080',
        APP_PORT: '3000',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(
          'postgresql://testuser:testpass@localhost:5432/testdb',
        );
        expect(result.data.REDIS_URL).toBe('redis://localhost:6379');
      }
    });

    it('should auto-construct DATABASE_URL from components', () => {
      const env = {
        POSTGRES_HOST: 'db.example.com',
        POSTGRES_PORT: '5433',
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'admin',
        POSTGRES_PASSWORD: 'secret123',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(
          'postgresql://admin:secret123@db.example.com:5433/myapp',
        );
      }
    });

    it('should use provided DATABASE_URL if available', () => {
      const customUrl = 'postgresql://custom:pass@custom.host:5432/customdb';
      const env = {
        DATABASE_URL: customUrl,
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(customUrl);
      }
    });

    it('should apply defaults for optional fields', () => {
      const minimalEnv = {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.POSTGRES_HOST).toBe('localhost');
        expect(result.data.POSTGRES_PORT).toBe(5432);
        expect(result.data.REDIS_HOST).toBe('localhost');
        expect(result.data.REDIS_PORT).toBe(6379);
        expect(result.data.API_PORT).toBe(8080);
      }
    });

    it('should reject JWT_SECRET that is too short', () => {
      const env = {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'short',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject SESSION_SECRET that is too short', () => {
      const env = {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'short',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject default development secrets in production', () => {
      const env = {
        NODE_ENV: 'production',
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'dev_jwt_secret_this_is_long_enough_but_has_dev_prefix',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should require POSTGRES_DB', () => {
      const env = {
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('loadServerEnv', () => {
    it('should return validated environment for valid input', () => {
      const validEnv = {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        JWT_SECRET: 'this_is_a_very_long_jwt_secret_key_for_testing_purposes',
        SESSION_SECRET: 'this_is_a_very_long_session_secret_key_for_testing',
      };

      const result = loadServerEnv(validEnv);
      expect(result).toBeDefined();
      expect(result.POSTGRES_DB).toBe('testdb');
      expect(result.DATABASE_URL).toContain('testdb');
    });

    it('should exit process on invalid environment', () => {
      const invalidEnv = {
        POSTGRES_DB: '',
        JWT_SECRET: 'short',
      };

      loadServerEnv(invalidEnv);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should provide helpful error messages', () => {
      const invalidEnv = {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'pass',
        JWT_SECRET: 'x',
      };

      loadServerEnv(invalidEnv);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid server environment variables'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tip: Check your .env files'),
      );
    });
  });
});
