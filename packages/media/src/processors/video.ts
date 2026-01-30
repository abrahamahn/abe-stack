// packages/media/src/processors/video.ts
/**
 * Video Processing Module
 *
 * Handles video processing operations using FFmpeg.
 * Provides transcoding, metadata extraction, audio extraction, and HLS streaming.
 *
 * @module processors/video
 */

import path from 'path';

import type { MediaMetadata, ProcessingResult, VideoProcessingOptions } from '../types';

export type { VideoProcessingOptions };

/**
 * Fluent-ffmpeg command interface for type-safe FFmpeg pipeline building
 */
interface FfmpegCommand {
  videoCodec: (codec: string) => FfmpegCommand;
  toFormat: (format: string) => FfmpegCommand;
  size: (size: string) => FfmpegCommand;
  videoBitrate: (bitrate: string) => FfmpegCommand;
  noVideo: () => FfmpegCommand;
  audioCodec: (codec: string) => FfmpegCommand;
  addOptions: (options: string[]) => FfmpegCommand;
  output: (path: string) => FfmpegCommand;
  complexFilter: (filter: string) => FfmpegCommand;
  screenshots: (options: {
    timestamps: number[];
    filename: string;
    folder: string;
    size: string;
  }) => FfmpegCommand;
  setStartTime: (time: number) => FfmpegCommand;
  setDuration: (duration: number) => FfmpegCommand;
  on: (event: string, callback: (err?: Error) => void) => FfmpegCommand;
  save: (outputPath: string) => FfmpegCommand;
  run: () => FfmpegCommand;
}

/**
 * FFprobe data structure returned by fluent-ffmpeg's ffprobe
 */
interface FfprobeData {
  format: {
    duration?: number;
    bit_rate?: string;
  };
  streams: Array<{
    codec_type: string;
    codec_name?: string;
    width?: number;
    height?: number;
    channels?: number;
    sample_rate?: string;
  }>;
}

type FfprobeCallback = (err: Error | null, data: FfprobeData) => void;

/**
 * Lazy-loaded fluent-ffmpeg module interface
 */
interface FfmpegModule {
  default: (input: string) => FfmpegCommand;
  setFfmpegPath: (path: string) => void;
  ffprobe: (input: string, callback: FfprobeCallback) => void;
}

/**
 * Video processor using FFmpeg for transcoding, metadata extraction,
 * variant generation, audio extraction, and HLS streaming.
 *
 * Uses lazy module loading to avoid importing heavy native dependencies
 * until first use.
 *
 * @example
 * ```typescript
 * const processor = new VideoProcessor();
 * const result = await processor.process('input.mp4', 'output.mp4', {
 *   format: 'mp4',
 *   resolution: { width: 1280, height: 720 },
 * });
 * ```
 */
export class VideoProcessor {
  private ffmpegModule: FfmpegModule | null = null;

  /**
   * Lazy load ffmpeg module to defer native dependency loading
   *
   * @returns The fluent-ffmpeg module with ffmpeg-static path configured
   * @complexity O(1) after first call (cached)
   */
  private async getFfmpeg(): Promise<FfmpegModule> {
    if (this.ffmpegModule === null) {
      const ffmpegStaticModule = (await import('ffmpeg-static')) as { default: string };
      const ffmpegModule = (await import('fluent-ffmpeg')) as unknown as FfmpegModule;
      this.ffmpegModule = ffmpegModule;
      this.ffmpegModule.setFfmpegPath(ffmpegStaticModule.default);
    }
    return this.ffmpegModule;
  }

