// main/server/system/src/errors/index.ts
/**
 * Errors Module
 *
 * HTTP reply helpers using abstract interfaces. Error classes, utilities,
 * and mapper types are canonical in @bslt/shared — import them from there.
 *
 * registerErrorHandler (Fastify-specific) moved to apps/server/src/http/error-handler.ts.
 */

export { replyError, replyOk, sendResult } from './reply';
