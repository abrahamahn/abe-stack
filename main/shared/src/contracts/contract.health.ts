// main/shared/src/contracts/contract.health.ts
/**
 * Health Contracts
 *
 * API contract definitions for health, readiness, and liveness probes.
 * Responses are NOT wrapped in successResponseSchema — consumed by
 * infrastructure tooling expecting flat JSON.
 * @module Contracts/Health
 */

import {
  detailedHealthResponseSchema,
  liveResponseSchema,
  readyResponseSchema,
} from '../system/health';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const healthContract = {
  health: {
    method: 'GET' as const,
    path: '/health',
    responses: {
      200: detailedHealthResponseSchema,
    },
    summary: 'Detailed health check with service statuses',
  },

  ready: {
    method: 'GET' as const,
    path: '/ready',
    responses: {
      200: readyResponseSchema,
    },
    summary: 'Readiness probe for load balancer',
  },

  live: {
    method: 'GET' as const,
    path: '/live',
    responses: {
      200: liveResponseSchema,
    },
    summary: 'Liveness probe for orchestrator',
  },
} satisfies Contract;
