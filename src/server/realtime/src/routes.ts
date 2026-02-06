// modules/realtime/src/routes.ts
/**
 * Realtime Routes
 *
 * Route definitions for realtime module.
 * Uses the generic router pattern for DRY registration.
 *
 * Route handlers accept HandlerContext (Record<string, unknown>) from the
 * generic router and narrow it to RealtimeModuleDeps at the call boundary.
 * This keeps the realtime package decoupled from the server's concrete context.
 *
 * @module routes
 */

import {
  createRouteMap,
  getRecordsRequestSchema,
  protectedRoute,
  transactionSchema,
  type GetRecordsRequest,
  type HandlerContext,
  type RecordPointer,
  type RealtimeTransaction,
  type RouteMap,
  type RouteResult,
} from '@abe-stack/shared';

import { handleGetRecords, handleWrite } from './handlers';

import type {
  ConflictResult,
  GetRecordsResult,
  RealtimeModuleDeps,
  RealtimeRequest,
  WriteResult,
} from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to RealtimeModuleDeps.
 * The server composition root ensures the context implements RealtimeModuleDeps.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed RealtimeModuleDeps
 * @complexity O(1)
 */
function asRealtimeDeps(ctx: HandlerContext): RealtimeModuleDeps {
  return ctx as unknown as RealtimeModuleDeps;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Realtime route map with all realtime record operation endpoints.
 *
 * Routes:
 * - POST realtime/write - Apply write transaction with optimistic locking
 * - POST realtime/getRecords - Fetch records by table and ID pointers
 */
export const realtimeRoutes: RouteMap = createRouteMap([
  [
    'realtime/write',
    protectedRoute<RealtimeTransaction, WriteResult | ConflictResult | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: RealtimeTransaction,
        req: FastifyRequest & { user: { userId: string; email: string; role: string } },
        _reply: FastifyReply,
      ): Promise<RouteResult<WriteResult | ConflictResult | { message: string }>> => {
        return handleWrite(asRealtimeDeps(ctx), body, req as unknown as RealtimeRequest);
      },
      transactionSchema,
      'user',
    ),
  ],

  [
    'realtime/getRecords',
    protectedRoute<GetRecordsRequest, GetRecordsResult | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: GetRecordsRequest,
        req: FastifyRequest & { user: { userId: string; email: string; role: string } },
        _reply: FastifyReply,
      ): Promise<RouteResult<GetRecordsResult | { message: string }>> => {
        return handleGetRecords(
          asRealtimeDeps(ctx),
          body as { pointers: RecordPointer[] },
          req as unknown as RealtimeRequest,
        );
      },
      getRecordsRequestSchema,
      'user',
    ),
  ],
]);
