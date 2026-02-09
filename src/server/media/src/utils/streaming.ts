// src/server/media/src/utils/streaming.ts
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

import { runFFmpeg } from '../ffmpeg-wrapper';

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

/** Maximum age for temp files before cleanup (24 hours in milliseconds) */
const TEMP_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Streaming media processor for handling large files without exhausting memory.
 * Uses Sharp for images and the internal FFmpeg wrapper for video,
 * both with streaming pipelines.
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
  private readonly options: Required<StreamingOptions>;
  private sharpModule: SharpFunction | null = null;

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
   * Process large video files with streaming via the internal FFmpeg wrapper.
   * Delegates to `runFFmpeg()` with mapped options.
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

      const ffmpegOpts: import('../ffmpeg-wrapper').FFmpegOptions = {
        input: inputPath,
        output: outputPath,
      };

      if (operations.format === 'mp4') {
        ffmpegOpts.videoCodec = 'libx264';
        ffmpegOpts.format = 'mp4';
      } else if (operations.format === 'webm') {
        ffmpegOpts.videoCodec = 'libvpx-vp9';
        ffmpegOpts.format = 'webm';
      }

      if (operations.resolution !== undefined) {
        ffmpegOpts.resolution = operations.resolution;
      }

      if (typeof operations.bitrate === 'string' && operations.bitrate !== '') {
        ffmpegOpts.videoBitrate = operations.bitrate;
      }

      if (operations.startTime !== undefined) {
        ffmpegOpts.startTime = operations.startTime;
      }

      if (operations.duration !== undefined) {
        ffmpegOpts.duration = operations.duration;
      }

      const result = await runFFmpeg(ffmpegOpts);

      if (result.success) {
        return { success: true, outputPath };
      }

      return {
        success: false,
        error: result.error ?? 'Streaming video processing failed',
      };
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
   * Clean up temporary files in the configured temp directory.
   * Deletes files older than the specified max age (default: 24 hours).
   *
   * @param maxAgeMs - Maximum file age in milliseconds before deletion (default: 24h)
   * @complexity O(n) where n = number of files in temp directory
   */
  async cleanupTempFiles(maxAgeMs: number = TEMP_FILE_MAX_AGE_MS): Promise<void> {
    try {
      await fs.mkdir(this.options.tempDir, { recursive: true });

      const entries = await fs.readdir(this.options.tempDir);
      const now = Date.now();

      for (const entry of entries) {
        try {
          const filePath = path.join(this.options.tempDir, entry);
          const stat = await fs.stat(filePath);

          if (stat.isFile() && now - stat.mtimeMs > maxAgeMs) {
            await fs.unlink(filePath);
          }
        } catch {
          // Skip files that cannot be accessed or deleted
        }
      }
    } catch {
      // Ignore cleanup errors (directory may not exist yet)
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
