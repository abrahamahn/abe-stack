// main/server/media/src/file-type.test.ts
/**
 * Tests for server-specific file type detection (I/O wrapper).
 *
 * Pure detection logic tests are in @abe-stack/shared
 * (main/shared/src/domain/media/media.file-type.test.ts)
 */

import { describe, expect, test, vi } from 'vitest';

import { detectFileTypeFromFile } from './file-type';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    open: vi.fn(),
  },
}));

describe('detectFileTypeFromFile', () => {
  test('should detect file type from magic bytes', async () => {
    const fs = await import('fs');

    const mockFileHandle = {
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer[0] = 0xff;
        buffer[1] = 0xd8;
        buffer[2] = 0xff;
        return Promise.resolve({ bytesRead: 3 });
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(fs.promises.open).mockResolvedValue(mockFileHandle as never);

    const result = await detectFileTypeFromFile('/test/image.jpg');

    expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    expect(mockFileHandle.close).toHaveBeenCalled();
  });

  test('should fallback to extension detection when magic bytes unknown', async () => {
    const fs = await import('fs');

    const mockFileHandle = {
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer[0] = 0x00;
        buffer[1] = 0x00;
        buffer[2] = 0x00;
        buffer[3] = 0x00;
        return Promise.resolve({ bytesRead: 4 });
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(fs.promises.open).mockResolvedValue(mockFileHandle as never);

    const result = await detectFileTypeFromFile('/test/video.mp4');

    expect(result).toEqual({ ext: 'mp4', mime: 'video/mp4' });
  });

  test('should return null when file cannot be opened', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.open).mockRejectedValue(new Error('File not found'));

    const result = await detectFileTypeFromFile('/nonexistent/file.jpg');

    expect(result).toBeNull();
  });

  test('should detect PNG file from magic bytes', async () => {
    const fs = await import('fs');

    const mockFileHandle = {
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer[0] = 0x89;
        buffer[1] = 0x50;
        buffer[2] = 0x4e;
        buffer[3] = 0x47;
        buffer[4] = 0x0d;
        buffer[5] = 0x0a;
        buffer[6] = 0x1a;
        buffer[7] = 0x0a;
        return Promise.resolve({ bytesRead: 8 });
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(fs.promises.open).mockResolvedValue(mockFileHandle as never);

    const result = await detectFileTypeFromFile('/test/image.png');

    expect(result).toEqual({ ext: 'png', mime: 'image/png' });
  });

  test('should return null for unknown file with no extension', async () => {
    const fs = await import('fs');

    const mockFileHandle = {
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer[0] = 0x00;
        buffer[1] = 0x01;
        buffer[2] = 0x02;
        return Promise.resolve({ bytesRead: 3 });
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(fs.promises.open).mockResolvedValue(mockFileHandle as never);

    const result = await detectFileTypeFromFile('/test/unknownfile');

    expect(result).toBeNull();
  });

  test('should close file descriptor even when fd.read() throws', async () => {
    const fs = await import('fs');
    const closeFn = vi.fn().mockResolvedValue(undefined);
    const mockFileHandle = {
      read: vi.fn().mockRejectedValue(new Error('Read failure')),
      close: closeFn,
    };

    vi.mocked(fs.promises.open).mockResolvedValue(mockFileHandle as never);

    const result = await detectFileTypeFromFile('/test/failing-read.bin');

    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
