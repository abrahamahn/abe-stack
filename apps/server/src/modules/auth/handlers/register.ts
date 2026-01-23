// apps/server/src/modules/auth/handlers/register.ts
/**
 * Register Handler
 *
 * Handles new user registration.
 */

import { registerUser, type RegisterResult } from '@auth/service';
import {
  EmailAlreadyExistsError,
  EmailSendError,
  mapErrorToResponse,
  WeakPasswordError,
  type AppContext,
  type ReplyWithCookies,
} from '@shared';

import type { RegisterRequest } from '@abe-stack/core';

export type { RegisterResult } from '@auth/service';

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
    if (error instanceof EmailSendError) {
      ctx.log.error(
        { email: body.email, originalError: error.originalError?.message },
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

    // Use error mapper for standard errors (EmailAlreadyExistsError, WeakPasswordError, etc.)
    // Need to handle these before the mapper for custom logging
    if (error instanceof EmailAlreadyExistsError || error instanceof WeakPasswordError) {
      return mapErrorToResponse(error, ctx);
    }

    return mapErrorToResponse(error, ctx);
  }
}
