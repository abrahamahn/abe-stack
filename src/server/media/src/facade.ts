// src/server/media/src/facade.ts
/**
 * Server-Side Media Processing Facade
 *
 * High-level API for media processing. Combines the processing orchestrator
 * with the job queue for background processing with retry support.
 *
 * Balanced approach: Essential external libraries (Sharp, FFmpeg) + Custom implementations.
 * Provides background processing, security scanning, and advanced media processing.
 * Supports optional entitlement gating via `ResolvedEntitlements`.
 *
 * @module facade
 */

import {
  ALL_MEDIA_EXTENSIONS,
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_MEDIA_FILE_SIZE,
  DEFAULT_PROCESSING_TIMEOUT_MS,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_MAX_RETRIES,
} from './constants';
import {
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  MediaProcessingOrchestrator,
} from './processor';
import { CustomJobQueue } from './queue';

import type { ProcessingLimits } from './processor';
import type { Logger } from '@abe-stack/shared';

/**
 * Resolved entitlements for media access control.
 * Optional — when not provided, entitlement checks are skipped.
 */
export interface MediaEntitlements {
  /** Whether the feature map includes 'media:processing' = enabled */
  features: Record<string, { enabled: boolean; limit?: number }>;
}

/**
 * Data payload for a media processing job submitted to the facade
 */
export interface MediaJobData {
  fileId: string;
  filePath: string;
  filename: string;
  userId: string;
  /** File size in megabytes (used for entitlement limit checks) */
  fileSizeMb?: number;
}

/**
 * Server-side media processing queue that combines the orchestrator
 * with the generic job queue for background processing.
 *
 * @example
 * ```typescript
 * const queue = createServerMediaQueue(logger);
 * await queue.start();
 * await queue.addJob({
 *   fileId: '123',
 *   filePath: '/tmp/upload.mp4',
 *   filename: 'video.mp4',
 *   userId: 'user-1',
 * });
 * ```
 */
export class ServerMediaQueue extends CustomJobQueue {
  private readonly orchestrator: MediaProcessingOrchestrator;
  private readonly logger: Logger;

  /**
   * Create a server media queue with pre-configured processors
   *
   * @param logger - Logger instance for structured logging
   * @param limits - Optional processing limits override (e.g., from plan config)
   */
  constructor(logger: Logger, limits?: Partial<ProcessingLimits>) {
    super({
      concurrency: DEFAULT_CONCURRENCY,
      retryDelayMs: DEFAULT_RETRY_DELAY_MS,
      maxRetries: DEFAULT_MAX_RETRIES,
      logger,
    });
    this.logger = logger;

    // Initialize production processors with external dependencies
    this.orchestrator = new MediaProcessingOrchestrator(
      new ImageProcessor(),
      new AudioProcessor(),
      new VideoProcessor(),
      {
        maxDuration: DEFAULT_PROCESSING_TIMEOUT_MS,
        maxFileSize: DEFAULT_MAX_MEDIA_FILE_SIZE,
        maxConcurrentJobs: DEFAULT_CONCURRENCY,
        allowedFormats: [...ALL_MEDIA_EXTENSIONS],
        ...limits,
      },
    );
  }

  /**
   * Override processJobData to handle media processing via orchestrator
   *
   * @param data - The media job payload
   * @throws Error if processing fails
   */
  protected override async processJobData(data: MediaJobData): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.info('Processing media job', {
        fileId: data.fileId,
        filename: data.filename,
      });

      const result = await this.orchestrator.processFile({
        fileId: data.fileId,
        filePath: data.filePath,
        filename: data.filename,
        priority: 'normal',
        retryCount: 0,
        startTime,
      });

      const processingTime = Date.now() - startTime;

      this.logger.info('Media processing completed', {
        fileId: data.fileId,
        success: result.success,
        processingTime,
      });

      void result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Media processing failed', {
        fileId: data.fileId,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      });

      throw error;
    }
  }

  /**
   * Add a media processing job to the queue.
   * When entitlements are provided, validates that:
   *  - `media:processing` feature is enabled
   *  - file size is within `media:max_file_size` limit
   *
   * @param data - The media job data
   * @param options - Optional priority, delay, and entitlements
   * @returns The job ID (same as fileId)
   * @throws Error if entitlement checks fail
   */
  async addJob(
    data: MediaJobData,
    options: { priority?: number; delay?: number; entitlements?: MediaEntitlements } = {},
  ): Promise<string> {
    // Entitlement gating (optional — skipped if entitlements not provided)
    if (options.entitlements !== undefined) {
      const processingFeature = options.entitlements.features['media:processing'];
      if (processingFeature?.enabled !== true) {
        throw new Error('Media processing is not available on your plan');
      }

      const fileSizeFeature = options.entitlements.features['media:max_file_size'];
      if (
        fileSizeFeature?.limit !== undefined &&
        data.fileSizeMb !== undefined &&
        data.fileSizeMb > fileSizeFeature.limit
      ) {
        throw new Error(
          `File size ${String(data.fileSizeMb)}MB exceeds plan limit of ${String(fileSizeFeature.limit)}MB`,
        );
      }
    }

    const addOpts: { priority?: number; delay?: number } = {};
    if (options.priority !== undefined) {
      addOpts.priority = options.priority;
    }
    if (options.delay !== undefined) {
      addOpts.delay = options.delay;
    }

    return this.add(data.fileId, data, addOpts);
  }

  /**
   * Get orchestrator stats including active jobs and limits
   *
   * @returns Orchestrator statistics
   */
  getOrchestratorStats(): unknown {
    return this.orchestrator.getStats();
  }
}

/**
 * Create a server media processing queue with default configuration
 *
 * @param logger - Logger instance for structured logging
 * @param limits - Optional processing limits override (e.g., from plan config)
 * @returns Configured ServerMediaQueue ready for use
 */
export function createServerMediaQueue(
  logger: Logger,
  limits?: Partial<ProcessingLimits>,
): ServerMediaQueue {
  return new ServerMediaQueue(logger, limits);
}
