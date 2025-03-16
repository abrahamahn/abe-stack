// src/server/apis/media.ts
import * as fs from 'fs';
import * as path from 'path';

import { Request, Response } from 'express';
import multer from 'multer';

import * as t from '../../shared/dataTypes';
import { MediaService } from '../services/MediaService';



type RequestWithFile = Request & { 
  file?: Express.Multer.File;
  protocol: string; // Optional, already included in Request
  get: (name: string) => string; // Optional, already included in Request
};

// Setup storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const mediaService = new MediaService();
    cb(null, mediaService['mediaPath']); // Access private property
  },
  filename: (_req, file, cb) => {
    const mediaService = new MediaService();
    cb(null, mediaService.generateFilename(file.originalname));
  }
});

export const upload = multer({ storage });
const mediaService = new MediaService();

// Stream media
export const streamInput = t.object({
  filename: t.string()
});

export function streamMedia(req: Request, res: Response) {
  try {
    const params = streamInput.validate(req.params);
    if (!params) {
      return res.status(400).json({ error: 'Invalid filename parameter' });
    }
    
    const mediaService = new MediaService();
    mediaService.streamMedia(req, res, params.filename);
  } catch (error) {
    console.error('Error streaming media:', error);
    return res.status(500).json({ error: 'Failed to stream media' });
  }
}

// Handle file upload in ApiServer.ts with middleware
export const uploadHandler = (req: RequestWithFile, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  
  const mediaType = mediaService.getMediaType(file.originalname);
  
  return res.status(200).json({
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    mediaType
  });
};

// Upload media endpoint
export async function uploadMedia(req: RequestWithFile, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaService = new MediaService();
    const filename = mediaService.generateFilename(file.originalname);
    
    // Save the file
    const filePath = path.join(mediaService['mediaPath'], filename);
    await fs.promises.writeFile(filePath, file.buffer);
    
    // Generate URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const fileUrl = `${baseUrl}/media/${filename}`;
    
    return res.status(201).json({
      filename,
      url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({ error: 'Failed to upload media' });
  }
}