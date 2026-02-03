// premium/media/src/audio-metadata.ts
/**
 * Custom Audio Metadata Parser - Lightweight replacement for music-metadata
 *
 * Parses basic audio metadata from common formats (MP3, WAV, FLAC, OGG)
 */

import { promises as fs } from 'fs';

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
    const buffer = await fs.readFile(filePath);
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

function parseWAVMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'wav',
    codec: 'pcm',
  };

  try {
    // Parse WAV header
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataSize = buffer.readUInt32LE(40);

    metadata.channels = channels;
    metadata.sampleRate = sampleRate;
    metadata.bitrate = sampleRate * channels * bitsPerSample;

    if (sampleRate > 0) {
      const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
      metadata.duration = dataSize / bytesPerSecond;
    }
  } catch {
    // Ignore parsing errors
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

function parseFLACMetadata(_buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'flac',
    codec: 'flac',
  };

  try {
    // FLAC metadata parsing is complex, just return basic info
    // In a full implementation, we'd parse the metadata blocks
    metadata.channels = 2; // Default assumption
    metadata.sampleRate = 44100; // Default assumption
  } catch {
    // Ignore parsing errors
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

function parseOGGMetadata(_buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'ogg',
    codec: 'vorbis', // Default assumption for OGG
  };

  try {
    // OGG metadata parsing is complex, just return basic info
    metadata.channels = 2; // Default assumption
    metadata.sampleRate = 44100; // Default assumption
  } catch {
    // Ignore parsing errors
  }

  return metadata;
}
