// main/server/media/src/audio-metadata.ts
/**
 * Audio Metadata Parser
 *
 * Server-side file I/O wrapper around the pure buffer-based parser
 * from @bslt/shared. Pure parsing logic lives in shared.
 */

import { promises as fs } from 'fs';

import { parseAudioMetadataFromBuffer } from '@bslt/shared';

import { MAX_AUDIO_FILE_SIZE } from './constants';

// Re-export type for backward compatibility
export type { AudioMetadata } from '@bslt/shared';

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
    // Use a single fd for stat + read to avoid TOCTOU races and huge file reads.
    const fd = await fs.open(filePath, 'r');
    let buffer: Buffer;
    try {
      const stats = await fd.stat();
      if (stats.size > MAX_AUDIO_FILE_SIZE) {
        return {};
      }
      buffer = await fd.readFile();
    } finally {
      await fd.close();
    }
    if (buffer.length > MAX_AUDIO_FILE_SIZE) {
      return {};
    }
    return parseAudioMetadataFromBuffer(buffer);
  } catch {
    return {};
  }
}
