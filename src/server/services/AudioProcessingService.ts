import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import * as mm from 'music-metadata';
import sharp from 'sharp';
import { ServerEnvironment } from './ServerEnvironment';

class AudioProcessingService {
  private uploadDir: string;
  private environment: ServerEnvironment;
  
  constructor(environment: ServerEnvironment) {
    this.environment = environment;
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDirectories();
  }
  
  private ensureDirectories() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'audio'),
      path.join(this.uploadDir, 'audio', 'original'),
      path.join(this.uploadDir, 'audio', 'processed'),
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'images', 'covers'),
      path.join(this.uploadDir, 'images', 'thumbnails'),
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  /**
   * Process an audio file: extract metadata, convert to standard formats, extract cover art
   */
  async processAudioFile(filePath: string, userId: string): Promise<{
    trackInfo: any;
    audioPath: string;
    coverArtPath?: string;
  }> {
    try {
      // Extract metadata from the original file
      const metadata = await this.extractMetadata(filePath);
      
      // Generate unique filenames
      const fileId = uuidv4();
      const originalExt = path.extname(filePath);
      const mp3OutputPath = path.join(this.uploadDir, 'audio', 'processed', `${fileId}.mp3`);
      
      // Extract and save cover art if available
      let coverArtPath: string | undefined;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        coverArtPath = await this.saveCoverArt(metadata.common.picture[0], fileId);
      }
      
      // Transcode to MP3 format for universal compatibility
      await this.transcodeToMp3(filePath, mp3OutputPath);
      
      // Create track info object
      const trackInfo = {
        title: metadata.common.title || path.basename(filePath, originalExt),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        genre: metadata.common.genre ? metadata.common.genre[0] : undefined,
        year: metadata.common.year,
        duration: metadata.format.duration || 0,
        fileSize: fs.statSync(mp3OutputPath).size,
        fileId,
        userId,
        originalFormat: metadata.format.container,
        sampleRate: metadata.format.sampleRate,
        bitrate: metadata.format.bitrate,
      };
      
      return {
        trackInfo,
        audioPath: mp3OutputPath,
        coverArtPath,
      };
    } catch (error) {
      console.error('Error processing audio file:', error);
      throw new Error('Failed to process audio file');
    }
  }
  
  /**
   * Extract metadata from an audio file
   */
  private async extractMetadata(filePath: string): Promise<mm.IAudioMetadata> {
    try {
      return await mm.parseFile(filePath);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw new Error('Failed to extract metadata');
    }
  }
  
  /**
   * Transcode file to MP3 format for better compatibility
   */
  private transcodeToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioBitrate(192)
        .format('mp3')
        .on('error', (err) => {
          console.error('Error transcoding file:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .save(outputPath);
    });
  }
  
  /**
   * Save the cover art from metadata to a file
   */
  private async saveCoverArt(picture: mm.IPicture, fileId: string): Promise<string> {
    const coverArtPath = path.join(this.uploadDir, 'covers', `${fileId}.${picture.format}`);
    const thumbnailPath = path.join(this.uploadDir, 'covers', `${fileId}_thumb.jpg`);
    
    await fs.ensureDir(path.dirname(coverArtPath));
    await fs.writeFile(coverArtPath, picture.data);
    
    // Create thumbnail - convert Uint8Array to Buffer
    const buffer = Buffer.from(picture.data);
    await sharp(buffer)
      .resize({ width: 300, height: 300, fit: 'contain' })
      .jpeg({ quality: 90 })
      .toFile(thumbnailPath);
      
    return coverArtPath;
  }
  
  /**
   * Generate waveform data for visualizations
   */
  async generateWaveformData(audioPath: string): Promise<number[]> {
    // This would typically use a library like audiowaveform, web-audio-api, etc.
    // For simplicity, returning a mock waveform
    return Array.from({ length: 100 }, () => Math.random());
  }
  
  /**
   * Create a streamable audio segment
   */
  async createStreamableSegment(audioPath: string, start: number, duration: number): Promise<string> {
    const segmentId = uuidv4();
    const outputPath = path.join(this.uploadDir, 'audio', 'processed', `${segmentId}.mp3`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .noVideo()
        .setStartTime(start)
        .setDuration(duration)
        .audioBitrate(192)
        .format('mp3')
        .on('error', (err) => {
          console.error('Error creating streamable segment:', err);
          reject(err);
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  async extractAndSaveAlbumArt(audioPath: string, outputPath: string): Promise<boolean> {
    try {
      const metadata = await mm.parseFile(audioPath);
      
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        
        // Convert Uint8Array to Buffer
        const buffer = Buffer.from(picture.data);
        
        // Use sharp with proper parameters
        await sharp(buffer)
          .resize({ width: 300, height: 300, fit: 'contain' })
          .toFile(outputPath);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to extract album art:', error);
      return false;
    }
  }
}

export default AudioProcessingService; 