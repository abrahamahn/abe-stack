import express from 'express';

import { authRouter } from '../domains/auth/routes';
import { errorHandler } from '../middleware/errorHandler';
import { apiLimiter } from '../middleware/rateLimiter';

import { adminRouter } from './admin';
import { mediaRouter } from './media';
import { moderatorRouter } from './moderator';
import { socialRouter } from './social';
import { userRouter } from './users';

const router: express.Router = express.Router();

// Apply rate limiter to all API routes
router.use(apiLimiter);

// Public routes
router.use('/auth', authRouter);

// Protected routes (authentication is handled within each router)
router.use('/users', userRouter);
router.use('/social', socialRouter);
router.use('/admin', adminRouter);
router.use('/moderator', moderatorRouter);
router.use('/media', mediaRouter);

// Error handler middleware (must be last)
router.use(errorHandler);

export default router;