/**
 * Logout Handler
 *
 * Handles user logout by revoking refresh token and clearing cookie.
 *
 * @module handlers/logout
 */
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse, LogoutResponse } from '@abe-stack/core';
/**
 * Handle user logout.
 * Revokes the refresh token and clears the cookie.
 *
 * @param ctx - Application context
 * @param request - Request with cookies
 * @param reply - Reply with cookie support
 * @returns Success response or error
 * @complexity O(1)
 */
export declare function handleLogout(ctx: AppContext, request: RequestWithCookies, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: LogoutResponse;
} | HttpErrorResponse>;
//# sourceMappingURL=logout.d.ts.map