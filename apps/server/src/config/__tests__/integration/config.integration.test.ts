import { initEnv } from '@abe-stack/core/env/load';
import { loadServerEnv } from '@abe-stack/core/env/schema';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { load } from '../../factory';

// We mock fs to avoid touching the real filesystem during tests
vi.mock('node:fs');
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
  };
});

describe('Configuration & Env Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear relevant env vars to ensure a clean state
    delete process.env['JWT_SECRET'];
    delete process.env['DATABASE_URL'];
    delete process.env['NODE_ENV'];
    delete process.env['ENV_FILE'];
    delete process.env['APP_NAME'];
    delete process.env['PUBLIC_API_URL'];
    delete process.env['VITE_API_URL'];

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

    // 1. Run loader
    initEnv();

    // 2. Load Config Factory
    const config = load(process.env as any);

    // 3. Verify overrides
    expect(process.env['APP_NAME']).toBe('StageApp');
    expect(process.env['JWT_SECRET']).toBe('base_secret_32_chars_long_123456');
    expect(config.env).toBe('development');
  });

  test('should enforce production security refinements', () => {
    process.env['NODE_ENV'] = 'production';

    const prodEnv = [
      'JWT_SECRET=too_short', // SECURITY RISK
      'DATABASE_URL=postgres://localhost',
    ].join('\n');

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
