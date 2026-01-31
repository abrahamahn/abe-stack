// modules/auth/src/handlers/register.ts
/**
 * Register Handler
 *
 * Handles new user registration.
 *
 * @module handlers/register
 */
import { mapErrorToHttpResponse } from '@abe-stack/core';
import { registerUser } from '../service';
import { createErrorMapperLogger } from '../types';
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
export async function handleRegister(ctx, body, _reply) {
    try {
        const { email, password, name } = body;
        const baseUrl = ctx.config.server.appBaseUrl;
        const result = await registerUser(ctx.db, ctx.repos, ctx.email, ctx.emailTemplates, ctx.config.auth, email, password, name, baseUrl);
        // No cookies set - user must verify email first
        return {
            status: 201,
            body: result,
        };
    }
    catch (error) {
        // Handle EmailSendError specially for registration: user was created, but email failed
        // Return success with a flag so the user knows to use the resend endpoint
        // Use error.name check instead of instanceof for ESM compatibility
        if (error instanceof Error && error.name === 'EmailSendError') {
            const emailError = error;
            ctx.log.error({ email: body.email, originalError: emailError.originalError?.message }, 'Failed to send verification email after user creation');
            return {
                status: 201,
                body: {
                    status: 'pending_verification',
                    message: 'Account created successfully, but we had trouble sending the verification email. Please use the resend verification option.',
                    email: body.email,
                    emailSendFailed: true,
                },
            };
        }
        // Use error mapper for all errors (including EmailAlreadyExistsError, WeakPasswordError, etc.)
        return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
    }
}
//# sourceMappingURL=register.js.map