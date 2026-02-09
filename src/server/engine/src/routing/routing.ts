// src/server/engine/src/routing/routing.ts
/**
 * Fastify Route Registration
 *
 * Generic router pattern for registering route maps into Fastify.
 * Handles three schema formats:
 * - ValidationSchema (safeParse): validated in the handler wrapper
 * - FastifySchema (properties): registered with Fastify for native validation
 * - No schema: body passed through unvalidated
 *
 * @module routing
 */

import type { BaseContext } from '@abe-stack/shared/core';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RouteOptions,
  preHandlerHookHandler,
} from 'fastify';

/**
 * Handler context type backed by the shared BaseContext contract.
 *
 * All handler contexts provide `db`, `repos`, and `log` at minimum.
 * Concrete contexts (e.g. AppContext) structurally satisfy this via
 * TypeScript structural subtyping -- no casting needed.
 */
export type HandlerContext = BaseContext;

export type RouteResult<T = unknown> = T;

export type RouteHandler<Body = unknown, Response = unknown> = (
  ctx: HandlerContext,
  body: Body,
  req: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult<Response>> | RouteResult<Response>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Validation schema interface compatible with `@abe-stack/shared` Schema<T>.
 * Accepts objects with `parse` and `safeParse` methods (e.g.,
 * custom Schema<T> from shared contracts).
 *
 * @complexity O(1)
 */
export interface ValidationSchema {
  parse: (data: unknown) => unknown;
  safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: unknown };
}

/** Union type for all accepted schema formats */
export type RouteSchema = FastifySchema | ValidationSchema;

export interface RouteDefinition {
  method: HttpMethod;
  handler: RouteHandler;
  isPublic: boolean;
  roles?: string[];
  schema?: RouteSchema;
}

export type RouteMap = Map<string, RouteDefinition>;

/**
 * Create a RouteMap from an array of [path, definition] tuples.
 * @param routes - Array of [path, RouteDefinition] entries
 * @returns Map of path to RouteDefinition
 * @complexity O(n) where n is number of routes
 */
export function createRouteMap(routes: [string, RouteDefinition][]): RouteMap {
  return new Map(routes);
}

/**
 * Create a public (unauthenticated) route definition.
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param handler - Route handler function
 * @param schema - Optional validation schema
 * @returns RouteDefinition marked as public
 * @complexity O(1)
 */
export function publicRoute<Body = unknown, Response = unknown>(
  method: HttpMethod,
  handler: RouteHandler<Body, Response>,
  schema?: RouteSchema,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: true,
    ...(schema !== undefined ? { schema } : {}),
  };
}

/**
 * Create a protected (authenticated) route definition.
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param handler - Route handler function
 * @param roles - Required roles (string or array)
 * @param schema - Optional validation schema
 * @returns RouteDefinition marked as protected with roles
 * @complexity O(1)
 */
export function protectedRoute<Body = unknown, Response = unknown>(
  method: HttpMethod,
  handler: RouteHandler<Body, Response>,
  roles: string | string[] = [],
  schema?: RouteSchema,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: false,
    roles: Array.isArray(roles) ? roles : roles !== '' ? [roles] : [],
    ...(schema !== undefined ? { schema } : {}),
  };
}

export type AuthGuardFactory = (secret: string, ...allowedRoles: string[]) => preHandlerHookHandler;

export interface RouterOptions {
  prefix: string;
  jwtSecret: string;
  authGuardFactory: AuthGuardFactory;
}

/**
 * Detect whether a schema supports `safeParse` (ValidationSchema).
 * Used to validate request bodies before passing to handlers.
 *
 * @param s - Route schema to check
 * @returns True if the schema has a callable safeParse method
 * @complexity O(1)
 */
function hasSafeParse(s: RouteSchema): s is ValidationSchema {
  if (typeof s !== 'object' || !('safeParse' in s)) return false;
  const obj = s as unknown as Record<string, unknown>;
  return typeof obj['safeParse'] === 'function';
}

/**
 * Register all routes from a RouteMap into a Fastify instance.
 *
 * Handles three schema formats:
 * - ValidationSchema (safeParse): validated in the handler wrapper
 * - FastifySchema (properties): registered with Fastify for native validation
 * - No schema: body passed through unvalidated
 *
 * @param app - Fastify instance to register routes with
 * @param ctx - Handler context providing db, repos, log, etc.
 * @param routes - RouteMap of path → RouteDefinition entries
 * @param options - Router options with prefix, jwtSecret, authGuardFactory
 * @complexity O(n) where n is the number of routes in the map
 */
export function registerRouteMap(
  app: FastifyInstance,
  ctx: HandlerContext,
  routes: RouteMap,
  options: RouterOptions,
): void {
  for (const [path, route] of routes) {
    const fullPath = `${options.prefix}/${path}`.replace(/\/+/g, '/');

    const baseOptions: Partial<RouteOptions> = {
      method: route.method,
      url: fullPath,
      handler: async (req: FastifyRequest, reply: FastifyReply) => {
        let body: unknown = req.body;

        // Validate body with ValidationSchema if present
        if (route.schema !== undefined && hasSafeParse(route.schema)) {
          const parseResult = route.schema.safeParse(body);
          if (!parseResult.success) {
            const errorMessage =
              parseResult.error instanceof Error ? parseResult.error.message : 'Validation failed';
            void reply.status(400).send({ message: errorMessage });
            return;
          }
          body = parseResult.data;
        }

        const result = await route.handler(ctx, body, req, reply);

        // Handle { status, body } response pattern used by module handlers
        if (
          result !== null &&
          result !== undefined &&
          typeof result === 'object' &&
          'status' in result &&
          typeof (result as Record<string, unknown>)['status'] === 'number' &&
          'body' in result
        ) {
          const typed = result as { status: number; body: unknown };
          void reply.status(typed.status).send(typed.body);
          return;
        }

        return result;
      },
    };

    if (!route.isPublic) {
      baseOptions.preHandler = options.authGuardFactory(options.jwtSecret, ...(route.roles ?? []));
    }

    if (
      route.schema !== undefined &&
      typeof route.schema === 'object' &&
      !hasSafeParse(route.schema) &&
      'properties' in route.schema
    ) {
      baseOptions.schema = route.schema as FastifySchema;
    }

    app.route(baseOptions as RouteOptions);
  }
}
