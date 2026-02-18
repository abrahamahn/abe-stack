// main/server/system/src/config/env.loader.test.ts
import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { initEnv } from './env.loader';

// We mock fs to avoid touching the real filesystem during tests
vi.mock('node:fs');
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
  };
});

describe('Env Loader (Unit)', () => {
  const originalEnv = { ...process.env };
  const mockRepoRoot = '/mock/repo';
  const mockConfigDir = path.join(mockRepoRoot, 'config');
  const mockEnvDir = path.join(mockConfigDir, 'env');

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env['NODE_ENV'];
    delete process.env['ENV_FILE'];
    delete process.env['TEST_VAR'];

    // Mock directory structure
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = String(p);
      return pStr === mockConfigDir || pStr === mockEnvDir || pStr.includes('.env');
    });

    vi.mocked(fs.statSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr === mockConfigDir || pStr === mockEnvDir) {
        return { isDirectory: () => true } as fs.Stats;
      }
      return { isDirectory: () => false } as fs.Stats;
    });

    // Mock process.cwd() to be within the mock repo
    vi.spyOn(process, 'cwd').mockReturnValue(path.join(mockRepoRoot, 'apps/server'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  test('should load from config/env/.env (Base)', () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('config/env/.env')) {
        return 'TEST_VAR=base_value';
      }
      return '';
    });

    initEnv();
    expect(process.env['TEST_VAR']).toBe('base_value');
  });

  test('should prioritize .env.local in config dir over stage files', () => {
    process.env['NODE_ENV'] = 'development';

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr.endsWith('.env.development')) return 'TEST_VAR=stage_value';
      if (pStr.endsWith('config/env/.env.local')) return 'TEST_VAR=local_value';
      return '';
    });

    initEnv();
    expect(process.env['TEST_VAR']).toBe('local_value');
  });

  test('should prioritize Stage files over Base .env', () => {
    process.env['NODE_ENV'] = 'production';

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr.endsWith('.env.production')) return 'TEST_VAR=prod_value';
      if (pStr.endsWith('config/env/.env')) return 'TEST_VAR=base_value';
      return '';
    });

    initEnv();
    expect(process.env['TEST_VAR']).toBe('prod_value');
  });

  test('should handle quoted values correctly', () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('config/env/.env')) {
        return 'VAR1="double quotes"\nVAR2=\'single quotes\'';
      }
      return '';
    });

    initEnv();
    expect(process.env['VAR1']).toBe('double quotes');
    expect(process.env['VAR2']).toBe('single quotes');
  });

  test('should strip inline comments for unquoted values', () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('config/env/.env')) {
        return `FLAG=false  # options: true | false\nNUM=123 # trailing`;
      }
      return '';
    });

    initEnv();
    expect(process.env['FLAG']).toBe('false');
    expect(process.env['NUM']).toBe('123');
  });

  test('should not strip # inside quoted values', () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('config/env/.env')) {
        return `TOKEN="abc #def"\nTOKEN2='abc #def'`;
      }
      return '';
    });

    initEnv();
    expect(process.env['TOKEN']).toBe('abc #def');
    expect(process.env['TOKEN2']).toBe('abc #def');
  });

  test('should fallback to root .env if config/env/.env is missing', () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr === path.join(mockRepoRoot, '.env')) return 'TEST_VAR=root_value';
      return '';
    });

    initEnv();
    expect(process.env['TEST_VAR']).toBe('root_value');
  });
});
