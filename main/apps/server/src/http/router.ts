// main/apps/server/src/http/router.ts
/**
 * Fastify Route Registration
 *
 * Bridges the framework-agnostic RouteMap (from @bslt/server-system) into
 * Fastify. Adapts FastifyRequest/FastifyReply to the abstract HttpRequest/
 * HttpReply interfaces so route handlers in server/core remain decoupled.
 *
 * Handles three schema formats:
 * - ValidationSchema (safeParse): validated in the handler wrapper
 * - FastifySchema (properties): registered with Fastify for native validation
 * - No schema: body passed through unvalidated
 *
 * @module router
 */

import { registerRoute } from '@bslt/server-system';
import { HTTP_STATUS } from '@bslt/shared/system';

import type {
  HandlerContext,
  HttpReply,
  HttpRequest,
  RouteMap,
  ValidationSchema,
} from '@bslt/server-system';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RouteOptions,
  preHandlerHookHandler,
} from 'fastify';

// ============================================================================
// Types
// ============================================================================

export type AuthGuardFactory = (secret: string, ...allowedRoles: string[]) => preHandlerHookHandler;

export interface RouterOptions {
  prefix: string;
  jwtSecret: string;
  authGuardFactory: AuthGuardFactory;
  /** Logical module name for route registry, e.g. "auth", "users". Auto-derived from path if omitted. */
  module?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect whether a schema supports `safeParse` (ValidationSchema).
 * @complexity O(1)
 */
function hasSafeParse(s: unknown): s is ValidationSchema {
  if (typeof s !== 'object' || s === null || !('safeParse' in s)) return false;
  return typeof (s as Record<string, unknown>)['safeParse'] === 'function';
}

/**
 * Derive the logical module name from a route path.
 * Example: "/api/auth/login" with prefix "/api" -> "auth"
 */
function deriveModule(fullPath: string, prefix: string): string {
  const relative = fullPath.replace(prefix, '').replace(/^\/+/, '');
  return relative.split('/')[0] ?? 'unknown';
}

/**
 * Adapt a FastifyRequest to the abstract HttpRequest interface.
 * FastifyRequest is structurally a superset of HttpRequest.
 */
function adaptRequest(req: FastifyRequest): HttpRequest {
  return req as unknown as HttpRequest;
}

/**
 * Adapt a FastifyReply to the abstract HttpReply interface.
 * FastifyReply is structurally a superset of HttpReply.
 */
function adaptReply(reply: FastifyReply): HttpReply {
  return reply as unknown as HttpReply;
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all routes from a RouteMap into a Fastify instance.
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
            void reply.status(HTTP_STATUS.BAD_REQUEST).send({ message: errorMessage });
            return;
          }
          body = parseResult.data;
        }

        const result = await route.handler(ctx, body, adaptRequest(req), adaptReply(reply));

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

    // Determine auth requirements. Engine RouteDefinition uses `isPublic` + `roles`.
    // Shared BaseRouteDefinition uses `auth` ('user' | 'admin' | undefined).
    // Support both formats so shared routes work without manual adaptation.
    const sharedAuth = (route as unknown as { auth?: string }).auth;
    const isPublic = route.isPublic;
    const roles = route.roles ?? (sharedAuth !== undefined ? [sharedAuth] : []);

    if (!isPublic) {
      baseOptions.preHandler = options.authGuardFactory(options.jwtSecret, ...roles);
    }

    if (
      route.schema !== undefined &&
      typeof route.schema === 'object' &&
      !hasSafeParse(route.schema) &&
      'properties' in route.schema
    ) {
      baseOptions.schema = route.schema as FastifySchema;
    }

    // Merge OpenAPI metadata into Fastify schema for @fastify/swagger
    if (route.openapi !== undefined) {
      const openapi = route.openapi;
      const schema = (baseOptions.schema ?? {}) as Record<string, unknown>;

      if (openapi.summary !== undefined) schema['summary'] = openapi.summary;
      if (openapi.description !== undefined) schema['description'] = openapi.description;
      if (openapi.tags !== undefined) schema['tags'] = openapi.tags;
      if (openapi.body !== undefined) schema['body'] = openapi.body;
      if (openapi.params !== undefined) schema['params'] = openapi.params;
      if (openapi.querystring !== undefined) schema['querystring'] = openapi.querystring;
      if (openapi.response !== undefined) schema['response'] = openapi.response;
      if (openapi.hide !== undefined) schema['hide'] = openapi.hide;

      baseOptions.schema = schema as FastifySchema;
    }

    // Auto-inject security metadata for Swagger
    {
      const schema = (baseOptions.schema ?? {}) as Record<string, unknown>;
      if (route.openapi?.security !== undefined) {
        schema['security'] = route.openapi.security;
      } else if (!isPublic) {
        schema['security'] = [{ bearerAuth: [] }];
      }
      if (Object.keys(schema).length > 0) {
        baseOptions.schema = schema as FastifySchema;
      }
    }

    // Add deprecation headers via onSend hook if route is deprecated
    if (route.deprecated !== undefined) {
      const deprecation = route.deprecated;
      app.addHook('onSend', async (request, reply) => {
        if (request.url === fullPath || request.routeOptions.url === path) {
          reply.header('Deprecation', 'true');
          if (deprecation.sunset !== undefined) {
            reply.header('Sunset', deprecation.sunset);
          }
          if (deprecation.message !== undefined) {
            reply.header('X-Deprecation-Notice', deprecation.message);
          }
        }
      });
    }

    app.route(baseOptions as RouteOptions);

    // Feed the route registry
    registerRoute({
      path: fullPath,
      method: route.method,
      isPublic,
      roles,
      hasSchema: route.schema !== undefined,
      module: options.module ?? deriveModule(fullPath, options.prefix),
      deprecated: route.deprecated !== undefined,
      ...(route.openapi?.summary !== undefined ? { summary: route.openapi.summary } : {}),
      ...(route.openapi?.tags !== undefined ? { tags: route.openapi.tags } : {}),
    });
  }
}
