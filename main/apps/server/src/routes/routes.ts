// main/apps/server/src/routes/routes.ts
/**
 * Route Registration
 *
 * Wires all route maps from @abe-stack/* packages into the Fastify server.
 * Only the system module remains local (deployment-specific health checks).
 *
 * No re-exports — consumers import directly from source packages.
 */

import { authRoutes, createAuthGuard } from '@abe-stack/core/auth';
import { userRoutes } from '@abe-stack/core/users';
import { registerRouteMap } from '@abe-stack/server-engine';

import { buildBillingRouteMap } from './billingRouteAdapter';
import { registerBillingWebhookRoutes } from './billingWebhooks';
import { appRouteModuleRegistrations } from './routeModules';

import type {
  HandlerContext,
  RouteDefinition as DbRouteDefinition,
  RouteMap as DbRouteMap,
  RouteOpenApiMeta,
} from '@abe-stack/server-engine';
import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

/**
 * Annotate routes from shared modules with OpenAPI metadata.
 * Shared's BaseRouteDefinition doesn't include `openapi`, but the engine's
 * RouteDefinition does. This merges the metadata at the registration boundary.
 */
function annotateRoutes(
  routes: DbRouteMap | Record<string, DbRouteDefinition>,
  annotations: Record<string, RouteOpenApiMeta>,
): void {
  for (const [path, meta] of Object.entries(annotations)) {
    const route: DbRouteDefinition | undefined =
      routes instanceof Map ? routes.get(path) : routes[path];
    if (route !== undefined) {
      route.openapi = meta;
    }
  }
}

const AUTH_LOGIN_PATH = 'auth/login';
const USERS_ME_PATH = 'users/me';

/**
 * Register all application routes
 *
 * Uses the generic router pattern to eliminate repetitive validation code.
 * Each module defines its routes in a routes.ts file using publicRoute/protectedRoute helpers.
 */
export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const routerOptions = {
    prefix: '/api',
    jwtSecret: ctx.config.auth.jwt.secret,
    authGuardFactory: (
      secret: string,
      ...roles: string[]
    ): ReturnType<typeof createAuthGuard> =>
      createAuthGuard(secret, ctx.repos, ...(roles as Array<'admin' | 'moderator' | 'user'>)),
  };

  // Cast AppContext to HandlerContext for route registration
  // AppContext structurally satisfies HandlerContext (verified via AppContextSatisfiesBaseContext)
  const handlerCtx = ctx as unknown as HandlerContext;

  // OpenAPI annotations for example routes (shared modules don't include openapi on their types)
  const typedAuthRoutes = authRoutes as unknown as DbRouteMap;
  const typedUserRoutes = userRoutes as unknown as DbRouteMap;

  annotateRoutes(typedAuthRoutes, {
    [AUTH_LOGIN_PATH]: {
      summary: 'Login with email/username and password',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          identifier: { type: 'string' },
          password: { type: 'string' },
          captchaToken: { type: 'string' },
        },
        required: ['identifier', 'password'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  });

  annotateRoutes(typedUserRoutes, {
    [USERS_ME_PATH]: {
      summary: 'Get current user profile',
      tags: ['users'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  });

  // Shared module registrations
  for (const { module, routes, prefix } of appRouteModuleRegistrations) {
    registerRouteMap(app, handlerCtx, routes, {
      ...routerOptions,
      ...(prefix !== undefined ? { prefix } : {}),
      module,
    });
  }

  // Billing routes — conditional on provider configuration
  if (ctx.config.billing.enabled) {
    registerRouteMap(app, handlerCtx, buildBillingRouteMap(), {
      ...routerOptions,
      module: 'billing',
    });
    registerBillingWebhookRoutes(app, ctx);
  }
}
