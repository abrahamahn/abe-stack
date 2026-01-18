// apps/server/src/infra/logger/index.ts
/**
 * Logger Module
 *
 * Structured logging with correlation ID support.
 *
 * Usage:
 *   // In request handlers, use request.log
 *   request.log.info('Processing request', { userId: request.user.id });
 *
 *   // For background jobs
 *   const log = createJobLogger(server.log, 'email-sender', jobId);
 *   log.info('Sending email', { to: email });
 */

// Core logger
export {
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  shouldLog,
} from './logger';

// Middleware
export { createJobCorrelationId, createJobLogger, registerLoggingMiddleware } from './middleware';

// Types
export type { LogData, Logger, LoggerConfig, LogLevel, RequestContext } from './types';
