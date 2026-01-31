/**
 * Magic Link Module
 *
 * Passwordless authentication via magic links.
 *
 * @module magic-link
 */
export { magicLinkRouteEntries, magicLinkRoutes } from './routes';
export { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';
export { cleanupExpiredMagicLinkTokens, requestMagicLink, verifyMagicLink, type MagicLinkRequestOptions, type MagicLinkResult, type RequestMagicLinkResult, } from './service';
//# sourceMappingURL=index.d.ts.map