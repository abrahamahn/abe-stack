// backend/server/src/common/types/index.ts
/**
 * Shared types for the application
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ServerEnvironment } from '../../env';

/**
 * Request information extracted for logging and security purposes
 */
export interface RequestInfo {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

/**
 * Reply type that supports cookie operations
 */
export interface ReplyWithCookies {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

/**
 * Request type that supports cookie reading
 */
export interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string };
  user?: { userId: string; email: string; role: string };
}

/**
 * Route handler context with environment
 */
export interface RouteContext {
  env: ServerEnvironment;
  request: FastifyRequest;
  reply: FastifyReply;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
