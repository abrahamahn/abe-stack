// src/server/routes/index.ts
import express from 'express';
import { authRouter } from './auth';
import { socialRouter } from './social';
import { adminRouter } from './admin';
import { moderatorRouter } from './moderator';
import { mediaRouter } from './media';
import { apiLimiter } from '../middleware/rateLimiter';
import { errorHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply rate limiter to all API routes
router.use(apiLimiter);

// Public routes
router.use('/auth', authRouter);

// Protected routes (authentication is handled within each router)
router.use('/social', socialRouter);
router.use('/admin', adminRouter);
router.use('/moderator', moderatorRouter);
router.use('/media', mediaRouter);

// Error handler middleware (must be last)
router.use(errorHandler);

export default router;