/**
 * Refresh Handler
 *
 * Handles token refresh using HTTP-only refresh token cookie.
 *
 * @module handlers/refresh
 */
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse, RefreshResponse } from '@abe-stack/core';
/**
 * Handle token refresh.
 * Rotates the refresh token and issues a new access token.
 *
 * @param ctx - Application context
 * @param request - Request with cookies
 * @param reply - Reply with cookie support
 * @returns New tokens or error response
 * @complexity O(1)
 */
export declare function handleRefresh(ctx: AppContext, request: RequestWithCookies, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: RefreshResponse;
} | HttpErrorResponse>;
//# sourceMappingURL=refresh.d.ts.map