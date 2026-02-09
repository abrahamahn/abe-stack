// src/server/media/src/processors/video.ts
/**
 * Video Processing Module
 *
 * Handles video processing operations using the internal FFmpeg wrapper.
 * Provides transcoding, metadata extraction, audio extraction, and HLS streaming.
 *
 * @module processors/video
 */

import path from 'path';

import { convertVideo, createHLSStream, extractAudio, getMediaMetadata } from '../ffmpeg-wrapper';

import type { MediaMetadata, ProcessingResult, VideoProcessingOptions } from '../types';

export type { VideoProcessingOptions };

/**
 * Video processor using the internal FFmpeg wrapper for transcoding,
 * metadata extraction, variant generation, audio extraction, and HLS streaming.
 *
 * No external npm dependencies — relies on the system-installed `ffmpeg`/`ffprobe` binaries.
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
   * Process video using FFmpeg wrapper with format, resolution, and bitrate options
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
    const convertOpts: {
      format?: 'mp4' | 'webm' | 'avi';
      videoCodec?: string;
      videoBitrate?: string;
      resolution?: { width: number; height: number };
    } = {};

    if (options.format !== undefined) {
      switch (options.format) {
        case 'mp4':
          convertOpts.format = 'mp4';
          convertOpts.videoCodec = 'libx264';
          break;
        case 'webm':
          convertOpts.format = 'webm';
          convertOpts.videoCodec = 'libvpx-vp9';
          break;
        case 'avi':
          convertOpts.format = 'avi';
          break;
        case 'mov':
          // mov is handled by ffmpeg without explicit format flag
          break;
      }
    }

    if (typeof options.bitrate === 'string' && options.bitrate !== '') {
      convertOpts.videoBitrate = options.bitrate;
    }

    if (options.resolution !== undefined) {
      convertOpts.resolution = options.resolution;
    }

    const result = await convertVideo(inputPath, outputPath, convertOpts);

    if (!result.success) {
      throw new Error(result.error ?? 'Video processing failed');
    }
  }

  /**
   * Extract metadata from a video file using ffprobe via the FFmpeg wrapper
   *
   * @param inputPath - Path to the video file
   * @returns Extracted media metadata (duration, dimensions, bitrate, codec, etc.)
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    try {
      const meta = await getMediaMetadata(inputPath);

      const result: MediaMetadata = {};
      if (meta.duration !== undefined) {
        result.duration = meta.duration;
      }
      if (meta.width !== undefined) {
        result.width = meta.width;
      }
      if (meta.height !== undefined) {
        result.height = meta.height;
      }
      if (meta.hasVideo === true) {
        result.codec = 'video';
      }
      return result;
    } catch {
      return {};
    }
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
  async extractAudioTrack(
    inputPath: string,
    outputPath: string,
    format: 'mp3' | 'wav' | 'aac' = 'mp3',
  ): Promise<ProcessingResult> {
    try {
      const result = await extractAudio(inputPath, outputPath, format);

      if (!result.success) {
        throw new Error(result.error ?? 'Audio extraction failed');
      }

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
   * Create HLS (HTTP Live Streaming) segments from a video file
   *
   * @param inputPath - Path to the source video
   * @param outputDir - Directory for HLS output files
   * @param baseName - Base name for the m3u8 playlist file
   * @returns Processing result with the playlist path
   */
  async createHLS(
    inputPath: string,
    outputDir: string,
    baseName: string,
  ): Promise<ProcessingResult> {
    try {
      const result = await createHLSStream(inputPath, outputDir, baseName);
      const outputPath = path.join(outputDir, `${baseName}.m3u8`);

      if (!result.success) {
        throw new Error(result.error ?? 'HLS creation failed');
      }

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
   * Get the duration of a video file in seconds
   *
   * @param inputPath - Path to the video file
   * @returns Duration in seconds, or null if unable to determine
   */
  async getDuration(inputPath: string): Promise<number | null> {
    try {
      const meta = await getMediaMetadata(inputPath);
      return meta.duration ?? null;
    } catch {
      return null;
    }
  }
}
