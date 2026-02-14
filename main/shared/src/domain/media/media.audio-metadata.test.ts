// main/shared/src/domain/media/media.audio-metadata.test.ts
/**
 * Tests for pure buffer-based audio metadata parsing.
 */

import { describe, expect, it } from 'vitest';

import { parseAudioMetadataFromBuffer } from './media.audio-metadata';

import type { AudioMetadata } from './media.audio-metadata';

describe('parseAudioMetadataFromBuffer', () => {
  describe('MP3 format', () => {
    it('should detect MP3 format from ID3v2 header', () => {
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0x49; // I
      buffer[1] = 0x44; // D
      buffer[2] = 0x33; // 3

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
      expect(result.codec).toBe('mp3');
    });

    it('should detect MP3 format from MPEG frame sync', () => {
      const buffer = Buffer.alloc(1000);
      buffer[0] = 0xff;
      buffer[1] = 0xfb; // Valid MPEG frame
      buffer[2] = 0x90; // Bitrate index + sample rate
      buffer[3] = 0x00; // Channel mode

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
    });

    it('should handle truncated MP3 frame header', () => {
      const buffer = Buffer.alloc(3);
      buffer[0] = 0xff;
      buffer[1] = 0xfb;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
    });

    it('should handle MP3 with invalid bitrate index', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xfb;
      buffer[2] = 0xf0; // Invalid bitrate index (15)
      buffer[3] = 0x00;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
    });

    it('should handle MP3 with invalid sample rate index', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xfb;
      buffer[2] = 0x9c; // Valid bitrate, invalid sample rate index (3)
      buffer[3] = 0x00;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
    });

    it('should handle MP3 with invalid MPEG version', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xf0 | 0x08; // Invalid MPEG version (1 in bits 3-4)
      buffer[2] = 0x90;
      buffer[3] = 0x00;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('mp3');
    });
  });

  describe('WAV format', () => {
    it('should detect WAV format from RIFF header', () => {
      const buffer = Buffer.alloc(100);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WAVE', 8);
      buffer.writeUInt16LE(2, 22); // channels
      buffer.writeUInt32LE(44100, 24); // sample rate
      buffer.writeUInt16LE(16, 34); // bits per sample
      buffer.writeUInt32LE(100000, 40); // data size

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('wav');
      expect(result.codec).toBe('pcm');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(44100);
    });

    it('should return WAV format but no fields for buffer shorter than 44 bytes', () => {
      const buffer = Buffer.alloc(20);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(12, 4);
      buffer.write('WAVE', 8);

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('wav');
      expect(result.codec).toBe('pcm');
      expect(result.channels).toBeUndefined();
      expect(result.sampleRate).toBeUndefined();
    });

    it('should reject WAV with zero channels', () => {
      const buffer = Buffer.alloc(100);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4);
      buffer.write('WAVE', 8);
      buffer.writeUInt16LE(0, 22); // channels = 0 (invalid)
      buffer.writeUInt32LE(44100, 24);
      buffer.writeUInt16LE(16, 34);
      buffer.writeUInt32LE(100000, 40);

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('wav');
      expect(result.channels).toBeUndefined();
    });
  });

  describe('FLAC format', () => {
    it('should detect FLAC format and parse STREAMINFO header', () => {
      const buffer = Buffer.alloc(100);
      // "fLaC" magic
      buffer[0] = 0x66;
      buffer[1] = 0x4c;
      buffer[2] = 0x61;
      buffer[3] = 0x43;
      // Metadata block header: type 0 (STREAMINFO), length 34
      buffer[4] = 0x00;
      buffer[5] = 0x00;
      buffer[6] = 0x00;
      buffer[7] = 0x22; // 34 bytes
      // STREAMINFO block
      buffer[8] = 0x10;
      buffer[9] = 0x00;
      buffer[10] = 0x10;
      buffer[11] = 0x00;
      // Sample rate 44100 Hz, channels=2, bps=16
      buffer[18] = 0x0a;
      buffer[19] = 0xc4;
      buffer[20] = 0x42;
      buffer[21] = 0xf0;
      // Total samples = 441000 (~10 seconds at 44100)
      buffer.writeUInt32BE(441000, 22);

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('flac');
      expect(result.codec).toBe('flac');
      expect(result.sampleRate).toBe(44100);
      expect(result.channels).toBe(2);
      expect(result.duration).toBeCloseTo(10, 0);
    });

    it('should detect FLAC format with minimal buffer', () => {
      const buffer = Buffer.alloc(10);
      buffer[0] = 0x66;
      buffer[1] = 0x4c;
      buffer[2] = 0x61;
      buffer[3] = 0x43;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('flac');
      expect(result.codec).toBe('flac');
    });
  });

  describe('OGG format', () => {
    it('should detect OGG format and parse Vorbis identification header', () => {
      const buffer = Buffer.alloc(100);
      // OGG page header
      buffer[0] = 0x4f; // O
      buffer[1] = 0x67; // g
      buffer[2] = 0x67; // g
      buffer[3] = 0x53; // S
      buffer[4] = 0x00; // version
      buffer[5] = 0x02; // header type
      buffer[26] = 0x01; // 1 segment
      buffer[27] = 58; // segment size
      // Vorbis identification header
      buffer[28] = 0x01; // packet type = identification
      buffer.write('vorbis', 29, 'ascii');
      buffer.writeUInt32LE(0, 35); // vorbis version
      buffer[39] = 2; // channels = 2
      buffer.writeUInt32LE(48000, 40); // sample rate
      buffer.writeInt32LE(0, 44); // bitrate max
      buffer.writeInt32LE(192000, 48); // bitrate nominal
      buffer.writeInt32LE(0, 52); // bitrate min

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('ogg');
      expect(result.codec).toBe('vorbis');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(48000);
      expect(result.bitrate).toBe(192000);
    });

    it('should detect OGG format with minimal buffer', () => {
      const buffer = Buffer.alloc(20);
      buffer[0] = 0x4f;
      buffer[1] = 0x67;
      buffer[2] = 0x67;
      buffer[3] = 0x53;

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result.format).toBe('ogg');
      expect(result.codec).toBe('vorbis');
    });
  });

  describe('edge cases', () => {
    it('should return empty object for unknown format', () => {
      const buffer = Buffer.alloc(100);
      buffer.fill(0);

      const result = parseAudioMetadataFromBuffer(buffer);
      expect(result).toEqual({});
    });

    it('should have all optional fields on AudioMetadata', () => {
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

    it('should accept all fields on AudioMetadata', () => {
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
