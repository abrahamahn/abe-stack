// src/server/services/MediaService.ts
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join, parse } from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import { Request, Response } from 'express';
import { path } from '../helpers/path';
import { Simplify } from '../../shared/typeHelpers';

export class MediaService {
  private mediaPath: string;
  
  constructor() {
    this.mediaPath = path('uploads/media');
    
    // Ensure media directory exists
    if (!existsSync(this.mediaPath)) {
      mkdirSync(this.mediaPath, { recursive: true });
    }
  }

  /**
   * Generate a unique filename
   */
  generateFilename(originalname: string): string {
    const { name, ext } = parse(originalname);
    const hash = crypto.createHash('md5').update(`${name}-${Date.now()}`).digest('hex').substring(0, 8);
    return `${name}-${hash}${ext}`;
  }

  /**
   * Stream media file
   */
  streamMedia(req: Request, res: Response, filename: string): void {
    const filepath = join(this.mediaPath, filename);
    
    if (!existsSync(filepath)) {
      res.status(404).send('File not found');
      return;
    }
    
    const stat = require('fs').statSync(filepath);
    const fileSize = stat.size;
    const mimeType = mime.lookup(filepath) || 'application/octet-stream';
    
    // Handle range requests (important for video/audio seeking)
    const rangeHeader = req.headers.range;
    
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType
      });
      
      const stream = createReadStream(filepath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType
      });
      createReadStream(filepath).pipe(res);
    }
  }

  /**
   * Get media type
   */
  getMediaType(filename: string): 'audio' | 'video' | 'image' | 'unknown' {
    const mimeType = mime.lookup(filename);
    
    if (!mimeType) return 'unknown';
    
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    
    return 'unknown';
  }
}

export type MediaServiceApi = Simplify<MediaService>;