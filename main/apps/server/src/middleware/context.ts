// main/apps/server/src/middleware/context.ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RequestWithCookies } from '../types/context';

/**
 * Fastify preHandler hook to contextualize the application context for Row-Level Security.
 *
 * If a user is authenticated (req.user is present), it creates a new scoped context
 * with the user's ID and tenant ID (if available).
 */
export async function contextualizeRequest(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const request = req as unknown as RequestWithCookies;

  if (!request.context || !request.user) {
    return;
  }

  // Identify tenant ID from request headers or user metadata
  // In our system, the active tenant is often passed in the 'x-tenant-id' header
  // or determined via the membership of the authenticated user.
  const tenantId = request.headers['x-tenant-id'] as string | undefined;

  // Create a contextualized context for this specific request.
  // This will wrap all DB queries in a transaction that sets PG session variables.
  request.context = request.context.contextualize({
    userId: request.user.userId,
    tenantId: tenantId,
    role: request.user.role,
  });
}
