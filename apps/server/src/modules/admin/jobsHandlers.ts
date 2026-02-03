// modules/admin/src/jobsHandlers.ts
/**
 * Jobs Handlers
 *
 * HTTP handlers for job monitoring endpoints.
 * All handlers require admin role (enforced by route definitions).
 */

import { ERROR_MESSAGES } from '@abe-stack/auth';
import { PostgresQueueStore, type JobListOptions } from '@abe-stack/db';
import { jobListQuerySchema } from '@abe-stack/shared';

import {
  cancelJob,
  getJobDetails,
  getQueueStats,
  JobNotFoundError,
  listJobs,
  QueueStoreNotAvailableError,
  retryJob,
} from './jobsService';

import type { AdminAppContext } from './types';
import type { JobActionResponse, JobDetails, JobListResponse, QueueStats } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

// ============================================================================
// Helper to get queue store
// ============================================================================

/**
 * Get the PostgresQueueStore from the app context.
 * The queue server stores the queue store reference.
 */
function getQueueStore(ctx: AdminAppContext): PostgresQueueStore {
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
  ctx: AdminAppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobListResponse | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
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
      page: query.page,
      limit: query.limit,
    };
    if (query.status !== undefined) {
      options.status = query.status;
    }
    if (query.name !== undefined) {
      options.name = query.name;
    }
    if (query.sortBy !== undefined) {
      options.sortBy = query.sortBy;
    }
    if (query.sortOrder !== undefined) {
      options.sortOrder = query.sortOrder;
    }

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
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get detailed job information
 */
export async function handleGetJobDetails(
  ctx: AdminAppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobDetails | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
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
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get queue statistics
 */
export async function handleGetQueueStats(
  ctx: AdminAppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: QueueStats | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
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
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Retry a failed job
 */
export async function handleRetryJob(
  ctx: AdminAppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobActionResponse | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
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
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Cancel a pending or processing job
 */
export async function handleCancelJob(
  ctx: AdminAppContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: JobActionResponse | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
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
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
