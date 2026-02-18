// main/server/system/src/config/env.loader.test.ts
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { initEnv } from './env.loader';

// We mock node:fs/promises to avoid touching the real filesystem during tests
vi.mock('node:fs/promises');

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

    // Mock directory structure: access resolves for known paths.
    // The implementation always calls these with string paths.
    vi.mocked(access).mockImplementation((p: unknown) => {
      const pStr = p as string;
      if (pStr === mockConfigDir || pStr === mockEnvDir || pStr.includes('.env')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('ENOENT'));
    });

    vi.mocked(stat).mockImplementation((p: unknown) => {
      const pStr = p as string;
      if (pStr === mockConfigDir || pStr === mockEnvDir) {
        return Promise.resolve({ isDirectory: () => true } as import('node:fs').Stats);
      }
      return Promise.resolve({ isDirectory: () => false } as import('node:fs').Stats);
    });

    // Mock process.cwd() to be within the mock repo
    vi.spyOn(process, 'cwd').mockReturnValue(path.join(mockRepoRoot, 'apps/server'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  test('should load from config/env/.env (Base)', async () => {
    vi.mocked(readFile).mockImplementation((p: unknown) => {
      if ((p as string).endsWith('config/env/.env')) {
        return Promise.resolve('TEST_VAR=base_value');
      }
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['TEST_VAR']).toBe('base_value');
  });

  test('should prioritize .env.local in config dir over stage files', async () => {
    process.env['NODE_ENV'] = 'development';

    vi.mocked(readFile).mockImplementation((p: unknown) => {
      const pStr = p as string;
      if (pStr.endsWith('.env.development')) return Promise.resolve('TEST_VAR=stage_value');
      if (pStr.endsWith('config/env/.env.local')) return Promise.resolve('TEST_VAR=local_value');
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['TEST_VAR']).toBe('local_value');
  });

  test('should prioritize Stage files over Base .env', async () => {
    process.env['NODE_ENV'] = 'production';

    vi.mocked(readFile).mockImplementation((p: unknown) => {
      const pStr = p as string;
      if (pStr.endsWith('.env.production')) return Promise.resolve('TEST_VAR=prod_value');
      if (pStr.endsWith('config/env/.env')) return Promise.resolve('TEST_VAR=base_value');
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['TEST_VAR']).toBe('prod_value');
  });

  test('should handle quoted values correctly', async () => {
    vi.mocked(readFile).mockImplementation((p: unknown) => {
      if ((p as string).endsWith('config/env/.env')) {
        return Promise.resolve('VAR1="double quotes"\nVAR2=\'single quotes\'');
      }
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['VAR1']).toBe('double quotes');
    expect(process.env['VAR2']).toBe('single quotes');
  });

  test('should strip inline comments for unquoted values', async () => {
    vi.mocked(readFile).mockImplementation((p: unknown) => {
      if ((p as string).endsWith('config/env/.env')) {
        return Promise.resolve(`FLAG=false  # options: true | false\nNUM=123 # trailing`);
      }
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['FLAG']).toBe('false');
    expect(process.env['NUM']).toBe('123');
  });

  test('should not strip # inside quoted values', async () => {
    vi.mocked(readFile).mockImplementation((p: unknown) => {
      if ((p as string).endsWith('config/env/.env')) {
        return Promise.resolve(`TOKEN="abc #def"\nTOKEN2='abc #def'`);
      }
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['TOKEN']).toBe('abc #def');
    expect(process.env['TOKEN2']).toBe('abc #def');
  });

  test('should fallback to root .env if config/env/.env is missing', async () => {
    vi.mocked(readFile).mockImplementation((p: unknown) => {
      const pStr = p as string;
      if (pStr === path.join(mockRepoRoot, '.env')) return Promise.resolve('TEST_VAR=root_value');
      return Promise.resolve('');
    });

    await initEnv();
    expect(process.env['TEST_VAR']).toBe('root_value');
  });
});
