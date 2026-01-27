// apps/server/src/infrastructure/media/processors/audio.ts
/**
 * Audio Processing Module
 *
 * Handles audio processing operations using FFmpeg.
 */

import type { AudioProcessingOptions, MediaMetadata, ProcessingResult } from '../types';

export type { AudioProcessingOptions };

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
 * Audio processor using FFmpeg
 */
export class AudioProcessor {
  private ffmpegModule: {
    default: (input: string) => FfmpegCommand;
    setFfmpegPath: (path: string) => void;
  } | null = null;
  private parseFileModule: ((path: string) => Promise<ParsedAudioMetadata>) | null = null;

  /**
   * Lazy load ffmpeg module
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
   * Lazy load music-metadata module
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
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions = {},
  ): Promise<ProcessingResult> {
    try {
      await this.processWithFfmpeg(inputPath, outputPath, options);

      // Generate waveform if specified
      let waveformPath: string | undefined;
      if (options.waveform) {
        waveformPath = outputPath.replace(/(\.[^.]+)$/, '_waveform.png');
        // Waveform generation would be implemented here
        // For now, just set the path
      }

      // Get metadata
      const metadata = await this.getMetadata(inputPath);

      return {
        success: true,
        outputPath,
        waveformPath,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio processing failed',
      };
    }
  }

  /**
   * Process audio using FFmpeg
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
   * Extract metadata from an audio file
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    try {
      const parseFile = await this.getParseFile();
      const metadata = await parseFile(inputPath);
      return {
        duration: metadata.format.duration,
        bitrate: metadata.format.bitrate,
        codec: metadata.format.codec,
        format: metadata.format.container,
        channels: metadata.format.numberOfChannels,
        sampleRate: metadata.format.sampleRate,
      };
    } catch {
      return {};
    }
  }

  /**
   * Generate multiple variants of an audio file
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
   * Extract a segment from an audio file
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
   * Extract segment using FFmpeg
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
   * Get the duration of an audio file
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
