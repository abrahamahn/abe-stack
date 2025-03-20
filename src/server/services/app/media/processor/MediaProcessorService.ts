import { promises as fs } from "fs";

import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";

import { Media } from "@database/models/media";
import { MediaRepository } from "@database/repositories";
import { BaseService } from "@services/shared";
import { ValidationError } from "@services/shared/errors/ServiceError";
import { MetricsService } from "@services/shared/monitoring";

// Constants for processing
const THUMBNAIL_SIZE = {
  width: 300,
  height: 300,
};

const VIDEO_FORMATS = {
  HLS: "hls",
  DASH: "dash",
  MP4: "mp4",
  WEBM: "webm",
} as const;

const AUDIO_FORMATS = {
  MP3: "mp3",
  WAV: "wav",
  AAC: "aac",
  OGG: "ogg",
} as const;

const IMAGE_FORMATS = {
  JPEG: "jpeg",
  WEBP: "webp",
  AVIF: "avif",
  PNG: "png",
} as const;

// Quality constraints
const QUALITY_CONSTRAINTS = {
  MIN_IMAGE_QUALITY: 20,
  MAX_IMAGE_QUALITY: 100,
  MIN_VIDEO_BITRATE: "500k",
  MAX_VIDEO_BITRATE: "8000k",
  MIN_AUDIO_BITRATE: "64k",
  MAX_AUDIO_BITRATE: "320k",
  MAX_IMAGE_DIMENSION: 4096,
  MIN_IMAGE_DIMENSION: 16,
} as const;

type VideoFormat = keyof typeof VIDEO_FORMATS;
type AudioFormat = keyof typeof AUDIO_FORMATS;
type ImageFormat = keyof typeof IMAGE_FORMATS;

interface ProcessingOptions {
  generateThumbnail?: boolean;
  optimizeForWeb?: boolean;
  convertToFormat?: string;
  quality?: number;
  resize?: {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill";
  };
}

interface VideoProcessingOptions extends ProcessingOptions {
  generateStreamingFormats?: boolean;
  videoBitrate?: string;
  audioBitrate?: string;
  keyframeInterval?: number;
  extractAudio?: boolean;
}

interface AudioProcessingOptions extends ProcessingOptions {
  normalize?: boolean;
  trim?: {
    start?: number;
    end?: number;
  };
  fadeIn?: number;
  fadeOut?: number;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

interface VideoMetadata {
  format: {
    duration: number;
    size: number;
    bit_rate: number;
  };
  streams: Array<{
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    bit_rate?: string;
    sample_rate?: number;
    channels?: number;
  }>;
}

interface AudioMetadata {
  format: {
    duration: number;
    size: number;
    bit_rate: number;
  };
  streams: Array<{
    codec_type: string;
    codec_name: string;
    sample_rate: number;
    channels: number;
    bit_rate?: string;
  }>;
}

interface MetricsData {
  mediaId: string;
  duration?: number;
  originalSize?: number;
  processedSize?: number;
  [key: string]: unknown;
}

/**
 * Service responsible for processing media files.
 * Features:
 * 1. Image resizing and optimization
 * 2. Video transcoding and format conversion
 * 3. Audio processing and enhancement
 * 4. Thumbnail generation
 * 5. Streaming optimization
 * 6. Performance metrics tracking
 */
export class MediaProcessorService extends BaseService {
  constructor(
    private mediaRepository: MediaRepository,
    private metricsService: MetricsService,
  ) {
    super("MediaProcessorService");
  }

