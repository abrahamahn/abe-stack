import Router from 'express';
import multer from 'multer';
import path from 'path';
import type { Request, Response } from 'express';;
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MediaController } from '../controllers/media.controller';
import { EnhancedMediaProcessingService } from '../services/EnhancedMediaProcessingService';
import { z } from 'zod';
import { Logger } from '../services/LoggerService';
import Media from '../models/Media';

// Extend Request type to include multer's file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: any;
}

const router = Router();
const logger = new Logger('MediaRoutes');
const mediaController = new MediaController();
const mediaService = new EnhancedMediaProcessingService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'temp'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const allowedMimes = {
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'video/mp4': true,
  'video/quicktime': true,
  'audio/mpeg': true,
  'audio/wav': true,
  'audio/mp4': true
} as const;

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in allowedMimes) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validation schemas
const uploadOptionsSchema = z.object({
  generateHLS: z.boolean().optional(),
  generateDASH: z.boolean().optional(),
  generateWaveform: z.boolean().optional(),
  quality: z.array(z.enum(['1080p', '720p', '480p', '360p', '240p'])).optional(),
  isPublic: z.boolean().optional()
});

// Upload endpoints
router.post('/upload/image', 
  authenticate,
  upload.single('file'),
  validate(uploadOptionsSchema),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const mediaId = await mediaService.queueImageProcessing(
        req.file.path,
        req.user!.id
      );

      res.status(202).json({
        message: 'Image upload accepted',
        mediaId,
        status: 'processing'
      });
    } catch (error) {
      logger.error('Image upload failed:', error);
      res.status(500).json({ error: 'Failed to process image upload' });
    }
  }
);

router.post('/upload/video',
  authenticate,
  upload.single('file'),
  validate(uploadOptionsSchema),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const options = req.body;
      const mediaId = await mediaService.queueVideoProcessing(
        req.file.path,
        req.user!.id,
        options
      );

      res.status(202).json({
        message: 'Video upload accepted',
        mediaId,
        status: 'processing'
      });
    } catch (error) {
      logger.error('Video upload failed:', error);
      res.status(500).json({ error: 'Failed to process video upload' });
    }
  }
);

router.post('/upload/audio',
  authenticate,
  upload.single('file'),
  validate(uploadOptionsSchema),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const options = req.body;
      const mediaId = await mediaService.queueAudioProcessing(
        req.file.path,
        req.user!.id,
        options.generateWaveform
      );

      res.status(202).json({
        message: 'Audio upload accepted',
        mediaId,
        status: 'processing'
      });
    } catch (error) {
      logger.error('Audio upload failed:', error);
      res.status(500).json({ error: 'Failed to process audio upload' });
    }
  }
);

// Streaming endpoints
router.get('/stream/video/:mediaId',
  mediaController.streamVideo.bind(mediaController)
);

router.get('/stream/video/:mediaId/hls/:file',
  mediaController.streamVideo.bind(mediaController)
);

router.get('/stream/video/:mediaId/dash/:file',
  mediaController.streamVideo.bind(mediaController)
);

router.get('/stream/audio/:mediaId',
  mediaController.streamAudio.bind(mediaController)
);

router.get('/stream/audio/:mediaId/waveform',
  mediaController.getWaveform.bind(mediaController)
);

// Media info endpoints
router.get('/:mediaId/status',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const media = await Media.findByPk(req.params.mediaId);
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      res.json({
        status: media.processingStatus,
        metadata: media.metadata
      });
    } catch (error) {
      logger.error('Failed to get media status:', error);
      res.status(500).json({ error: 'Failed to get media status' });
    }
  }
);

router.get('/:mediaId/info',
  async (req: Request, res: Response) => {
    try {
      const media = await Media.findByPk(req.params.mediaId);
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      res.json(media);
    } catch (error) {
      logger.error('Failed to get media info:', error);
      res.status(500).json({ error: 'Failed to get media info' });
    }
  }
);

export { router as mediaRouter }; 