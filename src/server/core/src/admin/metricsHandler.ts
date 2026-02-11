// src/server/core/src/admin/metricsHandler.ts
/**
 * Admin Metrics Handler
 *
 * HTTP handler for the admin metrics endpoint.
 * Returns request metrics summary and optional queue stats.
 * Requires admin role (enforced by route definitions).
 */

import { getMetricsCollector, type MetricsSummary } from '@abe-stack/server-engine';

import { ERROR_MESSAGES } from '../auth';

import type { AdminAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Queue statistics included in the metrics response.
 */
interface QueueStatsResponse {
  pending: number;
  failed: number;
}

/**
 * Full metrics response returned by the handler.
 */
interface MetricsResponse {
  metrics: MetricsSummary;
  queue: QueueStatsResponse | null;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handle GET /api/admin/metrics
 *
 * Returns aggregated request metrics and optional job queue statistics.
 * Admin-only endpoint.
 */
export async function handleGetMetrics(
  ctx: AdminAppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: MetricsResponse | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const collector = getMetricsCollector();
    const metrics = collector.getMetricsSummary();

    // Attempt to get queue stats if the queue is available
    let queue: QueueStatsResponse | null = null;
    const queueServer = ctx.queue as
      | { getStats?: () => Promise<{ pending: number; failed: number }> }
      | undefined;

    if (queueServer?.getStats !== undefined) {
      try {
        queue = await queueServer.getStats();
      } catch {
        // Queue stats unavailable -- degrade gracefully
        queue = null;
      }
    }

    ctx.log.info({ adminId: user.userId }, 'Admin retrieved metrics');

    return {
      status: 200,
      body: { metrics, queue },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ctx.log.error(err, 'Failed to retrieve metrics');
    return { status: 500, body: { message: 'Failed to retrieve metrics' } };
  }
}
