// main/server/system/src/storage/providers/local.test.ts
import { mkdir, open } from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalStorageProvider } from './local';

import type { LocalStorageConfig } from '../types';

// Mock node:crypto
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234'),
}));

// Mock node:fs/promises — factory must be self-contained (hoisted)
vi.mock('node:fs/promises', () => {
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  const mockClose = vi.fn().mockResolvedValue(undefined);
  return {
    mkdir: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue({
      writeFile: mockWriteFile,
      close: mockClose,
    }),
    readFile: vi.fn().mockResolvedValue(Buffer.from('')),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

describe('LocalStorageProvider', () => {
  const baseConfig: LocalStorageConfig = {
    provider: 'local',
    rootPath: '/tmp/uploads',
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ['*'],
  };

  const mockedOpen = vi.mocked(open);

  /** Get the mock fd methods from the last open() call */
  async function getMockFd(): Promise<{
    writeFile: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }> {
    const fd = await mockedOpen.mock.results[0]?.value;
    return fd as { writeFile: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  }

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
      const fd = await getMockFd();

      expect(result).toBe('test/file.txt');
      expect(mkdir).toHaveBeenCalledWith('/tmp/uploads/test', { recursive: true });
      expect(mockedOpen).toHaveBeenCalledWith('/tmp/uploads/test/file.txt', 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith(params.body);
      expect(fd.close).toHaveBeenCalled();
    });

    it('should generate a UUID key when no key is provided', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '',
        contentType: 'text/plain',
        body: Buffer.from('hello world'),
      };

      const result = await provider.upload(params.key, params.body, params.contentType);
      const fd = await getMockFd();

      expect(result).toBe('mock-uuid-1234');
      expect(mkdir).toHaveBeenCalledWith('/tmp/uploads', { recursive: true });
      expect(mockedOpen).toHaveBeenCalledWith('/tmp/uploads/mock-uuid-1234', 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith(params.body);
      expect(fd.close).toHaveBeenCalled();
    });

    it('should strip leading slashes from keys for file path', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '/leading/slash.txt',
        contentType: 'text/plain',
        body: Buffer.from('content'),
      };

      const result = await provider.upload(params.key, params.body, params.contentType);
      const fd = await getMockFd();

      // Returns the original key (not normalized)
      expect(result).toBe('/leading/slash.txt');
      // But writes to normalized path via open()
      expect(mockedOpen).toHaveBeenCalledWith('/tmp/uploads/leading/slash.txt', 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith(params.body);
    });

    it('should strip parent directory references for security', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: '../../../etc/passwd',
        contentType: 'text/plain',
        body: Buffer.from('malicious'),
      };

      await provider.upload(params.key, params.body, params.contentType);
      const fd = await getMockFd();

      // The normalizeStorageKey with stripParentRefs=true removes ".." sequences
      expect(mockedOpen).toHaveBeenCalledWith(expect.not.stringContaining('..'), 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith(params.body);
    });

    it('should handle string body', async () => {
      const provider = new LocalStorageProvider(baseConfig);
      const params = {
        key: 'text-file.txt',
        contentType: 'text/plain',
        body: 'string content',
      };

      await provider.upload(params.key, params.body, params.contentType);
      const fd = await getMockFd();

      expect(mockedOpen).toHaveBeenCalledWith('/tmp/uploads/text-file.txt', 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith('string content');
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
      const fd = await getMockFd();

      expect(mockedOpen).toHaveBeenCalledWith('/tmp/uploads/binary.bin', 'w', 0o600);
      expect(fd.writeFile).toHaveBeenCalledWith(body);
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
