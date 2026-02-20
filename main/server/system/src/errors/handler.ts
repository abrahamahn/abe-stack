// main/server/system/src/errors/handler.ts
/**
 * Global Fastify Error Handler
 *
 * Converts all thrown errors into consistent HTTP responses using the
 * canonical mapper from @bslt/shared. Centralises the error→response
 * concern so individual route handlers never need to replicate this logic.
 */

import {
  AppError,
  BadRequestError,
  formatValidationErrors,
  mapErrorToHttpResponse,
} from '@bslt/shared/system';

import { replyError } from './reply';

import type { HttpReply } from '../routing/http.types';
import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Fastify's built-in JSON Schema validation error shape (ajv).
 * Present on errors thrown by Fastify itself when request body/params fail schema validation.
 */
interface FastifyValidationError extends Error {
  validation: Array<{ message?: string; instancePath?: string; schemaPath?: string }>;
  validationContext?: string;
}

/**
 * Zod-duck-typed error shape. We detect this structurally to avoid a
 * hard dependency on Zod in this adapter layer.
 */
interface ZodLikeError {
  issues: Array<{ path: ReadonlyArray<string | number>; message: string; code: string }>;
}

// ============================================================================
// Guards
// ============================================================================

function isFastifyValidationError(error: unknown): error is FastifyValidationError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'validation' in error &&
    Array.isArray((error as FastifyValidationError).validation)
  );
}

function isZodLikeError(error: unknown): error is ZodLikeError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as ZodLikeError).issues)
  );
}

// ============================================================================
// Handler registration
// ============================================================================

/**
 * Registers a global Fastify error handler that maps all thrown errors to
 * consistent JSON responses.
 *
 * Priority:
 *  1. Fastify JSON-schema validation errors → 400
 *  2. Zod-duck-typed errors (has `issues` array) → 422 with field map
 *  3. `AppError` subclasses → status from error
 *  4. Generic `Error` / unknown → 500 (message redacted)
 *
 * Logging:
 *  - 5xx → `error` level (full error object + request context)
 *  - 4xx → `warn` level (summary only, no stack trace)
 *
 * @param server - The Fastify instance to attach the handler to
 */
export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply): void => {
    // `request.logger` is typed as always-defined by Fastify, but in practice it
    // may be undefined when an error fires before the onRequest lifecycle hook
    // runs (e.g. a plugin throwing during server startup / route registration).
    // We cast through `unknown` to expose that runtime optionality and fall back
    // to the server-level logger so we never crash with "Cannot read properties
    // of undefined".
    const log = (request.logger as unknown as FastifyBaseLogger | undefined) ?? server.log;

    // ── 1. Fastify JSON-schema validation (ajv) ──────────────────────────
    if (isFastifyValidationError(error)) {
      log.warn(
        {
          method: request.method,
          url: request.url,
          validationContext: error.validationContext,
          errors: error.validation,
        },
        'Request schema validation failed',
      );
      replyError(reply as unknown as HttpReply, new BadRequestError('Request validation failed'), request.correlationId);
      return;
    }

    // ── 2. Zod duck-typed errors ──────────────────────────────────────────
    if (isZodLikeError(error)) {
      log.warn(
        { method: request.method, url: request.url, issueCount: error.issues.length },
        'Zod validation failed',
      );
      void reply.status(422).send(formatValidationErrors(error.issues));
      return;
    }

    // ── 3 & 4. AppError subclasses + generic errors via mapper ────────────
    const response = mapErrorToHttpResponse(error, log);

    if (response.status >= 500) {
      log.error(
        {
          err: error,
          method: request.method,
          url: request.url,
          statusCode: response.status,
          ip: request.ip,
        },
        'Server error',
      );
    } else {
      // AppError subclasses handled here (4xx) — summary only, no stack
      if (!(error instanceof AppError)) {
        // Rare: non-AppError that mapped to <500 — still warn
        log.warn(
          { errorName: error.name, statusCode: response.status },
          'Unexpected non-AppError mapped to 4xx',
        );
      } else {
        log.warn(
          {
            code: error.code,
            message: error.message,
            statusCode: response.status,
            method: request.method,
            url: request.url,
          },
          'Client error',
        );
      }
    }

    void reply.status(response.status).send({ ok: false, error: response.body });
  });
}
