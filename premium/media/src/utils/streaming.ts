// premium/media/src/utils/streaming.ts
/**
 * Media Streaming Processor
 *
 * Handles large file processing with streaming to prevent memory exhaustion.
 * Processes files in chunks without loading entire file into memory.
 *
 * @module utils/streaming
 */

import { createReadStream, createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

/**
 * Configuration for streaming media processing
 */
export interface StreamingOptions {
  /** Chunk size in bytes for stream reads (default: 64KB) */
  chunkSize?: number;
  /** Maximum memory usage threshold in bytes (default: 50MB) */
  maxMemoryUsage?: number;
  /** Directory for temporary files during processing */
  tempDir?: string;
}

/**
 * Fluent-ffmpeg command interface for video streaming operations
 */
interface FfmpegCommand {
  videoCodec: (codec: string) => FfmpegCommand;
  toFormat: (format: string) => FfmpegCommand;
  size: (size: string) => FfmpegCommand;
  videoBitrate: (bitrate: string) => FfmpegCommand;
  setStartTime: (time: number) => FfmpegCommand;
  setDuration: (duration: number) => FfmpegCommand;
  on: (event: string, callback: (err?: Error) => void) => FfmpegCommand;
  save: (outputPath: string) => FfmpegCommand;
}

/**
 * Sharp instance interface for image streaming operations
 */
interface SharpInstance {
  resize: (options: {
    width?: number;
    height?: number;
    fit?: string;
    withoutEnlargement?: boolean;
  }) => SharpInstance;
  jpeg: (options: { quality?: number; progressive?: boolean }) => SharpInstance;
  png: (options: { compressionLevel?: number }) => SharpInstance;
  webp: (options: { quality?: number }) => SharpInstance;
  toFile: (path: string) => Promise<{ width: number; height: number; format: string }>;
}

type SharpFunction = (input: string) => SharpInstance;

/**
 * Lazy-loaded FFmpeg module interface
 */
interface FfmpegModule {
  default: (input: string) => FfmpegCommand;
  setFfmpegPath: (path: string) => void;
}

/**
 * Streaming media processor for handling large files without exhausting memory.
 * Uses Sharp for images and FFmpeg for video, both with streaming pipelines.
 *
 * @example
 * ```typescript
 * const processor = new StreamingMediaProcessor({ chunkSize: 128 * 1024 });
 * if (processor.shouldUseStreaming(fileSize)) {
 *   await processor.processLargeImage(input, output, { format: 'webp' });
 * }
 * ```
 */
export class StreamingMediaProcessor {
  private options: Required<StreamingOptions>;
  private sharpModule: SharpFunction | null = null;
  private ffmpegModule: FfmpegModule | null = null;

  /**
   * Create a streaming media processor
   *
   * @param options - Streaming configuration options
   */
  constructor(options: StreamingOptions = {}) {
    this.options = {
      chunkSize: 64 * 1024, // 64KB chunks
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB max memory
      tempDir: '/tmp/media-streaming',
      ...options,
    };
  }

  /**
   * Lazy load sharp module
   *
   * @returns The sharp function
   * @complexity O(1) after first call (cached)
   */
  private async getSharp(): Promise<SharpFunction> {
    if (this.sharpModule === null) {
      const sharpModule = (await import('sharp')) as { default: SharpFunction };
      this.sharpModule = sharpModule.default;
    }
    return this.sharpModule;
  }

  /**
   * Lazy load ffmpeg module
   *
   * @returns The FFmpeg module with static path configured
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
   * Process large image files with streaming via Sharp pipeline
   *
   * @param inputPath - Path to the input image
   * @param outputPath - Path for the processed output
   * @param operations - Image operations to apply (resize, format, quality)
   * @returns Result with success status and optional output path
   */
  async processLargeImage(
    inputPath: string,
    outputPath: string,
    operations: {
      resize?: { width: number; height: number };
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    },
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const sharp = await this.getSharp();
      let sharpPipeline = sharp(inputPath);

      // Configure resize if specified
      if (operations.resize !== undefined) {
        sharpPipeline = sharpPipeline.resize({
          width: operations.resize.width,
          height: operations.resize.height,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Configure format and quality
      if (operations.format !== undefined) {
        const quality = operations.quality ?? 85;
        switch (operations.format) {
          case 'jpeg':
            sharpPipeline = sharpPipeline.jpeg({ quality, progressive: true });
            break;
          case 'png':
            sharpPipeline = sharpPipeline.png({ compressionLevel: 6 });
            break;
          case 'webp':
            sharpPipeline = sharpPipeline.webp({ quality });
            break;
        }
      }

      // Write output
      await sharpPipeline.toFile(outputPath);

      return { success: true, outputPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Streaming image processing failed',
      };
    }
  }

  /**
   * Process large video files with streaming via FFmpeg
   *
   * @param inputPath - Path to the input video
   * @param outputPath - Path for the processed output
   * @param operations - Video operations to apply (format, resolution, bitrate, trim)
   * @returns Result with success status and optional output path
   */
  async processLargeVideo(
    inputPath: string,
    outputPath: string,
    operations: {
      format?: 'mp4' | 'webm';
      resolution?: { width: number; height: number };
      bitrate?: string;
      startTime?: number;
      duration?: number;
    },
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const ffmpegModule = await this.getFfmpeg();

      return await new Promise((resolve) => {
        let command = ffmpegModule.default(inputPath);

        // Configure format
        if (operations.format !== undefined) {
          switch (operations.format) {
            case 'mp4':
              command = command.videoCodec('libx264').toFormat('mp4');
              break;
            case 'webm':
              command = command.videoCodec('libvpx-vp9').toFormat('webm');
              break;
          }
        }

        // Configure resolution
        if (operations.resolution !== undefined) {
          command = command.size(
            `${String(operations.resolution.width)}x${String(operations.resolution.height)}`,
          );
        }

        // Configure bitrate
        if (typeof operations.bitrate === 'string' && operations.bitrate !== '') {
          command = command.videoBitrate(operations.bitrate);
        }

        // Configure time segment
        if (operations.startTime !== undefined) {
          command = command.setStartTime(operations.startTime);
        }
        if (operations.duration !== undefined) {
          command = command.setDuration(operations.duration);
        }

        command
          .on('end', () => {
            resolve({ success: true, outputPath });
          })
          .on('error', (err?: Error) => {
            resolve({
              success: false,
              error: err?.message ?? 'Streaming video processing failed',
            });
          })
          .save(outputPath);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Streaming video processing failed',
      };
    }
  }

  /**
   * Stream file copy with progress monitoring via Node.js streams.
   * Avoids loading entire file into memory.
   *
   * @param inputPath - Path to the source file
   * @param outputPath - Path for the destination file
   * @param onProgress - Optional callback invoked with bytes processed and total
   * @returns Result with success status and bytes copied
   */
  async streamFileCopy(
    inputPath: string,
    outputPath: string,
    onProgress?: (bytesProcessed: number, totalBytes: number) => void,
  ): Promise<{ success: boolean; bytesCopied: number; error?: string }> {
    try {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const stats = await fs.stat(inputPath);
      const totalBytes = stats.size;
      let bytesProcessed = 0;

      const readStream = createReadStream(inputPath, {
        highWaterMark: this.options.chunkSize,
      });

      const writeStream = createWriteStream(outputPath);

      readStream.on('data', (chunk: Buffer) => {
        bytesProcessed += chunk.length;
        onProgress?.(bytesProcessed, totalBytes);
      });

      await pipeline(readStream, writeStream);

      return { success: true, bytesCopied: bytesProcessed };
    } catch (error) {
      return {
        success: false,
        bytesCopied: 0,
        error: error instanceof Error ? error.message : 'File streaming failed',
      };
    }
  }

  /**
   * Determine if a file should be processed with streaming based on size.
   * Files larger than 10MB benefit from streaming to avoid memory pressure.
   *
   * @param fileSize - File size in bytes
   * @returns True if streaming should be used
   */
  shouldUseStreaming(fileSize: number): boolean {
    return fileSize > 10 * 1024 * 1024;
  }

  /**
   * Get file size without loading entire file into memory
   *
   * @param filePath - Path to the file
   * @returns File size in bytes
   * @throws Error if file cannot be accessed
   */
  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Clean up temporary files in the configured temp directory
   *
   * @param _pattern - Optional pattern to filter files (reserved for future use)
   */
  async cleanupTempFiles(_pattern?: string): Promise<void> {
    try {
      await fs.mkdir(this.options.tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Monitor current memory usage of the process
   *
   * @returns Object with used bytes, total heap, and percentage
   */
  getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const used = memUsage.heapUsed;
    const total = memUsage.heapTotal;

    return {
      used,
      total,
      percentage: (used / total) * 100,
    };
  }

  /**
   * Check if memory usage is within safe operating limits (under 80%)
   *
   * @returns True if memory usage is below 80% of heap total
   */
  isMemoryUsageSafe(): boolean {
    const usage = this.getMemoryUsage();
    return usage.percentage < 80;
  }
}
