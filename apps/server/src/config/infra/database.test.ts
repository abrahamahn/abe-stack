// apps/server/src/config/infra/database.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, test } from 'vitest';
import { buildConnectionString, getSafeConnectionString, loadDatabase } from './database';

describe('Database Configuration', () => {
  describe('loadDatabase', () => {
    test('should load default values when no env vars set', () => {
      const config = loadDatabase({} as unknown as FullEnv);

      if (config.provider !== 'postgresql') throw new Error('Expected postgresql');

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.ssl).toBe(false); // Default false for dev
    });

    test('should enable SSL by default in production', () => {
      const config = loadDatabase({ NODE_ENV: 'production' } as unknown as FullEnv);
      if (config.provider !== 'postgresql') throw new Error('Expected postgresql');

      expect(config.ssl).toBe(true);
    });

    test('should load JSON provider config', () => {
      const config = loadDatabase({
        DATABASE_PROVIDER: 'json',
        JSON_DB_PATH: 'test.json',
      } as unknown as FullEnv);

      expect(config.provider).toBe('json');
      if (config.provider === 'json') {
        expect(config.filePath).toBe('test.json');
      }
    });
  });

  describe('Connection String Utilities', () => {
    test('should redact password for logging', () => {
      const config = loadDatabase({
        POSTGRES_USER: 'abe',
        POSTGRES_PASSWORD: 'super-secret-password',
        POSTGRES_HOST: 'localhost',
      } as unknown as FullEnv);

      const safe = getSafeConnectionString(config);
      expect(safe).toContain('abe:****@localhost');
      expect(safe).not.toContain('super-secret-password');
    });

    test('should build connection string from parts', () => {
      const config = loadDatabase({
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'pass',
        POSTGRES_HOST: 'host',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'db',
      } as unknown as FullEnv);

      const result = buildConnectionString(config);
      expect(result).toBe('postgresql://user:pass@host:5432/db');
    });
  });
});
