import { Readable } from "stream";

import { inject, injectable } from "inversify";

import TYPES from "../../infrastructure/di/types";
import { IJobService } from "../../infrastructure/jobs/IJobService";
import {
  JobType,
  MediaProcessingJobData,
} from "../../infrastructure/jobs/JobTypes";
import { ILoggerService } from "../../infrastructure/logging/ILoggerService";
import { ImageProcessor } from "../../infrastructure/processor/ImageProcessor";
import { IStorageService } from "../../infrastructure/storage-backup/StorageService";

/**
 * Media processing options
 */
export interface MediaProcessingOptions {
  /**
   * Whether to generate thumbnails
   */
  generateThumbnails?: boolean;

  /**
   * Whether to optimize for web delivery
   */
  optimizeForWeb?: boolean;

  /**
   * Quality settings (1-100)
   */
  quality?: number;

  /**
   * Whether to preserve aspect ratio
   */
  preserveAspectRatio?: boolean;

  /**
   * Whether to strip metadata
   */
  stripMetadata?: boolean;

  /**
   * Target formats to generate
   */
  formats?: Array<{
    type: "thumbnail" | "preview" | "standard" | "hd";
    width: number;
    height: number;
    format?: "jpeg" | "webp" | "png";
  }>;
}

/**
 * Result of media processing
 */
export interface MediaProcessingResult {
  /**
   * Original media ID
   */
  mediaId: string;

  /**
   * Path to the original file
   */
  originalPath: string;

  /**
   * Paths to generated formats
   */
  generatedFormats: Array<{
    type: string;
    path: string;
    width: number;
    height: number;
    size: number;
    format: string;
  }>;

  /**
   * Processing metadata
   */
  metadata: {
    originalSize: number;
    totalProcessedSize: number;
    processingTimeMs: number;
    compressionRatio: number;
  };
}

/**
 * Service for media processing operations
 * This demonstrates the proper separation - business logic in services layer,
 * while using infrastructure components
 */
@injectable()
export class MediaProcessingService {
  private imageProcessor: ImageProcessor;

