// main/server/system/src/security/upload-scanner.test.ts
/**
 * File Upload Scanner Tests
 */

import { describe, expect, it, vi } from 'vitest';

import {
  createUploadScanner,
  detectMimeFromMagicBytes,
  detectScriptContent,
  getFileExtension,
  type ScannableFile,
  type ScannerPlugin,
} from './upload-scanner';

// ============================================================================
// Utility Tests
// ============================================================================

describe('getFileExtension', () => {
  it('should extract file extensions', () => {
    expect(getFileExtension('photo.jpg')).toBe('jpg');
    expect(getFileExtension('document.PDF')).toBe('pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  it('should return empty string for files without extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
    expect(getFileExtension('README')).toBe('');
  });

  it('should return empty string for trailing dot', () => {
    expect(getFileExtension('file.')).toBe('');
  });
});

describe('detectMimeFromMagicBytes', () => {
  it('should detect JPEG files', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('image/jpeg');
  });

  it('should detect PNG files', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('image/png');
  });

  it('should detect GIF files', () => {
    const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('image/gif');
  });

  it('should detect PDF files', () => {
    const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('application/pdf');
  });

  it('should detect PE executables', () => {
    const buffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('application/x-executable');
  });

  it('should detect ELF executables', () => {
    const buffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
    expect(detectMimeFromMagicBytes(buffer)).toBe('application/x-elf');
  });

  it('should return undefined for unknown signatures', () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeFromMagicBytes(buffer)).toBeUndefined();
  });

  it('should return undefined for empty buffer', () => {
    expect(detectMimeFromMagicBytes(Buffer.alloc(0))).toBeUndefined();
  });
});

describe('detectScriptContent', () => {
  it('should detect HTML script tags', () => {
    const buffer = Buffer.from('<html><script>alert("xss")</script></html>');
    expect(detectScriptContent(buffer)).toBe('HTML script tag');
  });

  it('should detect PHP tags', () => {
    const buffer = Buffer.from('<?php echo "hello"; ?>');
    expect(detectScriptContent(buffer)).toBe('PHP opening tag');
  });

  it('should detect JavaScript protocol handlers', () => {
    const buffer = Buffer.from('url: javascript:alert(1)');
    expect(detectScriptContent(buffer)).toBe('JavaScript protocol handler');
  });

  it('should detect inline event handlers', () => {
    const buffer = Buffer.from('<img onload="alert(1)">');
    expect(detectScriptContent(buffer)).toBe('Inline event handler');
  });

  it('should detect null bytes', () => {
    const buffer = Buffer.from('normal text\x00hidden binary');
    expect(detectScriptContent(buffer)).toBe('Null byte (binary in text content)');
  });

  it('should return null for clean content', () => {
    const buffer = Buffer.from('This is just a normal text file with no scripts.');
    expect(detectScriptContent(buffer)).toBeNull();
  });
});

// ============================================================================
// UploadScanner Tests
// ============================================================================

function createFile(overrides: Partial<ScannableFile> = {}): ScannableFile {
  return {
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG magic bytes
    ...overrides,
  };
}

