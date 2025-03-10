import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { ServerEnvironment } from './ServerEnvironment';

interface ImageSize {
  width: number;
  height: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
}

class MediaProcessingService {
  private uploadDir: string;
  private environment: ServerEnvironment;
  
  // Max dimensions for different image sizes
  private readonly IMAGE_SIZES = {
    original: { width: 2048, height: 2048 },
    large: { width: 1080, height: 1080 },
    medium: { width: 750, height: 750 },
    thumbnail: { width: 320, height: 320 },
    profile: { width: 320, height: 320 }
  };
  
  // Max dimensions and bitrates for different video sizes
  private readonly VIDEO_SIZES = {
    hd: { width: 1280, height: 720, bitrate: '2500k' },
    sd: { width: 640, height: 480, bitrate: '1000k' },
    mobile: { width: 480, height: 360, bitrate: '500k' }
  };
  
  constructor(environment: ServerEnvironment) {
    this.environment = environment;
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDirectories();
  }
  
  private ensureDirectories() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'images', 'original'),
      path.join(this.uploadDir, 'images', 'large'),
      path.join(this.uploadDir, 'images', 'medium'),
      path.join(this.uploadDir, 'images', 'thumbnail'),
      path.join(this.uploadDir, 'videos', 'original'),
      path.join(this.uploadDir, 'videos', 'hd'),
      path.join(this.uploadDir, 'videos', 'sd'),
      path.join(this.uploadDir, 'videos', 'mobile'),
      path.join(this.uploadDir, 'videos', 'thumbnails')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  /**
   * Process an image file: resize and optimize for different screen sizes
   */
  async processImage(filePath: string, userId: string): Promise<{
    imageId: string;
    paths: Record<string, string>;
    dimensions: ImageSize;
  }> {
    try {
      // Generate a unique ID for the image
      const imageId = uuidv4();
      const ext = 'jpg'; // Convert all images to JPEG for consistency
      
      // Get image metadata
      const metadata = await sharp(filePath).metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;
      
      // Process and save at different sizes
      const paths: Record<string, string> = {};
      
      // Process each size
      for (const [size, dimensions] of Object.entries(this.IMAGE_SIZES)) {
        const outputPath = path.join(
          this.uploadDir, 
          'images', 
          size, 
          `${imageId}.${ext}`
        );
        
        await sharp(filePath)
          .resize({
            width: dimensions.width,
            height: dimensions.height,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: size === 'original' ? 95 : 85 })
          .toFile(outputPath);
          
        paths[size] = outputPath;
      }
      
      return {
        imageId,
        paths,
        dimensions: {
          width: originalWidth,
          height: originalHeight
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }
  
  /**
   * Process a video file: generate thumbnails, transcode to multiple qualities
   */
  async processVideo(filePath: string, userId: string): Promise<{
    videoId: string;
    paths: Record<string, string>;
    thumbnailPath: string;
    metadata: VideoMetadata;
  }> {
    try {
      // Generate a unique ID for the video
      const videoId = uuidv4();
      const outputExt = 'mp4'; // Convert all videos to MP4
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(filePath);
      
      // Process thumbnail
      const thumbnailPath = path.join(
        this.uploadDir,
        'videos',
        'thumbnails',
        `${videoId}.jpg`
      );
      
      await this.generateVideoThumbnail(filePath, thumbnailPath, metadata.duration / 3);
      
      // Process and save at different sizes
      const paths: Record<string, string> = {};
      
      // Save original
      const originalPath = path.join(
        this.uploadDir,
        'videos',
        'original',
        `${videoId}.${outputExt}`
      );
      
      // Copy original if it's already MP4, otherwise convert
      if (path.extname(filePath).toLowerCase() === '.mp4') {
        await fsPromises.copyFile(filePath, originalPath);
      } else {
        await this.transcodeVideo(filePath, originalPath, {
          width: metadata.width,
          height: metadata.height,
          bitrate: '0' // Use original bitrate
        });
      }
      
      paths.original = originalPath;
      
      // Process each size
      for (const [size, dimensions] of Object.entries(this.VIDEO_SIZES)) {
        const outputPath = path.join(
          this.uploadDir,
          'videos',
          size,
          `${videoId}.${outputExt}`
        );
        
        await this.transcodeVideo(filePath, outputPath, dimensions);
        paths[size] = outputPath;
      }
      
      return {
        videoId,
        paths,
        thumbnailPath,
        metadata
      };
    } catch (error) {
      console.error('Error processing video:', error);
      throw new Error('Failed to process video');
    }
  }
  
  /**
   * Generate thumbnail from video at specified time
   */
  private async generateVideoThumbnail(
    inputPath: string,
    outputPath: string,
    timeInSeconds: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '480x?'
        })
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });
  }
  
  /**
   * Transcode video to specified size and quality
   */
  private async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: { width: number; height: number; bitrate: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpegCommand = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .size(`${options.width}x?`)
        .aspectRatio('16:9')
        .autopad()
        .videoBitrate(options.bitrate)
        .audioCodec('aac')
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-pix_fmt yuv420p', // For compatibility
          '-movflags +faststart', // For web streaming
          '-preset medium', // Balance between speed and quality
          '-profile:v main', // Good compatibility
          '-crf 23' // Constant quality factor (lower is better)
        ]);
      
      // Execute the command
      ffmpegCommand
        .on('error', (err) => {
          console.error('Error transcoding video:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .run();
    });
  }
  
  /**
   * Get video metadata
   */
  private getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('Error getting video metadata:', err);
          return reject(err);
        }
        
        // Find video stream
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }
        
        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name ?? '',
          bitrate: parseInt(String(metadata.format.bit_rate ?? '0'), 10) || 0
        });
      });
    });
  }
  
  /**
   * Process a carousel of images
   */
  async processCarousel(
    filePaths: string[],
    userId: string
  ): Promise<{
    carouselId: string;
    items: Array<{
      imageId: string;
      paths: Record<string, string>;
      dimensions: ImageSize;
    }>;
  }> {
    try {
      const carouselId = uuidv4();
      const items = [];
      
      for (const filePath of filePaths) {
        const processedImage = await this.processImage(filePath, userId);
        items.push(processedImage);
      }
      
      return {
        carouselId,
        items
      };
    } catch (error) {
      console.error('Error processing carousel:', error);
      throw new Error('Failed to process carousel');
    }
  }
}

export default MediaProcessingService; 