// src/server/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';

import { errorHandler as enhancedErrorHandler } from './error';

// Re-export the enhanced error handler
export const errorHandler: ErrorRequestHandler = enhancedErrorHandler;