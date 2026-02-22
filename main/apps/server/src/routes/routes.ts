// main/apps/server/src/routes/routes.ts
/**
 * Route Registration
 *
 * Wires all route maps from @bslt/* packages into the Fastify server.
 * Only the system module remains local (deployment-specific health checks).
 *
 * No re-exports — consumers import directly from source packages.
 */

import { authRoutes, createAuthGuard } from '@bslt/core/auth';
import { userRoutes } from '@bslt/core/users';

import { buildBillingRouteMap } from './billingRouteAdapter';
import { registerBillingWebhookRoutes } from './billingWebhooks';
import { appRouteModuleRegistrations } from './routeModules';

import type {
  RouteDefinition as DbRouteDefinition,
  RouteMap as DbRouteMap,
  HandlerContext,
  RouteOpenApiMeta,
} from '@bslt/server-system';
import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

import { registerRouteMap } from '@/http';

const LOCAL_AUTH_ROUTES = new Set<string>([
  'auth/register',
  'auth/login',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/set-password',
  'auth/verify-email',
  'auth/resend-verification',
  'auth/password/change',
]);

const OAUTH_STRATEGY_KEYS = new Set<string>([
  'google',
  'github',
  'kakao',
  'facebook',
  'microsoft',
  'apple',
]);

function filterAuthRoutesByStrategies(
  routes: DbRouteMap,
  enabledStrategies: readonly string[],
): DbRouteMap {
  const enabled = new Set(enabledStrategies);
  const filtered =
    routes instanceof Map
      ? new Map(routes)
      : new Map<string, DbRouteDefinition>(
          Object.entries(routes as unknown as Record<string, DbRouteDefinition>),
        );

  if (!enabled.has('local')) {
    for (const key of LOCAL_AUTH_ROUTES) {
      filtered.delete(key);
    }
  }

  if (!enabled.has('magic')) {
    for (const key of [...filtered.keys()]) {
      if (key.startsWith('auth/magic-link/')) filtered.delete(key);
    }
  }

  const hasAnyOAuthStrategy = [...enabled].some((s) => OAUTH_STRATEGY_KEYS.has(s));
  if (!hasAnyOAuthStrategy) {
    for (const key of [...filtered.keys()]) {
      if (key.startsWith('auth/oauth/') && key !== 'auth/oauth/providers') {
        filtered.delete(key);
      }
    }
  } else {
    for (const key of [...filtered.keys()]) {
      if (!key.startsWith('auth/oauth/')) continue;
      if (key === 'auth/oauth/providers' || key === 'auth/oauth/connections') continue;

      const segments = key.split('/');
      const provider = segments[2];
      if (provider !== undefined && OAUTH_STRATEGY_KEYS.has(provider) && !enabled.has(provider)) {
        filtered.delete(key);
      }
    }
  }

  return filtered;
}

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
    authGuardFactory: (secret: string, ...roles: string[]): ReturnType<typeof createAuthGuard> =>
      createAuthGuard(secret, ctx.repos, ...(roles as Array<'admin' | 'moderator' | 'user'>)),
  };

  // Cast AppContext to HandlerContext for route registration
  // AppContext structurally satisfies HandlerContext (verified via AppContextSatisfiesBaseContext)
  const handlerCtx = ctx as unknown as HandlerContext;

  // OpenAPI annotations for example routes (shared modules don't include openapi on their types)
  const typedAuthRoutes = authRoutes as unknown as DbRouteMap;
  const filteredAuthRoutes = filterAuthRoutesByStrategies(
    typedAuthRoutes,
    ctx.config.auth.strategies,
  );
  const typedUserRoutes = userRoutes as unknown as DbRouteMap;

  annotateRoutes(filteredAuthRoutes, {
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
    const effectiveRoutes = module === 'auth' ? filteredAuthRoutes : routes;
    registerRouteMap(app, handlerCtx, effectiveRoutes, {
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
