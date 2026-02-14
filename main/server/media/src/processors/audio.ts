// main/server/media/src/processors/audio.ts
/**
 * Audio Processing Module
 *
 * Handles audio processing operations using the internal FFmpeg wrapper
 * and custom audio metadata parser. Provides format conversion, metadata
 * extraction, variant generation, and segment extraction.
 *
 * @module processors/audio
 */

import { parseAudioMetadata } from '../audio-metadata';
import { runFFmpeg } from '../ffmpeg-wrapper';

import type { AudioProcessingOptions, MediaMetadata, ProcessingResult } from '../types';

export type { AudioProcessingOptions };

/**
 * Audio processor using the internal FFmpeg wrapper for format conversion
 * and custom metadata parser for metadata extraction. No external
 * dependencies beyond the system-installed `ffmpeg` binary.
 *
 * @example
 * ```typescript
 * const processor = new AudioProcessor();
 * const result = await processor.process('input.wav', 'output.mp3', {
 *   format: 'mp3',
 *   bitrate: '192k',
 * });
 * ```
 */
export class AudioProcessor {
  /**
   * Process an audio file with the specified options
   *
   * @param inputPath - Path to the input audio file
   * @param outputPath - Path for the processed output file
   * @param options - Audio processing configuration
   * @returns Processing result with success status, output path, and metadata
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions = {},
  ): Promise<ProcessingResult> {
    try {
      await this.processWithFfmpeg(inputPath, outputPath, options);

      // Generate waveform path if specified
      let waveformPath: string | undefined;
      if (options.waveform !== undefined) {
        waveformPath = outputPath.replace(/(\.[^.]+)$/, '_waveform.png');
      }

      // Get metadata
      const metadata = await this.getMetadata(inputPath);

      const result: ProcessingResult = {
        success: true,
        outputPath,
        metadata,
      };
      if (waveformPath !== undefined) {
        result.waveformPath = waveformPath;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio processing failed',
      };
    }
  }

  /**
   * Process audio using FFmpeg wrapper with format, bitrate, channels, and sample rate options
   *
   * @param inputPath - Path to the input audio file
   * @param outputPath - Path for the processed output file
   * @param options - Audio processing configuration
   * @throws Error if FFmpeg processing fails
   */
  private async processWithFfmpeg(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions,
  ): Promise<void> {
    const ffmpegOpts: import('../ffmpeg-wrapper').FFmpegOptions = {
      input: inputPath,
      output: outputPath,
    };
    if (options.format !== undefined) {
      ffmpegOpts.format = options.format;
    }
    if (typeof options.bitrate === 'string' && options.bitrate !== '') {
      ffmpegOpts.audioBitrate = options.bitrate;
    }

    const result = await runFFmpeg(ffmpegOpts);

    if (!result.success) {
      throw new Error(result.error ?? 'Audio processing failed');
    }
  }

  /**
   * Extract metadata from an audio file using the custom metadata parser
   *
   * @param inputPath - Path to the audio file
   * @returns Extracted media metadata (duration, bitrate, codec, channels, etc.)
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    try {
      const audioMeta = await parseAudioMetadata(inputPath);
      const result: MediaMetadata = {};
      if (audioMeta.duration !== undefined) {
        result.duration = audioMeta.duration;
      }
      if (audioMeta.bitrate !== undefined) {
        result.bitrate = audioMeta.bitrate;
      }
      if (audioMeta.codec !== undefined) {
        result.codec = audioMeta.codec;
      }
      if (audioMeta.format !== undefined) {
        result.format = audioMeta.format;
      }
      if (audioMeta.channels !== undefined) {
        result.channels = audioMeta.channels;
      }
      if (audioMeta.sampleRate !== undefined) {
        result.sampleRate = audioMeta.sampleRate;
      }
      return result;
    } catch {
      return {};
    }
  }

  /**
   * Generate multiple variants of an audio file (original, compressed, optimized)
   *
   * @param inputPath - Path to the source audio file
   * @param baseOutputPath - Base path for output variants (suffixes appended)
   * @returns Object containing results for each variant
   */
  async generateVariants(
    inputPath: string,
    baseOutputPath: string,
  ): Promise<{
    original: ProcessingResult;
    compressed: ProcessingResult;
    optimized: ProcessingResult;
  }> {
    const original = await this.process(inputPath, `${baseOutputPath}_original.mp3`, {
      format: 'mp3',
      bitrate: '320k',
    });

    const compressed = await this.process(inputPath, `${baseOutputPath}_compressed.mp3`, {
      format: 'mp3',
      bitrate: '128k',
    });

    const optimized = await this.process(inputPath, `${baseOutputPath}_optimized.mp3`, {
      format: 'mp3',
      bitrate: '192k',
      waveform: { width: 800, height: 200 },
    });

    return { original, compressed, optimized };
  }

  /**
   * Extract a time segment from an audio file
   *
   * @param inputPath - Path to the source audio file
   * @param outputPath - Path for the extracted segment
   * @param startTime - Start time in seconds
   * @param duration - Duration of the segment in seconds
   * @returns Processing result with success status and output path
   */
  async extractSegment(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
  ): Promise<ProcessingResult> {
    try {
      const result = await runFFmpeg({
        input: inputPath,
        output: outputPath,
        startTime,
        duration,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Segment extraction failed');
      }

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Segment extraction failed',
      };
    }
  }

  /**
   * Get the duration of an audio file in seconds
   *
   * @param inputPath - Path to the audio file
   * @returns Duration in seconds, or null if unable to determine
   */
  async getDuration(inputPath: string): Promise<number | null> {
    try {
      const audioMeta = await parseAudioMetadata(inputPath);
      return audioMeta.duration ?? null;
    } catch {
      return null;
    }
  }
}
