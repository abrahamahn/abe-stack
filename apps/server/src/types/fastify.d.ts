// apps/server/src/types/fastify.d.ts
/**
 * Fastify Type Augmentations
 *
 * Extends Fastify types for our application.
 * Note: Business logic dependencies are passed via AppContext, not decorators.
 */
import 'fastify';

// TODO: Restore RBAC when implementation is ready
// import type { Ability } from '../infra/rbac';
import type { TokenPayload } from '@modules/auth/utils/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user payload (set by auth middleware) */
    user?: TokenPayload;
    /** RBAC ability (set by attachAbility middleware) */
    // ability?: Ability;
  }
}
