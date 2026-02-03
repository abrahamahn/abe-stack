// premium/media/src/processors/audio.ts
/**
 * Audio Processing Module
 *
 * Handles audio processing operations using FFmpeg and music-metadata.
 * Provides format conversion, metadata extraction, variant generation,
 * and segment extraction.
 *
 * @module processors/audio
 */

import type { AudioProcessingOptions, MediaMetadata, ProcessingResult } from '../types';

export type { AudioProcessingOptions };

/**
 * Fluent-ffmpeg command interface for audio processing pipeline
 */
interface FfmpegCommand {
  toFormat: (format: string) => FfmpegCommand;
  audioBitrate: (bitrate: string) => FfmpegCommand;
  audioChannels: (channels: number) => FfmpegCommand;
  audioFrequency: (frequency: number) => FfmpegCommand;
  setStartTime: (time: number) => FfmpegCommand;
  setDuration: (duration: number) => FfmpegCommand;
  on: (event: string, callback: (err?: Error) => void) => FfmpegCommand;
  save: (outputPath: string) => FfmpegCommand;
}

/**
 * Parsed audio metadata from music-metadata library
 */
interface ParsedAudioMetadata {
  format: {
    duration?: number;
    bitrate?: number;
    codec?: string;
    container?: string;
    numberOfChannels?: number;
    sampleRate?: number;
  };
}

/**
 * Audio processor using FFmpeg for format conversion and music-metadata
 * for metadata extraction. Both modules are lazy-loaded.
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
  private ffmpegModule: {
    default: (input: string) => FfmpegCommand;
    setFfmpegPath: (path: string) => void;
  } | null = null;
  private parseFileModule: ((path: string) => Promise<ParsedAudioMetadata>) | null = null;

  /**
   * Lazy load ffmpeg module to defer native dependency loading
   *
   * @returns The fluent-ffmpeg module with ffmpeg-static path configured
   * @complexity O(1) after first call (cached)
   */
  private async getFfmpeg(): Promise<{
    default: (input: string) => FfmpegCommand;
    setFfmpegPath: (path: string) => void;
  }> {
    if (this.ffmpegModule === null) {
      const ffmpegStaticModule = (await import('ffmpeg-static')) as { default: string };
      const ffmpegModule = (await import('fluent-ffmpeg')) as unknown as {
        default: (input: string) => FfmpegCommand;
        setFfmpegPath: (path: string) => void;
      };
      this.ffmpegModule = ffmpegModule;
      this.ffmpegModule.setFfmpegPath(ffmpegStaticModule.default);
    }
    return this.ffmpegModule;
  }

  /**
   * Lazy load music-metadata module for audio metadata parsing
   *
   * @returns The parseFile function from music-metadata
   * @complexity O(1) after first call (cached)
   */
  private async getParseFile(): Promise<(path: string) => Promise<ParsedAudioMetadata>> {
    if (this.parseFileModule === null) {
      const musicMetadata = (await import('music-metadata')) as {
        parseFile: (path: string) => Promise<ParsedAudioMetadata>;
      };
      this.parseFileModule = musicMetadata.parseFile as (
        path: string,
      ) => Promise<ParsedAudioMetadata>;
    }
    return this.parseFileModule;
  }

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
   * Process audio using FFmpeg with format, bitrate, channels, and sample rate options
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
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve, reject) => {
      let command = ffmpegModule.default(inputPath);

      if (options.format !== undefined) {
        command = command.toFormat(options.format);
      }

      if (typeof options.bitrate === 'string' && options.bitrate !== '') {
        command = command.audioBitrate(options.bitrate);
      }

      if (options.channels !== undefined) {
        command = command.audioChannels(options.channels);
      }

      if (options.sampleRate !== undefined) {
        command = command.audioFrequency(options.sampleRate);
      }

      command
        .on('end', () => {
          resolve();
        })
        .on('error', (err?: Error) => {
          reject(err ?? new Error('Audio processing failed'));
        })
        .save(outputPath);
    });
  }

  /**
   * Extract metadata from an audio file using music-metadata
   *
   * @param inputPath - Path to the audio file
   * @returns Extracted media metadata (duration, bitrate, codec, channels, etc.)
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    try {
      const parseFile = await this.getParseFile();
      const metadata = await parseFile(inputPath);
      const result: MediaMetadata = {};
      if (metadata.format.duration !== undefined) {
        result.duration = metadata.format.duration;
      }
      if (metadata.format.bitrate !== undefined) {
        result.bitrate = metadata.format.bitrate;
      }
      if (metadata.format.codec !== undefined) {
        result.codec = metadata.format.codec;
      }
      if (metadata.format.container !== undefined) {
        result.format = metadata.format.container;
      }
      if (metadata.format.numberOfChannels !== undefined) {
        result.channels = metadata.format.numberOfChannels;
      }
      if (metadata.format.sampleRate !== undefined) {
        result.sampleRate = metadata.format.sampleRate;
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
      await this.extractSegmentWithFfmpeg(inputPath, outputPath, startTime, duration);

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
   * Extract segment using FFmpeg with start time and duration
   *
   * @param inputPath - Path to the source audio file
   * @param outputPath - Path for the extracted segment
   * @param startTime - Start time in seconds
   * @param duration - Duration of the segment in seconds
   * @throws Error if extraction fails
   */
  private async extractSegmentWithFfmpeg(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
  ): Promise<void> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve, reject) => {
      const command = ffmpegModule.default(inputPath);

      command
        .setStartTime(startTime)
        .setDuration(duration)
        .on('end', () => {
          resolve();
        })
        .on('error', (err?: Error) => {
          reject(err ?? new Error('Audio processing failed'));
        })
        .save(outputPath);
    });
  }

  /**
   * Get the duration of an audio file in seconds
   *
   * @param inputPath - Path to the audio file
   * @returns Duration in seconds, or null if unable to determine
   */
  async getDuration(inputPath: string): Promise<number | null> {
    try {
      const parseFile = await this.getParseFile();
      const metadata = await parseFile(inputPath);
      return metadata.format.duration ?? null;
    } catch {
      return null;
    }
  }
}
