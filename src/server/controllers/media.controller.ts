import fs from 'fs';
import path from 'path';

import { Request, Response } from 'express';
import multer from 'multer';
import rangeParser from 'range-parser';

import { NotFoundError } from '../middleware/error';
import { Logger } from '../services/LoggerService';
import { MediaProcessingService } from '../services/media/MediaProcessingService';
import { MediaService } from '../services/MediaService';

interface MediaRequest extends Request<Record<string, never>, Record<string, never>, {
  generateHLS?: string;
  generateDASH?: string;
  generateWaveform?: string;
  quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
}> {
  file?: Express.Multer.File;
  protocol: string;
  get(name: string): string | undefined;
  get(name: 'set-cookie'): string[] | undefined;
  body: {
    generateHLS?: string;
    generateDASH?: string;
    generateWaveform?: string;
    quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
  };
}

interface StreamRequest extends Request {
  params: {
    videoId?: string;
    audioId?: string;
    file?: string;
    quality?: '1080p' | '720p' | '480p' | '360p' | '240p';
    format?: string;
    filename?: string;
  };
  query: {
    format?: string;
  };
  headers: {
    range?: string;
  };
}

interface StreamResponse extends Response {
  writeHead(statusCode: number, statusMessage?: string, headers?: Record<string, string | number>): this;
  writeHead(statusCode: number, headers?: Record<string, string | number>): this;
  end(cb?: () => void): this;
  end(data: string | Buffer, cb?: () => void): this;
  end(str: string, encoding?: BufferEncoding, cb?: () => void): this;
}

interface AudioRequest extends Request {
  params: {
    audioId: string;
    format?: string;
  };
  headers: {
    range?: string;
  };
}

interface WaveformRequest extends Request {
  params: {
    audioId: string;
  };
}

interface JobRequest extends Request {
  params: {
    jobId: string;
  };
}

// Setup storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const mediaService = new MediaService();
    cb(null, mediaService['mediaPath']);
  },
  filename: (_req, file, cb) => {
    const mediaService = new MediaService();
    cb(null, mediaService.generateFilename(file.originalname));
  }
});

export const upload = multer({ storage });

/**
 * Controller for handling media uploads and streaming
 */
export class MediaController {
  private mediaService: MediaProcessingService;
  private basicMediaService: MediaService;
  private logger: Logger;
  private uploadDir: string;

