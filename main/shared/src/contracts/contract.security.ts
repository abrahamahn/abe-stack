// main/shared/src/contracts/contract.security.ts

import { errorResponseSchema } from '../engine/http/response';
import {
  securityEventDetailResponseSchema,
  securityEventsExportRequestSchema,
  securityEventsExportResponseSchema,
  securityEventsListRequestSchema,
  securityEventsListResponseSchema,
  securityMetricsResponseSchema,
} from '../core/admin/admin.security.schemas';

import type { Contract } from '../primitives/api';

/** Security audit API contract (admin-only) */
export const securityContract = {
  listEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/events',
    body: securityEventsListRequestSchema,
    responses: {
      200: securityEventsListResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List security events with pagination and filtering (admin only)',
  },
  getEvent: {
    method: 'GET' as const,
    path: '/api/admin/security/events/:id',
    responses: {
      200: securityEventDetailResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single security event by ID (admin only)',
  },
  getMetrics: {
    method: 'GET' as const,
    path: '/api/admin/security/metrics',
    responses: {
      200: securityMetricsResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get security event metrics for dashboard (admin only)',
  },
  exportEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/export',
    body: securityEventsExportRequestSchema,
    responses: {
      200: securityEventsExportResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Export security events as CSV or JSON (admin only)',
  },
} satisfies Contract;
