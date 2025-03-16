import { promises as fsPromises } from 'fs';
import path from 'path';

import { MediaType } from '../../types/media.types';
import { Logger } from '../LoggerService';

import { AudioProcessor, AudioProcessingOptions, AudioProcessingResult } from './AudioProcessor';
import { BaseMediaProcessor } from './BaseMediaProcessor';
import { ImageProcessor, ImageProcessingOptions, ImageProcessingResult } from './ImageProcessor';
import { VideoProcessor, VideoProcessingOptions, VideoProcessingResult } from './VideoProcessor';
/**
 * Media processing options
 */
export type MediaProcessingOptions = 
  | { type: MediaType.IMAGE; options?: ImageProcessingOptions }
  | { type: MediaType.VIDEO; options?: VideoProcessingOptions }
  | { type: MediaType.AUDIO; options?: AudioProcessingOptions };

/**
 * Media processing result
 */
export type MediaProcessingResult = 
  | ImageProcessingResult
  | VideoProcessingResult
  | AudioProcessingResult;

/**
 * Unified media processing service that delegates to specialized processors
 * 
 * @example
 * ```typescript
 * const mediaService = MediaProcessingService.getInstance();
 * const result = await mediaService.processMedia(filePath, MediaType.AUDIO);
 * ```
 */
export class MediaProcessingService {
  private static instance: MediaProcessingService | null = null;
  private readonly logger: Logger;
  private readonly uploadDir: string;
  private readonly processors: Map<MediaType, BaseMediaProcessor>;
  
  private constructor(uploadDir: string) {
    this.logger = new Logger('MediaProcessingService');
    this.uploadDir = uploadDir;
    this.processors = new Map();
    
    // Initialize processors
    this.processors.set(MediaType.IMAGE, new ImageProcessor(uploadDir));
    this.processors.set(MediaType.VIDEO, new VideoProcessor(uploadDir));
    this.processors.set(MediaType.AUDIO, new AudioProcessor(uploadDir));
    
    this.logger.info('MediaProcessingService initialized with processors for all media types');
  }
  
  /**
   * Get the singleton instance of the MediaProcessingService
   * @param uploadDir Directory to store processed media files
   */
  public static getInstance(uploadDir = 'uploads'): MediaProcessingService {
    if (!MediaProcessingService.instance) {
      MediaProcessingService.instance = new MediaProcessingService(uploadDir);
    }
    return MediaProcessingService.instance;
  }
  
  /**
   * Process a media file based on its type
   * @param filePath Path to the media file
   * @param mediaType Type of media (image, video, audio)
   * @param options Processing options
   */
  public async processMedia(
    filePath: string,
    mediaType: MediaType,
    options?: Record<string, unknown>
  ): Promise<MediaProcessingResult> {
    const processor = this.getProcessor(mediaType);
    
    if (!processor) {
      throw new Error(`No processor available for media type: ${mediaType}`);
    }
    
    try {
      await this.ensureUploadDirectory();
      const result = await processor.process(filePath, options);
      return result as MediaProcessingResult;
    } catch (error) {
      this.logger.error(`Failed to process ${mediaType} file: ${filePath}`, { error });
      throw error;
    }
  }
  
  /**
   * Process an image file
   * @param filePath Path to the image file
   * @param options Image processing options
   */
  public async processImage(
    filePath: string,
    options?: ImageProcessingOptions
  ): Promise<ImageProcessingResult> {
    return this.processMedia(filePath, MediaType.IMAGE, options as Record<string, unknown>) as Promise<ImageProcessingResult>;
  }
  
  /**
   * Process a video file
   * @param filePath Path to the video file
   * @param options Video processing options
   */
  public async processVideo(
    filePath: string,
    options?: VideoProcessingOptions
  ): Promise<VideoProcessingResult> {
    return this.processMedia(filePath, MediaType.VIDEO, options as Record<string, unknown>) as Promise<VideoProcessingResult>;
  }
  
  /**
   * Process an audio file
   * @param filePath Path to the audio file
   * @param options Audio processing options
   */
  public async processAudio(
    filePath: string,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    return this.processMedia(filePath, MediaType.AUDIO, options as Record<string, unknown>) as Promise<AudioProcessingResult>;
  }
  
  /**
   * Detect the media type based on file extension
   * @param filePath Path to the media file
   */
  public detectMediaType(filePath: string): MediaType {
    const ext = path.extname(filePath).toLowerCase();
    
    // Image extensions
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
      return MediaType.IMAGE;
    }
    
    // Video extensions
    if (['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'].includes(ext)) {
      return MediaType.VIDEO;
    }
    
    // Audio extensions
    if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'].includes(ext)) {
      return MediaType.AUDIO;
    }
    
    throw new Error(`Unsupported file type: ${ext}`);
  }
  
  /**
   * Get the appropriate processor for a media type
   */
  private getProcessor(mediaType: MediaType): BaseMediaProcessor | undefined {
    return this.processors.get(mediaType);
  }
  
  /**
   * Ensure the upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    await fsPromises.mkdir(this.uploadDir, { recursive: true });
  }
} 