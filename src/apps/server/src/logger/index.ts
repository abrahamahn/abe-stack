// src/apps/server/src/logger/index.ts
/**
 * Logger Module
 *
 * Fastify-specific logging wrappers with correlation ID support.
 * Pure utilities and types should be imported directly from
 * @abe-stack/shared.
 */

// Fastify-specific logger wrappers
export { createLogger, createRequestLogger } from './logger';

// Middleware (Fastify-specific)
export { createJobCorrelationId, createJobLogger, registerLoggingMiddleware } from './middleware';
