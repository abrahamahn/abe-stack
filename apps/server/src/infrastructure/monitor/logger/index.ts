// apps/server/src/infrastructure/monitor/logger/index.ts
/**
 * Logger Module
 *
 * Structured logging with correlation ID support.
 * Pure utilities (types, correlation, levels) come from @abe-stack/core.
 * Fastify-specific wrappers (createLogger, middleware) live here.
 *
 * Usage:
 *   // In request handlers, use request.log
 *   request.log.info('Processing request', { userId: request.user.id });
 *
 *   // For background jobs
 *   const log = createJobLogger(server.log, 'email-sender', jobId);
 *   log.info('Sending email', { to: email });
 */

// Fastify-specific logger wrappers
export { createLogger, createRequestLogger } from './logger';

// Pure utilities re-exported from core via logger.ts
export {
  createRequestContext,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  shouldLog,
} from './logger';

// Middleware (Fastify-specific)
export { createJobCorrelationId, createJobLogger, registerLoggingMiddleware } from './middleware';

// Types (re-exported from core)
export type { LogData, Logger, LoggerConfig, LogLevel, RequestContext } from './types';
