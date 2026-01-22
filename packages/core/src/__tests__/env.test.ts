// packages/core/src/__tests__/env.test.ts
import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest';

import {
  envSchema,
  getEnvValidator,
  loadServerEnv,
  serverEnvSchema,
  validateDatabaseEnv,
  validateDevelopmentEnv,
  validateEmailEnv,
  validateEnvironment,
  validateEnvironmentSafe,
  validateProductionEnv,
  validateSecurityEnv,
  validateStorageEnv,
} from '../env';

describe('serverEnvSchema', () => {
  const validEnv = {
    POSTGRES_DB: 'testdb',
    POSTGRES_USER: 'testuser',
    POSTGRES_PASSWORD: 'testpassword',
    JWT_SECRET: 'this-is-a-very-long-jwt-secret-key-for-testing',
    SESSION_SECRET: 'this-is-a-very-long-session-secret-for-testing',
  };

  describe('required fields', () => {
    test('should validate with all required fields', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    test('should fail without POSTGRES_DB', () => {
      const { POSTGRES_DB: _, ...env } = validEnv;
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should fail without POSTGRES_USER', () => {
      const { POSTGRES_USER: _, ...env } = validEnv;
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should fail without POSTGRES_PASSWORD', () => {
      const { POSTGRES_PASSWORD: _, ...env } = validEnv;
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should fail without JWT_SECRET', () => {
      const { JWT_SECRET: _, ...env } = validEnv;
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should fail without SESSION_SECRET', () => {
      const { SESSION_SECRET: _, ...env } = validEnv;
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('default values', () => {
    test('should set default NODE_ENV to development', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });

    test('should set default POSTGRES_HOST to localhost', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POSTGRES_HOST).toBe('localhost');
      }
    });

    test('should set default POSTGRES_PORT to 5432', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POSTGRES_PORT).toBe(5432);
      }
    });

    test('should set default API_PORT to 8080', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.API_PORT).toBe(8080);
      }
    });

    test('should set default STORAGE_PROVIDER to local', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.STORAGE_PROVIDER).toBe('local');
      }
    });
  });

  describe('auto-constructed URLs', () => {
    test('should auto-construct DATABASE_URL when not provided', () => {
      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(
          'postgresql://testuser:testpassword@localhost:5432/testdb',
        );
      }
    });

    test('should use provided DATABASE_URL when given', () => {
      const env = { ...validEnv, DATABASE_URL: 'postgresql://custom:url@host:5432/db' };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe('postgresql://custom:url@host:5432/db');
      }
    });

  });

  describe('validation rules', () => {
    test('should reject JWT_SECRET shorter than 32 characters', () => {
      const env = { ...validEnv, JWT_SECRET: 'short' };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should reject SESSION_SECRET shorter than 32 characters', () => {
      const env = { ...validEnv, SESSION_SECRET: 'short' };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should accept valid NODE_ENV values', () => {
      for (const nodeEnv of ['development', 'production', 'test']) {
        const result = serverEnvSchema.safeParse({ ...validEnv, NODE_ENV: nodeEnv });
        expect(result.success).toBe(true);
      }
    });

    test('should reject invalid NODE_ENV values', () => {
      const result = serverEnvSchema.safeParse({ ...validEnv, NODE_ENV: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('should coerce string port to number', () => {
      const env = { ...validEnv, POSTGRES_PORT: '5433' };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POSTGRES_PORT).toBe(5433);
      }
    });
  });

  describe('production refinement', () => {
    test('should reject dev_ prefixed secrets in production', () => {
      const env = {
        ...validEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'dev_this-is-a-very-long-jwt-secret',
      };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('should allow non-dev secrets in production', () => {
      const env = {
        ...validEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'production-very-long-jwt-secret-key-here',
        SESSION_SECRET: 'production-very-long-session-secret-here',
      };
      const result = serverEnvSchema.safeParse(env);
      expect(result.success).toBe(true);
    });
  });
});

describe('loadServerEnv', () => {
  const validEnv = {
    POSTGRES_DB: 'testdb',
    POSTGRES_USER: 'testuser',
    POSTGRES_PASSWORD: 'testpassword',
    JWT_SECRET: 'this-is-a-very-long-jwt-secret-key-for-testing',
    SESSION_SECRET: 'this-is-a-very-long-session-secret-for-testing',
  };

  let mockExit: MockInstance<(code?: number) => never>;
  let mockConsoleError: MockInstance;

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  test('should return validated env on success', () => {
    const result = loadServerEnv(validEnv);
    expect(result.POSTGRES_DB).toBe('testdb');
    expect(result.POSTGRES_USER).toBe('testuser');
    expect(result.DATABASE_URL).toContain('postgresql://');
  });

  test('should exit with code 1 on validation failure', () => {
    loadServerEnv({});
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('should not log error on validation failure (just exits)', () => {
    loadServerEnv({});
    // The implementation only calls process.exit(1), it does not log errors
    expect(mockConsoleError).not.toHaveBeenCalled();
  });
});

describe('environment helper functions', () => {
  const validEnv = {
    POSTGRES_DB: 'testdb',
    POSTGRES_USER: 'testuser',
    POSTGRES_PASSWORD: 'testpassword',
    JWT_SECRET: 'this-is-a-very-long-jwt-secret-key-for-testing',
    SESSION_SECRET: 'this-is-a-very-long-session-secret-for-testing',
  };

  describe('validateEnvironment', () => {
    test('should return validated env on success', () => {
      const result = validateEnvironment(validEnv);
      expect(result.POSTGRES_DB).toBe('testdb');
    });

    test('should throw on invalid env', () => {
      expect(() => validateEnvironment({})).toThrow();
    });
  });

  describe('validateEnvironmentSafe', () => {
    test('should return success result for valid env', () => {
      const result = validateEnvironmentSafe(validEnv);
      expect(result.success).toBe(true);
    });

    test('should return failure result for invalid env', () => {
      const result = validateEnvironmentSafe({});
      expect(result.success).toBe(false);
    });
  });

  describe('validateDatabaseEnv', () => {
    test('should validate database env successfully', () => {
      const result = validateDatabaseEnv(validEnv);
      expect(result.POSTGRES_DB).toBe('testdb');
      expect(result.POSTGRES_USER).toBe('testuser');
    });
  });

  describe('validateSecurityEnv', () => {
    test('should validate security env successfully', () => {
      const result = validateSecurityEnv(validEnv);
      expect(result.JWT_SECRET).toBeDefined();
      expect(result.SESSION_SECRET).toBeDefined();
    });
  });

  describe('validateStorageEnv', () => {
    test('should validate storage env successfully', () => {
      const result = validateStorageEnv(validEnv);
      expect(result.STORAGE_PROVIDER).toBe('local');
    });
  });

  describe('validateEmailEnv', () => {
    test('should validate email env successfully', () => {
      const result = validateEmailEnv(validEnv);
      expect(result.EMAIL_PROVIDER).toBe('console');
    });
  });

  describe('validateDevelopmentEnv', () => {
    test('should validate development env successfully', () => {
      const devEnv = { ...validEnv, NODE_ENV: 'development' };
      const result = validateDevelopmentEnv(devEnv);
      expect(result.NODE_ENV).toBe('development');
    });

    test('should throw for non-development NODE_ENV', () => {
      const prodEnv = { ...validEnv, NODE_ENV: 'production' };
      expect(() => validateDevelopmentEnv(prodEnv)).toThrow('NODE_ENV must be development');
    });
  });

  describe('validateProductionEnv', () => {
    test('should validate production env successfully', () => {
      const prodEnv = {
        ...validEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'production-very-long-jwt-secret-key-here',
        SESSION_SECRET: 'production-very-long-session-secret-here',
      };
      const result = validateProductionEnv(prodEnv);
      expect(result.NODE_ENV).toBe('production');
    });

    test('should throw for non-production NODE_ENV', () => {
      const devEnv = { ...validEnv, NODE_ENV: 'development' };
      expect(() => validateProductionEnv(devEnv)).toThrow('NODE_ENV must be production');
    });
  });

  describe('getEnvValidator', () => {
    test('should return a validator function', () => {
      const validator = getEnvValidator();
      expect(typeof validator).toBe('function');
    });

    test('should validate env using returned function', () => {
      const validator = getEnvValidator();
      const result = validator(validEnv);
      expect(result.POSTGRES_DB).toBe('testdb');
    });

    test('should use custom schema when provided', () => {
      const validator = getEnvValidator(envSchema);
      const result = validator(validEnv);
      expect(result.POSTGRES_DB).toBe('testdb');
    });
  });
});
