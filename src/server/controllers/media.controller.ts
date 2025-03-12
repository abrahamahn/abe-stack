import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { EnhancedMediaProcessingService } from '../services/EnhancedMediaProcessingService';
import { Logger } from '../services/LoggerService';
import { NotFoundError } from '../middleware/error';
import rangeParser from 'range-parser';

/**
 * Controller for handling media uploads and streaming
 */
export class MediaController {
  private mediaService: EnhancedMediaProcessingService;
  private logger: Logger;
  private uploadDir: string;

  constructor() {
    this.mediaService = new EnhancedMediaProcessingService();
    this.logger = new Logger('MediaController');
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Handle image upload
   */
  public async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { path: filePath } = req.file;
      const userId = req.user!.id;

      // Queue the image for processing
      const jobId = await this.mediaService.queueImageProcessing(filePath, userId);

      res.status(202).json({
        message: 'Image upload accepted and queued for processing',
        jobId,
        status: 'processing'
      });
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  /**
   * Handle video upload
   */
  public async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { path: filePath } = req.file;
      const userId = req.user!.id;
      const generateHLS = req.body.generateHLS !== 'false';
      const generateDASH = req.body.generateDASH === 'true';
      const quality = req.body.quality as ('1080p' | '720p' | '480p' | '360p' | '240p')[] | undefined;

      // Queue the video for processing with proper options object
      const jobId = await this.mediaService.queueVideoProcessing(filePath, userId, {
        generateHLS,
        generateDASH,
        quality
      });

      res.status(202).json({
        message: 'Video upload accepted and queued for processing',
        jobId,
        status: 'processing'
      });
    } catch (error) {
      this.logger.error('Error uploading video:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }

  /**
   * Handle audio upload
   */
  public async uploadAudio(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { path: filePath } = req.file;
      const userId = req.user!.id;
      const generateWaveform = req.body.generateWaveform !== 'false';

      // Queue the audio for processing
      const jobId = await this.mediaService.queueAudioProcessing(filePath, userId, generateWaveform);

      res.status(202).json({
        message: 'Audio upload accepted and queued for processing',
        jobId,
        status: 'processing'
      });
    } catch (error) {
      this.logger.error('Error uploading audio:', error);
      res.status(500).json({ error: 'Failed to upload audio' });
    }
  }

  /**
   * Stream a video file with support for HLS
   */
  public async streamVideo(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, quality } = req.params;
      
      // Check if HLS is requested
      if (req.query.format === 'hls') {
        await this.streamHLS(videoId, req, res);
        return;
      }
      
      // Determine the video path based on quality
      let videoPath: string;
      if (quality && ['1080p', '720p', '480p', '360p', '240p'].includes(quality)) {
        videoPath = path.join(this.uploadDir, 'videos', 'transcoded', `${videoId}_${quality}.mp4`);
      } else {
        videoPath = path.join(this.uploadDir, 'videos', 'original', `${videoId}.mp4`);
      }
      
      // Check if the file exists
      if (!fs.existsSync(videoPath)) {
        throw new NotFoundError('Video not found');
      }
      
      // Get file stats
      const stat = fs.promises.stat(videoPath);
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
          const stream = fs.createReadStream(videoPath, { start, end });
          
          // Set headers
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4'
          });
          
          // Pipe the stream to the response
          stream.pipe(res);
        } else {
          // Handle case where range is not specified or invalid
          const stream = fs.createReadStream(videoPath);
          
          // Set headers for full file
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
          });
          
          // Pipe the stream to the response
          stream.pipe(res);
        }
      } else {
        // Set headers for full file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4'
        });
        
        // Create read stream for the entire file
        const stream = fs.createReadStream(videoPath);
        
        // Pipe the stream to the response
        stream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        this.logger.error('Error streaming video:', error);
        res.status(500).json({ error: 'Failed to stream video' });
      }
    }
  }
  
  /**
   * Stream HLS content
   */
  private async streamHLS(videoId: string, req: Request, res: Response): Promise<void> {
    try {
      const { file } = req.params;
      const hlsDir = path.join(this.uploadDir, 'videos', 'hls', videoId);
      
      // Check if the HLS directory exists
      if (!fs.existsSync(hlsDir)) {
        throw new NotFoundError('HLS stream not found');
      }
      
      // If no specific file is requested, serve the master playlist
      const filePath = file 
        ? path.join(hlsDir, file) 
        : path.join(hlsDir, 'master.m3u8');
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('HLS file not found');
      }
      
      // Set content type based on file extension
      const ext = path.extname(filePath);
      const contentType = ext === '.m3u8' 
        ? 'application/vnd.apple.mpegurl' 
        : 'video/mp2t';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      
      // Stream the file
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        this.logger.error('Error streaming HLS:', error);
        res.status(500).json({ error: 'Failed to stream HLS content' });
      }
    }
  }
  
  /**
   * Stream an audio file
   */
  public async streamAudio(req: Request, res: Response): Promise<void> {
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
  public async getWaveform(req: Request, res: Response): Promise<void> {
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
      res.setHeader('Content-Type', 'application/json');
      res.send(waveformData);
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
  public async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      // TODO: Implement job status checking
      // This would typically involve checking the status in Bull
      
      res.status(200).json({
        jobId,
        status: 'processing', // or 'completed', 'failed', etc.
        message: 'Job is being processed'
      });
    } catch (error) {
      this.logger.error('Error getting job status:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  }
} 