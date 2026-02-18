// main/shared/src/engine/media/media.ts
/**
 * Media Processing Domain
 *
 * Pure, framework-agnostic media utilities: type detection (magic bytes + extension),
 * audio metadata parsing, filename sanitization, upload validation, and MIME lookup.
 *
 * @module Domain/Media
 */

import { EXT_TO_MIME, EXTRA_EXT_TO_MIME } from '../../primitives/constants/media';
import { generateUUID } from '../../primitives/helpers/crypto';
import {
  MAX_CHUNK_SIZE,
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_TIMEOUT_MS,
} from '../constants/limits';

import type {
  AudioProcessingOptions,
  ContentModerationResult,
  FileTypeResult,
  ImageProcessingOptions,
  MediaMetadata,
  MediaProcessingOptions,
  ProcessingResult,
  SecurityScanResult,
  UploadConfig,
  VideoProcessingOptions,
} from './media.types';

// ============================================================================
// Types
// ============================================================================

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

export type {
  AudioProcessingOptions,
  ContentModerationResult,
  FileTypeResult,
  ImageProcessingOptions,
  MediaMetadata,
  MediaProcessingOptions,
  ProcessingResult,
  SecurityScanResult,
  UploadConfig,
  VideoProcessingOptions,
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Magic number signatures for common file types
 */
const MAGIC_NUMBERS: Array<{
  offset: number;
  signature: number[];
  ext: string;
  mime: string;
}> = [
  // Images
  { offset: 0, signature: [0xff, 0xd8, 0xff], ext: 'jpg', mime: 'image/jpeg' },
  {
    offset: 0,
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ext: 'png',
    mime: 'image/png',
  },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x42, 0x4d], ext: 'bmp', mime: 'image/bmp' },
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' }, // RIFF header for WebP

  // Audio
  { offset: 0, signature: [0xff, 0xfb], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf3], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf2], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0x49, 0x44, 0x33], ext: 'mp3', mime: 'audio/mpeg' }, // ID3v2
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'wav', mime: 'audio/wav' }, // RIFF for WAV
  { offset: 0, signature: [0x4f, 0x67, 0x67, 0x53], ext: 'ogg', mime: 'audio/ogg' },
  {
    offset: 0,
    signature: [0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41],
    ext: 'm4a',
    mime: 'audio/m4a',
  }, // M4A

  // Video
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  { offset: 0, signature: [0x1a, 0x45, 0xdf, 0xa3], ext: 'webm', mime: 'video/webm' },
  { offset: 0, signature: [0x46, 0x4c, 0x56, 0x01], ext: 'flv', mime: 'video/x-flv' },

  // Documents
  { offset: 0, signature: [0x25, 0x50, 0x44, 0x46], ext: 'pdf', mime: 'application/pdf' },
];

// Characters that are not allowed in filenames (path separators, special chars)
const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;
// Non-printable control characters - built dynamically to avoid ESLint no-control-regex
// Matches ASCII control chars (0x00-0x1f) and extended control chars (0x7f-0x9f)
const CONTROL_CHARS = new RegExp(
  '[' +
    String.fromCharCode(0x00) +
    '-' +
    String.fromCharCode(0x1f) +
    String.fromCharCode(0x7f) +
    '-' +
    String.fromCharCode(0x9f) +
    ']',
  'g',
);

// ============================================================================
// Functions — File Type Detection
// ============================================================================

/**
 * Detect file type from buffer using magic bytes
 */
export function detectFileType(buffer: Buffer): FileTypeResult | null {
  for (const config of MAGIC_NUMBERS) {
    if (buffer.length >= config.offset + config.signature.length) {
      const signatureMatch = config.signature.every(
        (byte, index) => buffer[config.offset + index] === byte,
      );

      if (signatureMatch) {
        return { ext: config.ext, mime: config.mime };
      }
    }
  }

  return null;
}

/**
 * Detect file type from file path (extension-based fallback)
 */
export function detectFileTypeFromPath(filePath: string): FileTypeResult | null {
  const ext = filePath.split('.').pop()?.toLowerCase();

  if (ext === undefined || ext.length === 0) return null;

  const mime = EXT_TO_MIME[ext];
  if (mime !== undefined && mime.length > 0) {
    return { ext, mime };
  }

  return null;
}

