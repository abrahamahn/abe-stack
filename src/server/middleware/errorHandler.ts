// src/server/middleware/errorHandler.ts
import { errorHandler as enhancedErrorHandler } from './error';

// Re-export the enhanced error handler
export const errorHandler = enhancedErrorHandler;