// MediaProcessor.ts
import path from "path";

import ffmpeg from "fluent-ffmpeg";

import { ILoggerService } from "@/server/infrastructure/logging";
import {
  ContentCategory,
  getContentCategory,
  FileUtils,
} from "@/server/infrastructure/storage";

import { ImageProcessor, ImageOptions } from "./ImageProcessor";

/**
 * Media processing options
 */
export interface MediaOptions extends ImageOptions {
  /**
   * Video bitrate
   */
  videoBitrate?: string;

  /**
   * Audio bitrate
   */
  audioBitrate?: string;

  /**
   * Generate streaming variants (HLS)
   */
  generateStreamingVariants?: boolean;

  /**
   * Audio normalization
   */
  normalize?: boolean;

  /**
   * Generate thumbnail
   */
  generateThumbnail?: boolean;

  /**
   * Thumbnail size
   */
  thumbnailSize?: number;

  /**
   * Target path for processed file
   */
  targetPath?: string;
}

/**
 * Media processing result
 */
export interface MediaProcessingResult {
  /**
   * Output path
   */
  path: string;

  /**
   * Public URL
   */
  url: string;

  /**
   * Content type
   */
  contentType: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Media metadata
   */
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    dimensions?: { width: number; height: number };
  };

  /**
   * Thumbnail path (if generated)
   */
  thumbnail?: string;
}

/**
 * Unified media processor for images, videos, and audio
 */
export class MediaProcessor {
  private logger: ILoggerService;
  private fileUtils: FileUtils;
  private imageProcessor: ImageProcessor;
  private baseUrl: string;
  private activeProcesses: Set<string> = new Set();

  constructor(
    logger: ILoggerService,
    fileUtils: FileUtils,
    basePath: string,
    baseUrl: string = "",
  ) {
    this.logger = logger.createLogger("MediaProcessor");
    this.fileUtils = fileUtils;
    this.imageProcessor = new ImageProcessor(logger, fileUtils);
    this.baseUrl = baseUrl;
    this.activeProcesses = new Set();

    // Ensure base directory exists
    this.fileUtils.ensureDirectory(basePath);
  }

