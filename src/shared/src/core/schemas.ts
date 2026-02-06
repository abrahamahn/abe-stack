// packages/shared/src/core/schemas.ts

/**
 * @file Common Schemas (Re-exports)
 * @description Re-exports validation schemas from contracts/common for backward compatibility.
 * All schemas are now implemented using the manual createSchema system.
 * @module Shared/Schemas
 * @deprecated Import directly from '../contracts/common' instead.
 */

import { createErrorCodeSchema } from '../contracts/common';

import { ERROR_CODES } from './constants';

export {
  apiResultSchema,
  emailSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema as errorResponseSchema,
  isoDateTimeSchema,
  passwordSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponseEnvelope as ErrorResponse,
  type SuccessResponseEnvelope,
} from '../contracts/common';

/**
 * Error code validation schema.
 * Validates that the value is a known application error code.
 */
export const errorCodeSchema = createErrorCodeSchema(ERROR_CODES);
