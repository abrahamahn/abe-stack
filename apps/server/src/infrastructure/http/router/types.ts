// apps/server/src/infrastructure/http/router/types.ts
/**
 * Router Types
 *
 * Type definitions for the generic route registration pattern.
 * Adopted from Chet-stack's API registration approach.
 */

import type { AppContext } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Schema Interface
// ============================================================================

/**
 * Minimal schema interface compatible with Zod schemas
 * Avoids direct dependency on zod package
 * Updated for Zod v4 compatibility where path can include symbols (PropertyKey)
 */
export interface ValidationSchema<T = unknown> {
  safeParse(data: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: Array<{ path: PropertyKey[]; message: string; code: string }> };
      };
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Route handler result
 */
export interface RouteResult<T = unknown> {
  status: number;
  body: T;
}

/**
 * Public route handler (no auth required)
 */
export type PublicHandler<TBody = unknown, TResult = unknown> = (
  ctx: AppContext,
  body: TBody,
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;

/**
 * Protected route handler (auth required)
 */
export type ProtectedHandler<TBody = unknown, TResult = unknown> = (
  ctx: AppContext,
  body: TBody,
  request: FastifyRequest & { user: { userId: string; email: string; role: string } },
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;

/**
 * Route handler (either public or protected)
 */
export type RouteHandler<TBody = unknown, TResult = unknown> =
  | PublicHandler<TBody, TResult>
  | ProtectedHandler<TBody, TResult>;

// ============================================================================
// Route Definition Types
// ============================================================================

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Base route definition without generics for use in RouteMap
 * This allows mixing different typed route definitions in a single map
 */
export interface BaseRouteDefinition {
  /** HTTP method */
  method: HttpMethod;
  /** Schema for body validation (optional for GET/DELETE) */
  schema?: ValidationSchema;
  /** Route handler - accepts generic handler for flexibility */
  handler: (
    ctx: AppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<RouteResult>;
  /** Required role (undefined = public, 'user' = any authenticated, 'admin' = admin only) */
  auth?: 'user' | 'admin';
}

/**
 * Typed route definition for use with helper functions
 * Provides type safety at the handler level
 */
export interface RouteDefinition<TBody = unknown, TResult = unknown> {
  /** HTTP method */
  method: HttpMethod;
  /** Schema for body validation (optional for GET/DELETE) */
  schema?: ValidationSchema<TBody>;
  /** Route handler */
  handler: RouteHandler<TBody, TResult>;
  /** Required role (undefined = public, 'user' = any authenticated, 'admin' = admin only) */
  auth?: 'user' | 'admin';
}

/**
 * Route map (path -> definition)
 * Uses BaseRouteDefinition to allow mixing typed route definitions.
 * Type safety is preserved at the handler level through helper functions.
 */
export type RouteMap = Record<string, BaseRouteDefinition>;

// ============================================================================
// Router Options
// ============================================================================

export interface RouterOptions {
  /** Base path prefix (e.g., '/api') */
  prefix?: string;
  /** JWT secret for auth guards */
  jwtSecret: string;
}
