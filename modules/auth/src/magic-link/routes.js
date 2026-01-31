// modules/auth/src/magic-link/routes.ts
/**
 * Magic Link Routes
 *
 * Route definitions for magic link authentication.
 * Uses HandlerContext from the generic router and narrows to AppContext.
 *
 * @module magic-link/routes
 */
import { magicLinkRequestSchema, magicLinkVerifySchema, } from '@abe-stack/core';
import { createRouteMap, publicRoute, } from '@abe-stack/http';
import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';
/**
 * Narrow HandlerContext to AppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed AppContext
 * @complexity O(1)
 */
function asAppContext(ctx) {
    return ctx;
}
// ============================================================================
// Route Entries (for merging with parent routes)
// ============================================================================
/**
 * Magic link route entries for merging with parent auth routes.
 */
export const magicLinkRouteEntries = [
    [
        'auth/magic-link/request',
        publicRoute('POST', async (ctx, body, req) => {
            return handleMagicLinkRequest(asAppContext(ctx), body, req);
        }, magicLinkRequestSchema),
    ],
    [
        'auth/magic-link/verify',
        publicRoute('POST', async (ctx, body, req, reply) => {
            return handleMagicLinkVerify(asAppContext(ctx), body, req, reply);
        }, magicLinkVerifySchema),
    ],
];
// ============================================================================
// Route Map (for standalone use)
// ============================================================================
/**
 * Magic link route map for standalone registration.
 */
export const magicLinkRoutes = createRouteMap(magicLinkRouteEntries);
//# sourceMappingURL=routes.js.map