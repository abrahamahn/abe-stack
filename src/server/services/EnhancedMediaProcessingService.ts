import { promises as fsPromises } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { Logger } from './LoggerService';
import { ImageProcessingJob, VideoProcessingJob, AudioProcessingJob } from './QueueService';
import { InMemoryQueue, Job } from './InMemoryQueue';
import { MediaType, ProcessingStatus } from '../types';
import { Media } from '../models/Media';

// Media processing result interfaces
export interface ImageProcessingResult {
  imageId: string;
  paths: Record<string, string>;
  dimensions: ImageSize;
  metadata: ImageMetadata;
}

export interface VideoProcessingResult {
  videoId: string;
  paths: Record<string, string>;
  hlsPath?: string;
  dashPath?: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
}

export interface AudioProcessingResult {
  audioId: string;
  paths: Record<string, string>;
  waveformPath?: string;
  metadata: AudioMetadata;
}

// Media metadata interfaces
export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageMetadata {
  format: string;
  size: number;
  dimensions: ImageSize;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
  fps?: number;
}

export interface AudioMetadata {
  duration: number;
  format: string;
  bitrate: number;
  sampleRate?: number;
  channels?: number;
}

interface ProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  options?: {
    generateHLS?: boolean;
    generateDASH?: boolean;
    generateWaveform?: boolean;
    quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
  };
}

/**
 * Enhanced service for processing media files (images, videos, audio)
 * with support for adaptive streaming formats
 */
