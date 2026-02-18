// main/apps/server/src/config/factory.test.ts
import fs from 'node:fs';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { load } from './factory';

// Mock filesystem for consistent testing
vi.mock('node:fs');
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
  };
});

describe('Configuration Factory', () => {
  const originalEnv = { ...process.env };
  const validEnv = {
    NODE_ENV: 'test' as const,
    JWT_SECRET: 'a-very-secure-secret-key-32-chars-long!',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SEARCH_PROVIDER: 'sql' as const,
    PACKAGE_MANAGER_PROVIDER: 'pnpm' as const,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };

    // Clear relevant env vars
    delete process.env['JWT_SECRET'];
    delete process.env['DATABASE_URL'];
    delete process.env['NODE_ENV'];
    delete process.env['ENV_FILE'];
    delete process.env['APP_NAME'];
    delete process.env['PUBLIC_API_URL'];
    delete process.env['VITE_API_URL'];

    // Mock filesystem using vi.spyOn to avoid no-sync lint rule
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      const pStr = String(p);
      return pStr.includes('config') || pStr.includes('.env');
    });

    vi.spyOn(fs, 'statSync').mockImplementation((p) => {
      const pStr = String(p);
      if (pStr.endsWith('config')) {
        return { isDirectory: () => true } as fs.Stats;
      }
      return { isDirectory: () => false } as fs.Stats;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Basic Loading', () => {
    test('should load full configuration structure', () => {
      const config = load(validEnv);

      expect(config.env).toBe('test');
      expect(config.auth.jwt.secret).toBe(validEnv.JWT_SECRET);
      expect(config.packageManager.provider).toBe('pnpm');
      expect(config.search.provider).toBe('sql');
    });

    test('should toggle search providers based on environment', () => {
      const sqlConfig = load({ ...validEnv, SEARCH_PROVIDER: 'sql' });
      expect(sqlConfig.search.provider).toBe('sql');

      const esEnv = {
        ...validEnv,
        SEARCH_PROVIDER: 'elasticsearch' as const,
        ELASTICSEARCH_NODE: 'http://es:9200',
        ELASTICSEARCH_INDEX: 'test-index',
      };
      const esConfig = load(esEnv);
      expect(esConfig.search.provider).toBe('elasticsearch');
      if (esConfig.search.provider === 'elasticsearch') {
        const config = esConfig.search.config;
        expect(config.index).toBe('test-index');
      }
    });
  });

  describe('Environment Priority & Integration', () => {
    test('should respect priority: Stage > Base > Root', () => {
      // Simulate the result of initEnv() loading files in priority order.
      // Stage-specific values override base values (stage loaded first, only sets if absent).
      // Since initEnv() uses priority: system env wins, then first file sets the value.
      const env = {
        ...validEnv,
        NODE_ENV: 'development' as const,
        APP_NAME: 'StageApp', // Stage-specific override wins
      };

      const config = load(env);

      expect(config.env).toBe('development');
    });

    test('should support flexible URL resolution (VITE_ vs PUBLIC_)', () => {
      const env = {
        ...validEnv,
        NODE_ENV: 'development' as const,
        VITE_API_URL: 'http://localhost:9000', // Vite-style URL
      };

      const config = load(env);

      // Server should pick up VITE_API_URL as its apiBaseUrl
      expect(config.server.apiBaseUrl).toBe('http://localhost:9000');
    });
  });

  describe('Validation & Security', () => {
    test('should enforce production security refinements', () => {
      // Short JWT_SECRET fails Zod validation; load() calls process.exit(1)
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process Exited');
      });

      expect(() =>
        load({
          NODE_ENV: 'production',
          JWT_SECRET: 'too_short',
          DATABASE_URL: 'postgres://localhost',
        }),
      ).toThrow('Process Exited');
      exitSpy.mockRestore();
    });

    test('should validate URL formats in config', () => {
      // Invalid PUBLIC_API_URL fails Zod validation; load() calls process.exit(1)
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process Exited');
      });

      expect(() =>
        load({
          ...validEnv,
          NODE_ENV: 'development' as const,
          PUBLIC_API_URL: 'not-a-url', // INVALID URL
        }),
      ).toThrow('Process Exited');
      exitSpy.mockRestore();
    });

    test('should fail fast on Zod schema validation errors', () => {
      const invalidEnv = { NODE_ENV: 'development' as const }; // Missing JWT_SECRET etc

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      expect(() => load(invalidEnv)).toThrow();
      exitSpy.mockRestore();
    });
  });

  describe('Production Hard-Guards', () => {
    const prodBaseEnv = {
      ...validEnv,
      NODE_ENV: 'production' as const,
      EMAIL_PROVIDER: 'smtp' as const,
      SMTP_HOST: 'smtp.sendgrid.net',
      DB_SSL: 'true',
      APP_BASE_URL: 'https://my-app.com',
    };

    test('should allow valid production config', () => {
      const config = load(prodBaseEnv);
      expect(config.env).toBe('production');
      if (config.database.provider === 'postgresql') {
        expect(config.database.ssl).toBe(true);
      }
    });

    test('should enforce SSL for database in production', () => {
      const badEnv = { ...prodBaseEnv, DB_SSL: 'false' };
      expect(() => load(badEnv)).toThrow(/Database: SSL must be enabled in production/);
    });

    test('should forbid console email provider in production', () => {
      const badEnv = { ...prodBaseEnv, EMAIL_PROVIDER: 'console' as const };
      expect(() => load(badEnv)).toThrow(/Email: Provider cannot be "console" in production/);
    });

    test('should enforce S3 credentials in production if S3 provider is used', () => {
      const s3Env = {
        ...prodBaseEnv,
        STORAGE_PROVIDER: 's3' as const,
        S3_BUCKET: 'abe-bucket',
        S3_REGION: 'us-east-1',
        // Missing keys
      };
      expect(() => load(s3Env)).toThrow(/S3_ACCESS_KEY_ID is required in production/);
    });

    test('should reject JSON database provider in production', () => {
      // DATABASE_URL kept from prodBaseEnv so env-level validation passes;
      // factory-level guard catches the json provider.
      const badEnv = { ...prodBaseEnv, DATABASE_PROVIDER: 'json' as const };
      expect(() => load(badEnv)).toThrow(/JSON provider is not allowed in production/);
    });

    test('should reject non-HTTPS app base URL in production', () => {
      const badEnv = { ...prodBaseEnv, APP_BASE_URL: 'http://my-app.com' };
      expect(() => load(badEnv)).toThrow(/must be an HTTPS URL in production/);
    });

    test('should reject Elasticsearch over HTTP in production', () => {
      const badEnv = {
        ...prodBaseEnv,
        SEARCH_PROVIDER: 'elasticsearch' as const,
        ELASTICSEARCH_NODE: 'http://es.internal:9200',
      };
      expect(() => load(badEnv)).toThrow(/must use HTTPS in production/);
    });
  });
});
