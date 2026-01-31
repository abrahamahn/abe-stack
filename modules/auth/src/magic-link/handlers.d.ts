/**
 * Magic Link Handlers
 *
 * HTTP handlers for magic link authentication.
 * Thin layer that calls services and formats responses.
 *
 * @module magic-link/handlers
 */
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { AuthResponse, HttpErrorResponse, MagicLinkRequest, MagicLinkRequestResponse } from '@abe-stack/core';
/**
 * Handle magic link request.
 * Always returns success to prevent email enumeration.
 * Rate limiting is handled by the service.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @param request - Request with cookies and request info
 * @returns Magic link request response or error
 * @complexity O(1)
 */
export declare function handleMagicLinkRequest(ctx: AppContext, body: MagicLinkRequest, request: RequestWithCookies): Promise<{
    status: 200;
    body: MagicLinkRequestResponse;
} | HttpErrorResponse>;
/**
 * Handle magic link verification.
 * Verifies the token and returns auth credentials on success.
 *
 * @param ctx - Application context
 * @param body - Request body with token
 * @param request - Request with cookies and request info
 * @param reply - Reply with cookie support
 * @returns Auth response or error
 * @complexity O(1)
 */
export declare function handleMagicLinkVerify(ctx: AppContext, body: {
    token: string;
}, request: RequestWithCookies, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: AuthResponse;
} | HttpErrorResponse>;
//# sourceMappingURL=handlers.d.ts.map