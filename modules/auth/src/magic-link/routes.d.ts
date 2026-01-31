/**
 * Magic Link Routes
 *
 * Route definitions for magic link authentication.
 * Uses HandlerContext from the generic router and narrows to AppContext.
 *
 * @module magic-link/routes
 */
import { type BaseRouteDefinition } from '@abe-stack/http';
/**
 * Magic link route entries for merging with parent auth routes.
 */
export declare const magicLinkRouteEntries: Array<[string, BaseRouteDefinition]>;
/**
 * Magic link route map for standalone registration.
 */
export declare const magicLinkRoutes: import("@abe-stack/http").RouteMap;
//# sourceMappingURL=routes.d.ts.map