// apps/server/src/types/fastify.d.ts
/**
 * Fastify Type Augmentations
 *
 * Extends Fastify types for our application.
 * Note: Business logic dependencies are passed via AppContext, not decorators.
 */
import 'fastify';

import type { TokenPayload } from '../modules/auth/utils/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user payload (set by auth middleware) */
    user?: TokenPayload;
  }
}
