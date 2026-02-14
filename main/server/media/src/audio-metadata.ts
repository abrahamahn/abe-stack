// main/server/media/src/audio-metadata.ts
/**
 * Audio Metadata Parser
 *
 * Server-side file I/O wrapper around the pure buffer-based parser
 * from @abe-stack/shared. Pure parsing logic lives in shared.
 */

import { promises as fs } from 'fs';

import { parseAudioMetadataFromBuffer } from '@abe-stack/shared';

import { MAX_AUDIO_FILE_SIZE } from './constants';

// Re-export type for backward compatibility
export type { AudioMetadata } from '@abe-stack/shared';

/**
 * Parse audio metadata from file
 */
export async function parseAudioMetadata(filePath: string): Promise<{
  duration?: number;
  bitrate?: number;
  codec?: string;
  format?: string;
  channels?: number;
  sampleRate?: number;
  title?: string;
  artist?: string;
  album?: string;
}> {
  try {
    // Read file directly (avoids TOCTOU race from separate stat + readFile)
    const buffer = await fs.readFile(filePath);
    if (buffer.length > MAX_AUDIO_FILE_SIZE) {
      return {};
    }
    return parseAudioMetadataFromBuffer(buffer);
  } catch {
    return {};
  }
}
