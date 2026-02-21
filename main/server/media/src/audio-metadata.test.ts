// main/server/media/src/audio-metadata.test.ts
/**
 * Tests for server-specific audio metadata I/O wrapper.
 *
 * Pure buffer-based parser tests are in @bslt/shared
 * (main/shared/src/domain/media/media.audio-metadata.test.ts)
 */

import { describe, expect, it, vi } from 'vitest';

import { parseAudioMetadata } from './audio-metadata';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    open: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe('parseAudioMetadata (I/O wrapper)', () => {
  it('should return empty object for non-existent file', async () => {
    const fs = await import('fs');
    vi.mocked(fs.promises.open).mockRejectedValueOnce(new Error('File not found'));

    const result = await parseAudioMetadata('/nonexistent.mp3');
    expect(result).toEqual({});
  });

  it('should return empty metadata for files exceeding MAX_AUDIO_FILE_SIZE', async () => {
    const fs = await import('fs');
    const mockFd = {
      stat: vi.fn().mockResolvedValue({ size: 201 * 1024 * 1024 }),
      readFile: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(fs.promises.open).mockResolvedValueOnce(mockFd as never);

    const result = await parseAudioMetadata('/huge.mp3');
    expect(result).toEqual({});
  });

  it('should parse files at exactly 200 MB', async () => {
    const fs = await import('fs');
    const buffer = Buffer.alloc(100);
    buffer.fill(0);
    const mockFd = {
      stat: vi.fn().mockResolvedValue({ size: 200 * 1024 * 1024 }),
      readFile: vi.fn().mockResolvedValue(buffer),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(fs.promises.open).mockResolvedValueOnce(mockFd as never);

    const result = await parseAudioMetadata('/borderline.mp3');
    // File is at limit (not over), so it should be parsed (returns empty for unknown format)
    expect(result).toEqual({});
    expect(mockFd.readFile).toHaveBeenCalled();
  });

  it('should delegate to parseAudioMetadataFromBuffer for valid file', async () => {
    const fs = await import('fs');
    // ID3v2 header
    const buffer = Buffer.alloc(1000);
    buffer[0] = 0x49;
    buffer[1] = 0x44;
    buffer[2] = 0x33;
    const mockFd = {
      stat: vi.fn().mockResolvedValue({ size: buffer.length }),
      readFile: vi.fn().mockResolvedValue(buffer),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(fs.promises.open).mockResolvedValueOnce(mockFd as never);

    const result = await parseAudioMetadata('/test.mp3');
    expect(result.format).toBe('mp3');
    expect(result.codec).toBe('mp3');
  });
});
