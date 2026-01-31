/**
 * Logout All Devices Handler
 *
 * Revokes all refresh tokens for a user, logging them out of all devices.
 *
 * @module handlers/logout-all
 */
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@abe-stack/core';
/**
 * Handle logout from all devices.
 * Revokes all user tokens and clears the current cookie.
 *
 * @param ctx - Application context
 * @param request - Request with cookies and auth info
 * @param reply - Reply with cookie support
 * @returns Success response or error
 * @complexity O(1)
 */
export declare function handleLogoutAll(ctx: AppContext, request: RequestWithCookies, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
//# sourceMappingURL=logout-all.d.ts.map