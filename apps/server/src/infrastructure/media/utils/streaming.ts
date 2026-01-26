// apps/server/src/infrastructure/media/utils/streaming.ts
/**
 * Media Streaming Processor
 *
 * Handles large file processing with streaming to prevent memory exhaustion.
 * Processes files in chunks without loading entire file into memory.
 */

import { createReadStream, createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export interface StreamingOptions {
  chunkSize?: number; // Default 64KB
  maxMemoryUsage?: number; // Default 50MB
  tempDir?: string;
}

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

interface FfmpegModule {
  default: (input: string) => FfmpegCommand;
  setFfmpegPath: (path: string) => void;
}

export class StreamingMediaProcessor {
  private options: Required<StreamingOptions>;
  private sharpModule: SharpFunction | null = null;
  private ffmpegModule: FfmpegModule | null = null;

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
   */
  private async getSharp(): Promise<SharpFunction> {
    if (!this.sharpModule) {
      const sharpModule = (await import('sharp')) as { default: SharpFunction };
      this.sharpModule = sharpModule.default;
    }
    return this.sharpModule;
  }

  /**
   * Lazy load ffmpeg module
   */
  private async getFfmpeg(): Promise<FfmpegModule> {
    if (!this.ffmpegModule) {
      const ffmpegStaticModule = (await import('ffmpeg-static')) as { default: string };
      const ffmpegModule = (await import('fluent-ffmpeg')) as unknown as FfmpegModule;
      this.ffmpegModule = ffmpegModule;
      this.ffmpegModule.setFfmpegPath(ffmpegStaticModule.default);
    }
    return this.ffmpegModule;
  }

  /**
   * Process large image files with streaming
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
      if (operations.resize) {
        sharpPipeline = sharpPipeline.resize({
          width: operations.resize.width,
          height: operations.resize.height,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Configure format and quality
      if (operations.format) {
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
   * Process large video files with streaming
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
        if (operations.format) {
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
        if (operations.resolution) {
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
   * Stream file copy with progress monitoring
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
   * Check if file should be processed with streaming
   */
  shouldUseStreaming(fileSize: number): boolean {
    // Use streaming for files larger than 10MB or when memory usage would be high
    return fileSize > 10 * 1024 * 1024;
  }

  /**
   * Get file size without loading entire file
   */
  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(_pattern?: string): Promise<void> {
    try {
      // This would use a more sophisticated cleanup strategy in production
      // For now, just ensure temp directory exists
      await fs.mkdir(this.options.tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Monitor memory usage during processing
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
   * Check if memory usage is within safe limits
   */
  isMemoryUsageSafe(): boolean {
    const usage = this.getMemoryUsage();
    return usage.percentage < 80; // Keep under 80% heap usage
  }
}
