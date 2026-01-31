/**
 * Email Verification Handlers
 *
 * Handles email verification and resend verification flows.
 *
 * @module handlers/verify
 */
import type { AppContext, ReplyWithCookies } from '../types';
import type { AuthResponse, HttpErrorResponse } from '@abe-stack/core';
/**
 * Handle email verification.
 * Verifies the token and returns auth credentials for auto-login.
 *
 * @param ctx - Application context
 * @param body - Request body with verification token
 * @param reply - Reply with cookie support
 * @returns Auth response with verified flag or error
 * @complexity O(1)
 */
export declare function handleVerifyEmail(ctx: AppContext, body: {
    token: string;
}, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: AuthResponse & {
        verified: boolean;
    };
} | HttpErrorResponse>;
/**
 * Handle resend verification email.
 * Creates a new verification token and sends the email.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @returns Success response or error
 * @complexity O(1)
 */
export declare function handleResendVerification(ctx: AppContext, body: {
    email: string;
}): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
//# sourceMappingURL=verify.d.ts.map