  /**
   * Clean up resources and release file handles
   * Call this when you're done using the MediaProcessor
   */
  public cleanup(): void {
    // Clear all active processes
    this.activeProcesses.clear();

    // Force garbage collection if available
    if (global.gc) {
      try {
        global.gc();
      } catch (error) {
        this.logger.debug("Error during garbage collection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Update the base URL (useful when port changes)
   * @param baseUrl New base URL
   */
  updateBaseUrl(baseUrl: string): void {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      this.logger.info("Updated media processor base URL", {
        baseUrl: this.baseUrl,
      });
    }
  }

  /**
   * Process media file based on its type
   * @param filePath Source file path
   * @param options Processing options
   */
  async processMedia(
    filePath: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      targetPath?: string;
      generateThumbnail?: boolean;
      thumbnailSize?: number;
    },
  ): Promise<MediaProcessingResult> {
    // Track this process
    const processId = `${filePath}-${Date.now()}`;
    this.activeProcesses.add(processId);

    try {
      // Default options
      const processOptions: MediaOptions = {
        ...options,
        generateThumbnail: options?.generateThumbnail !== false, // Default to true for image processing
      };

      // Detect content type
      const contentType = this.fileUtils.detectContentType(filePath);
      const category = getContentCategory(contentType);

      // Process based on media type
      switch (category) {
        case ContentCategory.IMAGE:
          return await this.processImage(
            filePath,
            processOptions?.targetPath || filePath,
            contentType,
            processOptions,
          );
        case ContentCategory.VIDEO:
          return await this.processVideo(
            filePath,
            processOptions?.targetPath || filePath,
            contentType,
            processOptions,
          );
        case ContentCategory.AUDIO:
          return await this.processAudio(
            filePath,
            processOptions?.targetPath || filePath,
            contentType,
            processOptions,
          );
        default: {
          // For other file types, just copy the file
          await this.fileUtils.copyFile(
            filePath,
            processOptions?.targetPath || filePath,
          );

          // Get file stats
          const stats = await this.fileUtils.getFileStats(
            processOptions?.targetPath || filePath,
          );

          return {
            path: processOptions?.targetPath || filePath,
            url: this.getFileUrl(processOptions?.targetPath || filePath),
            contentType,
            size: stats.size,
            metadata: {
              format: path
                .extname(processOptions?.targetPath || filePath)
                .slice(1),
            },
          };
        }
      }
    } catch (error) {
      this.logger.error(`Error processing media: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // Remove from active processes
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * Process an image
   * @param sourcePath Source file path
   * @param targetPath Target file path
   * @param contentType Content type
   * @param options Processing options
   */
  private async processImage(
    sourcePath: string,
    targetPath: string,
    contentType: string,
    options: MediaOptions,
  ): Promise<MediaProcessingResult> {
    // Process the image
    const processedMetadata = await this.imageProcessor.process(
      sourcePath,
      targetPath,
      options,
    );

    // Generate thumbnail if requested
    let thumbnail;
    if (options.generateThumbnail) {
      const thumbSize = options.thumbnailSize || 200;
      const thumbPath = this.generateThumbnailPath(targetPath);
      thumbnail = await this.imageProcessor.generateThumbnail(
        sourcePath,
        thumbPath,
        thumbSize,
      );
    }

    return {
      path: targetPath,
      url: this.getFileUrl(targetPath),
      contentType: this.getOutputContentType(contentType, options.format),
      size: processedMetadata.size,
      metadata: {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        dimensions:
          processedMetadata.width && processedMetadata.height
            ? {
                width: processedMetadata.width,
                height: processedMetadata.height,
              }
            : undefined,
      },
      thumbnail,
    };
  }

  /**
   * Process a video
   * @param sourcePath Source file path
   * @param targetPath Target file path
   * @param contentType Content type
   * @param options Processing options
   */
  private async processVideo(
    sourcePath: string,
    targetPath: string,
    contentType: string,
    options: MediaOptions,
  ): Promise<MediaProcessingResult> {
    // Create output directory
    const outputDir = path.dirname(targetPath);
    await this.fileUtils.ensureDirectory(outputDir);

    // Get video metadata
    const metadata = await this.getVideoMetadata(sourcePath);

    // Generate thumbnail if requested
    let thumbnail;
    if (options.generateThumbnail) {
      thumbnail = await this.generateVideoThumbnail(
        sourcePath,
        this.generateThumbnailPath(targetPath),
        options.thumbnailSize || 200,
      );
    }

    // If streaming variants are requested
    if (options.generateStreamingVariants) {
      await this.generateStreamingVariants(sourcePath, targetPath, options);
    } else {
      // Basic video processing
      await this.transcodeVideo(sourcePath, targetPath, options);
    }

    // Get processed file stats
    const stats = await this.fileUtils.getFileStats(targetPath);

    return {
      path: targetPath,
      url: this.getFileUrl(targetPath),
      contentType,
      size: stats.size,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        format: path.extname(targetPath).slice(1),
        dimensions:
          metadata.width && metadata.height
            ? {
                width: metadata.width,
                height: metadata.height,
              }
            : undefined,
      },
      thumbnail,
    };
  }

  /**
   * Process an audio file
   * @param sourcePath Source file path
   * @param targetPath Target file path
   * @param contentType Content type
   * @param options Processing options
   */
  private async processAudio(
    sourcePath: string,
    targetPath: string,
    contentType: string,
    options: MediaOptions,
  ): Promise<MediaProcessingResult> {
    // Create output directory
    const outputDir = path.dirname(targetPath);
    await this.fileUtils.ensureDirectory(outputDir);

    // Extract audio metadata
    const metadata = await this.getAudioMetadata(sourcePath);

    // Process audio
    await this.transcodeAudio(sourcePath, targetPath, options);

    // Get processed file stats
    const stats = await this.fileUtils.getFileStats(targetPath);

    return {
      path: targetPath,
      url: this.getFileUrl(targetPath),
      contentType,
      size: stats.size,
      metadata: {
        duration: metadata.duration,
        format: path.extname(targetPath).slice(1),
        dimensions: { width: 0, height: 0 },
      },
    };
  }

  /**
   * Generate streaming variants for a video
   * @param sourcePath Source video path
   * @param targetPath Base path for output files
   * @param options Processing options
   */
  private async generateStreamingVariants(
    sourcePath: string,
    targetPath: string,
    _options: MediaOptions,
  ): Promise<void> {
    // Get output directory
    const outputDir = path.dirname(targetPath);
    const baseName = path.basename(targetPath, path.extname(targetPath));

    // Create HLS directory
    const hlsDir = path.join(outputDir, `${baseName}_hls`);
    await this.fileUtils.ensureDirectory(hlsDir);

    // Generate HLS playlist
    return new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .outputOptions([
          "-hls_time 10",
          "-hls_list_size 0",
          "-hls_segment_filename",
          `${hlsDir}/%03d.ts`,
        ])
        .output(`${hlsDir}/playlist.m3u8`)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  /**
   * Transcode a video
   * @param sourcePath Source video path
   * @param targetPath Target video path
   * @param options Processing options
   */
  private async transcodeVideo(
    sourcePath: string,
    targetPath: string,
    options: MediaOptions,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let command = ffmpeg(sourcePath);

      if (options.videoBitrate) {
        command = command.videoBitrate(options.videoBitrate);
      }

      if (options.audioBitrate) {
        command = command.audioBitrate(options.audioBitrate);
      }

      command
        .output(targetPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  /**
   * Transcode an audio file
   * @param sourcePath Source audio path
   * @param targetPath Target audio path
   * @param options Processing options
   */
  private async transcodeAudio(
    sourcePath: string,
    targetPath: string,
    options: MediaOptions,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let command = ffmpeg(sourcePath);

      if (options.audioBitrate) {
        command = command.audioBitrate(options.audioBitrate);
      }

      if (options.normalize) {
        command = command.audioFilters("loudnorm");
      }

      command
        .output(targetPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  /**
   * Generate a thumbnail from a video
   * @param sourcePath Source video path
   * @param targetPath Target thumbnail path
   * @param size Thumbnail size
   */
  private async generateVideoThumbnail(
    sourcePath: string,
    targetPath: string,
    size: number,
  ): Promise<string> {
    // Create output directory
    const outputDir = path.dirname(targetPath);
    await this.fileUtils.ensureDirectory(outputDir);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(sourcePath)
        .screenshots({
          timestamps: ["10%"],
          filename: path.basename(targetPath),
          folder: outputDir,
          size: `${size}x${size}`,
        })
        .on("end", () => resolve(targetPath))
        .on("error", (err) => reject(err));
    });
  }

  /**
   * Get video metadata
   * @param filePath Video file path
   */
  private async getVideoMetadata(
    filePath: string,
  ): Promise<{ width?: number; height?: number; duration?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video",
        );

        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: metadata.format.duration,
        });
      });
    });
  }

  /**
   * Get audio metadata
   * @param filePath Audio file path
   */
  private async getAudioMetadata(
    filePath: string,
  ): Promise<{ duration?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          duration: metadata.format.duration,
        });
      });
    });
  }

  /**
   * Generate a thumbnail path
   * @param originalPath Original file path
   */
  private generateThumbnailPath(originalPath: string): string {
    const ext = path.extname(originalPath);
    const basePath = originalPath.substring(
      0,
      originalPath.length - ext.length,
    );
    return `${basePath}_thumb.webp`;
  }

  /**
   * Get file URL
   * @param filePath File path
   */
  private getFileUrl(filePath: string): string {
    // Normalize path for URL
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Remove any leading slash to avoid double slashes
    const cleanPath = normalizedPath.startsWith("/")
      ? normalizedPath.substring(1)
      : normalizedPath;

    return this.baseUrl ? `${this.baseUrl}/${cleanPath}` : cleanPath;
  }

  /**
   * Get output content type based on format
   * @param originalType Original content type
   * @param format Output format
   */
  private getOutputContentType(originalType: string, format?: string): string {
    if (!format || format === "original") {
      return originalType;
    }

    const formatContentTypes: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };

    return formatContentTypes[format] || originalType;
  }
}
