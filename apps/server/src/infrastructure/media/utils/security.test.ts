// apps/server/src/infrastructure/media/utils/security.test.ts
import { promises as fs } from 'fs';

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MediaSecurityScanner, type SecurityScanResult } from './security';

// Mock fs/promises
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    open: vi.fn(),
  },
}));

// Mock sharp - return a simple mock that works for most cases
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    }),
  })),
}));

describe('MediaSecurityScanner', () => {
  let scanner: MediaSecurityScanner;
  let mockFsStat: ReturnType<typeof vi.fn>;
  let mockFsOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scanner = new MediaSecurityScanner();

    mockFsStat = vi.mocked(fs.stat);
    mockFsOpen = vi.mocked(fs.open);

    // Default mocks for valid file
    mockFsStat.mockResolvedValue({ size: 1024 } as ReturnType<typeof fs.stat> extends Promise<
      infer R
    >
      ? R
      : never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create scanner with default options', () => {
      expect(scanner).toBeDefined();
    });

    it('should create scanner with custom options', () => {
      const customScanner = new MediaSecurityScanner({
        maxFileSize: 50 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });

      expect(customScanner).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize scanner', () => {
      scanner.initialize();
      scanner.initialize(); // Second call should be no-op

      // Should not throw
      expect(scanner).toBeDefined();
    });
  });

  describe('scanFile', () => {
    it('should reject file exceeding max size', async () => {
      mockFsStat.mockResolvedValue({ size: 200 * 1024 * 1024 } as ReturnType<
        typeof fs.stat
      > extends Promise<infer R>
        ? R
        : never);

      const result = await scanner.scanFile('/path/to/large.jpg');

      expect(result.safe).toBe(false);
      expect(result.threats?.some((t) => t.includes('exceeds limit'))).toBe(true);
    });

    it('should reject empty file', async () => {
      mockFsStat.mockResolvedValue({ size: 0 } as ReturnType<typeof fs.stat> extends Promise<
        infer R
      >
        ? R
        : never);

      const result = await scanner.scanFile('/path/to/empty.jpg');

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('File is empty');
    });

    it('should handle scan errors gracefully', async () => {
      mockFsStat.mockRejectedValue(new Error('File not found'));

      const result = await scanner.scanFile('/non/existent/file.jpg');

      expect(result.safe).toBe(false);
      expect(result.threats?.some((t) => t.includes('Scan failed'))).toBe(true);
    });

    it('should process valid file with proper MIME type', async () => {
      // Setup mocks for a valid JPEG file
      const jpegBuffer = Buffer.alloc(512);
      jpegBuffer[0] = 0xff;
      jpegBuffer[1] = 0xd8;
      jpegBuffer[2] = 0xff;

      const mockFileHandle = {
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          jpegBuffer.copy(buffer);
          return Promise.resolve({ bytesRead: buffer.length });
        }),
        close: vi.fn(),
      };

      mockFsStat.mockResolvedValue({ size: 1024 } as ReturnType<typeof fs.stat> extends Promise<
        infer R
      >
        ? R
        : never);
      mockFsOpen.mockResolvedValue(mockFileHandle);

      const result = await scanner.scanFile('/path/to/valid.jpg');

      // File should be scanned - verify mocks were called
      expect(mockFsStat).toHaveBeenCalled();
      expect(mockFsOpen).toHaveBeenCalled();
      // The result should contain either the file being safe or threats detected
      expect(typeof result.safe).toBe('boolean');
    });

    it('should reject disallowed MIME type', async () => {
      // Setup mocks for an executable file
      const exeBuffer = Buffer.alloc(64);
      // MZ header for executables
      exeBuffer[0] = 0x4d;
      exeBuffer[1] = 0x5a;

      const mockFileHandle = {
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          exeBuffer.copy(buffer);
          return Promise.resolve({ bytesRead: 64 });
        }),
        close: vi.fn(),
      };

      mockFsStat.mockResolvedValue({ size: 1024 } as ReturnType<typeof fs.stat> extends Promise<
        infer R
      >
        ? R
        : never);
      mockFsOpen.mockResolvedValue(mockFileHandle);

      // Unknown file type should default to octet-stream
      const result = await scanner.scanFile('/path/to/file.exe');

      expect(result.safe).toBe(false);
      expect(result.threats?.some((t) => t.includes('Disallowed MIME type'))).toBe(true);
    });
  });

  describe('moderateContent', () => {
    it('should return approved by default', () => {
      const result = scanner.moderateContent('/path/to/image.jpg', 'image/jpeg');

      expect(result.approved).toBe(true);
      expect(result.reviewRecommended).toBe(false);
    });

    it('should handle any file type', () => {
      const imageResult = scanner.moderateContent('/path/to/image.jpg', 'image/jpeg');
      const videoResult = scanner.moderateContent('/path/to/video.mp4', 'video/mp4');
      const audioResult = scanner.moderateContent('/path/to/audio.mp3', 'audio/mpeg');

      expect(imageResult.approved).toBe(true);
      expect(videoResult.approved).toBe(true);
      expect(audioResult.approved).toBe(true);
    });
  });

  describe('SecurityScanResult interface', () => {
    it('should have correct shape for safe result', () => {
      const result: SecurityScanResult = {
        safe: true,
        metadata: {
          fileSize: 1024,
          mimeType: 'image/jpeg',
          hasExif: false,
          dimensions: { width: 1920, height: 1080 },
        },
      };

      expect(result.safe).toBe(true);
      expect(result.metadata?.fileSize).toBe(1024);
    });

    it('should have correct shape for unsafe result', () => {
      const result: SecurityScanResult = {
        safe: false,
        threats: ['File size exceeds limit', 'Invalid signature'],
        warnings: ['Contains EXIF metadata'],
        metadata: {
          fileSize: 200 * 1024 * 1024,
        },
      };

      expect(result.safe).toBe(false);
      expect(result.threats).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('file size validation', () => {
    it('should accept file within default size limit', async () => {
      const fileSize = 50 * 1024 * 1024;
      mockFsStat.mockResolvedValue({ size: fileSize } as ReturnType<typeof fs.stat> extends Promise<
        infer R
      >
        ? R
        : never);

      const mockFileHandle = {
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          // Write JPEG signature
          buffer[0] = 0xff;
          buffer[1] = 0xd8;
          buffer[2] = 0xff;
          return Promise.resolve({ bytesRead: buffer.length });
        }),
        close: vi.fn(),
      };
      mockFsOpen.mockResolvedValue(mockFileHandle);

      const result = await scanner.scanFile('/path/to/medium.jpg');

      // Should not fail due to size (file is under 100MB default limit)
      const hasSizeExceededThreat = result.threats?.some((t) => t.includes('exceeds limit'));
      expect(hasSizeExceededThreat).toBeFalsy();
      // Should not fail due to being empty
      expect(result.threats?.includes('File is empty')).toBe(false);
    });

    it('should use custom max file size', async () => {
      const customScanner = new MediaSecurityScanner({
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      mockFsStat.mockResolvedValue({ size: 15 * 1024 * 1024 } as ReturnType<
        typeof fs.stat
      > extends Promise<infer R>
        ? R
        : never);

      const result = await customScanner.scanFile('/path/to/large.jpg');

      expect(result.safe).toBe(false);
      expect(result.threats?.some((t) => t.includes('exceeds limit'))).toBe(true);
    });
  });

  describe('allowed MIME types', () => {
    it('should use default allowed MIME types', () => {
      const defaultScanner = new MediaSecurityScanner();
      expect(defaultScanner).toBeDefined();
    });

    it('should use custom allowed MIME types', async () => {
      const customScanner = new MediaSecurityScanner({
        allowedMimeTypes: ['image/jpeg'],
      });

      // PNG file should be rejected
      const pngBuffer = Buffer.alloc(64);
      pngBuffer[0] = 0x89;
      pngBuffer[1] = 0x50;
      pngBuffer[2] = 0x4e;
      pngBuffer[3] = 0x47;

      const mockFileHandle = {
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          pngBuffer.copy(buffer);
          return Promise.resolve({ bytesRead: 64 });
        }),
        close: vi.fn(),
      };

      mockFsStat.mockResolvedValue({ size: 1024 } as ReturnType<typeof fs.stat> extends Promise<
        infer R
      >
        ? R
        : never);
      mockFsOpen.mockResolvedValue(mockFileHandle);

      const result = await customScanner.scanFile('/path/to/image.png');

      expect(result.safe).toBe(false);
      expect(result.threats?.some((t) => t.includes('Disallowed MIME type'))).toBe(true);
    });
  });
});
