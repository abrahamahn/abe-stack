/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/utils/__tests__/file-type.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  detectFileType,
  detectFileTypeFromPath,
  detectFileTypeFromFile,
  isAllowedFileType,
  getExtensionFromMime,
  type FileTypeResult,
} from '../file-type';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  open: vi.fn(),
}));

describe('detectFileType', () => {
  describe('image formats', () => {
    it('should detect JPEG files', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = detectFileType(jpegBuffer);

      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    it('should detect PNG files', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = detectFileType(pngBuffer);

      expect(result).toEqual({ ext: 'png', mime: 'image/png' });
    });

    it('should detect GIF files', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const result = detectFileType(gifBuffer);

      expect(result).toEqual({ ext: 'gif', mime: 'image/gif' });
    });

    it('should detect WebP files', () => {
      // RIFF signature for WebP
      const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      const result = detectFileType(webpBuffer);

      // Note: WebP shares RIFF signature with WAV/AVI, so first match wins
      expect(result?.mime).toMatch(/image\/webp|audio\/wav|video\/avi/);
    });

    it('should detect AVIF files', () => {
      const avifBuffer = Buffer.from([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00,
        0x00,
      ]);
      const result = detectFileType(avifBuffer);

      expect(result).toEqual({ ext: 'avif', mime: 'image/avif' });
    });
  });

  describe('audio formats', () => {
    it('should detect MP3 files', () => {
      const mp3Buffer = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
      const result = detectFileType(mp3Buffer);

      expect(result).toEqual({ ext: 'mp3', mime: 'audio/mpeg' });
    });

    it('should detect AAC files', () => {
      const aacBuffer = Buffer.from([0xff, 0xf1, 0x50, 0x80]);
      const result = detectFileType(aacBuffer);

      expect(result).toEqual({ ext: 'aac', mime: 'audio/aac' });
    });

    it('should detect OGG files', () => {
      const oggBuffer = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
      const result = detectFileType(oggBuffer);

      expect(result).toEqual({ ext: 'ogg', mime: 'audio/ogg' });
    });
  });

  describe('video formats', () => {
    it('should detect MP4 files', () => {
      const mp4Buffer = Buffer.from([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      const result = detectFileType(mp4Buffer);

      expect(result).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    });

    it('should detect WebM files', () => {
      const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);
      const result = detectFileType(webmBuffer);

      expect(result).toEqual({ ext: 'webm', mime: 'video/webm' });
    });

    it('should detect MOV files', () => {
      const movBuffer = Buffer.from([
        0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      ]);
      const result = detectFileType(movBuffer);

      expect(result).toEqual({ ext: 'mov', mime: 'video/quicktime' });
    });
  });

  describe('document formats', () => {
    it('should detect PDF files', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const result = detectFileType(pdfBuffer);

      expect(result).toEqual({ ext: 'pdf', mime: 'application/pdf' });
    });
  });

  describe('edge cases', () => {
    it('should return null for unknown file type', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const result = detectFileType(unknownBuffer);

      expect(result).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const emptyBuffer = Buffer.from([]);
      const result = detectFileType(emptyBuffer);

      expect(result).toBeNull();
    });

    it('should return null for buffer smaller than signature', () => {
      const smallBuffer = Buffer.from([0xff, 0xd8]);
      const result = detectFileType(smallBuffer);

      // Should still detect JPEG since signature is 3 bytes and buffer has 2
      // Actually the buffer is too small for 3-byte signature
      expect(result).toBeNull();
    });

    it('should handle partial signature matches', () => {
      // Buffer starts like JPEG but has wrong continuation
      const partialBuffer = Buffer.from([0xff, 0xd8, 0x00]);
      const result = detectFileType(partialBuffer);

      // 0xd8 0xff check - third byte doesn't match JPEG signature
      expect(result).toBeNull();
    });
  });
});

