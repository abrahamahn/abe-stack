import { InMemoryQueue, Job, JobOptions, JobProcessor } from './InMemoryQueue';
import { Logger } from './LoggerService';

// Queue types
export const QueueTypes = {
  IMAGE_PROCESSING: 'image-processing',
  VIDEO_PROCESSING: 'video-processing',
  AUDIO_PROCESSING: 'audio-processing',
  NOTIFICATION: 'notification'
} as const;

export type QueueTypeKey = keyof typeof QueueTypes;
export type QueueTypeValue = typeof QueueTypes[QueueTypeKey];

// Job data interfaces
export interface ImageProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface VideoProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  options?: {
    generateHLS?: boolean;
    generateDASH?: boolean;
    quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface AudioProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  generateWaveform?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationJob {
  userId: string;
  type: string;
  message: string;
  data?: Record<string, string | number | boolean>;
}

type QueueJobType = {
  [QueueTypes.IMAGE_PROCESSING]: ImageProcessingJob;
  [QueueTypes.VIDEO_PROCESSING]: VideoProcessingJob;
  [QueueTypes.AUDIO_PROCESSING]: AudioProcessingJob;
  [QueueTypes.NOTIFICATION]: NotificationJob;
};

type AllJobTypes = ImageProcessingJob | VideoProcessingJob | AudioProcessingJob | NotificationJob;

/**
 * Service for managing background job queues
 */
export class QueueService {
  private static instance: QueueService;
  private queues: Map<QueueTypeValue, InMemoryQueue<AllJobTypes>> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('QueueService');
    
    // Initialize queues
    this.initializeQueue(QueueTypes.IMAGE_PROCESSING);
    this.initializeQueue(QueueTypes.VIDEO_PROCESSING);
    this.initializeQueue(QueueTypes.AUDIO_PROCESSING);
    this.initializeQueue(QueueTypes.NOTIFICATION);
    
    // Handle process events
    process.on('SIGTERM', () => void this.closeQueues());
    process.on('SIGINT', () => void this.closeQueues());
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize a queue with the given name
   */
  private initializeQueue<K extends QueueTypeValue>(queueType: K) {
    const queue = new InMemoryQueue<QueueJobType[K]>((job) => Promise.resolve(job));
    
    // Set up event handlers
    queue.on('error', (error) => {
      this.logger.error(`Error in ${queueType} queue:`, error);
    });
    
    queue.on('failed', (job: Job<QueueJobType[K]>, error) => {
      this.logger.error(`Job ${job.id} in ${queueType} queue failed:`, error);
    });
    
    queue.on('completed', (job: Job<QueueJobType[K]>) => {
      this.logger.debug(`Job ${job.id} in ${queueType} queue completed`);
    });
    
    this.queues.set(queueType, queue as unknown as InMemoryQueue<AllJobTypes>);
    return queue;
  }

  /**
   * Get a queue by type
   */
  public getQueue<K extends QueueTypeValue>(queueType: K): InMemoryQueue<QueueJobType[K]> | undefined {
    return this.queues.get(queueType) as InMemoryQueue<QueueJobType[K]> | undefined;
  }

  /**
   * Add an image processing job to the queue
   */
  public addImageProcessingJob(
    data: ImageProcessingJob,
    options?: JobOptions
  ): Job<ImageProcessingJob> {
    const queue = this.getQueue(QueueTypes.IMAGE_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueTypes.IMAGE_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add a video processing job to the queue
   */
  public addVideoProcessingJob(
    data: VideoProcessingJob,
    options?: JobOptions
  ): Job<VideoProcessingJob> {
    const queue = this.getQueue(QueueTypes.VIDEO_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueTypes.VIDEO_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add an audio processing job to the queue
   */
  public addAudioProcessingJob(
    data: AudioProcessingJob,
    options?: JobOptions
  ): Job<AudioProcessingJob> {
    const queue = this.getQueue(QueueTypes.AUDIO_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueTypes.AUDIO_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add a notification job to the queue
   */
  public addNotificationJob(
    data: NotificationJob,
    options?: JobOptions
  ): Job<NotificationJob> {
    const queue = this.getQueue(QueueTypes.NOTIFICATION);
    if (!queue) {
      throw new Error(`Queue ${QueueTypes.NOTIFICATION} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Register a processor for a queue
   */
  public registerProcessor<K extends QueueTypeValue>(
    queueType: K,
    processor: JobProcessor<QueueJobType[K]>
  ): void {
    const queue = this.getQueue(queueType);
    if (!queue) {
      throw new Error(`Queue ${queueType} not found`);
    }
    
    queue.process(processor);
    this.logger.info(`Processor registered for ${queueType} queue`);
  }

  /**
   * Close all queues
   */
  private async closeQueues(): Promise<void> {
    this.logger.info('Closing all queues');
    
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    
    this.logger.info('All queues closed');
  }
} 