/**
 * Login Handler
 *
 * Handles user authentication via email/password.
 *
 * @module handlers/login
 */
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { AuthResponse, HttpErrorResponse, LoginRequest } from '@abe-stack/core';
/**
 * Handle user login via email and password.
 *
 * @param ctx - Application context
 * @param body - Login request body (email + password)
 * @param request - Request with cookies and request info
 * @param reply - Reply with cookie support
 * @returns Auth response with tokens or error response
 * @complexity O(1)
 */
export declare function handleLogin(ctx: AppContext, body: LoginRequest, request: RequestWithCookies, reply: ReplyWithCookies): Promise<{
    status: 200;
    body: AuthResponse;
} | HttpErrorResponse>;
//# sourceMappingURL=login.d.ts.map