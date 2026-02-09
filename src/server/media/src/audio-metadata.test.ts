// src/server/media/src/audio-metadata.test.ts
/**
 * Tests for audio-metadata parser including file size guard
 */

import { describe, expect, it, vi } from 'vitest';

import { parseAudioMetadata, type AudioMetadata } from './audio-metadata';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
  },
}));

describe('Audio Metadata', () => {
  describe('parseAudioMetadata', () => {
    it('should return empty object for non-existent file', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockRejectedValueOnce(new Error('File not found'));

      const result = await parseAudioMetadata('/nonexistent.mp3');
      expect(result).toEqual({});
    });

    it('should return empty metadata for files exceeding MAX_AUDIO_FILE_SIZE', async () => {
      const fs = await import('fs');
      // 201 MB — exceeds the 200 MB limit
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 201 * 1024 * 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);

      const result = await parseAudioMetadata('/huge.mp3');
      expect(result).toEqual({});
      // readFile should NOT have been called
      expect(fs.promises.readFile).not.toHaveBeenCalled();
    });

    it('should parse files at exactly 200 MB', async () => {
      const fs = await import('fs');
      // Exactly 200 MB — within the limit
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 200 * 1024 * 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer.fill(0);
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/borderline.mp3');
      // File is at limit (not over), so it should be parsed (returns empty for unknown format)
      expect(result).toEqual({});
      // readFile SHOULD have been called
      expect(fs.promises.readFile).toHaveBeenCalled();
    });

    it('should detect MP3 format from ID3v2 header', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // ID3v2 header: "ID3" (0x49 0x44 0x33)
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0x49; // I
      buffer[1] = 0x44; // D
      buffer[2] = 0x33; // 3
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
      expect(result.codec).toBe('mp3');
    });

    it('should detect MP3 format from MPEG frame sync', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // MPEG frame sync: 0xFF followed by 0xE0-0xFF
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0xff;
      buffer[1] = 0xfb; // Valid MPEG frame
      // Add valid frame header bytes
      buffer[2] = 0x90; // Bitrate index + sample rate
      buffer[3] = 0x00; // Channel mode
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should detect WAV format from RIFF header', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // RIFF header + WAVE
      const buffer = Buffer.alloc(100);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WAVE', 8);
      // fmt chunk - minimal valid values
      buffer.writeUInt16LE(2, 22); // channels
      buffer.writeUInt32LE(44100, 24); // sample rate
      buffer.writeUInt16LE(16, 34); // bits per sample
      buffer.writeUInt32LE(100000, 40); // data size
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.wav');
      expect(result.format).toBe('wav');
      expect(result.codec).toBe('pcm');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(44100);
    });

    it('should detect FLAC format and parse STREAMINFO header', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // Build a minimal valid FLAC buffer with STREAMINFO
      const buffer = Buffer.alloc(100);
      // "fLaC" magic
      buffer[0] = 0x66;
      buffer[1] = 0x4c;
      buffer[2] = 0x61;
      buffer[3] = 0x43;
      // Metadata block header: type 0 (STREAMINFO), length 34
      buffer[4] = 0x00; // type 0, not last
      buffer[5] = 0x00;
      buffer[6] = 0x00;
      buffer[7] = 0x22; // 34 bytes
      // STREAMINFO block (34 bytes starting at offset 8)
      // bytes 0-1: min block size
      buffer[8] = 0x10;
      buffer[9] = 0x00;
      // bytes 2-3: max block size
      buffer[10] = 0x10;
      buffer[11] = 0x00;
      // bytes 4-9: frame sizes (skip)
      // bytes 10-13: sample rate (20 bits) | channels-1 (3 bits) | bps-1 (5 bits) | total samples high (4 bits)
      // 44100 Hz = 0x0AC44, channels=2 (stored as 1), bps=16 (stored as 15)
      // 0x0AC44 in 20 bits: 0000_1010_1100_0100_0100
      // channels-1=1 in 3 bits: 001
      // bps-1=15 in 5 bits: 01111
      // total samples high 4 bits: 0000
      // So bytes: 0x0A 0xC4 0x42 (0100_0010) 0xF0 (1111_0000)
      buffer[18] = 0x0a; // byte10: high 8 bits of sample rate
      buffer[19] = 0xc4; // byte11: middle 8 bits of sample rate
      buffer[20] = 0x42; // byte12: low 4 bits of SR | 3 bits channels | 1 bit bps
      buffer[21] = 0xf0; // byte13: 4 bits bps | 4 bits total samples high
      // bytes 14-17: total samples low (set to 441000 = ~10 seconds at 44100)
      buffer.writeUInt32BE(441000, 22);
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.flac');
      expect(result.format).toBe('flac');
      expect(result.codec).toBe('flac');
      expect(result.sampleRate).toBe(44100);
      expect(result.channels).toBe(2);
      expect(result.duration).toBeCloseTo(10, 0);
    });

    it('should detect FLAC format with minimal buffer', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 10 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // Only the "fLaC" magic — not enough for STREAMINFO
      const buffer = Buffer.alloc(10);
      buffer[0] = 0x66;
      buffer[1] = 0x4c;
      buffer[2] = 0x61;
      buffer[3] = 0x43;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.flac');
      expect(result.format).toBe('flac');
      expect(result.codec).toBe('flac');
      // No channels/sampleRate parsed from truncated buffer
    });

    it('should detect OGG format and parse Vorbis identification header', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // Build a minimal OGG Vorbis page
      const buffer = Buffer.alloc(100);
      // OGG page header
      buffer[0] = 0x4f; // O
      buffer[1] = 0x67; // g
      buffer[2] = 0x67; // g
      buffer[3] = 0x53; // S
      buffer[4] = 0x00; // version
      buffer[5] = 0x02; // header type (beginning of stream)
      // bytes 6-25: granule, serial, seq, crc (skip)
      buffer[26] = 0x01; // 1 segment
      // segment table (1 byte)
      buffer[27] = 58; // segment size
      // Vorbis identification header starts at offset 28
      buffer[28] = 0x01; // packet type = identification
      buffer.write('vorbis', 29, 'ascii'); // bytes 29-34
      buffer.writeUInt32LE(0, 35); // vorbis version = 0
      buffer[39] = 2; // channels = 2
      buffer.writeUInt32LE(48000, 40); // sample rate = 48000
      buffer.writeInt32LE(0, 44); // bitrate max
      buffer.writeInt32LE(192000, 48); // bitrate nominal = 192000
      buffer.writeInt32LE(0, 52); // bitrate min
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.ogg');
      expect(result.format).toBe('ogg');
      expect(result.codec).toBe('vorbis');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(48000);
      expect(result.bitrate).toBe(192000);
    });

    it('should detect OGG format with minimal buffer', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 20 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // Only the "OggS" magic — not enough for Vorbis header
      const buffer = Buffer.alloc(20);
      buffer[0] = 0x4f;
      buffer[1] = 0x67;
      buffer[2] = 0x67;
      buffer[3] = 0x53;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.ogg');
      expect(result.format).toBe('ogg');
      expect(result.codec).toBe('vorbis');
      // No channels/sampleRate parsed from truncated buffer
    });

    it('should return WAV format but no fields for buffer shorter than 44 bytes', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 20 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // RIFF + WAVE header but only 20 bytes (not enough for fmt chunk)
      const buffer = Buffer.alloc(20);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(12, 4);
      buffer.write('WAVE', 8);
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/short.wav');
      expect(result.format).toBe('wav');
      expect(result.codec).toBe('pcm');
      // Not enough data to parse channels/sampleRate
      expect(result.channels).toBeUndefined();
      expect(result.sampleRate).toBeUndefined();
    });

    it('should reject WAV with zero channels', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 100 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4);
      buffer.write('WAVE', 8);
      buffer.writeUInt16LE(0, 22); // channels = 0 (invalid)
      buffer.writeUInt32LE(44100, 24);
      buffer.writeUInt16LE(16, 34);
      buffer.writeUInt32LE(100000, 40);
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/bad.wav');
      expect(result.format).toBe('wav');
      // Channels should not be set for zero-channel WAV
      expect(result.channels).toBeUndefined();
    });

    it('should return empty object for unknown format', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 1024 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer.fill(0);
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.unknown');
      expect(result).toEqual({});
    });

    it('should handle truncated MP3 frame header', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 3 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      // MPEG frame sync but buffer too short for full header
      const buffer = Buffer.alloc(3); // Only 3 bytes, not enough for header
      buffer[0] = 0xff;
      buffer[1] = 0xfb;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
      // Should still detect MP3 but may not get all metadata
    });

    it('should handle MP3 with invalid bitrate index', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 100 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xfb;
      buffer[2] = 0xf0; // Invalid bitrate index (15)
      buffer[3] = 0x00;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should handle MP3 with invalid sample rate index', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 100 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xfb;
      buffer[2] = 0x9c; // Valid bitrate, invalid sample rate index (3)
      buffer[3] = 0x00;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should handle MP3 with invalid MPEG version', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValueOnce({ size: 100 } as Awaited<
        ReturnType<typeof fs.promises.stat>
      >);
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xf0 | 0x08; // Invalid MPEG version (1 in bits 3-4)
      buffer[2] = 0x90;
      buffer[3] = 0x00;
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
    });
  });

  describe('AudioMetadata interface', () => {
    it('should have all optional fields', () => {
      const metadata: AudioMetadata = {};
      expect(metadata.duration).toBeUndefined();
      expect(metadata.bitrate).toBeUndefined();
      expect(metadata.codec).toBeUndefined();
      expect(metadata.format).toBeUndefined();
      expect(metadata.channels).toBeUndefined();
      expect(metadata.sampleRate).toBeUndefined();
      expect(metadata.title).toBeUndefined();
      expect(metadata.artist).toBeUndefined();
      expect(metadata.album).toBeUndefined();
    });

    it('should accept all fields', () => {
      const metadata: AudioMetadata = {
        duration: 180,
        bitrate: 320000,
        codec: 'mp3',
        format: 'mp3',
        channels: 2,
        sampleRate: 44100,
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
      };

      expect(metadata.duration).toBe(180);
      expect(metadata.bitrate).toBe(320000);
      expect(metadata.title).toBe('Test Song');
    });
  });
});