describe('UploadScanner', () => {
  describe('file size check', () => {
    it('should reject files exceeding max size', async () => {
      const scanner = createUploadScanner({ maxFileSize: 1000 });
      const file = createFile({ size: 2000 });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
      expect(result.source).toBe('size-check');
    });

    it('should allow files within max size', async () => {
      const scanner = createUploadScanner({ maxFileSize: 2000 });
      const file = createFile({ size: 1000 });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });
  });

  describe('extension check', () => {
    it('should reject blocked extensions', async () => {
      const scanner = createUploadScanner();
      const file = createFile({ filename: 'malware.exe', buffer: Buffer.alloc(4) });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('.exe');
      expect(result.source).toBe('extension-check');
    });

    it('should reject script extensions', async () => {
      const scanner = createUploadScanner();

      for (const ext of ['js', 'php', 'py', 'sh', 'bat', 'ps1']) {
        const file = createFile({ filename: `file.${ext}`, buffer: Buffer.alloc(4) });
        const result = await scanner.scan(file);
        expect(result.safe).toBe(false);
      }
    });

    it('should allow safe extensions', async () => {
      const scanner = createUploadScanner();
      const file = createFile({ filename: 'photo.jpg' });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });

    it('should support custom blocked extensions', async () => {
      const scanner = createUploadScanner({ blockedExtensions: ['xyz'] });
      const file = createFile({
        filename: 'file.xyz',
        buffer: Buffer.alloc(4),
      });

      const result = await scanner.scan(file);
      expect(result.safe).toBe(false);

      // Default blocked extension should not be blocked with custom list
      const exeFile = createFile({
        filename: 'file.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('safe content'),
      });
      const exeResult = await scanner.scan(exeFile);
      expect(exeResult.safe).toBe(true);
    });
  });

  describe('MIME type check', () => {
    it('should reject MIME types not in allowlist', async () => {
      const scanner = createUploadScanner({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });
      const file = createFile({ mimeType: 'application/pdf', buffer: Buffer.alloc(4) });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('not in the allowed list');
      expect(result.source).toBe('mime-check');
    });

    it('should allow MIME types in allowlist', async () => {
      const scanner = createUploadScanner({
        allowedMimeTypes: ['image/jpeg'],
      });
      const file = createFile({ mimeType: 'image/jpeg' });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });

    it('should allow all MIME types when no allowlist is configured', async () => {
      const scanner = createUploadScanner();
      const file = createFile({ mimeType: 'application/octet-stream' });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });
  });

  describe('magic bytes check', () => {
    it('should detect executables masquerading as images', async () => {
      const scanner = createUploadScanner();
      const file = createFile({
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // PE executable magic bytes
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('executable');
      expect(result.source).toBe('magic-bytes-check');
    });

    it('should detect ELF executables', async () => {
      const scanner = createUploadScanner();
      const file = createFile({
        filename: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('executable');
    });

    it('should detect MIME type category mismatch', async () => {
      const scanner = createUploadScanner();
      // Declare as image but content is PDF
      const file = createFile({
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('mismatch');
    });

    it('should skip magic byte check when disabled', async () => {
      const scanner = createUploadScanner({ validateMagicBytes: false, scanForScripts: false });
      const file = createFile({
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });
  });

  describe('script detection', () => {
    it('should detect scripts embedded in non-text files', async () => {
      const scanner = createUploadScanner({ validateMagicBytes: false });
      const file = createFile({
        mimeType: 'image/jpeg',
        buffer: Buffer.from('<script>alert("xss")</script>'),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('script');
      expect(result.source).toBe('script-check');
    });

    it('should allow scripts in text files', async () => {
      const scanner = createUploadScanner({
        blockedExtensions: [], // don't block by extension
        validateMagicBytes: false,
      });
      const file = createFile({
        filename: 'page.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('<script>console.log("ok")</script>'),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });

    it('should skip script check when disabled', async () => {
      const scanner = createUploadScanner({
        scanForScripts: false,
        validateMagicBytes: false,
      });
      const file = createFile({
        mimeType: 'image/jpeg',
        buffer: Buffer.from('<script>alert("xss")</script>'),
      });

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });
  });

  describe('scanner plugins', () => {
    it('should run external scanner plugins', async () => {
      const plugin: ScannerPlugin = {
        name: 'TestScanner',
        scan: vi.fn().mockResolvedValue({ safe: false, reason: 'Virus detected' }),
      };

      const scanner = createUploadScanner({ plugins: [plugin] });
      const file = createFile();

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('Virus detected');
      expect(result.source).toBe('TestScanner');
      expect(plugin.scan).toHaveBeenCalledWith(file);
    });

    it('should pass files that all plugins approve', async () => {
      const plugin: ScannerPlugin = {
        name: 'TestScanner',
        scan: vi.fn().mockResolvedValue({ safe: true }),
      };

      const scanner = createUploadScanner({ plugins: [plugin] });
      const file = createFile();

      const result = await scanner.scan(file);

      expect(result.safe).toBe(true);
    });

    it('should handle plugin errors gracefully', async () => {
      const plugin: ScannerPlugin = {
        name: 'BrokenScanner',
        scan: vi.fn().mockRejectedValue(new Error('Scanner crash')),
      };

      const scanner = createUploadScanner({ plugins: [plugin] });
      const file = createFile();

      const result = await scanner.scan(file);

      // Should not block uploads on plugin error
      expect(result.safe).toBe(true);
    });

    it('should stop at the first failing plugin', async () => {
      const plugin1: ScannerPlugin = {
        name: 'Scanner1',
        scan: vi.fn().mockResolvedValue({ safe: false, reason: 'Bad file' }),
      };
      const plugin2: ScannerPlugin = {
        name: 'Scanner2',
        scan: vi.fn().mockResolvedValue({ safe: true }),
      };

      const scanner = createUploadScanner({ plugins: [plugin1, plugin2] });
      const file = createFile();

      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
      expect(result.source).toBe('Scanner1');
      // Second plugin should not be called
      expect(plugin2.scan).not.toHaveBeenCalled();
    });

    it('should support adding plugins at runtime', async () => {
      const scanner = createUploadScanner();
      const plugin: ScannerPlugin = {
        name: 'DynamicScanner',
        scan: vi.fn().mockResolvedValue({ safe: false, reason: 'Blocked' }),
      };

      scanner.addPlugin(plugin);
      const file = createFile();
      const result = await scanner.scan(file);

      expect(result.safe).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onRejected when a file is rejected', async () => {
      const onRejected = vi.fn();
      const scanner = createUploadScanner({
        maxFileSize: 100,
        onRejected,
      });
      const file = createFile({ size: 200 });

      await scanner.scan(file);

      expect(onRejected).toHaveBeenCalledWith(file, expect.objectContaining({ safe: false }));
    });

    it('should call onAccepted when a file passes', async () => {
      const onAccepted = vi.fn();
      const scanner = createUploadScanner({ onAccepted });
      const file = createFile();

      await scanner.scan(file);

      expect(onAccepted).toHaveBeenCalledWith(file);
    });
  });

  describe('isExtensionBlocked', () => {
    it('should check extension blocklist', () => {
      const scanner = createUploadScanner();
      expect(scanner.isExtensionBlocked('exe')).toBe(true);
      expect(scanner.isExtensionBlocked('EXE')).toBe(true);
      expect(scanner.isExtensionBlocked('jpg')).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return scanner configuration summary', () => {
      const scanner = createUploadScanner({
        maxFileSize: 1000,
        allowedMimeTypes: ['image/jpeg'],
        plugins: [{ name: 'TestPlugin', scan: vi.fn() }],
      });

      const config = scanner.getConfig();
      expect(config.maxFileSize).toBe(1000);
      expect(config.allowedMimeTypeCount).toBe(1);
      expect(config.pluginCount).toBe(1);
      expect(config.pluginNames).toEqual(['TestPlugin']);
      expect(config.validateMagicBytes).toBe(true);
      expect(config.scanForScripts).toBe(true);
    });
  });
});
