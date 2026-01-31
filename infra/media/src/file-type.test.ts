// infra/media/src/file-type.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  detectFileType,
  detectFileTypeFromFile,
  detectFileTypeFromPath,
  isAllowedFileType,
} from './file-type';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    open: vi.fn(),
  },
}));

describe('detectFileType', () => {
  describe('image detection', () => {
    test('should detect JPEG files', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = detectFileType(jpegBuffer);
      expect(result).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    test('should detect PNG files', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = detectFileType(pngBuffer);
      expect(result).toEqual({ ext: 'png', mime: 'image/png' });
    });

    test('should detect GIF87a files', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      const result = detectFileType(gifBuffer);
      expect(result).toEqual({ ext: 'gif', mime: 'image/gif' });
    });

    test('should detect GIF89a files', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const result = detectFileType(gifBuffer);
      expect(result).toEqual({ ext: 'gif', mime: 'image/gif' });
    });

    test('should detect BMP files', () => {
      const bmpBuffer = Buffer.from([0x42, 0x4d, 0x00, 0x00]);
      const result = detectFileType(bmpBuffer);
      expect(result).toEqual({ ext: 'bmp', mime: 'image/bmp' });
    });
  });

  describe('audio detection', () => {
    test('should detect MP3 files (MPEG Audio)', () => {
      const mp3Buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
      const result = detectFileType(mp3Buffer);
      expect(result).toEqual({ ext: 'mp3', mime: 'audio/mpeg' });
    });

    test('should detect MP3 files (ID3v2 tag)', () => {
      const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00]);
      const result = detectFileType(mp3Buffer);
      expect(result).toEqual({ ext: 'mp3', mime: 'audio/mpeg' });
    });

    test('should detect OGG files', () => {
      const oggBuffer = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00]);
      const result = detectFileType(oggBuffer);
      expect(result).toEqual({ ext: 'ogg', mime: 'audio/ogg' });
    });
  });

  describe('video detection', () => {
    test('should detect WebM files', () => {
      const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]);
      const result = detectFileType(webmBuffer);
      expect(result).toEqual({ ext: 'webm', mime: 'video/webm' });
    });

    test('should detect FLV files', () => {
      const flvBuffer = Buffer.from([0x46, 0x4c, 0x56, 0x01, 0x05]);
      const result = detectFileType(flvBuffer);
      expect(result).toEqual({ ext: 'flv', mime: 'video/x-flv' });
    });
  });

  describe('document detection', () => {
    test('should detect PDF files', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
      const result = detectFileType(pdfBuffer);
      expect(result).toEqual({ ext: 'pdf', mime: 'application/pdf' });
    });
  });

  describe('edge cases', () => {
    test('should return null for unknown file type', () => {
      const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = detectFileType(unknownBuffer);
      expect(result).toBeNull();
    });

    test('should return null for empty buffer', () => {
      const emptyBuffer = Buffer.from([]);
      const result = detectFileType(emptyBuffer);
      expect(result).toBeNull();
    });

    test('should return null for buffer too short for signature', () => {
      const shortBuffer = Buffer.from([0xff]); // Too short for JPEG
      const result = detectFileType(shortBuffer);
      expect(result).toBeNull();
    });
  });
});

describe('detectFileTypeFromPath', () => {
  describe('image extensions', () => {
    test('should detect .jpg files', () => {
      expect(detectFileTypeFromPath('photo.jpg')).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    });

    test('should detect .jpeg files', () => {
      expect(detectFileTypeFromPath('photo.jpeg')).toEqual({ ext: 'jpeg', mime: 'image/jpeg' });
    });

    test('should detect .png files', () => {
      expect(detectFileTypeFromPath('image.png')).toEqual({ ext: 'png', mime: 'image/png' });
    });

    test('should detect .gif files', () => {
      expect(detectFileTypeFromPath('animation.gif')).toEqual({ ext: 'gif', mime: 'image/gif' });
    });

    test('should detect .webp files', () => {
      expect(detectFileTypeFromPath('modern.webp')).toEqual({ ext: 'webp', mime: 'image/webp' });
    });
  });

  describe('audio extensions', () => {
    test('should detect .mp3 files', () => {
      expect(detectFileTypeFromPath('song.mp3')).toEqual({ ext: 'mp3', mime: 'audio/mpeg' });
    });

    test('should detect .wav files', () => {
      expect(detectFileTypeFromPath('audio.wav')).toEqual({ ext: 'wav', mime: 'audio/wav' });
    });

    test('should detect .ogg files', () => {
      expect(detectFileTypeFromPath('track.ogg')).toEqual({ ext: 'ogg', mime: 'audio/ogg' });
    });
  });

  describe('video extensions', () => {
    test('should detect .mp4 files', () => {
      expect(detectFileTypeFromPath('video.mp4')).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    });

    test('should detect .webm files', () => {
      expect(detectFileTypeFromPath('clip.webm')).toEqual({ ext: 'webm', mime: 'video/webm' });
    });

    test('should detect .mov files', () => {
      expect(detectFileTypeFromPath('movie.mov')).toEqual({ ext: 'mov', mime: 'video/quicktime' });
    });
  });

  describe('document extensions', () => {
    test('should detect .pdf files', () => {
      expect(detectFileTypeFromPath('document.pdf')).toEqual({
        ext: 'pdf',
        mime: 'application/pdf',
      });
    });

    test('should detect .txt files', () => {
      expect(detectFileTypeFromPath('readme.txt')).toEqual({ ext: 'txt', mime: 'text/plain' });
    });

    test('should detect .json files', () => {
      expect(detectFileTypeFromPath('config.json')).toEqual({
        ext: 'json',
        mime: 'application/json',
      });
    });
  });

  describe('case insensitivity', () => {
    test('should handle uppercase extensions', () => {
      expect(detectFileTypeFromPath('photo.JPG')).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
      expect(detectFileTypeFromPath('video.MP4')).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    });

    test('should handle mixed case extensions', () => {
      expect(detectFileTypeFromPath('image.Png')).toEqual({ ext: 'png', mime: 'image/png' });
    });
  });

  describe('edge cases', () => {
    test('should return null for files without extension', () => {
      expect(detectFileTypeFromPath('README')).toBeNull();
      expect(detectFileTypeFromPath('Makefile')).toBeNull();
    });

    test('should return null for unknown extension', () => {
      expect(detectFileTypeFromPath('file.xyz')).toBeNull();
      expect(detectFileTypeFromPath('data.custom')).toBeNull();
    });

    test('should handle paths with directories', () => {
      expect(detectFileTypeFromPath('/path/to/image.png')).toEqual({
        ext: 'png',
        mime: 'image/png',
      });
      expect(detectFileTypeFromPath('relative/path/video.mp4')).toEqual({
        ext: 'mp4',
        mime: 'video/mp4',
      });
    });

    test('should handle files with multiple dots', () => {
      expect(detectFileTypeFromPath('archive.tar.gz')).toBeNull(); // .gz not supported
      expect(detectFileTypeFromPath('my.file.mp4')).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    });
  });
});

