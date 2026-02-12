// src/server/media/src/audio-metadata.ts
/**
 * Custom Audio Metadata Parser - Lightweight replacement for music-metadata
 *
 * Parses basic audio metadata from common formats (MP3, WAV, FLAC, OGG)
 */

import { promises as fs } from 'fs';

import { MAX_AUDIO_FILE_SIZE } from './constants';

export interface AudioMetadata {
  duration?: number;
  bitrate?: number;
  codec?: string;
  format?: string;
  channels?: number;
  sampleRate?: number;
  title?: string;
  artist?: string;
  album?: string;
}

/**
 * Parse audio metadata from file
 */
export async function parseAudioMetadata(filePath: string): Promise<AudioMetadata> {
  try {
    // Read file directly (avoids TOCTOU race from separate stat + readFile)
    const buffer = await fs.readFile(filePath);
    if (buffer.length > MAX_AUDIO_FILE_SIZE) {
      return {};
    }
    const metadata: AudioMetadata = {};

    // Detect format and parse accordingly
    if (isMP3(buffer)) {
      Object.assign(metadata, parseMP3Metadata(buffer));
    } else if (isWAV(buffer)) {
      Object.assign(metadata, parseWAVMetadata(buffer));
    } else if (isFLAC(buffer)) {
      Object.assign(metadata, parseFLACMetadata(buffer));
    } else if (isOGG(buffer)) {
      Object.assign(metadata, parseOGGMetadata(buffer));
    }

    return metadata;
  } catch {
    return {};
  }
}

// ============================================================================
// MP3 Metadata Parser
// ============================================================================

function isMP3(buffer: Buffer): boolean {
  // Check for ID3v2 or MPEG frame sync
  const byte1 = buffer[1];
  return (
    (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || // ID3v2
    (buffer.length >= 2 && buffer[0] === 0xff && byte1 !== undefined && (byte1 & 0xe0) === 0xe0) // MPEG frame
  );
}

function parseMP3Metadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'mp3',
    codec: 'mp3',
  };

  // Try to find first MPEG frame
  for (let i = 0; i < Math.min(buffer.length - 4, 10000); i++) {
    const nextByte = buffer[i + 1];
    if (buffer[i] === 0xff && nextByte !== undefined && (nextByte & 0xe0) === 0xe0) {
      // Found MPEG frame
      const frame = parseMPEGFrame(buffer, i);
      if (frame !== null) {
        metadata.bitrate = frame.bitrate;
        metadata.sampleRate = frame.sampleRate;
        metadata.channels = frame.channels;
        break;
      }
    }
  }

  // Parse ID3 tags for duration estimate
  if (
    metadata.bitrate !== undefined &&
    metadata.bitrate !== 0 &&
    metadata.sampleRate !== undefined &&
    metadata.sampleRate !== 0
  ) {
    // Rough duration estimate: file_size * 8 / bitrate
    const fileSizeBits = buffer.length * 8;
    metadata.duration = fileSizeBits / metadata.bitrate;
  }

  return metadata;
}

function parseMPEGFrame(
  buffer: Buffer,
  offset: number,
): { bitrate: number; sampleRate: number; channels: number } | null {
  try {
    const byte1 = buffer[offset + 1];
    const byte2 = buffer[offset + 2];

    if (byte1 === undefined || byte2 === undefined) {
      return null;
    }

    // MPEG version (bits 3-4 of byte1)
    const mpegVersion = (byte1 >> 3) & 0x03;
    // Layer (bits 1-2 of byte1) - unused but kept for clarity
    // const layer = (byte1 >> 1) & 0x03;
    // Bitrate index (bits 4-7 of byte2)
    const bitrateIndex = (byte2 >> 4) & 0x0f;
    // Sample rate index (bits 2-3 of byte2)
    const sampleRateIndex = (byte2 >> 2) & 0x03;
    // Channel mode (bits 6-7 of byte3)
    const channelMode = (buffer[offset + 3] ?? 0) >> 6;

    const bitrates: Record<string, number[]> = {
      // MPEG-1
      mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
      // MPEG-2/2.5
      mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    };

    const sampleRates: Record<string, number[]> = {
      // MPEG-1
      mpeg1: [44100, 48000, 32000],
      // MPEG-2
      mpeg2: [22050, 24000, 16000],
      // MPEG-2.5
      mpeg25: [11025, 12000, 8000],
    };

    const versionKey =
      mpegVersion === 3
        ? 'mpeg1'
        : mpegVersion === 2
          ? 'mpeg2'
          : mpegVersion === 0
            ? 'mpeg25'
            : null;

    if (versionKey === null) {
      return null;
    }

    const bitrateTable = bitrates[versionKey];
    const sampleRateTable = sampleRates[versionKey];

    if (
      bitrateTable === undefined ||
      sampleRateTable === undefined ||
      bitrateIndex >= bitrateTable.length ||
      sampleRateIndex >= sampleRateTable.length
    ) {
      return null;
    }

    const bitrateValue = bitrateTable[bitrateIndex];
    const sampleRateValue = sampleRateTable[sampleRateIndex];

    if (bitrateValue === undefined || sampleRateValue === undefined) {
      return null;
    }

    const bitrate = bitrateValue * 1000; // Convert to bps
    const sampleRate = sampleRateValue;
    const channels = channelMode === 3 ? 1 : 2; // 3 = mono, others = stereo

    return { bitrate, sampleRate, channels };
  } catch {
    return null;
  }
}

