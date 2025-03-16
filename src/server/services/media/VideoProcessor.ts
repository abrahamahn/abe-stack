import path from 'path';

import ffmpeg from 'fluent-ffmpeg';

import { MediaType, ProcessingStatus, VideoMetadata } from '../../types/media.types';

import { BaseMediaProcessor, BaseProcessingResult } from './BaseMediaProcessor';

/**
 * Video processing result interface
 */
export interface VideoProcessingResult extends BaseProcessingResult {
  thumbnailPath: string;
  hlsPath?: string;
  dashPath?: string;
  metadata: VideoMetadata;
}

/**
 * Video processing options
 */
export interface VideoProcessingOptions {
  generateHLS?: boolean;
  generateDASH?: boolean;
  generateThumbnail?: boolean;
  thumbnailTime?: number;
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Video quality presets
 */
const QUALITY_PRESETS = {
  low: {
    videoBitrate: '800k',
    audioBitrate: '96k',
    maxWidth: 640,
    maxHeight: 360
  },
  medium: {
    videoBitrate: '1500k',
    audioBitrate: '128k',
    maxWidth: 1280,
    maxHeight: 720
  },
  high: {
    videoBitrate: '3000k',
    audioBitrate: '192k',
    maxWidth: 1920,
    maxHeight: 1080
  }
};

/**
 * Video processor class for handling video processing operations
 */
export class VideoProcessor extends BaseMediaProcessor {
  constructor(uploadDir: string) {
    super(path.join(uploadDir, 'videos'), 'VideoProcessor');
  }
  
  /**
   * Process a video file
   */
  public async process(filePath: string, options?: VideoProcessingOptions): Promise<VideoProcessingResult> {
    const mediaId = this.generateFileId();
    const opts = this.getProcessingOptions(options);
    
    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(filePath);
      
      // Create output directory
      const outputDir = path.join(this.uploadDir, mediaId);
      await this.ensureDirectoryExists(outputDir);
      
      // Process video
      const paths: Record<string, string> = {
        original: filePath
      };
      
      // Generate thumbnail
      let thumbnailPath = '';
      if (opts.generateThumbnail) {
        thumbnailPath = await this.generateThumbnail(
          filePath,
          outputDir,
          opts.thumbnailTime
        );
        paths.thumbnail = thumbnailPath;
      }
      
      // Generate HLS
      if (opts.generateHLS) {
        const hlsPath = await this.generateHLS(
          filePath,
          outputDir,
          opts
        );
        paths.hls = hlsPath;
      }
      
      // Generate DASH
      if (opts.generateDASH) {
        const dashPath = await this.generateDASH(
          filePath,
          outputDir,
          opts
        );
        paths.dash = dashPath;
      }
      
      return {
        mediaId,
        paths,
        thumbnailPath,
        hlsPath: paths.hls,
        dashPath: paths.dash,
        metadata,
        status: ProcessingStatus.COMPLETED
      };
    } catch (error) {
      this.logger.error(`Failed to process video: ${filePath}`, { error });
      return {
        mediaId,
        paths: { original: filePath },
        thumbnailPath: '',
        metadata: {
          width: 0,
          height: 0,
          duration: 0,
          format: '',
          fileSize: 0,
          mimeType: '',
          bitrate: 0
        },
        status: ProcessingStatus.FAILED
      };
    }
  }
  
  /**
   * Get the media type
   */
  public getMediaType(): MediaType {
    return MediaType.VIDEO;
  }
  
  /**
   * Get video metadata
   */
  private getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }
        
        this.getFileSize(filePath)
          .then(fileSize => {
            resolve({
              width: videoStream.width || 0,
              height: videoStream.height || 0,
              duration: metadata.format.duration || 0,
              format: metadata.format.format_name || '',
              fileSize,
              mimeType: `video/${metadata.format.format_name}`,
              bitrate: parseInt(metadata.format.bit_rate?.toString() || '0', 10),
              fps: videoStream.r_frame_rate && typeof videoStream.r_frame_rate === 'string'
                ? Number((videoStream.r_frame_rate.split('/').map(Number).reduce((a, b) => a / b)).toFixed(2))
                : undefined,
              codec: videoStream.codec_name
            });
          })
          .catch(reject);
      });
    });
  }
  
  /**
   * Generate a thumbnail from a video
   */
  private generateThumbnail(
    inputPath: string,
    outputDir: string,
    thumbnailTime?: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, 'thumbnail.jpg');
      
      ffmpeg(inputPath)
        .on('error', reject)
        .screenshots({
          timestamps: [thumbnailTime || 1],
          filename: 'thumbnail.jpg',
          folder: outputDir,
          size: '320x240'
        })
        .on('end', () => resolve(outputPath));
    });
  }
  
  /**
   * Generate HLS (HTTP Live Streaming) files
   */
  private generateHLS(
    inputPath: string,
    outputDir: string,
    options: Required<VideoProcessingOptions>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hlsDir = path.join(outputDir, 'hls');
      const playlistPath = path.join(hlsDir, 'playlist.m3u8');
      
      // Ensure HLS directory exists
      this.ensureDirectoryExists(hlsDir)
        .then(() => {
          const qualityPreset = QUALITY_PRESETS[options.quality];
          
          ffmpeg(inputPath)
            .outputOptions([
              '-profile:v main',
              '-c:v h264',
              '-c:a aac',
              `-b:v ${qualityPreset.videoBitrate}`,
              `-b:a ${qualityPreset.audioBitrate}`,
              '-f hls',
              '-hls_time 10',
              '-hls_playlist_type vod',
              '-hls_segment_filename',
              path.join(hlsDir, 'segment_%03d.ts')
            ])
            .output(playlistPath)
            .on('error', reject)
            .on('end', () => resolve(playlistPath))
            .run();
        })
        .catch(reject);
    });
  }
  
  /**
   * Generate DASH (Dynamic Adaptive Streaming over HTTP) files
   */
  private generateDASH(
    inputPath: string,
    outputDir: string,
    options: Required<VideoProcessingOptions>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const dashDir = path.join(outputDir, 'dash');
      const manifestPath = path.join(dashDir, 'manifest.mpd');
      
      // Ensure DASH directory exists
      this.ensureDirectoryExists(dashDir)
        .then(() => {
          const qualityPreset = QUALITY_PRESETS[options.quality];
          
          ffmpeg(inputPath)
            .outputOptions([
              '-profile:v main',
              '-c:v libx264',
              '-c:a aac',
              `-b:v ${qualityPreset.videoBitrate}`,
              `-b:a ${qualityPreset.audioBitrate}`,
              '-f dash',
              '-use_timeline 1',
              '-use_template 1',
              '-seg_duration 4',
              '-init_seg_name init-stream$RepresentationID$.m4s',
              '-media_seg_name chunk-stream$RepresentationID$-$Number%05d$.m4s'
            ])
            .output(manifestPath)
            .on('error', reject)
            .on('end', () => resolve(manifestPath))
            .run();
        })
        .catch(reject);
    });
  }
  
  /**
   * Get processing options with defaults
   */
  private getProcessingOptions(options?: VideoProcessingOptions): Required<VideoProcessingOptions> {
    return {
      generateHLS: options?.generateHLS ?? true,
      generateDASH: options?.generateDASH ?? false,
      generateThumbnail: options?.generateThumbnail ?? true,
      thumbnailTime: options?.thumbnailTime ?? 1,
      quality: options?.quality ?? 'medium',
      maxWidth: options?.maxWidth ?? 1920,
      maxHeight: options?.maxHeight ?? 1080
    };
  }
} 