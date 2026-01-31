/**
 * Auth Routes
 *
 * Route definitions for auth module.
 * Uses the generic router pattern for DRY registration.
 *
 * Route handlers accept HandlerContext (Record<string, unknown>) from the
 * generic router and narrow it to AppContext at the call boundary.
 * This keeps the auth package decoupled from the server's concrete context.
 *
 * @module routes
 */
/**
 * Auth route map with all authentication endpoints.
 */
export declare const authRoutes: import("@abe-stack/http").RouteMap;
//# sourceMappingURL=routes.d.ts.map