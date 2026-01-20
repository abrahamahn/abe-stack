// packages/core/src/media/__tests__/audio-metadata.test.ts
import { describe, expect, it, vi } from 'vitest';

import { parseAudioMetadata, type AudioMetadata } from '../audio-metadata';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('Audio Metadata', () => {
  describe('parseAudioMetadata', () => {
    it('should return empty object for non-existent file', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('File not found'));

      const result = await parseAudioMetadata('/nonexistent.mp3');
      expect(result).toEqual({});
    });

    it('should detect MP3 format from ID3v2 header', async () => {
      const fs = await import('fs');
      // ID3v2 header: "ID3" (0x49 0x44 0x33)
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0x49; // I
      buffer[1] = 0x44; // D
      buffer[2] = 0x33; // 3
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
      expect(result.codec).toBe('mp3');
    });

    it('should detect MP3 format from MPEG frame sync', async () => {
      const fs = await import('fs');
      // MPEG frame sync: 0xFF followed by 0xE0-0xFF
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0xff;
      buffer[1] = 0xfb; // Valid MPEG frame
      // Add valid frame header bytes
      buffer[2] = 0x90; // Bitrate index + sample rate
      buffer[3] = 0x00; // Channel mode
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should detect WAV format from RIFF header', async () => {
      const fs = await import('fs');
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
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.wav');
      expect(result.format).toBe('wav');
      expect(result.codec).toBe('pcm');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(44100);
    });

    it('should detect FLAC format', async () => {
      const fs = await import('fs');
      // FLAC header: "fLaC"
      const buffer = Buffer.alloc(100);
      buffer[0] = 0x66; // f
      buffer[1] = 0x4c; // L
      buffer[2] = 0x61; // a
      buffer[3] = 0x43; // C
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.flac');
      expect(result.format).toBe('flac');
      expect(result.codec).toBe('flac');
    });

    it('should detect OGG format', async () => {
      const fs = await import('fs');
      // OGG header: "OggS"
      const buffer = Buffer.alloc(100);
      buffer[0] = 0x4f; // O
      buffer[1] = 0x67; // g
      buffer[2] = 0x67; // g
      buffer[3] = 0x53; // S
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.ogg');
      expect(result.format).toBe('ogg');
      expect(result.codec).toBe('vorbis');
    });

    it('should return empty object for unknown format', async () => {
      const fs = await import('fs');
      const buffer = Buffer.alloc(100);
      buffer.fill(0);
      vi.mocked(fs.promises.readFile).mockResolvedValue(buffer);

      const result = await parseAudioMetadata('/test.unknown');
      expect(result).toEqual({});
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
