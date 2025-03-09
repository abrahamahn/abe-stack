// src/server/routes/media.routes.ts
import express from 'express';
import { mediaLimiter } from '../middleware/mediaRateLimiter';

const router = express.Router();

router.use(mediaLimiter);

router.get('/', (req, res) => {
  res.json({ message: 'Media routes' });
});

export default router;