describe('isAllowedFileType', () => {
  describe('exact MIME type matching', () => {
    test('should allow exact MIME type match', () => {
      const fileType = { ext: 'jpg', mime: 'image/jpeg' };
      expect(isAllowedFileType(fileType, ['image/jpeg'])).toBe(true);
    });

    test('should reject non-matching MIME type', () => {
      const fileType = { ext: 'png', mime: 'image/png' };
      expect(isAllowedFileType(fileType, ['image/jpeg'])).toBe(false);
    });

    test('should allow from multiple allowed types', () => {
      const fileType = { ext: 'mp4', mime: 'video/mp4' };
      expect(isAllowedFileType(fileType, ['image/jpeg', 'video/mp4', 'audio/mpeg'])).toBe(true);
    });
  });

  describe('wildcard matching', () => {
    test('should allow image/* wildcard', () => {
      expect(isAllowedFileType({ ext: 'jpg', mime: 'image/jpeg' }, ['image/*'])).toBe(true);
      expect(isAllowedFileType({ ext: 'png', mime: 'image/png' }, ['image/*'])).toBe(true);
      expect(isAllowedFileType({ ext: 'gif', mime: 'image/gif' }, ['image/*'])).toBe(true);
    });

    test('should allow video/* wildcard', () => {
      expect(isAllowedFileType({ ext: 'mp4', mime: 'video/mp4' }, ['video/*'])).toBe(true);
      expect(isAllowedFileType({ ext: 'webm', mime: 'video/webm' }, ['video/*'])).toBe(true);
    });

    test('should allow audio/* wildcard', () => {
      expect(isAllowedFileType({ ext: 'mp3', mime: 'audio/mpeg' }, ['audio/*'])).toBe(true);
    });

    test('should reject wrong category with wildcard', () => {
      expect(isAllowedFileType({ ext: 'mp4', mime: 'video/mp4' }, ['image/*'])).toBe(false);
      expect(isAllowedFileType({ ext: 'jpg', mime: 'image/jpeg' }, ['video/*'])).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should return false for null file type', () => {
      expect(isAllowedFileType(null, ['image/*'])).toBe(false);
    });

    test('should return false for empty allowed types', () => {
      expect(isAllowedFileType({ ext: 'jpg', mime: 'image/jpeg' }, [])).toBe(false);
    });

    test('should handle mixed wildcards and specific types', () => {
      const allowedTypes = ['image/*', 'video/mp4', 'application/pdf'];

      expect(isAllowedFileType({ ext: 'png', mime: 'image/png' }, allowedTypes)).toBe(true);
      expect(isAllowedFileType({ ext: 'mp4', mime: 'video/mp4' }, allowedTypes)).toBe(true);
      expect(isAllowedFileType({ ext: 'pdf', mime: 'application/pdf' }, allowedTypes)).toBe(true);
      expect(isAllowedFileType({ ext: 'webm', mime: 'video/webm' }, allowedTypes)).toBe(false);
    });
  });
});

describe('detectFileTypeFromFile', () => {
  test('should detect file type from magic bytes', async () => {
    const fs = await import('fs');

    // Create a mock file handle that returns JPEG magic bytes
    const mockFileHandle = {
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        // Write JPEG magic bytes into buffer
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

    // Return unrecognized magic bytes
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

    // File has .mp4 extension for fallback
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
        // PNG magic bytes
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
});
