/**
 * OAuth Routes
 *
 * Route definitions for OAuth authentication endpoints.
 * Uses the generic router pattern for DRY registration.
 * Handlers accept HandlerContext and narrow to AppContext at the call boundary.
 *
 * @module oauth/routes
 */
import { type BaseRouteDefinition } from '@abe-stack/http';
/**
 * OAuth Routes
 *
 * GET  /api/auth/oauth/:provider          - Initiate OAuth flow (redirect to provider)
 * GET  /api/auth/oauth/:provider/callback - Handle OAuth callback
 * POST /api/auth/oauth/:provider/link     - Initiate OAuth linking (authenticated)
 * DELETE /api/auth/oauth/:provider        - Unlink OAuth provider (authenticated)
 * GET  /api/auth/oauth/connections        - Get connected providers (authenticated)
 */
export declare const oauthRouteEntries: Array<[string, BaseRouteDefinition]>;
/**
 * OAuth route map for standalone registration.
 */
export declare const oauthRoutes: import("@abe-stack/http").RouteMap;
//# sourceMappingURL=routes.d.ts.map