  /**
   * Process an image with specified options
   *
   * @param media - Media object to process
   * @param buffer - Original image buffer
   * @param options - Processing options
   * @returns Processed image buffer and metadata
   */
  async processImage(
    media: Media,
    buffer: Buffer,
    options: ProcessingOptions = {},
  ): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> {
    try {
      // Validate input
      if (!buffer || buffer.length === 0) {
        throw new ValidationError("Empty image buffer provided");
      }

      // Validate quality
      if (options.quality) {
        if (
          options.quality < QUALITY_CONSTRAINTS.MIN_IMAGE_QUALITY ||
          options.quality > QUALITY_CONSTRAINTS.MAX_IMAGE_QUALITY
        ) {
          throw new ValidationError(
            `Image quality must be between ${QUALITY_CONSTRAINTS.MIN_IMAGE_QUALITY} and ${QUALITY_CONSTRAINTS.MAX_IMAGE_QUALITY}`,
          );
        }
      }

      // Validate dimensions
      if (options.resize) {
        if (options.resize.width) {
          if (
            options.resize.width < QUALITY_CONSTRAINTS.MIN_IMAGE_DIMENSION ||
            options.resize.width > QUALITY_CONSTRAINTS.MAX_IMAGE_DIMENSION
          ) {
            throw new ValidationError(
              `Image width must be between ${QUALITY_CONSTRAINTS.MIN_IMAGE_DIMENSION} and ${QUALITY_CONSTRAINTS.MAX_IMAGE_DIMENSION}`,
            );
          }
        }
        if (options.resize.height) {
          if (
            options.resize.height < QUALITY_CONSTRAINTS.MIN_IMAGE_DIMENSION ||
            options.resize.height > QUALITY_CONSTRAINTS.MAX_IMAGE_DIMENSION
          ) {
            throw new ValidationError(
              `Image height must be between ${QUALITY_CONSTRAINTS.MIN_IMAGE_DIMENSION} and ${QUALITY_CONSTRAINTS.MAX_IMAGE_DIMENSION}`,
            );
          }
        }
      }

      let processor = sharp(buffer);
      const metadata = await processor.metadata();

      // Resize if specified
      if (options.resize) {
        processor = processor.resize(
          options.resize.width,
          options.resize.height,
          {
            fit: options.resize.fit || "cover",
            withoutEnlargement: true,
          },
        );
      }

      // Optimize for web if requested
      if (options.optimizeForWeb) {
        processor = processor.jpeg({ quality: options.quality || 80 });
      }

      // Convert format if specified
      if (options.convertToFormat) {
        const format = options.convertToFormat.toUpperCase() as ImageFormat;
        if (format in IMAGE_FORMATS) {
          processor = processor[IMAGE_FORMATS[format]]({
            quality: options.quality || 80,
          });
        } else {
          throw new ValidationError(
            `Unsupported image format: ${options.convertToFormat}`,
          );
        }
      }

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        const thumbnail = await this.generateThumbnail(buffer);
        await fs.mkdir("thumbnails", { recursive: true });
        await fs.writeFile(`thumbnails/${media.id}.jpg`, thumbnail);
        await this.mediaRepository.update(media.id, {
          thumbnailUrl: `thumbnails/${media.id}.jpg`,
        });
      }

      const processedBuffer = await processor.toBuffer();

      // Track metrics
      await this.recordMetrics("image_processing", {
        mediaId: media.id,
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      });

      return {
        buffer: processedBuffer,
        metadata,
      };
    } catch (error) {
      this.logger.error("Error processing image", {
        mediaId: media.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Process a video with specified options
   *
   * @param media - Media object to process
   * @param inputPath - Path to input video file
   * @param options - Video processing options
   * @returns Processed video path and metadata
   */
  async processVideo(
    media: Media,
    inputPath: string,
    options: VideoProcessingOptions = {},
  ): Promise<{ outputPath: string; metadata: VideoMetadata }> {
    try {
      // Validate input
      if (!(await this.fileExists(inputPath))) {
        throw new ValidationError("Input video file does not exist");
      }

      // Validate bitrates
      if (
        options.videoBitrate &&
        !this.isValidBitrate(
          options.videoBitrate,
          QUALITY_CONSTRAINTS.MIN_VIDEO_BITRATE,
          QUALITY_CONSTRAINTS.MAX_VIDEO_BITRATE,
        )
      ) {
        throw new ValidationError(
          `Video bitrate must be between ${QUALITY_CONSTRAINTS.MIN_VIDEO_BITRATE} and ${QUALITY_CONSTRAINTS.MAX_VIDEO_BITRATE}`,
        );
      }
      if (
        options.audioBitrate &&
        !this.isValidBitrate(
          options.audioBitrate,
          QUALITY_CONSTRAINTS.MIN_AUDIO_BITRATE,
          QUALITY_CONSTRAINTS.MAX_AUDIO_BITRATE,
        )
      ) {
        throw new ValidationError(
          `Audio bitrate must be between ${QUALITY_CONSTRAINTS.MIN_AUDIO_BITRATE} and ${QUALITY_CONSTRAINTS.MAX_AUDIO_BITRATE}`,
        );
      }

      const outputPath = `processed/${media.id}/video`;
      await fs.mkdir(outputPath, { recursive: true });

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        await this.generateVideoThumbnail(inputPath, media.id);
      }

      // Process video based on options
      if (options.generateStreamingFormats) {
        await this.generateStreamingFormats(inputPath, outputPath, options);
      } else {
        await this.transcodeVideo(inputPath, outputPath, options);
      }

      // Track metrics
      await this.recordMetrics("video_processing", {
        mediaId: media.id,
        duration: metadata.format.duration,
        originalSize: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        hasAudio: metadata.streams.some((s) => s.codec_type === "audio"),
        hasVideo: metadata.streams.some((s) => s.codec_type === "video"),
      });

      return {
        outputPath,
        metadata,
      };
    } catch (error) {
      this.logger.error("Error processing video", {
        mediaId: media.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Process an audio file with specified options
   *
   * @param media - Media object to process
   * @param inputPath - Path to input audio file
   * @param options - Audio processing options
   * @returns Processed audio path and metadata
   */
  async processAudio(
    media: Media,
    inputPath: string,
    options: AudioProcessingOptions = {},
  ): Promise<{ outputPath: string; metadata: AudioMetadata }> {
    try {
      // Validate input
      if (!(await this.fileExists(inputPath))) {
        throw new ValidationError("Input audio file does not exist");
      }

      // Validate bitrate
      if (
        options.bitrate &&
        !this.isValidBitrate(
          options.bitrate,
          QUALITY_CONSTRAINTS.MIN_AUDIO_BITRATE,
          QUALITY_CONSTRAINTS.MAX_AUDIO_BITRATE,
        )
      ) {
        throw new ValidationError(
          `Audio bitrate must be between ${QUALITY_CONSTRAINTS.MIN_AUDIO_BITRATE} and ${QUALITY_CONSTRAINTS.MAX_AUDIO_BITRATE}`,
        );
      }

      const outputPath = `processed/${media.id}/audio`;
      await fs.mkdir(outputPath, { recursive: true });

      const metadata = await this.getAudioMetadata(inputPath);

      let command = ffmpeg(inputPath);

      // Apply audio processing options
      if (options.normalize) {
        command = command.audioFilters("loudnorm");
      }

      if (options.trim) {
        if (options.trim.start) {
          command = command.setStartTime(options.trim.start);
        }
        if (options.trim.end) {
          command = command.setDuration(
            options.trim.end - (options.trim.start || 0),
          );
        }
      }

      if (options.fadeIn) {
        command = command.audioFilters(`afade=t=in:st=0:d=${options.fadeIn}`);
      }

      if (options.fadeOut) {
        const duration = metadata.format.duration;
        command = command.audioFilters(
          `afade=t=out:st=${duration - options.fadeOut}:d=${options.fadeOut}`,
        );
      }

      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }

      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }

      if (options.channels) {
        command = command.audioChannels(options.channels);
      }

      // Process audio
      await new Promise<void>((resolve, reject) => {
        command
          .output(
            `${outputPath}/output.${options.convertToFormat ? AUDIO_FORMATS[options.convertToFormat.toUpperCase() as AudioFormat] || "mp3" : AUDIO_FORMATS.MP3}`,
          )
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });

      // Track metrics
      await this.recordMetrics("audio_processing", {
        mediaId: media.id,
        duration: metadata.format.duration,
        originalSize: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        sampleRate: metadata.streams[0]?.sample_rate,
        channels: metadata.streams[0]?.channels,
      });

      return {
        outputPath,
        metadata,
      };
    } catch (error) {
      this.logger.error("Error processing audio", {
        mediaId: media.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a thumbnail for an image
   *
   * @param buffer - Original image buffer
   * @returns Thumbnail buffer
   */
  private async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Generate a thumbnail from a video
   *
   * @param inputPath - Path to input video
   * @param mediaId - ID of the media
   * @returns Path to generated thumbnail
   */
  private async generateVideoThumbnail(
    inputPath: string,
    mediaId: string,
  ): Promise<string> {
    const thumbnailPath = `thumbnails/${mediaId}.jpg`;
    await fs.mkdir("thumbnails", { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ["10%"],
          filename: thumbnailPath,
          size: `${THUMBNAIL_SIZE.width}x${THUMBNAIL_SIZE.height}`,
        })
        .on("end", () => resolve(thumbnailPath))
        .on("error", (err) => reject(err));
    });
  }

  /**
   * Generate streaming formats (HLS/DASH) for a video
   *
   * @param inputPath - Path to input video
   * @param outputPath - Base path for output files
   * @param options - Processing options
   */
  private async generateStreamingFormats(
    inputPath: string,
    outputPath: string,
    _options: VideoProcessingOptions,
  ): Promise<void> {
    const hlsPath = `${outputPath}/${VIDEO_FORMATS.HLS}`;
    const dashPath = `${outputPath}/${VIDEO_FORMATS.DASH}`;

    await Promise.all([
      fs.mkdir(hlsPath, { recursive: true }),
      fs.mkdir(dashPath, { recursive: true }),
    ]);

    await Promise.all([
      // Generate HLS
      new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-hls_time 10",
            "-hls_list_size 0",
            "-hls_segment_filename",
            `${hlsPath}/%03d.ts`,
          ])
          .output(`${hlsPath}/playlist.m3u8`)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      }),

      // Generate DASH
      new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            `-f ${VIDEO_FORMATS.DASH}`,
            "-seg_duration 10",
            "-use_template 1",
            "-use_timeline 1",
          ])
          .output(`${dashPath}/manifest.mpd`)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      }),
    ]);
  }

  /**
   * Transcode a video to different format/quality
   *
   * @param inputPath - Path to input video
   * @param outputPath - Path for output video
   * @param options - Processing options
   */
  private async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: VideoProcessingOptions,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (options.videoBitrate) {
        command = command.videoBitrate(options.videoBitrate);
      }

      if (options.audioBitrate) {
        command = command.audioBitrate(options.audioBitrate);
      }

      if (options.keyframeInterval) {
        command = command.outputOptions([`-g ${options.keyframeInterval}`]);
      }

      command
        .output(
          `${outputPath}/output.${options.convertToFormat ? VIDEO_FORMATS[options.convertToFormat.toUpperCase() as VideoFormat] || VIDEO_FORMATS.MP4 : VIDEO_FORMATS.MP4}`,
        )
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  /**
   * Get video metadata
   *
   * @param inputPath - Path to video file
   * @returns Video metadata
   */
  private async getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata as VideoMetadata);
      });
    });
  }

  /**
   * Get audio metadata
   *
   * @param inputPath - Path to audio file
   * @returns Audio metadata
   */
  private async getAudioMetadata(inputPath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata as AudioMetadata);
      });
    });
  }

  /**
   * Record metrics for media processing
   *
   * @param operation - Name of the operation
   * @param data - Metrics data
   */
  private async recordMetrics(
    operation: string,
    _data: MetricsData,
  ): Promise<void> {
    this.metricsService.recordOperationDuration(
      `${operation}_time`,
      Date.now(),
    );
  }

  /**
   * Check if a file exists
   *
   * @param path - Path to file
   * @returns Whether file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate bitrate string
   *
   * @param bitrate - Bitrate string to validate
   * @param min - Minimum allowed bitrate
   * @param max - Maximum allowed bitrate
   * @returns Whether bitrate is valid
   */
  private isValidBitrate(bitrate: string, min: string, max: string): boolean {
    const value = parseInt(bitrate);
    const minValue = parseInt(min);
    const maxValue = parseInt(max);
    return value >= minValue && value <= maxValue;
  }
}
