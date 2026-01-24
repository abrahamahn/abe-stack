// apps/server/src/infrastructure/data/storage/__tests__/localStorageProvider.test.ts
import { mkdir, writeFile } from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalStorageProvider } from '../localStorageProvider';

import type { LocalStorageConfig } from '@abe-stack/core/contracts/config';

// Mock node:crypto
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234'),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('LocalStorageProvider', () => {
  const baseConfig: LocalStorageConfig = {
    provider: 'local',
    rootPath: '/tmp/uploads',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a file with the provided key', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: 'test/file.txt',
        contentType: 'text/plain',
        body: Buffer.from('hello world'),
      };

      const result = await provider.upload(params.key, params.body, params.contentType);

      expect(result).toBe('test/file.txt');
      expect(mkdir).toHaveBeenCalledWith('/tmp/uploads/test', { recursive: true });
      expect(writeFile).toHaveBeenCalledWith('/tmp/uploads/test/file.txt', params.body);
    });

    it('should generate a UUID key when no key is provided', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '',
        contentType: 'text/plain',
        body: Buffer.from('hello world'),
      };

      const result = await provider.upload(params.key, params.body, params.contentType);

      expect(result).toBe('mock-uuid-1234');
      expect(mkdir).toHaveBeenCalledWith('/tmp/uploads', { recursive: true });
      expect(writeFile).toHaveBeenCalledWith('/tmp/uploads/mock-uuid-1234', params.body);
    });

    it('should strip leading slashes from keys', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '/leading/slash.txt',
        contentType: 'text/plain',
        body: Buffer.from('content'),
      };

      const result = await provider.upload(params.key, params.body, params.contentType);

      expect(result).toBe('/leading/slash.txt');
      expect(writeFile).toHaveBeenCalledWith('/tmp/uploads/leading/slash.txt', params.body);
    });

    it('should strip parent directory references for security', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '../../../etc/passwd',
        contentType: 'text/plain',
        body: Buffer.from('malicious'),
      };

      await provider.upload(params.key, params.body, params.contentType);

      // The normalizeStorageKey with stripParentRefs=true removes ".." sequences
      expect(writeFile).toHaveBeenCalledWith(expect.not.stringContaining('..'), params.body);
    });

    it('should handle string body', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: 'text-file.txt',
        contentType: 'text/plain',
        body: 'string content',
      };

      await provider.upload(params.key, params.body, params.contentType);

      expect(writeFile).toHaveBeenCalledWith('/tmp/uploads/text-file.txt', 'string content');
    });

    it('should handle Uint8Array body', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const body = new Uint8Array([72, 101, 108, 108, 111]);
      const params = {
        key: 'binary.bin',
        contentType: 'application/octet-stream',
        body,
      };

      await provider.upload(params.key, params.body, params.contentType);

      expect(writeFile).toHaveBeenCalledWith('/tmp/uploads/binary.bin', body);
    });
  });

  describe('getSignedUrl', () => {
    it('should return a file:// URL when no publicBaseUrl is configured', async () => {
      const provider = new LocalStorageProvider(baseConfig);

      const url = await provider.getSignedUrl('path/to/file.txt');

      expect(url).toBe('file:///tmp/uploads/path/to/file.txt');
    });

    it('should return a public URL when publicBaseUrl is configured', async () => {
      const configWithPublicUrl: LocalStorageConfig = {
        ...baseConfig,
        publicBaseUrl: 'https://cdn.example.com/files',
      };
      const provider = new LocalStorageProvider(configWithPublicUrl);

      const url = await provider.getSignedUrl('path/to/file.txt');

      expect(url).toBe('https://cdn.example.com/files/path/to/file.txt');
    });

    it('should strip trailing slashes from publicBaseUrl', async () => {
      const configWithTrailingSlash: LocalStorageConfig = {
        ...baseConfig,
        publicBaseUrl: 'https://cdn.example.com/',
      };
      const provider = new LocalStorageProvider(configWithTrailingSlash);

      const url = await provider.getSignedUrl('file.txt');

      expect(url).toBe('https://cdn.example.com/file.txt');
    });

    it('should strip leading slashes from key when building public URL', async () => {
      const configWithPublicUrl: LocalStorageConfig = {
        ...baseConfig,
        publicBaseUrl: 'https://cdn.example.com',
      };
      const provider = new LocalStorageProvider(configWithPublicUrl);

      const url = await provider.getSignedUrl('/leading-slash.txt');

      expect(url).toBe('https://cdn.example.com/leading-slash.txt');
    });

    it('should strip parent refs from key for security in file:// URLs', async () => {
      const provider = new LocalStorageProvider(baseConfig);

      const url = await provider.getSignedUrl('../../../etc/passwd');

      expect(url).not.toContain('..');
    });
  });
});
