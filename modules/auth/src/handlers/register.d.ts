/**
 * Register Handler
 *
 * Handles new user registration.
 *
 * @module handlers/register
 */
import { type RegisterResult } from '../service';
import type { AppContext, ReplyWithCookies } from '../types';
import type { HttpErrorResponse, RegisterRequest } from '@abe-stack/core';
export type { RegisterResult } from '../service';
/**
 * Handle new user registration.
 * Creates user with unverified email and sends verification email.
 *
 * @param ctx - Application context
 * @param body - Registration request body (email + password + optional name)
 * @param _reply - Reply with cookie support (unused - no cookies set before verification)
 * @returns Registration result or error
 * @complexity O(1)
 */
export declare function handleRegister(ctx: AppContext, body: RegisterRequest, _reply: ReplyWithCookies): Promise<{
    status: 201;
    body: RegisterResult & {
        emailSendFailed?: boolean;
    };
} | HttpErrorResponse>;
//# sourceMappingURL=register.d.ts.map