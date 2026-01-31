// modules/auth/src/routes.ts
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
import { emailVerificationRequestSchema, forgotPasswordRequestSchema, loginRequestSchema, registerRequestSchema, resendVerificationRequestSchema, resetPasswordRequestSchema, setPasswordRequestSchema, } from '@abe-stack/core';
import { createRouteMap, protectedRoute, publicRoute, } from '@abe-stack/http';
import { handleForgotPassword, handleLogin, handleLogout, handleLogoutAll, handleRefresh, handleRegister, handleResendVerification, handleResetPassword, handleSetPassword, handleVerifyEmail, } from './handlers';
import { magicLinkRouteEntries } from './magic-link';
import { oauthRouteEntries } from './oauth';
/**
 * Narrow HandlerContext to AppContext.
 * The server composition root ensures the context implements AppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed AppContext
 * @complexity O(1)
 */
function asAppContext(ctx) {
    return ctx;
}
// ============================================================================
// Route Definitions
// ============================================================================
/**
 * Auth route map with all authentication endpoints.
 */
export const authRoutes = createRouteMap([
    [
        'auth/register',
        publicRoute('POST', async (ctx, body, _req, reply) => {
            return handleRegister(asAppContext(ctx), body, reply);
        }, registerRequestSchema),
    ],
    [
        'auth/login',
        publicRoute('POST', async (ctx, body, req, reply) => {
            return handleLogin(asAppContext(ctx), body, req, reply);
        }, loginRequestSchema),
    ],
    [
        'auth/refresh',
        publicRoute('POST', async (ctx, _body, req, reply) => {
            return handleRefresh(asAppContext(ctx), req, reply);
        }),
    ],
    [
        'auth/logout',
        publicRoute('POST', async (ctx, _body, req, reply) => {
            return handleLogout(asAppContext(ctx), req, reply);
        }),
    ],
    [
        'auth/logout-all',
        protectedRoute('POST', (ctx, _body, req, reply) => {
            return handleLogoutAll(asAppContext(ctx), req, reply);
        }),
    ],
    [
        'auth/forgot-password',
        publicRoute('POST', async (ctx, body) => {
            return handleForgotPassword(asAppContext(ctx), body);
        }, forgotPasswordRequestSchema),
    ],
    [
        'auth/reset-password',
        publicRoute('POST', async (ctx, body) => {
            return handleResetPassword(asAppContext(ctx), body);
        }, resetPasswordRequestSchema),
    ],
    [
        'auth/set-password',
        protectedRoute('POST', async (ctx, body, req) => {
            return handleSetPassword(asAppContext(ctx), body, req);
        }, 'user', setPasswordRequestSchema),
    ],
    [
        'auth/verify-email',
        publicRoute('POST', async (ctx, body, _req, reply) => {
            return handleVerifyEmail(asAppContext(ctx), body, reply);
        }, emailVerificationRequestSchema),
    ],
    [
        'auth/resend-verification',
        publicRoute('POST', async (ctx, body) => {
            return handleResendVerification(asAppContext(ctx), body);
        }, resendVerificationRequestSchema),
    ],
    // Magic link routes
    ...magicLinkRouteEntries,
    // OAuth routes
    ...oauthRouteEntries,
]);
//# sourceMappingURL=routes.js.map