  /**
   * Process a video file with the specified options
   *
   * @param inputPath - Path to the input video file
   * @param outputPath - Path for the processed output file
   * @param options - Video processing configuration
   * @returns Processing result with success status, output path, and metadata
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: VideoProcessingOptions = {},
  ): Promise<ProcessingResult> {
    try {
      await this.processWithFfmpeg(inputPath, outputPath, options);

      // Generate thumbnail if specified
      let thumbnailPath: string | undefined;
      if (options.thumbnail !== undefined) {
        thumbnailPath = outputPath.replace(/(\.[^.]+)$/, '_thumb.jpg');
      }

      // Get metadata
      const metadata = await this.getMetadata(inputPath);

      const result: ProcessingResult = {
        success: true,
        outputPath,
        metadata,
      };
      if (thumbnailPath !== undefined) {
        result.thumbnailPath = thumbnailPath;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Video processing failed',
      };
    }
  }

  /**
   * Process video using FFmpeg with format, resolution, and bitrate options
   *
   * @param inputPath - Path to the input video file
   * @param outputPath - Path for the processed output file
   * @param options - Video processing configuration
   * @throws Error if FFmpeg processing fails
   */
  private async processWithFfmpeg(
    inputPath: string,
    outputPath: string,
    options: VideoProcessingOptions,
  ): Promise<void> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve, reject) => {
      let command = ffmpegModule.default(inputPath);

      if (options.format !== undefined) {
        switch (options.format) {
          case 'mp4':
            command = command.videoCodec('libx264').toFormat('mp4');
            break;
          case 'webm':
            command = command.videoCodec('libvpx-vp9').toFormat('webm');
            break;
          case 'avi':
            command = command.toFormat('avi');
            break;
          case 'mov':
            command = command.toFormat('mov');
            break;
        }
      }

      if (options.resolution !== undefined) {
        command = command.size(
          `${String(options.resolution.width)}x${String(options.resolution.height)}`,
        );
      }

      if (options.bitrate !== undefined && options.bitrate !== '') {
        command = command.videoBitrate(options.bitrate);
      }

      command
        .on('end', () => {
          resolve();
        })
        .on('error', (err?: Error) => {
          reject(err ?? new Error('Video processing failed'));
        })
        .save(outputPath);
    });
  }

  /**
   * Extract metadata from a video file using ffprobe
   *
   * @param inputPath - Path to the video file
   * @returns Extracted media metadata (duration, dimensions, bitrate, codec, etc.)
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve) => {
      ffmpegModule.ffprobe(inputPath, (err: Error | null, data: FfprobeData) => {
        if (err !== null) {
          resolve({});
          return;
        }

        const videoStream = data.streams.find((s) => s.codec_type === 'video');
        const audioStream = data.streams.find((s) => s.codec_type === 'audio');

        const result: MediaMetadata = {};
        if (data.format.duration !== undefined) {
          result.duration = data.format.duration;
        }
        if (videoStream?.width !== undefined) {
          result.width = videoStream.width;
        }
        if (videoStream?.height !== undefined) {
          result.height = videoStream.height;
        }
        if (data.format.bit_rate !== undefined && data.format.bit_rate !== '') {
          result.bitrate = parseInt(data.format.bit_rate, 10);
        }
        if (videoStream?.codec_name !== undefined) {
          result.codec = videoStream.codec_name;
        }
        if (audioStream?.channels !== undefined) {
          result.channels = audioStream.channels;
        }
        if (audioStream?.sample_rate !== undefined && audioStream.sample_rate !== '') {
          result.sampleRate = parseInt(audioStream.sample_rate, 10);
        }
        resolve(result);
      });
    });
  }

  /**
   * Generate multiple variants of a video file (original, compressed, optimized)
   *
   * @param inputPath - Path to the source video
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
    const original = await this.process(inputPath, `${baseOutputPath}_original.mp4`, {
      format: 'mp4',
    });

    const compressed = await this.process(inputPath, `${baseOutputPath}_compressed.mp4`, {
      format: 'mp4',
      resolution: { width: 1280, height: 720 },
      bitrate: '1500k',
      thumbnail: { time: 5, size: 300 },
    });

    const optimized = await this.process(inputPath, `${baseOutputPath}_optimized.mp4`, {
      format: 'mp4',
      resolution: { width: 1920, height: 1080 },
      bitrate: '3000k',
      thumbnail: { time: 5, size: 300 },
    });

    return { original, compressed, optimized };
  }

  /**
   * Extract audio track from a video file
   *
   * @param inputPath - Path to the video file
   * @param outputPath - Path for the extracted audio file
   * @param format - Output audio format (mp3, wav, or aac)
   * @returns Processing result with success status and output path
   */
  async extractAudio(
    inputPath: string,
    outputPath: string,
    format: 'mp3' | 'wav' | 'aac' = 'mp3',
  ): Promise<ProcessingResult> {
    try {
      await this.extractAudioWithFfmpeg(inputPath, outputPath, format);

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio extraction failed',
      };
    }
  }

  /**
   * Extract audio using FFmpeg, stripping video track
   *
   * @param inputPath - Path to the video file
   * @param outputPath - Path for the extracted audio
   * @param format - Target audio format
   * @throws Error if extraction fails
   */
  private async extractAudioWithFfmpeg(
    inputPath: string,
    outputPath: string,
    format: string,
  ): Promise<void> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve, reject) => {
      const command = ffmpegModule.default(inputPath);

      command
        .noVideo()
        .audioCodec(format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le')
        .toFormat(format)
        .on('end', () => {
          resolve();
        })
        .on('error', (err?: Error) => {
          reject(err ?? new Error('Video processing failed'));
        })
        .save(outputPath);
    });
  }

  /**
   * Create HLS (HTTP Live Streaming) segments from a video file
   *
   * @param inputPath - Path to the source video
   * @param outputDir - Directory for HLS output files
   * @param baseName - Base name for the m3u8 playlist file
   * @returns Processing result with the playlist path
   */
  async createHLSStream(
    inputPath: string,
    outputDir: string,
    baseName: string,
  ): Promise<ProcessingResult> {
    try {
      const outputPath = path.join(outputDir, `${baseName}.m3u8`);
      await this.createHLSWithFfmpeg(inputPath, outputPath);

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HLS creation failed',
      };
    }
  }

  /**
   * Create HLS stream using FFmpeg with 10-second segments
   *
   * @param inputPath - Path to the source video
   * @param outputPath - Path for the m3u8 playlist
   * @throws Error if HLS creation fails
   */
  private async createHLSWithFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve, reject) => {
      const command = ffmpegModule.default(inputPath);

      command
        .addOptions(['-hls_time 10', '-hls_list_size 0', '-hls_segment_type mpegts'])
        .output(outputPath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err?: Error) => {
          reject(err ?? new Error('Video processing failed'));
        })
        .run();
    });
  }

  /**
   * Get the duration of a video file in seconds
   *
   * @param inputPath - Path to the video file
   * @returns Duration in seconds, or null if unable to determine
   */
  async getDuration(inputPath: string): Promise<number | null> {
    const ffmpegModule = await this.getFfmpeg();

    return new Promise((resolve) => {
      ffmpegModule.ffprobe(inputPath, (err: Error | null, data: FfprobeData) => {
        if (err !== null) {
          resolve(null);
          return;
        }
        resolve(data.format.duration ?? null);
      });
    });
  }
}
