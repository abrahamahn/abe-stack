/**
 * Password Handlers
 *
 * Handles forgot password, reset password, and set password flows.
 *
 * @module handlers/password
 */
import type { AppContext, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@abe-stack/core';
/**
 * Handle forgot password request.
 * Always returns success to prevent user enumeration.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @returns Success response (always, for enumeration prevention)
 * @complexity O(1)
 */
export declare function handleForgotPassword(ctx: AppContext, body: {
    email: string;
}): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
/**
 * Handle password reset with token.
 *
 * @param ctx - Application context
 * @param body - Request body with token and new password
 * @returns Success response or error
 * @complexity O(1)
 */
export declare function handleResetPassword(ctx: AppContext, body: {
    token: string;
    password: string;
}): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
/**
 * Handle set password for magic-link-only users.
 *
 * @param ctx - Application context
 * @param body - Request body with new password
 * @param req - Request with auth info
 * @returns Success response or error
 * @complexity O(1)
 */
export declare function handleSetPassword(ctx: AppContext, body: {
    password: string;
}, req: RequestWithCookies): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
//# sourceMappingURL=password.d.ts.map