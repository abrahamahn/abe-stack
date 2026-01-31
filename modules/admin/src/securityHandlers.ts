// modules/admin/src/securityHandlers.ts
/**
 * Security Handlers
 *
 * HTTP handlers for security audit endpoints.
 * Thin layer that calls services and formats responses.
 */

import { ERROR_MESSAGES } from '../../../modules/auth/src';

import {
  exportSecurityEvents,
  getSecurityEvent,
  getSecurityMetrics,
  listSecurityEvents,
  SecurityEventNotFoundError,
} from './securityService';

import type { AdminAppContext } from './types';
import type {
  SecurityEvent,
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsListRequest,
  SecurityEventsListResponse,
  SecurityMetrics,
} from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// List Security Events
// ============================================================================

export async function handleListSecurityEvents(
  ctx: AdminAppContext,
  body: SecurityEventsListRequest,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: SecurityEventsListResponse | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const { filter, ...paginationOptions } = body;
    const result = await listSecurityEvents(ctx.db, paginationOptions, filter);

    ctx.log.info(
      { adminId: user.userId, eventCount: result.data.length },
      'Admin listed security events',
    );

    return { status: 200, body: result };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Get Security Event Detail
// ============================================================================

export async function handleGetSecurityEvent(
  ctx: AdminAppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: SecurityEvent | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const params = request.params as { id: string };
    const { id } = params;
    const event = await getSecurityEvent(ctx.db, id);

    ctx.log.info({ adminId: user.userId, eventId: id }, 'Admin viewed security event');

    return { status: 200, body: event };
  } catch (error) {
    if (error instanceof SecurityEventNotFoundError) {
      return { status: 404, body: { message: 'Security event not found' } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Get Security Metrics
// ============================================================================

export async function handleGetSecurityMetrics(
  ctx: AdminAppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: SecurityMetrics | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Parse period from query string
    const query = request.query as { period?: string };
    const periodParam = query.period;
    let period: 'hour' | 'day' | 'week' | 'month' = 'day';
    if (
      typeof periodParam === 'string' &&
      periodParam.length > 0 &&
      ['hour', 'day', 'week', 'month'].includes(periodParam)
    ) {
      period = periodParam as 'hour' | 'day' | 'week' | 'month';
    }

    const metrics = await getSecurityMetrics(ctx.db, period);

    ctx.log.info({ adminId: user.userId, period }, 'Admin viewed security metrics');

    return { status: 200, body: metrics };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Export Security Events
// ============================================================================

export async function handleExportSecurityEvents(
  ctx: AdminAppContext,
  body: SecurityEventsExportRequest,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: SecurityEventsExportResponse | { message: string } }> {
  const user = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const { format, filter } = body;
    const result = await exportSecurityEvents(ctx.db, format, filter);

    ctx.log.info({ adminId: user.userId, format, filter }, 'Admin exported security events');

    return { status: 200, body: result };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