  constructor(
    @inject(TYPES.StorageService) private storageService: IStorageService,
    @inject(TYPES.JobService) private jobService: IJobService,
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {
    // Create the image processor in the service layer
    this.imageProcessor = new ImageProcessor();
    this.logger.info("Media processing service initialized");

    // Register job processors
    this.registerJobProcessors();
  }

  /**
   * Process media immediately
   * @param mediaId Unique ID of the media
   * @param filePath Path to the media file
   * @param options Processing options
   */
  async processMedia(
    mediaId: string,
    filePath: string,
    userId: string,
    options: MediaProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    try {
      this.logger.info("Processing media", { mediaId, filePath });

      // Check if the file exists and get metadata
      const fileExists = await this.storageService.fileExists(filePath);
      if (!fileExists) {
        throw new Error(`File not found: ${filePath}`);
      }

      const metadata = await this.storageService.getFileMetadata(filePath);
      const startTime = Date.now();

      // Determine if this is an image
      const isImage = metadata.contentType.startsWith("image/");

      if (!isImage) {
        throw new Error("Only image processing is currently supported");
      }

      // Process the image formats
      const formats = options.formats || [
        { type: "thumbnail", width: 150, height: 150, format: "webp" },
        { type: "preview", width: 800, height: 600, format: "webp" },
        { type: "standard", width: 1920, height: 1080, format: "webp" },
      ];

      const generatedFormats = [];
      let totalProcessedSize = 0;

      for (const format of formats) {
        const targetPath = this.generateTargetPath(filePath, mediaId, format);

        // Use the infrastructure storage service with application-specific parameters
        const result = await this.storageService.optimizeImage(filePath, {
          width: format.width,
          height: format.height,
          quality: options.quality || 85,
          preserveAspectRatio: options.preserveAspectRatio !== false,
          stripMetadata: options.stripMetadata !== false,
          format: format.format || "webp",
        });

        // Copy to final destination
        await this.storageService.saveFile(
          targetPath,
          await this.storageService.getFile(result.metadata.path)
        );

        generatedFormats.push({
          type: format.type,
          path: targetPath,
          width: result.metadata.width || format.width,
          height: result.metadata.height || format.height,
          size: result.metadata.size,
          format: result.metadata.format || format.format || "webp",
        });

        totalProcessedSize += result.metadata.size;
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        mediaId,
        originalPath: filePath,
        generatedFormats,
        metadata: {
          originalSize: metadata.size,
          totalProcessedSize,
          processingTimeMs,
          compressionRatio: metadata.size / totalProcessedSize,
        },
      };
    } catch (error) {
      this.logger.error("Failed to process media", {
        error: error instanceof Error ? error.message : String(error),
        mediaId,
        filePath,
      });
      throw error;
    }
  }

  /**
   * Queue media processing as a background job
   * @param mediaId Unique ID of the media
   * @param filePath Path to the media file
   * @param userId User ID who owns the media
   * @param options Processing options
   */
  async queueMediaProcessing(
    mediaId: string,
    filePath: string,
    userId: string,
    options: MediaProcessingOptions = {}
  ): Promise<string> {
    try {
      // Check if the file exists
      const fileExists = await this.storageService.fileExists(filePath);
      if (!fileExists) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Generate job data
      const formats = options.formats || [
        { type: "thumbnail", width: 150, height: 150, format: "webp" },
        { type: "preview", width: 800, height: 600, format: "webp" },
        { type: "standard", width: 1920, height: 1080, format: "webp" },
      ];

      // Transform service-layer format to infrastructure-layer format
      const jobData: MediaProcessingJobData = {
        mediaId,
        userId,
        originalPath: filePath,
        targetFormats: formats.map((f) => ({
          type: f.type as any,
          width: f.width,
          height: f.height,
          quality: options.quality || 85,
          format: f.format as any,
          targetPath: this.generateTargetPath(filePath, mediaId, f),
        })),
        options: {
          preserveAspectRatio: options.preserveAspectRatio !== false,
          stripMetadata: options.stripMetadata !== false,
        },
      };

      // Add the job to the queue using the infrastructure's job service
      const jobId = await this.jobService.addJob(
        JobType.MEDIA_PROCESSING,
        jobData,
        {
          priority: options.optimizeForWeb ? 5 : 10,
        }
      );

      this.logger.info("Queued media processing job", {
        mediaId,
        jobId,
        formatCount: formats.length,
      });

      return jobId;
    } catch (error) {
      this.logger.error("Failed to queue media processing", {
        error: error instanceof Error ? error.message : String(error),
        mediaId,
        filePath,
      });
      throw error;
    }
  }

  /**
   * Register job processors with the job service
   */
  private registerJobProcessors(): void {
    // Register the media processing job handler
    this.jobService.registerProcessor(
      JobType.MEDIA_PROCESSING,
      async (data: MediaProcessingJobData) => {
        try {
          this.logger.info("Processing media job", {
            mediaId: data.mediaId,
            formatCount: data.targetFormats.length,
          });

          // Process each format
          for (const format of data.targetFormats) {
            await this.storageService.optimizeImage(data.originalPath, {
              width: format.width,
              height: format.height,
              quality: format.quality,
              preserveAspectRatio: data.options?.preserveAspectRatio !== false,
              stripMetadata: data.options?.stripMetadata !== false,
              format: format.format,
            });
          }

          this.logger.info("Completed media processing job", {
            mediaId: data.mediaId,
          });
        } catch (error) {
          this.logger.error("Failed to process media job", {
            error: error instanceof Error ? error.message : String(error),
            mediaId: data.mediaId,
          });
          throw error;
        }
      }
    );

    this.logger.info("Registered media job processors");
  }

  /**
   * Generate a target path for processed media
   */
  private generateTargetPath(
    originalPath: string,
    mediaId: string,
    format: { type: string; width: number; height: number; format?: string }
  ): string {
    const basePath = originalPath.substring(0, originalPath.lastIndexOf("."));
    const extension = format.format || "webp";
    return `${basePath}_${format.type}_${format.width}x${format.height}.${extension}`;
  }
}
