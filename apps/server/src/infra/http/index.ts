// apps/server/src/infra/http/index.ts
/**
 * HTTP Infrastructure
 *
 * Security middleware and HTTP utilities.
 */

export { applySecurityHeaders, applyCors, handlePreflight, type CorsOptions } from './security';
