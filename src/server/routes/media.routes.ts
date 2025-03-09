// src/server/routes/media.routes.ts
import Router from 'express';
import type { Request, Response } from 'express';
import { mediaLimiter } from '../middleware/mediaRateLimiter';

const router = Router();

router.use(mediaLimiter);

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Media routes' });
});

export default router;