  constructor() {
    this.mediaService = MediaProcessingService.getInstance();
    this.basicMediaService = new MediaService();
    this.logger = new Logger('MediaController');
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Handle basic media upload
   */
  public async uploadMedia(req: MediaRequest, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const filename = this.basicMediaService.generateFilename(file.originalname);
      const filePath = path.join(this.basicMediaService['mediaPath'], filename);
      
      await fs.promises.writeFile(filePath, file.buffer);
      
      const hostHeader = req.get('host');
      const host = typeof hostHeader === 'string' ? hostHeader : '';
      const baseUrl = `${req.protocol}://${host}`;
      const fileUrl = `${baseUrl}/media/${filename}`;
      
      res.status(201).json({
        filename,
        url: fileUrl,
        mediaType: this.basicMediaService.getMediaType(file.originalname)
      });
    } catch (error) {
      this.logger.error('Error uploading media:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  }

  /**
   * Handle image upload with processing
   */
  public async uploadImage(req: MediaRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const filePath = req.file.path;
      const result = await this.mediaService.processImage(filePath);

      res.status(202).json({
        message: 'Image upload accepted and processed',
        mediaId: result.mediaId,
        status: 'completed'
      });
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  /**
   * Handle video upload with processing
   */
  public async uploadVideo(req: MediaRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const filePath = req.file.path;
      const generateHLS = req.body.generateHLS !== 'false';
      const generateDASH = req.body.generateDASH === 'true';
      const quality = req.body.quality;

      const result = await this.mediaService.processVideo(filePath, {
        generateHLS,
        generateDASH,
        quality: this.mapQualityToEnum(quality)
      });

      res.status(202).json({
        message: 'Video upload accepted and processed',
        mediaId: result.mediaId,
        status: 'completed'
      });
    } catch (error) {
      this.logger.error('Error uploading video:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }

  /**
   * Stream any media file
   */
  public streamMedia(req: StreamRequest, res: StreamResponse): void {
    try {
      const { filename } = req.params;
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }

      this.basicMediaService.streamMedia(req, res, filename);
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  /**
   * Stream a video file with support for HLS
   */
  public async streamVideo(req: StreamRequest, res: Response): Promise<void> {
    try {
      const { videoId, quality } = req.params;
      
      if (!videoId) {
        res.status(400).json({ error: 'Video ID is required' });
        return;
      }

      if (req.query.format === 'hls') {
        await this.streamHLS(videoId, req, res);
        return;
      }

      const videoPath = this.getVideoPath(videoId, quality);
      await this.streamFile(videoPath, 'video/mp4', req, res);
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  /**
   * Stream HLS content
   */
  private async streamHLS(videoId: string, req: StreamRequest, res: Response): Promise<void> {
    try {
      const { file } = req.params;
      const hlsDir = path.join(this.uploadDir, 'videos', 'hls', videoId);

      if (!fs.existsSync(hlsDir)) {
        throw new NotFoundError('HLS stream not found');
      }

      const filePath = file 
        ? path.join(hlsDir, file)
        : path.join(hlsDir, 'master.m3u8');

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('HLS file not found');
      }

      const contentType = path.extname(filePath) === '.m3u8'
        ? 'application/vnd.apple.mpegurl'
        : 'video/mp2t';

      await this.streamFile(filePath, contentType, req, res);
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  private getVideoPath(videoId: string, quality?: string): string {
    if (quality && ['1080p', '720p', '480p', '360p', '240p'].includes(quality)) {
      return path.join(this.uploadDir, 'videos', 'transcoded', `${videoId}_${quality}.mp4`);
    }
    return path.join(this.uploadDir, 'videos', 'original', `${videoId}.mp4`);
  }

  private async streamFile(filePath: string, contentType: string, req: StreamRequest, res: StreamResponse): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File not found');
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const ranges = rangeParser(fileSize, range);
      if (Array.isArray(ranges) && ranges.length > 0) {
        const { start, end } = ranges[0];
        const stream = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': contentType
        });
        
        stream.pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType
    });
    
    fs.createReadStream(filePath).pipe(res);
  }

  private handleStreamError(error: unknown, res: Response): void {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      this.logger.error('Error streaming:', error);
      res.status(500).json({ error: 'Failed to stream content' });
    }
  }

  private mapQualityToEnum(quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[]): 'low' | 'medium' | 'high' | undefined {
    if (!quality?.length) return undefined;
    
    const highestQuality = quality[0];
    switch (highestQuality) {
      case '1080p':
      case '720p':
        return 'high';
      case '480p':
        return 'medium';
      case '360p':
      case '240p':
        return 'low';
      default:
        return undefined;
    }
  }

  /**
   * Stream an audio file
   */
  public async streamAudio(req: AudioRequest, res: StreamResponse): Promise<void> {
    try {
      const { audioId, format } = req.params;
      
      // Determine the audio path based on format
      let audioPath: string;
      if (format === 'mp3') {
        audioPath = path.join(this.uploadDir, 'audio', 'transcoded', `${audioId}.mp3`);
      } else {
        audioPath = path.join(this.uploadDir, 'audio', 'original', `${audioId}.${format || 'mp3'}`);
      }
      
      // Check if the file exists
      if (!fs.existsSync(audioPath)) {
        throw new NotFoundError('Audio not found');
      }
      
      // Get file stats
      const stat = fs.promises.stat(audioPath);
      const fileSize = (await stat).size;
      
      // Handle range requests
      const range = req.headers.range;
      if (range) {
        const ranges = rangeParser(fileSize, range);
        
        // Check if ranges is a valid range object (not -1 or -2)
        if (typeof ranges === 'object' && ranges !== null) {
          // Use the first range
          const { start, end } = ranges[0];
          
          // Create read stream for the range
          const stream = fs.createReadStream(audioPath, { start, end });
          
          // Set headers
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/mpeg'
          });
          
          // Pipe the stream to the response
          stream.pipe(res);
        } else {
          // Handle case where range is not specified or invalid
          const stream = fs.createReadStream(audioPath);
          
          // Set headers for full file
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/mpeg'
          });
          
          // Pipe the stream to the response
          stream.pipe(res);
        }
      } else {
        // Set headers for full file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/mpeg'
        });
        
        // Create read stream for the entire file
        const stream = fs.createReadStream(audioPath);
        
        // Pipe the stream to the response
        stream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        this.logger.error('Error streaming audio:', error);
        res.status(500).json({ error: 'Failed to stream audio' });
      }
    }
  }
  
  /**
   * Get audio waveform data
   */
  public async getWaveform(req: WaveformRequest, res: StreamResponse): Promise<void> {
    try {
      const { audioId } = req.params;
      const waveformPath = path.join(this.uploadDir, 'audio', 'waveforms', `${audioId}.json`);
      
      // Check if the file exists
      if (!fs.existsSync(waveformPath)) {
        throw new NotFoundError('Waveform data not found');
      }
      
      // Read the waveform data
      const waveformData = await fs.promises.readFile(waveformPath, 'utf8');
      
      // Send the data
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(waveformData);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        this.logger.error('Error getting waveform data:', error);
        res.status(500).json({ error: 'Failed to get waveform data' });
      }
    }
  }
  
  /**
   * Get job status
   */
  public async getJobStatus(req: JobRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      // Simulate checking job status asynchronously
      await Promise.resolve();
      
      res.status(200).json({
        jobId,
        status: 'processing',
        message: 'Job is being processed'
      });
    } catch (error) {
      this.logger.error('Error getting job status:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  }
} 