export class EnhancedMediaProcessingService {
  private imageQueue: InMemoryQueue<ImageProcessingJob>;
  private videoQueue: InMemoryQueue<VideoProcessingJob>;
  private audioQueue: InMemoryQueue<AudioProcessingJob>;
  private logger: Logger;
  private readonly outputDir: string;
  
  
  // Video encoding presets for HLS
  private readonly HLS_PRESETS = [
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
    { name: '480p', width: 854, height: 480, bitrate: '1400k' },
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '240p', width: 426, height: 240, bitrate: '400k' }
  ];
  
  // Video encoding presets for DASH
  private readonly DASH_PRESETS = [
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
    { name: '480p', width: 854, height: 480, bitrate: '1400k' },
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '240p', width: 426, height: 240, bitrate: '400k' }
  ];
  
  constructor() {
    this.logger = new Logger('EnhancedMediaProcessingService');
    this.outputDir = path.join(process.cwd(), 'uploads');
    
    // Initialize in-memory queues with default processors
    this.imageQueue = new InMemoryQueue<ImageProcessingJob>(async (job) => {
      await this.processImage(job.data.mediaId, job.data.filePath);
    });
    
    this.videoQueue = new InMemoryQueue<VideoProcessingJob>(async (job) => {
      await this.processVideo(job.data.mediaId, job.data.filePath, job.data.options);
    });
    
    this.audioQueue = new InMemoryQueue<AudioProcessingJob>(async (job) => {
      await this.processAudio(job.data.mediaId, job.data.filePath, job.data.generateWaveform ?? true);
    });
    
    // Set up additional queue event handlers
    this.setupQueueProcessors();
  }
  
  /**
   * Queue an image for processing
   */
  public async queueImageProcessing(filePath: string, userId: string): Promise<string> {
    const media = await this.createMediaRecord(filePath, MediaType.IMAGE, userId);
    await this.imageQueue.add({ mediaId: media.id, filePath, userId });
    return media.id;
  }
  
  /**
   * Queue a video for processing
   */
  public async queueVideoProcessing(
    filePath: string, 
    userId: string, 
    options: { 
      generateHLS?: boolean;
      generateDASH?: boolean;
      quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
    } = { generateHLS: true }
  ): Promise<string> {
    const media = await this.createMediaRecord(filePath, MediaType.VIDEO, userId);
    await this.videoQueue.add({ 
      mediaId: media.id, 
      filePath, 
      userId,
      options
    });
    return media.id;
  }
  
  /**
   * Queue an audio file for processing
   */
  public async queueAudioProcessing(filePath: string, userId: string, generateWaveform: boolean = true): Promise<string> {
    const media = await this.createMediaRecord(filePath, MediaType.AUDIO, userId);
    await this.audioQueue.add({ 
      mediaId: media.id, 
      filePath, 
      userId,
      generateWaveform
    });
    return media.id;
  }
  
  private setupQueueProcessors() {
    // Image processing
    this.imageQueue.process(async (job: Job<ImageProcessingJob>) => {
      const { mediaId, filePath } = job.data;
      await this.processImage(mediaId, filePath);
    });

    // Video processing
    this.videoQueue.process(async (job: Job<VideoProcessingJob>) => {
      const { mediaId, filePath, options } = job.data;
      await this.processVideo(mediaId, filePath, options);
    });

    // Audio processing
    this.audioQueue.process(async (job: Job<AudioProcessingJob>) => {
      const { mediaId, filePath, generateWaveform } = job.data;
      await this.processAudio(mediaId, filePath, generateWaveform ?? true);
    });

    // Handle failed jobs
    [this.imageQueue, this.videoQueue, this.audioQueue].forEach(queue => {
      queue.on('failed', (job: Job<any>, err: Error) => {
        this.logger.error(`Job ${job.id} failed:`, err);
        this.updateMediaStatus(job.data.mediaId, ProcessingStatus.FAILED);
      });
    });
  }
  
  private async processImage(mediaId: string, filePath: string): Promise<void> {
    try {
      await this.updateMediaStatus(mediaId, ProcessingStatus.PROCESSING);

      const outputDir = path.join(this.outputDir, 'images', mediaId);
      await fsPromises.mkdir(outputDir, { recursive: true });

      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Generate different sizes
      const sizes = [
        { width: 2048, suffix: 'original' },
        { width: 1024, suffix: 'large' },
        { width: 768, suffix: 'medium' },
        { width: 480, suffix: 'small' },
        { width: 240, suffix: 'thumbnail' }
      ];

      await Promise.all(sizes.map(async ({ width, suffix }) => {
        const outputPath = path.join(outputDir, `${suffix}.webp`);
        await image
          .resize({ 
            width, 
            fit: 'inside' 
          })
          .webp({ quality: 80 })
          .toFile(outputPath);
      }));

      await this.updateMediaStatus(mediaId, ProcessingStatus.COMPLETED, {
        width: metadata.width,
        height: metadata.height
      });

    } catch (error) {
      this.logger.error('Image processing failed:', error);
      await this.updateMediaStatus(mediaId, ProcessingStatus.FAILED);
      throw error;
    }
  }
  
  private async processVideo(mediaId: string, filePath: string, options: ProcessingJob['options']): Promise<void> {
    try {
      await this.updateMediaStatus(mediaId, ProcessingStatus.PROCESSING);

      const outputDir = path.join(this.outputDir, 'videos', mediaId);
      await fsPromises.mkdir(outputDir, { recursive: true });

      // Get video metadata
      const metadata = await this.getVideoMetadata(filePath);

      if (options?.generateHLS) {
        const hlsDir = path.join(outputDir, 'hls');
        await fsPromises.mkdir(hlsDir, { recursive: true });
        await this.generateHLSStream(filePath, hlsDir, options.quality);
      }

      if (options?.generateDASH) {
        const dashDir = path.join(outputDir, 'dash');
        await fsPromises.mkdir(dashDir, { recursive: true });
        await this.generateDASHStream(filePath, dashDir, options.quality);
      }

      // Generate thumbnail
      const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
      await this.generateVideoThumbnail(filePath, thumbnailPath);

      // Generate preview GIF
      const previewPath = path.join(outputDir, 'preview.gif');
      await this.generateVideoPreview(filePath, previewPath);

      await this.updateMediaStatus(mediaId, ProcessingStatus.COMPLETED, {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        formats: {
          hls: options?.generateHLS || false,
          dash: options?.generateDASH || false,
          preview: true
        }
      });

    } catch (error) {
      this.logger.error('Video processing failed:', error);
      await this.updateMediaStatus(mediaId, ProcessingStatus.FAILED);
      throw error;
    }
  }
  
  private async processAudio(mediaId: string, filePath: string, generateWaveform: boolean): Promise<void> {
    try {
      await this.updateMediaStatus(mediaId, ProcessingStatus.PROCESSING);

      const outputDir = path.join(this.outputDir, 'audio', mediaId);
      await fsPromises.mkdir(outputDir, { recursive: true });

      // Get audio metadata
      const metadata = await this.getAudioMetadata(filePath);

      // Convert to MP3 if not already
      const mp3Path = path.join(outputDir, 'audio.mp3');
      await this.convertToMp3(filePath, mp3Path);

      if (generateWaveform) {
        const waveformPath = path.join(outputDir, 'waveform.json');
        await this.generateWaveformData(filePath, waveformPath);
      }

      await this.updateMediaStatus(mediaId, ProcessingStatus.COMPLETED, {
        duration: metadata.duration
      });

    } catch (error) {
      this.logger.error('Audio processing failed:', error);
      await this.updateMediaStatus(mediaId, ProcessingStatus.FAILED);
      throw error;
    }
  }
  
  private generateHLSStream(
    inputPath: string, 
    outputDir: string, 
    qualities?: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const presets = qualities 
        ? this.HLS_PRESETS.filter(p => qualities.includes(p.name))
        : this.HLS_PRESETS;

      const command = ffmpeg(inputPath);

      // Generate variant streams
      presets.forEach((preset) => {
        command
          .output(path.join(outputDir, `${preset.name}.m3u8`))
          .addOption('-map', '0:v')
          .addOption('-map', '0:a')
          .addOption('-c:a', 'aac')
          .addOption('-ar', '48000')
          .addOption('-c:v', 'libx264')
          .addOption('-profile:v', 'main')
          .addOption('-crf', '20')
          .addOption('-sc_threshold', '0')
          .addOption('-g', '48')
          .addOption('-keyint_min', '48')
          .addOption('-hls_time', '6')
          .addOption('-hls_playlist_type', 'vod')
          .addOption('-b:v', preset.bitrate)
          .addOption('-maxrate', preset.bitrate)
          .addOption('-bufsize', `${parseInt(preset.bitrate)}*2`)
          .addOption('-hls_segment_filename', path.join(outputDir, `${preset.name}_%03d.ts`))
          .size(`${preset.width}x${preset.height}`);
      });

      // Generate master playlist
      command
        .output(path.join(outputDir, 'master.m3u8'))
        .addOption('-f', 'hls')
        .addOption('-var_stream_map', this.generateStreamMap(presets.length))
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  private generateDASHStream(
    inputPath: string, 
    outputDir: string,
    qualities?: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const presets = qualities 
        ? this.DASH_PRESETS.filter(p => qualities.includes(p.name))
        : this.DASH_PRESETS;

      const command = ffmpeg(inputPath);

      // Generate variant streams
      presets.forEach((preset) => {
        command
          .output(path.join(outputDir, `${preset.name}.mp4`))
          .addOption('-map', '0:v')
          .addOption('-map', '0:a')
          .addOption('-c:a', 'aac')
          .addOption('-ar', '48000')
          .addOption('-c:v', 'libx264')
          .addOption('-profile:v', 'main')
          .addOption('-crf', '23')
          .addOption('-bf', '1')
          .addOption('-keyint_min', '48')
          .addOption('-g', '48')
          .addOption('-sc_threshold', '0')
          .addOption('-b:v', preset.bitrate)
          .addOption('-maxrate', preset.bitrate)
          .addOption('-bufsize', `${parseInt(preset.bitrate)}*2`)
          .size(`${preset.width}x${preset.height}`);
      });

      // Generate DASH manifest
      command
        .output(path.join(outputDir, 'manifest.mpd'))
        .addOption('-f', 'dash')
        .addOption('-use_timeline', '1')
        .addOption('-use_template', '1')
        .addOption('-min_seg_duration', '2000')
        .addOption('-adaptation_sets', 'id=0,streams=v id=1,streams=a')
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  private generateVideoThumbnail(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['50%'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath)
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private generateVideoPreview(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
          '-t', '3'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  private generateStreamMap(streamCount: number): string {
    let map = '';
    for (let i = 0; i < streamCount; i++) {
      map += `v:${i},a:${i} `;
    }
    return map.trim();
  }
  
  private generateWaveformData(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .on('end', async () => {
          try {
            const waveformData = Array.from({ length: 100 }, () => Math.random());
            await fsPromises.writeFile(outputPath, JSON.stringify(waveformData), 'utf8');
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .pipe();
    });
  }
  
  private convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }
  
  private async getVideoMetadata(filePath: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        const stream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          width: stream?.width || 0,
          height: stream?.height || 0,
          duration: metadata.format.duration || 0
        });
      });
    });
  }
  
  private async getAudioMetadata(filePath: string): Promise<{ duration: number; sampleRate: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        const stream = metadata.streams.find(s => s.codec_type === 'audio');
        resolve({
          duration: metadata.format.duration || 0,
          sampleRate: parseInt(String(stream?.sample_rate || '44100'))
        });
      });
    });
  }
  
  private async createMediaRecord(filePath: string, type: MediaType, userId: string): Promise<Media> {
    const stats = await fsPromises.stat(filePath);
    return await Media.create({
      userId,
      type,
      originalFilename: path.basename(filePath),
      filename: path.basename(filePath),
      path: filePath,
      mimeType: this.getMimeType(filePath),
      size: stats.size,
      processingStatus: ProcessingStatus.PENDING,
      isPublic: false,
      width: 0,
      height: 0,
      duration: 0,
      thumbnailPath: '',
      metadata: {},
      processingJobId: '' // Added missing required field
    });
  }
  
  private async updateMediaStatus(mediaId: string, status: ProcessingStatus, metadata?: object): Promise<void> {
    const media = await Media.findByPk(mediaId);
    if (!media) return;
    await media.update(
      { 
        processingStatus: status,
        ...(metadata ? { metadata } : {})
      }
    );
  }
  
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 