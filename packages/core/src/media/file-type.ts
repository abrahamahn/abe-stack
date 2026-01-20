// packages/core/src/media/file-type.ts
/**
 * Custom File Type Detection - Lightweight replacement for file-type package
 *
 * Uses magic number detection to identify file types without external dependencies.
 */

import { promises as fs } from 'fs';

import type { FileTypeResult } from './types';

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

/**
 * Detect file type from buffer using magic bytes
 */
export function detectFileType(buffer: Buffer): FileTypeResult | null {
  // Check each known file signature
  for (const config of MAGIC_NUMBERS) {
    if (buffer.length >= config.offset + config.signature.length) {
      const signatureMatch = config.signature.every(
        (byte, index) => buffer[config.offset + index] === byte,
      );

      if (signatureMatch) {
        return {
          ext: config.ext,
          mime: config.mime,
        };
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

  if (!ext) return null;

  // Extension to MIME type mapping
  const extToMime: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    tiff: 'image/tiff',
    bmp: 'image/bmp',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/m4a',

    // Video
    mp4: 'video/mp4',
    avi: 'video/avi',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    flv: 'video/x-flv',

    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain',
    json: 'application/json',
  };

  const mime = extToMime[ext];
  if (mime) {
    return { ext, mime };
  }

  return null;
}

/**
 * Read file header and detect type
 */
export async function detectFileTypeFromFile(filePath: string): Promise<FileTypeResult | null> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(64); // Read first 64 bytes
    await fd.read(buffer, 0, 64, 0);
    await fd.close();

    // Try magic byte detection first
    const result = detectFileType(buffer);
    if (result) return result;

    // Fall back to extension-based detection
    return detectFileTypeFromPath(filePath);
  } catch {
    return null;
  }
}

/**
 * Validate if file type is allowed
 */
export function isAllowedFileType(
  fileType: FileTypeResult | null,
  allowedTypes: string[],
): boolean {
  if (!fileType) return false;
  const mimeCategory = fileType.mime.split('/')[0] ?? '';
  return allowedTypes.includes(fileType.mime) || allowedTypes.includes(`${mimeCategory}/*`);
}
