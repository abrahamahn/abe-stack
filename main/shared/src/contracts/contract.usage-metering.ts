// main/shared/src/contracts/contract.usage-metering.ts
/**
 * Usage Metering Contracts
 *
 * API contract definitions for usage metering endpoints.
 * @module Contracts/UsageMetering
 */

import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../system/http';
import { usageSummaryResponseSchema } from '../system/usage-metering';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const usageMeteringContract = {
  // Usage summary for authenticated user's billing context
  getBillingUsage: {
    method: 'GET' as const,
    path: '/api/billing/usage',
    responses: {
      200: successResponseSchema(usageSummaryResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get current billing usage summary',
  },

  // Usage summary for a specific tenant
  getTenantUsage: {
    method: 'GET' as const,
    path: '/api/tenants/:id/usage',
    responses: {
      200: successResponseSchema(usageSummaryResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get usage summary for a specific tenant',
  },

  // Record usage for a tenant (admin/internal)
  recordUsage: {
    method: 'POST' as const,
    path: '/api/tenants/:id/usage/record',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(emptyBodySchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Record a usage increment for a tenant (admin)',
  },
} satisfies Contract;