// ============================================================================
// WAV Metadata Parser
// ============================================================================

function isWAV(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45 // WAVE
  );
}

/**
 * Parse WAV fmt chunk and optional data chunk for duration.
 *
 * WAV header layout (RIFF):
 *   bytes 0-3:   "RIFF"
 *   bytes 4-7:   file size - 8
 *   bytes 8-11:  "WAVE"
 *   bytes 12-15: "fmt " sub-chunk ID
 *   bytes 16-19: fmt chunk size (16 for PCM)
 *   bytes 20-21: audio format (1 = PCM)
 *   bytes 22-23: number of channels
 *   bytes 24-27: sample rate
 *   bytes 28-31: byte rate
 *   bytes 32-33: block align
 *   bytes 34-35: bits per sample
 *   bytes 36-39: "data" sub-chunk ID
 *   bytes 40-43: data chunk size
 *
 * @param buffer - File buffer with at least 12 bytes (isWAV check)
 * @returns Parsed metadata with format set to 'wav'
 * @complexity O(1) — reads fixed offsets
 */
function parseWAVMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'wav',
    codec: 'pcm',
  };

  // Need at least 44 bytes for a complete WAV header (RIFF + fmt + data header)
  if (buffer.length < 44) {
    return metadata;
  }

  try {
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataSize = buffer.readUInt32LE(40);

    // Sanity-check parsed values to avoid nonsensical metadata
    if (channels === 0 || channels > 32 || sampleRate === 0 || bitsPerSample === 0) {
      return metadata;
    }

    metadata.channels = channels;
    metadata.sampleRate = sampleRate;
    metadata.bitrate = sampleRate * channels * bitsPerSample;

    const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
    if (bytesPerSecond > 0) {
      metadata.duration = dataSize / bytesPerSecond;
    }
  } catch {
    // Return partial metadata on malformed buffer
  }

  return metadata;
}

// ============================================================================
// FLAC Metadata Parser
// ============================================================================

function isFLAC(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x66 &&
    buffer[1] === 0x4c &&
    buffer[2] === 0x61 &&
    buffer[3] === 0x43 // fLaC
  );
}

/**
 * Parse FLAC STREAMINFO metadata block.
 *
 * FLAC layout after the 4-byte "fLaC" marker:
 *   byte 4: block type (bit 7 = last-block flag, bits 0-6 = type; 0 = STREAMINFO)
 *   bytes 5-7: block length (24-bit big-endian)
 *   STREAMINFO (34 bytes):
 *     bytes 0-1: min block size
 *     bytes 2-3: max block size
 *     bytes 4-6: min frame size
 *     bytes 7-9: max frame size
 *     bytes 10-13: sample rate (20 bits) | channels-1 (3 bits) | bps-1 (5 bits) | total samples high (4 bits)
 *     bytes 14-17: total samples low (32 bits)
 *
 * @complexity O(1) — reads fixed offsets
 */
function parseFLACMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'flac',
    codec: 'flac',
  };

  try {
    // STREAMINFO starts at offset 4 (after "fLaC") + 4 (block header)
    const streamInfoOffset = 8;
    // Need at least streamInfoOffset + 18 bytes for sample rate / channels / total samples
    if (buffer.length < streamInfoOffset + 18) {
      return metadata;
    }

    // Bytes 10-13 of STREAMINFO (absolute offset: streamInfoOffset + 10)
    const byte10 = buffer[streamInfoOffset + 10] ?? 0;
    const byte11 = buffer[streamInfoOffset + 11] ?? 0;
    const byte12 = buffer[streamInfoOffset + 12] ?? 0;
    const byte13 = buffer[streamInfoOffset + 13] ?? 0;

    // Sample rate: 20 bits from byte10[7:0] byte11[7:0] byte12[7:4]
    const sampleRate = (byte10 << 12) | (byte11 << 4) | (byte12 >> 4);
    // Channels: 3 bits from byte12[3:1], stored as channels - 1
    const channels = ((byte12 >> 1) & 0x07) + 1;
    // Bits per sample: 5 bits from byte12[0] byte13[7:4], stored as bps - 1
    const bitsPerSample = ((byte12 & 0x01) << 4) | (byte13 >> 4);

    // Sanity-check: FLAC spec limits sample rate to 655350 Hz (20-bit max)
    // and channels to 8 (3-bit field + 1). Reject obviously corrupt headers.
    if (sampleRate === 0 || sampleRate > 655350 || channels > 8) {
      return metadata;
    }

    metadata.sampleRate = sampleRate;
    metadata.channels = channels;

    // Total samples: 4 bits from byte13[3:0] + 32 bits from bytes 14-17
    // totalSamplesHigh is 0–15, totalSamplesLow is unsigned 32-bit.
    // Max combined: 15 * 2^32 + (2^32 - 1) ≈ 6.87 × 10^10, well within
    // Number.MAX_SAFE_INTEGER (2^53 - 1), so no precision loss.
    const totalSamplesHigh = byte13 & 0x0f;
    const byte14 = buffer[streamInfoOffset + 14] ?? 0;
    const byte15 = buffer[streamInfoOffset + 15] ?? 0;
    const byte16 = buffer[streamInfoOffset + 16] ?? 0;
    const byte17 = buffer[streamInfoOffset + 17] ?? 0;
    const totalSamplesLow = (byte14 << 24) | (byte15 << 16) | (byte16 << 8) | byte17;
    // Use >>> 0 to convert signed 32-bit result to unsigned before widening
    const totalSamples = totalSamplesHigh * 0x100000000 + (totalSamplesLow >>> 0);

    if (totalSamples > 0) {
      metadata.duration = totalSamples / sampleRate;
    }

    if (bitsPerSample > 0) {
      metadata.bitrate = sampleRate * channels * (bitsPerSample + 1);
    }
  } catch {
    // Return partial metadata on error
  }

  return metadata;
}

// ============================================================================
// OGG Metadata Parser
// ============================================================================

function isOGG(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53 // OggS
  );
}

/**
 * Parse OGG Vorbis identification header.
 *
 * OGG page header (27+ bytes):
 *   bytes 0-3:   "OggS"
 *   byte 4:      version (0)
 *   byte 5:      header type
 *   bytes 6-13:  granule position
 *   bytes 14-17: serial number
 *   bytes 18-21: page sequence
 *   bytes 22-25: CRC
 *   byte 26:     number of segments
 *   bytes 27+:   segment table
 *
 * After the segment table, the Vorbis identification header starts with:
 *   byte 0:      packet type (1 = identification)
 *   bytes 1-6:   "vorbis"
 *   bytes 7-10:  vorbis version (0)
 *   byte 11:     channels
 *   bytes 12-15: sample rate (32-bit LE)
 *   bytes 16-19: bitrate maximum
 *   bytes 20-23: bitrate nominal
 *   bytes 24-27: bitrate minimum
 *
 * @complexity O(1) — reads fixed offsets
 */
function parseOGGMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'ogg',
    codec: 'vorbis',
  };

  try {
    // Need at least 27 bytes for OGG page header + 1 byte segment count
    if (buffer.length < 28) {
      return metadata;
    }

    const numSegments = buffer[26] ?? 0;
    // Data starts after the page header (27 bytes) + segment table
    const dataOffset = 27 + numSegments;

    // Check we have enough for the Vorbis identification header (28 bytes)
    if (buffer.length < dataOffset + 28) {
      return metadata;
    }

    // Verify Vorbis identification header: packet type 1 + "vorbis"
    const packetType = buffer[dataOffset];
    const vorbisTag = buffer.subarray(dataOffset + 1, dataOffset + 7).toString('ascii');
    if (packetType !== 1 || vorbisTag !== 'vorbis') {
      return metadata;
    }

    const channels = buffer[dataOffset + 11] ?? 0;
    const sampleRate = buffer.readUInt32LE(dataOffset + 12);
    const bitrateNominal = buffer.readInt32LE(dataOffset + 20);

    if (channels > 0) {
      metadata.channels = channels;
    }
    if (sampleRate > 0) {
      metadata.sampleRate = sampleRate;
    }
    if (bitrateNominal > 0) {
      metadata.bitrate = bitrateNominal;
    }
  } catch {
    // Return partial metadata on error
  }

  return metadata;
}
