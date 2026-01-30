// apps/server/src/modules/auth/handlers/register.ts
/**
 * Register Handler
 *
 * Handles new user registration.
 */

import { registerUser, type RegisterResult } from '../service';
import { mapErrorToResponse, type AppContext, type ReplyWithCookies } from '@shared';

import type { RegisterRequest } from '@abe-stack/core';

export type { RegisterResult } from '../service';

export async function handleRegister(
  ctx: AppContext,
  body: RegisterRequest,
  _reply: ReplyWithCookies,
): Promise<
  | { status: 201; body: RegisterResult & { emailSendFailed?: boolean } }
  | { status: number; body: { message: string; code?: string; email?: string } }
> {
  try {
    const { email, password, name } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    const result = await registerUser(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.config.auth,
      email,
      password,
      name,
      baseUrl,
    );

    // No cookies set - user must verify email first
    return {
      status: 201,
      body: result,
    };
  } catch (error) {
    // Handle EmailSendError specially for registration: user was created, but email failed
    // Return success with a flag so the user knows to use the resend endpoint
    // Use error.name check instead of instanceof for ESM compatibility
    if (error instanceof Error && error.name === 'EmailSendError') {
      const emailError = error as Error & { originalError?: Error };
      ctx.log.error(
        { email: body.email, originalError: emailError.originalError?.message },
        'Failed to send verification email after user creation',
      );
      return {
        status: 201,
        body: {
          status: 'pending_verification',
          message:
            'Account created successfully, but we had trouble sending the verification email. Please use the resend verification option.',
          email: body.email,
          emailSendFailed: true,
        },
      };
    }

    // Use error mapper for all errors (including EmailAlreadyExistsError, WeakPasswordError, etc.)
    return mapErrorToResponse(error, ctx);
  }
}
