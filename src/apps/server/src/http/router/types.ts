// apps/server/src/http/router/types.ts
/**
 * Router Types
 *
 * Type definitions for the generic route registration pattern.
 * Adopted from Chet-stack's API registration approach.
 *
 * Uses a generic HandlerContext type so the router is framework-agnostic.
 * The server maps its AppContext to this type at integration time.
 */

import type { BaseContext } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Context Type
// ============================================================================

/**
 * Handler context type backed by the shared BaseContext contract.
 *
 * All handler contexts must provide `db`, `repos`, and `log` at minimum.
 * The server's `AppContext` structurally satisfies this (and adds more services),
 * so no casting is needed when passing AppContext to package handlers.
 */
export type HandlerContext = BaseContext;

// ============================================================================
// Schema Interface
// ============================================================================

/**
 * Minimal schema interface for validation.
 * Compatible with the manual validation schemas in @abe-stack/shared.
 */
export interface ValidationSchema<T = unknown> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: Error };
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
 *
 * @param ctx - The handler context (mapped from server's AppContext)
 * @param body - The validated request body
 * @param request - The Fastify request object
 * @param reply - The Fastify reply object
 * @returns Promise resolving to a RouteResult with status and body
 */
export type PublicHandler<TBody = unknown, TResult = unknown> = (
  ctx: HandlerContext,
  body: TBody,
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;

/**
 * Protected route handler (auth required)
 *
 * @param ctx - The handler context (mapped from server's AppContext)
 * @param body - The validated request body
 * @param request - The Fastify request with user information
 * @param reply - The Fastify reply object
 * @returns Promise resolving to a RouteResult with status and body
 */
export type ProtectedHandler<TBody = unknown, TResult = unknown> = (
  ctx: HandlerContext,
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
    ctx: HandlerContext,
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
// Auth Guard Types
// ============================================================================

/**
 * Auth guard function type (Fastify preHandler hook).
 * This is injected by the server, keeping the router decoupled from auth logic.
 */
export type AuthGuardHook = (
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void,
) => void;

/**
 * Factory function that creates auth guards.
 * Accepts a JWT secret and optional role, returns a Fastify preHandler hook.
 *
 * @param jwtSecret - The JWT secret for token verification
 * @param role - Optional role requirement ('admin' restricts to admin users)
 * @returns A Fastify preHandler hook function
 */
export type AuthGuardFactory = (jwtSecret: string, role?: string) => AuthGuardHook;

// ============================================================================
// Router Options
// ============================================================================

export interface RouterOptions {
  /** Base path prefix (e.g., '/api') */
  prefix?: string;
  /** JWT secret for auth guards */
  jwtSecret: string;
  /** Auth guard factory function (injected by server) */
  authGuardFactory: AuthGuardFactory;
}
