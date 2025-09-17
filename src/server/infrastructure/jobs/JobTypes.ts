/**
 * Types of background jobs supported by the application
 */
export enum JobType {
  // Media processing jobs
  MEDIA_PROCESSING = "media_processing",
  VIDEO_TRANSCODING = "video_transcoding",
  IMAGE_OPTIMIZATION = "image_optimization",
  THUMBNAIL_GENERATION = "thumbnail_generation",

  // Communication jobs
  EMAIL_NOTIFICATION = "email_notification",
  PUSH_NOTIFICATION = "push_notification",

  // Content jobs
  FEED_GENERATION = "feed_generation",
  CONTENT_INDEXING = "content_indexing",

  // User-related jobs
  USER_ONBOARDING = "user_onboarding",
  ACCOUNT_CLEANUP = "account_cleanup",

  // System jobs
  DATABASE_BACKUP = "database_backup",
  CACHE_MAINTENANCE = "cache_maintenance",
  REPORT_GENERATION = "report_generation",
}

/**
 * Job priority levels
 */
export enum JobPriority {
  LOWEST = 20,
  LOW = 10,
  NORMAL = 0,
  MEDIUM = -5,
  HIGH = -10,
  CRITICAL = -15,
  URGENT = -20,
}

/**
 * Strategy for handling job dependency failures
 */
export enum DependencyResolutionStrategy {
  /**
   * Fail the dependent job if any dependency fails
   */
  FAIL_ON_ANY_FAILURE = "fail_on_any_failure",

  /**
   * Only require that dependencies complete, regardless of their success
   */
  CONTINUE_ON_FAILURE = "continue_on_failure",

  /**
   * Skip the dependent job if any dependency fails
   */
  SKIP_ON_FAILURE = "skip_on_failure",
}

/**
 * Media format type
 */
export type MediaFormatType = "thumbnail" | "preview" | "standard" | "hd";

/**
 * Media processing job data
 */
export interface MediaProcessingJobData {
  /**
   * Unique ID of the media being processed
   */
  mediaId: string;

  /**
   * User ID who owns the media
   */
  userId: string;

  /**
   * Path to the original media file
   */
  originalPath: string;

  /**
   * Target output formats to generate
   */
  targetFormats: Array<{
    /**
     * Type of format to generate
     */
    type: MediaFormatType;

    /**
     * Target width in pixels
     */
    width: number;

    /**
     * Target height in pixels
     */
    height: number;

    /**
     * Quality setting (1-100, for lossy formats)
     */
    quality: number;

    /**
     * Optional target format (defaults to format based on type)
     */
    format?: "jpeg" | "webp" | "png" | "mp4" | "webm";

    /**
     * Optional target path (if not provided, will be auto-generated)
     */
    targetPath?: string;
  }>;

  /**
   * Optional metadata to include with the processed media
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional processing options
   */
  options?: {
    /**
     * Whether to preserve the original aspect ratio
     */
    preserveAspectRatio?: boolean;

    /**
     * Whether to strip metadata from the processed media
     */
    stripMetadata?: boolean;

    /**
     * Custom options for specific media types
     */
    custom?: Record<string, unknown>;
  };
}

/**
 * Email notification job data
 */
export interface EmailNotificationJobData {
  /**
   * Optional user ID associated with the email
   */
  userId?: string;

  /**
   * Recipient email address
   */
  email: string;

  /**
   * Template ID to use for the email
   */
  templateId: string;

  /**
   * Email subject
   */
  subject: string;

  /**
   * Variables to use in the email template
   */
  variables?: Record<string, any>;

  /**
   * Optional attachments
   */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Job options interface
 */
export interface JobOptions {
  /**
   * Job priority
   */
  priority?: JobPriority;

  /**
   * Number of retry attempts
   */
  attempts?: number;

  /**
   * Retry backoff configuration
   */
  backoff?: {
    /**
     * Type of backoff strategy
     */
    type: "fixed" | "exponential";

    /**
     * Base delay in milliseconds
     */
    delay: number;
  };

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Delay before the job is processed (in milliseconds)
   */
  delay?: number;

  /**
   * Optional custom job ID
   */
  jobId?: string;

  /**
   * Job dependencies - these jobs must complete before this job can start
   */
  dependsOn?: {
    /**
     * IDs of jobs that must complete before this job can start
     */
    jobIds: string[];

    /**
     * How to handle dependency failures
     * @default DependencyResolutionStrategy.FAIL_ON_ANY_FAILURE
     */
    strategy?: DependencyResolutionStrategy;
  };

  /**
   * Optional metadata for the job
   */
  metadata?: Record<string, unknown>;
}

/**
 * Type to map job types to their data types
 */
export interface JobDataMap {
  [JobType.MEDIA_PROCESSING]: MediaProcessingJobData;
  [JobType.VIDEO_TRANSCODING]: Record<string, unknown>;
  [JobType.IMAGE_OPTIMIZATION]: Record<string, unknown>;
  [JobType.THUMBNAIL_GENERATION]: Record<string, unknown>;
  [JobType.EMAIL_NOTIFICATION]: EmailNotificationJobData;
  [JobType.PUSH_NOTIFICATION]: Record<string, unknown>;
  [JobType.FEED_GENERATION]: Record<string, unknown>;
  [JobType.CONTENT_INDEXING]: Record<string, unknown>;
  [JobType.USER_ONBOARDING]: Record<string, unknown>;
  [JobType.ACCOUNT_CLEANUP]: Record<string, unknown>;
  [JobType.DATABASE_BACKUP]: Record<string, unknown>;
  [JobType.CACHE_MAINTENANCE]: Record<string, unknown>;
  [JobType.REPORT_GENERATION]: Record<string, unknown>;
}
