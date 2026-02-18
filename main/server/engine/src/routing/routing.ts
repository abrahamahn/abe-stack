// main/server/engine/src/routing/routing.ts
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

import { HTTP_STATUS } from '@abe-stack/shared';

import { registerRoute } from './route-registry';

import type { BaseContext } from '@abe-stack/shared';
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

/** JSON Schema object for OpenAPI route metadata */
export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

/** OpenAPI metadata that can be attached to a route */
export interface RouteOpenApiMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  body?: JsonSchemaObject;
  params?: JsonSchemaObject;
  querystring?: JsonSchemaObject;
  response?: Record<number, JsonSchemaObject>;
  hide?: boolean;
  /** OpenAPI security requirements. Set to `[]` for explicitly unsecured routes. */
  security?: Array<Record<string, string[]>>;
}

/** Deprecation metadata for sunset routes */
export interface RouteDeprecation {
  /** ISO 8601 date when the route will be removed */
  sunset?: string;
  /** Human-readable deprecation message */
  message?: string;
}

export interface RouteDefinition {
  method: HttpMethod;
  handler: RouteHandler;
  isPublic: boolean;
  roles?: string[];
  schema?: RouteSchema;
  /** Optional OpenAPI metadata for swagger docs */
  openapi?: RouteOpenApiMeta;
  /** Mark route as deprecated — adds Sunset and Deprecation response headers */
  deprecated?: RouteDeprecation;
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
  openapi?: RouteOpenApiMeta,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: true,
    ...(schema !== undefined ? { schema } : {}),
    ...(openapi !== undefined ? { openapi } : {}),
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
  openapi?: RouteOpenApiMeta,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: false,
    roles: Array.isArray(roles) ? roles : roles !== '' ? [roles] : [],
    ...(schema !== undefined ? { schema } : {}),
    ...(openapi !== undefined ? { openapi } : {}),
  };
}

export type AuthGuardFactory = (secret: string, ...allowedRoles: string[]) => preHandlerHookHandler;

export interface RouterOptions {
  prefix: string;
  jwtSecret: string;
  authGuardFactory: AuthGuardFactory;
  /** Logical module name for route registry, e.g. "auth", "users". Auto-derived from path if omitted. */
  module?: string;
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
 * Derive the logical module name from a route path.
 *
 * Strips the prefix and takes the first path segment.
 * Example: "/api/auth/login" with prefix "/api" -> "auth"
 */
function deriveModule(fullPath: string, prefix: string): string {
  const relative = fullPath.replace(prefix, '').replace(/^\/+/, '');
  return relative.split('/')[0] ?? 'unknown';
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
            void reply.status(HTTP_STATUS.BAD_REQUEST).send({ message: errorMessage });
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

    // Determine auth requirements.  Engine RouteDefinition uses `isPublic` + `roles`.
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
