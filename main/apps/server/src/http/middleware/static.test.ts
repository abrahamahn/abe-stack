// main/apps/server/src/http/middleware/static.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { registerStaticServe } from './static';

// Mock node:fs
vi.mock('node:fs', () => ({
  createReadStream: vi.fn(() => ({ pipe: vi.fn() })),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  open: vi.fn(),
}));

describe('Static File Serving', () => {
  describe('registerStaticServe', () => {
    let mockServer: {
      get: ReturnType<typeof vi.fn>;
      log: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockServer = {
        get: vi.fn(),
        log: {
          info: vi.fn(),
          error: vi.fn(),
        },
      };
    });

    test('should register route with correct prefix', () => {
      registerStaticServe(mockServer as never, {
        root: '/uploads',
        prefix: '/files',
      });

      expect(mockServer.get).toHaveBeenCalledWith(
        '/files/*',
        expect.objectContaining({ preHandler: expect.any(Function) }),
        expect.any(Function),
      );
    });

    test('should normalize prefix without trailing slash', () => {
      registerStaticServe(mockServer as never, {
        root: '/uploads',
        prefix: '/files',
      });

      expect(mockServer.get).toHaveBeenCalledWith(
        '/files/*',
        expect.objectContaining({ preHandler: expect.any(Function) }),
        expect.any(Function),
      );
    });

    test('should handle prefix with trailing slash', () => {
      registerStaticServe(mockServer as never, {
        root: '/uploads',
        prefix: '/files/',
      });

      expect(mockServer.get).toHaveBeenCalledWith(
        '/files/*',
        expect.objectContaining({ preHandler: expect.any(Function) }),
        expect.any(Function),
      );
    });

    test('should log registration info', () => {
      registerStaticServe(mockServer as never, {
        root: '/var/uploads',
        prefix: '/uploads',
      });

      expect(mockServer.log.info).toHaveBeenCalledWith(
        expect.objectContaining({ root: '/var/uploads', prefix: '/uploads/' }),
        'Static file serving registered',
      );
    });

    describe('route handler', () => {
      let routeHandler: (req: unknown, reply: unknown) => Promise<unknown>;

      beforeEach(() => {
        registerStaticServe(mockServer as never, {
          root: '/uploads',
          prefix: '/files',
          maxAge: 3600,
        });
        const calls = mockServer.get.mock.calls[0];
        if (typeof calls?.[2] === 'function') {
          routeHandler = calls[2] as (req: unknown, reply: unknown) => Promise<unknown>;
        }
      });

      test('should return 400 for invalid path encoding', async () => {
        const mockRequest = { url: '/files/%ZZ' };
        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid path encoding' });
      });

      test('should return 403 for path traversal attempts', async () => {
        const mockRequest = { url: '/files/../../../etc/passwd' };
        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'Forbidden' });
      });

      test('should return 404 when file not found', async () => {
        const { open } = await import('node:fs/promises');
        (open as ReturnType<typeof vi.fn>).mockRejectedValue(
          Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
        );

        const mockRequest = { url: '/files/nonexistent.txt' };
        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'Not found' });
      });

      test('should return 404 when path is directory', async () => {
        const { open } = await import('node:fs/promises');
        (open as ReturnType<typeof vi.fn>).mockResolvedValue({
          stat: vi.fn().mockResolvedValue({
            isFile: () => false,
            size: 0,
            mtime: new Date(),
          }),
          close: vi.fn().mockResolvedValue(undefined),
          fd: 3,
        });

        const mockRequest = { url: '/files/somedir' };
        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(404);
      });

      test('should serve file with correct headers', async () => {
        const { open } = await import('node:fs/promises');
        const { createReadStream } = await import('node:fs');
        const mockStream = { pipe: vi.fn() };
        const mtime = new Date('2024-01-01');
        const mockFd = 3;

        (open as ReturnType<typeof vi.fn>).mockResolvedValue({
          stat: vi.fn().mockResolvedValue({
            isFile: () => true,
            size: 1024,
            mtime,
          }),
          close: vi.fn().mockResolvedValue(undefined),
          fd: mockFd,
        });
        (createReadStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);

        const mockRequest = { url: '/files/image.jpg' };
        const mockReply = {
          header: vi.fn().mockReturnThis(),
          send: vi.fn().mockResolvedValue(undefined),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
        expect(mockReply.header).toHaveBeenCalledWith('Content-Length', 1024);
        expect(mockReply.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
        expect(mockReply.header).toHaveBeenCalledWith('Last-Modified', mtime.toUTCString());
        expect(createReadStream).toHaveBeenCalledWith('', { fd: mockFd, autoClose: true });
        expect(mockReply.send).toHaveBeenCalledWith(mockStream);
      });

      test('should handle PNG files', async () => {
        const { open } = await import('node:fs/promises');
        const { createReadStream } = await import('node:fs');
        (open as ReturnType<typeof vi.fn>).mockResolvedValue({
          stat: vi.fn().mockResolvedValue({
            isFile: () => true,
            size: 2048,
            mtime: new Date(),
          }),
          close: vi.fn().mockResolvedValue(undefined),
          fd: 3,
        });
        (createReadStream as ReturnType<typeof vi.fn>).mockReturnValue({ pipe: vi.fn() });

        const mockRequest = { url: '/files/image.png' };
        const mockReply = {
          header: vi.fn().mockReturnThis(),
          send: vi.fn().mockResolvedValue(undefined),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'image/png');
      });

      test('should return 500 on unexpected error', async () => {
        const { open } = await import('node:fs/promises');
        (open as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unexpected error'));

        const mockRequest = { url: '/files/file.txt' };
        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await routeHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
      });
    });
  });
});
