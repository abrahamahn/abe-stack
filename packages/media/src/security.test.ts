// packages/media/src/__tests__/security.test.ts
import { describe, expect, it, vi } from 'vitest';

import { BasicSecurityScanner } from '../security';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    open: vi.fn(),
  },
}));

describe('BasicSecurityScanner', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const scanner = new BasicSecurityScanner();
      expect(scanner).toBeInstanceOf(BasicSecurityScanner);
    });

    it('should accept custom options', () => {
      const scanner = new BasicSecurityScanner({
        maxFileSize: 50 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });
      expect(scanner).toBeInstanceOf(BasicSecurityScanner);
    });
  });

  describe('scanFile', () => {
    it('should return safe result for valid file', async () => {
      const fs = await import('fs');
      const mockFd = {
        read: vi.fn().mockResolvedValue({ bytesRead: 100 }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 1024,
      } as never);
      vi.mocked(fs.promises.open).mockResolvedValue(mockFd as never);

      const scanner = new BasicSecurityScanner();
      const result = await scanner.scanFile('/safe-file.jpg');

      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
      expect(result.metadata.fileSize).toBe(1024);
    });

    it('should detect file size exceeding limit', async () => {
      const fs = await import('fs');

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 200 * 1024 * 1024, // 200MB
      } as never);

      const scanner = new BasicSecurityScanner({
        maxFileSize: 100 * 1024 * 1024,
        allowedMimeTypes: [],
      });
      const result = await scanner.scanFile('/large-file.mp4');

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.includes('exceeds limit'))).toBe(true);
    });

    it('should detect empty file', async () => {
      const fs = await import('fs');

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 0,
      } as never);

      const scanner = new BasicSecurityScanner();
      const result = await scanner.scanFile('/empty-file.txt');

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('File is empty');
    });

    it('should detect XSS content in text files', async () => {
      const fs = await import('fs');
      const maliciousContent = '<script>alert("xss")</script>';
      const buffer = Buffer.from(maliciousContent);

      const mockFd = {
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buffer.copy(buf);
          return Promise.resolve({ bytesRead: buffer.length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: buffer.length,
      } as never);
      vi.mocked(fs.promises.open).mockResolvedValue(mockFd as never);

      const scanner = new BasicSecurityScanner();
      // Use .txt extension so it's detected as text-based for XSS scanning
      const result = await scanner.scanFile('/malicious.txt');

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.includes('XSS'))).toBe(true);
    });

    it('should detect server-side code', async () => {
      const fs = await import('fs');
      const phpContent = '<?php echo "hello"; ?>';
      const buffer = Buffer.from(phpContent);

      const mockFd = {
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buffer.copy(buf);
          return Promise.resolve({ bytesRead: buffer.length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: buffer.length,
      } as never);
      vi.mocked(fs.promises.open).mockResolvedValue(mockFd as never);

      const scanner = new BasicSecurityScanner();
      const result = await scanner.scanFile('/malicious.txt');

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.includes('Server-side code'))).toBe(true);
    });

    it('should warn about high entropy files', async () => {
      const fs = await import('fs');
      // Create high entropy buffer (random-like data)
      const buffer = Buffer.alloc(1024);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }

      const mockFd = {
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buffer.copy(buf);
          return Promise.resolve({ bytesRead: buffer.length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: buffer.length,
      } as never);
      vi.mocked(fs.promises.open).mockResolvedValue(mockFd as never);

      const scanner = new BasicSecurityScanner();
      const result = await scanner.scanFile('/encrypted.bin');

      // High entropy files get warnings, not threats
      expect(result.warnings.some((w) => w.includes('entropy'))).toBe(true);
    });

    it('should handle scan errors gracefully', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockRejectedValue(new Error('File not found'));

      const scanner = new BasicSecurityScanner();
      const result = await scanner.scanFile('/nonexistent.txt');

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.includes('Scan failed'))).toBe(true);
    });
  });
});