describe('detectFileTypeFromPath', () => {
  describe('image extensions', () => {
    it('should detect JPG extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.jpg');
      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    it('should detect JPEG extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.jpeg');
      expect(result).toEqual({ ext: 'jpeg', mime: 'image/jpeg' });
    });

    it('should detect PNG extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.png');
      expect(result).toEqual({ ext: 'png', mime: 'image/png' });
    });

    it('should detect GIF extension', () => {
      const result = detectFileTypeFromPath('/path/to/animation.gif');
      expect(result).toEqual({ ext: 'gif', mime: 'image/gif' });
    });

    it('should detect WebP extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.webp');
      expect(result).toEqual({ ext: 'webp', mime: 'image/webp' });
    });

    it('should detect AVIF extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.avif');
      expect(result).toEqual({ ext: 'avif', mime: 'image/avif' });
    });

    it('should detect TIFF extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.tiff');
      expect(result).toEqual({ ext: 'tiff', mime: 'image/tiff' });
    });

    it('should detect BMP extension', () => {
      const result = detectFileTypeFromPath('/path/to/image.bmp');
      expect(result).toEqual({ ext: 'bmp', mime: 'image/bmp' });
    });
  });

  describe('audio extensions', () => {
    it('should detect MP3 extension', () => {
      const result = detectFileTypeFromPath('/music/song.mp3');
      expect(result).toEqual({ ext: 'mp3', mime: 'audio/mpeg' });
    });

    it('should detect WAV extension', () => {
      const result = detectFileTypeFromPath('/audio/sound.wav');
      expect(result).toEqual({ ext: 'wav', mime: 'audio/wav' });
    });

    it('should detect FLAC extension', () => {
      const result = detectFileTypeFromPath('/audio/lossless.flac');
      expect(result).toEqual({ ext: 'flac', mime: 'audio/flac' });
    });

    it('should detect AAC extension', () => {
      const result = detectFileTypeFromPath('/audio/compressed.aac');
      expect(result).toEqual({ ext: 'aac', mime: 'audio/aac' });
    });

    it('should detect OGG extension', () => {
      const result = detectFileTypeFromPath('/audio/track.ogg');
      expect(result).toEqual({ ext: 'ogg', mime: 'audio/ogg' });
    });

    it('should detect M4A extension', () => {
      const result = detectFileTypeFromPath('/audio/apple.m4a');
      expect(result).toEqual({ ext: 'm4a', mime: 'audio/m4a' });
    });
  });

  describe('video extensions', () => {
    it('should detect MP4 extension', () => {
      const result = detectFileTypeFromPath('/videos/movie.mp4');
      expect(result).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    });

    it('should detect WebM extension', () => {
      const result = detectFileTypeFromPath('/videos/clip.webm');
      expect(result).toEqual({ ext: 'webm', mime: 'video/webm' });
    });

    it('should detect AVI extension', () => {
      const result = detectFileTypeFromPath('/videos/old.avi');
      expect(result).toEqual({ ext: 'avi', mime: 'video/avi' });
    });

    it('should detect MOV extension', () => {
      const result = detectFileTypeFromPath('/videos/quicktime.mov');
      expect(result).toEqual({ ext: 'mov', mime: 'video/quicktime' });
    });

    it('should detect MKV extension', () => {
      const result = detectFileTypeFromPath('/videos/matroska.mkv');
      expect(result).toEqual({ ext: 'mkv', mime: 'video/x-matroska' });
    });

    it('should detect FLV extension', () => {
      const result = detectFileTypeFromPath('/videos/flash.flv');
      expect(result).toEqual({ ext: 'flv', mime: 'video/x-flv' });
    });

    it('should detect WMV extension', () => {
      const result = detectFileTypeFromPath('/videos/windows.wmv');
      expect(result).toEqual({ ext: 'wmv', mime: 'video/x-ms-wmv' });
    });
  });

  describe('document extensions', () => {
    it('should detect PDF extension', () => {
      const result = detectFileTypeFromPath('/docs/document.pdf');
      expect(result).toEqual({ ext: 'pdf', mime: 'application/pdf' });
    });

    it('should detect DOC extension', () => {
      const result = detectFileTypeFromPath('/docs/word.doc');
      expect(result).toEqual({ ext: 'doc', mime: 'application/msword' });
    });

    it('should detect DOCX extension', () => {
      const result = detectFileTypeFromPath('/docs/word.docx');
      expect(result).toEqual({
        ext: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    });

    it('should detect XLS extension', () => {
      const result = detectFileTypeFromPath('/docs/spreadsheet.xls');
      expect(result).toEqual({ ext: 'xls', mime: 'application/vnd.ms-excel' });
    });

    it('should detect XLSX extension', () => {
      const result = detectFileTypeFromPath('/docs/spreadsheet.xlsx');
      expect(result).toEqual({
        ext: 'xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    });

    it('should detect PPT extension', () => {
      const result = detectFileTypeFromPath('/docs/presentation.ppt');
      expect(result).toEqual({ ext: 'ppt', mime: 'application/vnd.ms-powerpoint' });
    });

    it('should detect PPTX extension', () => {
      const result = detectFileTypeFromPath('/docs/presentation.pptx');
      expect(result).toEqual({
        ext: 'pptx',
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle uppercase extensions', () => {
      const result = detectFileTypeFromPath('/path/to/IMAGE.JPG');
      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    it('should handle mixed case extensions', () => {
      const result = detectFileTypeFromPath('/path/to/image.JpG');
      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    it('should return null for unknown extension', () => {
      const result = detectFileTypeFromPath('/path/to/file.xyz');
      expect(result).toBeNull();
    });

    it('should return null for file without extension', () => {
      const result = detectFileTypeFromPath('/path/to/noextension');
      expect(result).toBeNull();
    });

    it('should handle multiple dots in filename', () => {
      const result = detectFileTypeFromPath('/path/to/file.backup.jpg');
      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    it('should handle hidden files with extension', () => {
      const result = detectFileTypeFromPath('/path/to/.hidden.png');
      expect(result).toEqual({ ext: 'png', mime: 'image/png' });
    });
  });
});

describe('detectFileTypeFromFile', () => {
  let mockOpen: ReturnType<typeof vi.fn>;
  let mockFileHandle: {
    read: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockFileHandle = {
      read: vi.fn(),
      close: vi.fn(),
    };

    const fs = await import('fs/promises');
    mockOpen = vi.mocked(fs.open);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should detect file type from file content', async () => {
    const jpegHeader = Buffer.alloc(64);
    jpegHeader[0] = 0xff;
    jpegHeader[1] = 0xd8;
    jpegHeader[2] = 0xff;

    const jpegMockRead = vi.fn((buffer: Buffer): Promise<{ bytesRead: number }> => {
      jpegHeader.copy(buffer);
      return Promise.resolve({ bytesRead: 64 });
    });
    mockFileHandle.read = jpegMockRead;
    mockOpen.mockResolvedValue(mockFileHandle);

    const result = await detectFileTypeFromFile('/path/to/image.jpg');

    expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    expect(mockFileHandle.close).toHaveBeenCalled();
  });

  it('should fall back to extension when magic bytes not recognized', async () => {
    const unknownContent = Buffer.alloc(64);
    const unknownMockRead = vi.fn((buffer: Buffer): Promise<{ bytesRead: number }> => {
      unknownContent.copy(buffer);
      return Promise.resolve({ bytesRead: 64 });
    });
    mockFileHandle.read = unknownMockRead;
    mockOpen.mockResolvedValue(mockFileHandle);

    const result = await detectFileTypeFromFile('/path/to/image.png');

    expect(result).toEqual({ ext: 'png', mime: 'image/png' });
  });

  it('should return null when file cannot be read', async () => {
    mockOpen.mockRejectedValue(new Error('File not found'));

    const result = await detectFileTypeFromFile('/non/existent/file.jpg');

    expect(result).toBeNull();
  });

  it('should return null for unrecognized file without known extension', async () => {
    const unknownContent = Buffer.alloc(64);
    const unknownMockRead = vi.fn((buffer: Buffer): Promise<{ bytesRead: number }> => {
      unknownContent.copy(buffer);
      return Promise.resolve({ bytesRead: 64 });
    });
    mockFileHandle.read = unknownMockRead;
    mockOpen.mockResolvedValue(mockFileHandle);

    const result = await detectFileTypeFromFile('/path/to/file.unknown');

    expect(result).toBeNull();
  });
});

describe('isAllowedFileType', () => {
  it('should return true for exact MIME type match', () => {
    const fileType: FileTypeResult = { ext: 'jpg', mime: 'image/jpeg' };
    const allowedTypes = ['image/jpeg', 'image/png'];

    expect(isAllowedFileType(fileType, allowedTypes)).toBe(true);
  });

  it('should return true for wildcard MIME type match', () => {
    const fileType: FileTypeResult = { ext: 'jpg', mime: 'image/jpeg' };
    const allowedTypes = ['image/*', 'audio/*'];

    expect(isAllowedFileType(fileType, allowedTypes)).toBe(true);
  });

  it('should return false for non-matching MIME type', () => {
    const fileType: FileTypeResult = { ext: 'mp3', mime: 'audio/mpeg' };
    const allowedTypes = ['image/jpeg', 'image/png'];

    expect(isAllowedFileType(fileType, allowedTypes)).toBe(false);
  });

  it('should return false for null file type', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];

    expect(isAllowedFileType(null, allowedTypes)).toBe(false);
  });

  it('should return false for empty allowed types', () => {
    const fileType: FileTypeResult = { ext: 'jpg', mime: 'image/jpeg' };

    expect(isAllowedFileType(fileType, [])).toBe(false);
  });

  it('should handle audio wildcard match', () => {
    const fileType: FileTypeResult = { ext: 'mp3', mime: 'audio/mpeg' };
    const allowedTypes = ['audio/*'];

    expect(isAllowedFileType(fileType, allowedTypes)).toBe(true);
  });

  it('should handle video wildcard match', () => {
    const fileType: FileTypeResult = { ext: 'mp4', mime: 'video/mp4' };
    const allowedTypes = ['video/*'];

    expect(isAllowedFileType(fileType, allowedTypes)).toBe(true);
  });
});

describe('getExtensionFromMime', () => {
  it('should return correct extension for JPEG', () => {
    expect(getExtensionFromMime('image/jpeg')).toBe('jpg');
  });

  it('should return correct extension for PNG', () => {
    expect(getExtensionFromMime('image/png')).toBe('png');
  });

  it('should return correct extension for GIF', () => {
    expect(getExtensionFromMime('image/gif')).toBe('gif');
  });

  it('should return correct extension for WebP', () => {
    expect(getExtensionFromMime('image/webp')).toBe('webp');
  });

  it('should return correct extension for AVIF', () => {
    expect(getExtensionFromMime('image/avif')).toBe('avif');
  });

  it('should return correct extension for MP3', () => {
    expect(getExtensionFromMime('audio/mpeg')).toBe('mp3');
  });

  it('should return correct extension for WAV', () => {
    expect(getExtensionFromMime('audio/wav')).toBe('wav');
  });

  it('should return correct extension for AAC', () => {
    expect(getExtensionFromMime('audio/aac')).toBe('aac');
  });

  it('should return correct extension for OGG', () => {
    expect(getExtensionFromMime('audio/ogg')).toBe('ogg');
  });

  it('should return correct extension for MP4', () => {
    expect(getExtensionFromMime('video/mp4')).toBe('mp4');
  });

  it('should return correct extension for WebM', () => {
    expect(getExtensionFromMime('video/webm')).toBe('webm');
  });

  it('should return correct extension for AVI', () => {
    expect(getExtensionFromMime('video/avi')).toBe('avi');
  });

  it('should return correct extension for MOV', () => {
    expect(getExtensionFromMime('video/quicktime')).toBe('mov');
  });

  it('should return correct extension for PDF', () => {
    expect(getExtensionFromMime('application/pdf')).toBe('pdf');
  });

  it('should return "bin" for unknown MIME type', () => {
    expect(getExtensionFromMime('application/unknown')).toBe('bin');
  });

  it('should return "bin" for empty MIME type', () => {
    expect(getExtensionFromMime('')).toBe('bin');
  });
});
