import { promises as fsPromises } from 'fs';
import path from 'path';

import ffmpeg from 'fluent-ffmpeg';
import * as mm from 'music-metadata';

import { MediaType, ProcessingStatus, AudioMetadata } from '../../types/media.types';

import { BaseMediaProcessor, BaseProcessingResult } from './BaseMediaProcessor';

/**
 * Audio processing result interface
 */
export interface AudioProcessingResult extends BaseProcessingResult {
  waveformPath?: string;
  metadata: AudioMetadata;
}

/**
 * Audio processing options
 */
export interface AudioProcessingOptions {
  generateWaveform?: boolean;
  normalize?: boolean;
  format?: 'mp3' | 'aac' | 'ogg' | 'wav';
  bitrate?: string;
}

/**
 * Audio processor class for handling audio processing operations
 */
export class AudioProcessor extends BaseMediaProcessor {
  constructor(uploadDir: string) {
    super(path.join(uploadDir, 'audio'), 'AudioProcessor');
  }
  
  /**
   * Process an audio file
   */
  public async process(filePath: string, options?: AudioProcessingOptions): Promise<AudioProcessingResult> {
    const mediaId = this.generateFileId();
    const opts = this.getProcessingOptions(options);
    
    try {
      // Get audio metadata
      const metadata = await this.getAudioMetadata(filePath);
      
      // Create output directory
      const outputDir = path.join(this.uploadDir, mediaId);
      await this.ensureDirectoryExists(outputDir);
      
      // Process audio
      const paths: Record<string, string> = {
        original: filePath
      };
      
      // Convert to desired format if needed
      const processedPath = await this.processAudio(
        filePath,
        outputDir,
        opts
      );
      paths.processed = processedPath;
      
      // Generate waveform if requested
      let waveformPath = '';
      if (opts.generateWaveform) {
        waveformPath = await this.generateWaveform(
          processedPath,
          outputDir
        );
        paths.waveform = waveformPath;
      }
      
      return {
        mediaId,
        paths,
        waveformPath,
        metadata,
        status: ProcessingStatus.COMPLETED
      };
    } catch (error) {
      this.logger.error(`Failed to process audio: ${filePath}`, { error });
      return {
        mediaId,
        paths: { original: filePath },
        metadata: {
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
    return MediaType.AUDIO;
  }
  
  /**
   * Get audio metadata
   */
  private async getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    try {
      const metadata = await mm.parseFile(filePath);
      const fileSize = await this.getFileSize(filePath);
      
      return {
        duration: metadata.format.duration || 0,
        format: metadata.format.container || '',
        fileSize,
        mimeType: `audio/${metadata.format.container || 'mpeg'}`,
        bitrate: metadata.format.bitrate || 0,
        sampleRate: metadata.format.sampleRate,
        channels: metadata.format.numberOfChannels,
        codec: metadata.format.codec,
        title: metadata.common.title,
        artist: metadata.common.artist,
        album: metadata.common.album,
        genre: metadata.common.genre ? metadata.common.genre[0] : undefined,
        year: metadata.common.year
      };
    } catch (error) {
      this.logger.error(`Failed to get audio metadata: ${filePath}`, { error });
      throw error;
    }
  }
  
  /**
   * Process audio file (convert, normalize, etc.)
   */
  private processAudio(
    inputPath: string,
    outputDir: string,
    options: Required<AudioProcessingOptions>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputFilename = `processed.${options.format}`;
      const outputPath = path.join(outputDir, outputFilename);
      
      let command = ffmpeg(inputPath);
      
      // Apply normalization if requested
      if (options.normalize) {
        command = command.audioFilters('loudnorm');
      }
      
      // Set output format and bitrate
      command = command
        .audioBitrate(options.bitrate)
        .format(options.format);
      
      command
        .output(outputPath)
        .on('error', reject)
        .on('end', () => resolve(outputPath))
        .run();
    });
  }
  
  /**
   * Generate a waveform visualization
   */
  private generateWaveform(
    inputPath: string,
    outputDir: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, 'waveform.json');
      
      ffmpeg(inputPath)
        .outputOptions([
          '-filter_complex',
          'showwavespic=s=1000x200:colors=#3498db',
          '-frames:v', '1'
        ])
        .output(path.join(outputDir, 'waveform.png'))
        .on('error', reject)
        .on('end', () => {
          // Generate a simplified JSON representation of the waveform
          // This would typically involve analyzing the waveform image
          // For simplicity, we're just creating a placeholder
          const waveformData = {
            samples: 1000,
            channels: 1,
            data: Array(100).fill(0).map(() => Math.random())
          };
          
          fsPromises.writeFile(
            outputPath,
            JSON.stringify(waveformData),
            'utf8'
          )
            .then(() => resolve(outputPath))
            .catch(error => reject(error));
        })
        .run();
    });
  }
  
  /**
   * Get processing options with defaults
   */
  private getProcessingOptions(options?: AudioProcessingOptions): Required<AudioProcessingOptions> {
    return {
      generateWaveform: options?.generateWaveform ?? true,
      normalize: options?.normalize ?? true,
      format: options?.format ?? 'mp3',
      bitrate: options?.bitrate ?? '192k'
    };
  }
} 