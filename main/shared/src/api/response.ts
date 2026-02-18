// main/shared/src/api/response.ts
/**
 * API Response Module
 *
 * Re-exports response schemas from engine/http/response (canonical source)
 * and provides api-level response types and type guards.
 */

import {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
} from '../engine/http/response';

import type {
  ApiResultEnvelope,
  EmptyBody,
  ErrorResponse,
  ErrorResponseEnvelope,
  SuccessResponseEnvelope,
} from '../engine/http/response';

export {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
};

export type {
  ApiResultEnvelope,
  EmptyBody,
  ErrorResponse,
  ErrorResponseEnvelope,
  SuccessResponseEnvelope,
};

