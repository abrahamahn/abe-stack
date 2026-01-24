// apps/server/src/config/factory.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { load } from './factory';

describe('Configuration Loader', () => {
  const validEnv = {
    NODE_ENV: 'test' as const,
    JWT_SECRET: 'a-very-secure-secret-key-32-chars-long!',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SEARCH_PROVIDER: 'sql' as const,
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test('should load configuration with all domains', () => {
    const config = load(validEnv);

    expect(config.env).toBe('test');
    expect(config.auth.jwt.secret).toBe(validEnv.JWT_SECRET);
    expect(config.database.provider).toBe('postgresql');
    expect(config.notifications.enabled).toBe(false); // Default
  });

  test('should enforce production security policies', () => {
    const prodEnv = {
      ...validEnv,
      NODE_ENV: 'production' as const,
      EMAIL_PROVIDER: 'smtp' as const,
      SMTP_HOST: 'smtp.sendgrid.net',
      DB_SSL: 'true',
    };

    const config = load(prodEnv);
    expect(config.auth.cookie.secure).toBe(true);
    if (config.database.provider !== 'postgresql') {
      throw new Error('Expected postgresql');
    }
    expect(config.database.ssl).toBe(true);
  });

  test('should fail fast on invalid Zod schema', () => {
    // Missing JWT_SECRET which should be required in FullEnvSchema
    const invalidEnv = { NODE_ENV: 'development' as const };

    // We mock process.exit so the test doesn't kill the runner
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    expect(() => load(invalidEnv as any)).toThrow();
    exitSpy.mockRestore();
  });

  test('should collect multiple validation errors', () => {
    const badConfig = {
      ...validEnv,
      NODE_ENV: 'production' as const,
      EMAIL_PROVIDER: 'console' as const, // Forbidden in prod
      DB_SSL: 'false', // Forbidden in prod
    };

    expect(() => load(badConfig)).toThrow('Server failed to start: Invalid Configuration');
  });
});
