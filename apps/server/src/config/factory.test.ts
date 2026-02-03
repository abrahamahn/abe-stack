// apps/server/src/config/factory.test.ts
import fs from 'node:fs';

import { initEnv, loadServerEnv } from '@abe-stack/shared';
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

    // Mock filesystem
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = String(p);
      return pStr.includes('.config') || pStr.includes('.env');
    });

    vi.mocked(fs.statSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr.endsWith('.config')) {
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
      const nodeEnv = 'development';
      process.env['NODE_ENV'] = nodeEnv;

      const baseEnv = 'APP_NAME=BaseApp\nJWT_SECRET=base_secret_32_chars_long_123456';
      const stageEnv = 'APP_NAME=StageApp'; // Should override BaseApp

      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pStr = String(p);
        if (pStr.endsWith('.env.development')) return stageEnv;
        if (pStr.endsWith('.config/env/.env')) return baseEnv;
        return '';
      });

      // Run loader
      initEnv();

      // Load Config Factory
      const config = load(process.env as any);

      // Verify overrides
      expect(process.env['APP_NAME']).toBe('StageApp');
      expect(process.env['JWT_SECRET']).toBe('base_secret_32_chars_long_123456');
      expect(config.env).toBe('development');
    });

    test('should support flexible URL resolution (VITE_ vs PUBLIC_)', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['JWT_SECRET'] = 'valid_secret_32_chars_long_123456';
      process.env['VITE_API_URL'] = 'http://localhost:9000'; // Set Vite-style
      process.env['DATABASE_URL'] = 'postgres://localhost';

      vi.mocked(fs.readFileSync).mockImplementation(() => '');

      const config = load(process.env as any);

      // Server should pick up VITE_API_URL as its apiBaseUrl
      expect(config.server.apiBaseUrl).toBe('http://localhost:9000');
    });
  });

  describe('Validation & Security', () => {
    test('should enforce production security refinements', () => {
      process.env['NODE_ENV'] = 'production';

      const prodEnv = ['JWT_SECRET=too_short', 'DATABASE_URL=postgres://localhost'].join('\n');

      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (String(p).endsWith('.env.production')) return prodEnv;
        return '';
      });

      // We expect this to fail during validation
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process Exited');
      });

      expect(() => loadServerEnv()).toThrow('Process Exited');
      exitSpy.mockRestore();
    });

    test('should validate URL formats in config', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['JWT_SECRET'] = 'valid_secret_32_chars_long_123456';
      process.env['PUBLIC_API_URL'] = 'not-a-url'; // INVALID

      vi.mocked(fs.readFileSync).mockImplementation(() => '');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process Exited');
      });

      expect(() => loadServerEnv()).toThrow('Process Exited');
      exitSpy.mockRestore();
    });

    test('should fail fast on Zod schema validation errors', () => {
      const invalidEnv = { NODE_ENV: 'development' as const }; // Missing JWT_SECRET etc

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      expect(() => load(invalidEnv as any)).toThrow();
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
      expect(() => load(s3Env)).toThrow(/Storage: S3_ACCESS_KEY_ID is required in production/);
    });
  });
});