/**
 * Validate if file type is allowed
 */
export function isAllowedFileType(
  fileType: FileTypeResult | null,
  allowedTypes: string[],
): boolean {
  if (fileType === null) return false;
  const mimeCategory = fileType.mime.split('/')[0] ?? '';
  return allowedTypes.includes(fileType.mime) || allowedTypes.includes(`${mimeCategory}/*`);
}

// ============================================================================
// Functions — MIME Type Lookup
// ============================================================================

/**
 * Get MIME type for a file extension.
 *
 * @param filePath - The file path or filename to determine MIME type for
 * @returns The MIME type string, defaulting to 'application/octet-stream'
 */
export function getMimeType(filePath: string): string {
  const parts = filePath.split('.');
  const ext = parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';

  if (ext === '') return 'application/octet-stream';

  return EXTRA_EXT_TO_MIME[ext] ?? EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

// ============================================================================
// Functions — Audio Metadata Parsing
// ============================================================================

function isMP3(buffer: Buffer): boolean {
  const byte1 = buffer[1];
  return (
    (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || // ID3v2
    (buffer.length >= 2 && buffer[0] === 0xff && byte1 !== undefined && (byte1 & 0xe0) === 0xe0) // MPEG frame
  );
}

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

function isFLAC(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x66 &&
    buffer[1] === 0x4c &&
    buffer[2] === 0x61 &&
    buffer[3] === 0x43 // fLaC
  );
}

function isOGG(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53 // OggS
  );
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

    const mpegVersion = (byte1 >> 3) & 0x03;
    const bitrateIndex = (byte2 >> 4) & 0x0f;
    const sampleRateIndex = (byte2 >> 2) & 0x03;
    const channelMode = (buffer[offset + 3] ?? 0) >> 6;

    const bitrates: Record<string, number[]> = {
      mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
      mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    };

    const sampleRates: Record<string, number[]> = {
      mpeg1: [44100, 48000, 32000],
      mpeg2: [22050, 24000, 16000],
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

    const bitrate = bitrateValue * 1000;
    const sampleRate = sampleRateValue;
    const channels = channelMode === 3 ? 1 : 2;

    return { bitrate, sampleRate, channels };
  } catch {
    return null;
  }
}

function parseMP3Metadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'mp3',
    codec: 'mp3',
  };

  for (let i = 0; i < Math.min(buffer.length - 4, 10000); i++) {
    const nextByte = buffer[i + 1];
    if (buffer[i] === 0xff && nextByte !== undefined && (nextByte & 0xe0) === 0xe0) {
      const frame = parseMPEGFrame(buffer, i);
      if (frame !== null) {
        metadata.bitrate = frame.bitrate;
        metadata.sampleRate = frame.sampleRate;
        metadata.channels = frame.channels;
        break;
      }
    }
  }

  if (
    metadata.bitrate !== undefined &&
    metadata.bitrate !== 0 &&
    metadata.sampleRate !== undefined &&
    metadata.sampleRate !== 0
  ) {
    const fileSizeBits = buffer.length * 8;
    metadata.duration = fileSizeBits / metadata.bitrate;
  }

  return metadata;
}

/**
 * Parse WAV fmt chunk and optional data chunk for duration.
 */
function parseWAVMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'wav',
    codec: 'pcm',
  };

  if (buffer.length < 44) {
    return metadata;
  }

  try {
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataSize = buffer.readUInt32LE(40);

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

/**
 * Parse FLAC STREAMINFO metadata block.
 */
function parseFLACMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'flac',
    codec: 'flac',
  };

  try {
    const streamInfoOffset = 8;
    if (buffer.length < streamInfoOffset + 18) {
      return metadata;
    }

    const byte10 = buffer[streamInfoOffset + 10] ?? 0;
    const byte11 = buffer[streamInfoOffset + 11] ?? 0;
    const byte12 = buffer[streamInfoOffset + 12] ?? 0;
    const byte13 = buffer[streamInfoOffset + 13] ?? 0;

    const sampleRate = (byte10 << 12) | (byte11 << 4) | (byte12 >> 4);
    const channels = ((byte12 >> 1) & 0x07) + 1;
    const bitsPerSample = ((byte12 & 0x01) << 4) | (byte13 >> 4);

    if (sampleRate === 0 || sampleRate > 655350 || channels > 8) {
      return metadata;
    }

    metadata.sampleRate = sampleRate;
    metadata.channels = channels;

    const totalSamplesHigh = byte13 & 0x0f;
    const byte14 = buffer[streamInfoOffset + 14] ?? 0;
    const byte15 = buffer[streamInfoOffset + 15] ?? 0;
    const byte16 = buffer[streamInfoOffset + 16] ?? 0;
    const byte17 = buffer[streamInfoOffset + 17] ?? 0;
    const totalSamplesLow = (byte14 << 24) | (byte15 << 16) | (byte16 << 8) | byte17;
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

/**
 * Parse OGG Vorbis identification header.
 */
function parseOGGMetadata(buffer: Buffer): AudioMetadata {
  const metadata: AudioMetadata = {
    format: 'ogg',
    codec: 'vorbis',
  };

  try {
    if (buffer.length < 28) {
      return metadata;
    }

    const numSegments = buffer[26] ?? 0;
    const dataOffset = 27 + numSegments;

    if (buffer.length < dataOffset + 28) {
      return metadata;
    }

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

/**
 * Parse audio metadata from a buffer.
 * Detects format (MP3, WAV, FLAC, OGG) and extracts metadata.
 *
 * @param buffer - File content as a Buffer
 * @returns Parsed audio metadata (empty object if format is unrecognized)
 */
export function parseAudioMetadataFromBuffer(buffer: Buffer): AudioMetadata {
  if (isMP3(buffer)) return parseMP3Metadata(buffer);
  if (isWAV(buffer)) return parseWAVMetadata(buffer);
  if (isFLAC(buffer)) return parseFLACMetadata(buffer);
  if (isOGG(buffer)) return parseOGGMetadata(buffer);
  return {};
}

// ============================================================================
// Functions — Validation
// ============================================================================

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  let sanitized = filename.replace(UNSAFE_FILENAME_CHARS, '_');

  sanitized = sanitized.replace(CONTROL_CHARS, '_');

  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.slice(
      0,
      MAX_FILENAME_LENGTH - (ext !== undefined && ext.length > 0 ? ext.length + 1 : 0),
    );
    sanitized = ext !== undefined && ext.length > 0 ? `${name}.${ext}` : name;
  }

  if (sanitized.length === 0) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Generate a cryptographically secure file ID.
 *
 * Uses `crypto.randomUUID()` for unpredictable, collision-resistant IDs
 * suitable for use in URLs and storage keys. Returns a 32-character
 * hex-encoded UUID (dashes stripped).
 *
 * @returns 32-character lowercase hex string
 */
export function generateFileId(): string {
  return generateUUID().replace(/-/g, '');
}

/**
 * Validate upload configuration against allowed limits.
 * Pure validation -- no I/O.
 */
export function validateUploadConfig(config: {
  maxFileSize?: number;
  allowedTypes?: string[];
  chunkSize?: number;
  timeout?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxFileSize !== undefined && config.maxFileSize !== 0 && config.maxFileSize <= 0) {
    errors.push('maxFileSize must be positive');
  }

  if (
    config.maxFileSize !== undefined &&
    config.maxFileSize !== 0 &&
    config.maxFileSize > MAX_UPLOAD_FILE_SIZE
  ) {
    errors.push('maxFileSize cannot exceed 1GB');
  }

  if (config.chunkSize !== undefined && config.chunkSize !== 0 && config.chunkSize <= 0) {
    errors.push('chunkSize must be positive');
  }

  if (
    config.chunkSize !== undefined &&
    config.chunkSize !== 0 &&
    config.chunkSize > MAX_CHUNK_SIZE
  ) {
    errors.push('chunkSize cannot exceed 10MB');
  }

  if (config.timeout !== undefined && config.timeout !== 0 && config.timeout <= 0) {
    errors.push('timeout must be positive');
  }

  if (
    config.timeout !== undefined &&
    config.timeout !== 0 &&
    config.timeout > MAX_UPLOAD_TIMEOUT_MS
  ) {
    errors.push('timeout cannot exceed 1 hour');
  }

  if (config.allowedTypes?.length === 0) {
    errors.push('allowedTypes cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
