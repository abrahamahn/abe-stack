// apps/server/src/infra/media/file-type.ts
/**
 * Custom File Type Detection
 *
 * Lightweight file type detection using magic bytes/signatures.
 * Replaces the file-type package to keep dependencies minimal.
 */

export interface FileTypeResult {
  ext: string;
  mime: string;
}

const MAGIC_BYTES: Record<string, { signature: Buffer; mime: string; ext: string }> = {
  // Images
  'image/jpeg': {
    signature: Buffer.from([0xff, 0xd8, 0xff]),
    mime: 'image/jpeg',
    ext: 'jpg',
  },
  'image/png': {
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    mime: 'image/png',
    ext: 'png',
  },
  'image/gif': {
    signature: Buffer.from([0x47, 0x49, 0x46]),
    mime: 'image/gif',
    ext: 'gif',
  },
  'image/webp': {
    signature: Buffer.from([0x52, 0x49, 0x46, 0x46]),
    mime: 'image/webp',
    ext: 'webp',
  },
  'image/avif': {
    signature: Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ]),
    mime: 'image/avif',
    ext: 'avif',
  },

  // Audio
  'audio/mpeg': {
    signature: Buffer.from([0xff, 0xfb]),
    mime: 'audio/mpeg',
    ext: 'mp3',
  },
  'audio/wav': {
    signature: Buffer.from([0x52, 0x49, 0x46, 0x46]),
    mime: 'audio/wav',
    ext: 'wav',
  },
  'audio/aac': {
    signature: Buffer.from([0xff, 0xf1]),
    mime: 'audio/aac',
    ext: 'aac',
  },
  'audio/ogg': {
    signature: Buffer.from([0x4f, 0x67, 0x67, 0x53]),
    mime: 'audio/ogg',
    ext: 'ogg',
  },

  // Video
  'video/mp4': {
    signature: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
    mime: 'video/mp4',
    ext: 'mp4',
  },
  'video/webm': {
    signature: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    mime: 'video/webm',
    ext: 'webm',
  },
  'video/avi': {
    signature: Buffer.from([0x52, 0x49, 0x46, 0x46]),
    mime: 'video/avi',
    ext: 'avi',
  },
  'video/quicktime': {
    signature: Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]),
    mime: 'video/quicktime',
    ext: 'mov',
  },

  // Documents
  'application/pdf': {
    signature: Buffer.from([0x25, 0x50, 0x44, 0x46]),
    mime: 'application/pdf',
    ext: 'pdf',
  },
};

/**
 * Detect file type from buffer using magic bytes
 */
export function detectFileType(buffer: Buffer): FileTypeResult | null {
  // Check each known file signature
  for (const [_mime, config] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= config.signature.length) {
      // Check if buffer starts with the signature
      const signatureMatch = config.signature.every((byte, index) => buffer[index] === byte);

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
    webm: 'video/webm',
    avi: 'video/avi',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
    const fs = await import('fs/promises');
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(64); // Read first 64 bytes
    await fileHandle.read(buffer, 0, 64, 0);
    await fileHandle.close();

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
  const baseType = fileType.mime.split('/')[0];
  return (
    allowedTypes.includes(fileType.mime) ||
    (baseType ? allowedTypes.includes(`${baseType}/*`) : false)
  );
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mime: string): string {
  for (const [mimeKey, config] of Object.entries(MAGIC_BYTES)) {
    if (mimeKey === mime) {
      return config.ext;
    }
  }
  return 'bin'; // Default extension
}
