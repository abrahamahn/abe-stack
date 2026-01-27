// apps/server/src/modules/admin/jobsHandlers.ts
/**
 * Jobs Handlers
 *
 * HTTP handlers for job monitoring endpoints.
 * All handlers require admin role (enforced by route definitions).
 */

import { jobListQuerySchema } from '@abe-stack/core';
import { PostgresQueueStore, type JobListOptions } from '@infrastructure';
import { ERROR_MESSAGES, type AppContext } from '@shared';

import {
    cancelJob,
    getJobDetails,
    getQueueStats,
    JobNotFoundError,
    listJobs,
    QueueStoreNotAvailableError,
    retryJob,
} from './jobsService';

import type { JobActionResponse, JobDetails, JobListResponse, QueueStats } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Helper to get queue store
// ============================================================================

/**
 * Get the PostgresQueueStore from the app context.
 * The queue server stores the queue store reference.
 */
function getQueueStore(ctx: AppContext): PostgresQueueStore {
  // Create a new store instance with the same db client
  return new PostgresQueueStore(ctx.db);
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * List jobs with filtering and pagination
 */
export async function handleListJobs(
  ctx: AppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobListResponse | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const store = getQueueStore(ctx);

    // Parse query parameters
    const queryResult = jobListQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return { status: 500, body: { message: queryResult.error.message } };
    }

    const query = queryResult.data;
    const options: JobListOptions = {
      status: query.status,
      name: query.name,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await listJobs(store, options);

    ctx.log.info(
      { adminId: user.userId, page: query.page, status: query.status },
      'Admin listed jobs',
    );

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof QueueStoreNotAvailableError) {
      return { status: 500, body: { message: error.message } };
    }
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get detailed job information
 */
export async function handleGetJobDetails(
  ctx: AppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobDetails | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const store = getQueueStore(ctx);
    const params = request.params as { jobId: string };

    const job = await getJobDetails(store, params.jobId);

    ctx.log.info({ adminId: user.userId, jobId: params.jobId }, 'Admin viewed job details');

    return { status: 200, body: job };
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    if (error instanceof QueueStoreNotAvailableError) {
      return { status: 500, body: { message: error.message } };
    }
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get queue statistics
 */
export async function handleGetQueueStats(
  ctx: AppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: QueueStats | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const store = getQueueStore(ctx);
    const stats = await getQueueStats(store);

    return { status: 200, body: stats };
  } catch (error) {
    if (error instanceof QueueStoreNotAvailableError) {
      return { status: 500, body: { message: error.message } };
    }
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Retry a failed job
 */
export async function handleRetryJob(
  ctx: AppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobActionResponse | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const store = getQueueStore(ctx);
    const params = request.params as { jobId: string };

    const result = await retryJob(store, params.jobId);

    ctx.log.info(
      { adminId: user.userId, jobId: params.jobId, success: result.success },
      'Admin retried job',
    );

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    if (error instanceof QueueStoreNotAvailableError) {
      return { status: 500, body: { message: error.message } };
    }
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Cancel a pending or processing job
 */
export async function handleCancelJob(
  ctx: AppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobActionResponse | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const store = getQueueStore(ctx);
    const params = request.params as { jobId: string };

    const result = await cancelJob(store, params.jobId);

    ctx.log.info(
      { adminId: user.userId, jobId: params.jobId, success: result.success },
      'Admin cancelled job',
    );

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    if (error instanceof QueueStoreNotAvailableError) {
      return { status: 500, body: { message: error.message } };
    }
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
