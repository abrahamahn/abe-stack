// main/server/system/src/errors/index.ts
/**
 * Errors Module
 *
 * Fastify-specific error handler. Error classes, utilities, and mapper types
 * are canonical in @bslt/shared — import them from there directly.
 */

export { registerErrorHandler } from './handler';
export { replyError, replyOk, sendResult } from './reply';
