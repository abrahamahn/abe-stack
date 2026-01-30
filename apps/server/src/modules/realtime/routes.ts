// apps/server/src/modules/realtime/routes.ts
/**
 * Realtime Routes
 *
 * Route definitions for realtime module.
 * Uses the generic router pattern for DRY registration.
 */

import { getRecordsRequestSchema, transactionSchema } from '@abe-stack/core';
import { createRouteMap, protectedRoute, type RouteResult } from '@/infrastructure/http/router';

import {
  handleGetRecords,
  handleWrite,
  type ConflictResult,
  type GetRecordsResult,
  type WriteResult,
} from './handlers';

import type { GetRecordsRequest, RecordPointer, RealtimeTransaction } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';
import type { FastifyReply } from 'fastify';

// ============================================================================
// Route Definitions
// ============================================================================

export const realtimeRoutes = createRouteMap([
  [
    'realtime/write',
    protectedRoute<RealtimeTransaction, WriteResult | ConflictResult | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: RealtimeTransaction,
        req: RequestWithCookies & { user: { userId: string; email: string; role: string } },
        _reply: FastifyReply,
      ): Promise<RouteResult<WriteResult | ConflictResult | { message: string }>> => {
        return handleWrite(ctx, body, req);
      },
      'user',
      transactionSchema,
    ),
  ],

  [
    'realtime/getRecords',
    protectedRoute<GetRecordsRequest, GetRecordsResult | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: GetRecordsRequest,
        req: RequestWithCookies & { user: { userId: string; email: string; role: string } },
        _reply: FastifyReply,
      ): Promise<RouteResult<GetRecordsResult | { message: string }>> => {
        return handleGetRecords(ctx, body as { pointers: RecordPointer[] }, req);
      },
      'user',
      getRecordsRequestSchema,
    ),
  ],
]);
