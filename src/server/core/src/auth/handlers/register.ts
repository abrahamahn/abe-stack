// src/server/core/src/auth/handlers/register.ts
/**
 * Register Handler
 *
 * Handles new user registration.
 *
 * @module handlers/register
 */

import { HTTP_STATUS, mapErrorToHttpResponse } from '@abe-stack/shared';

import { isCaptchaRequired, verifyCaptchaToken } from '../security';
import { registerUser, type RegisterResult } from '../service';
import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies, ReplyWithCookies } from '../types';
import type { HttpErrorResponse, RegisterRequest } from '@abe-stack/shared';

/**
 * Handle new user registration.
 * Creates user with unverified email and sends verification email.
 *
 * @param ctx - Application context
 * @param body - Registration request body (email, username, firstName, lastName, password)
 * @param _reply - Reply with cookie support (unused - no cookies set before verification)
 * @returns Registration result or error
 * @complexity O(1)
 */
export async function handleRegister(
  ctx: AppContext,
  body: RegisterRequest,
  request: RequestWithCookies,
  _reply: ReplyWithCookies,
): Promise<
  { status: 201; body: RegisterResult & { emailSendFailed?: boolean } } | HttpErrorResponse
> {
  try {
    // Verify CAPTCHA token if enabled
    if (isCaptchaRequired(ctx.config.auth)) {
      const { ipAddress } = request.requestInfo;
      const captchaToken = body.captchaToken ?? '';
      const captchaResult = await verifyCaptchaToken(ctx.config.auth, captchaToken, ipAddress);
      if (!captchaResult.success) {
        return {
          status: HTTP_STATUS.BAD_REQUEST,
          body: { message: 'CAPTCHA verification failed' },
        };
      }
    }

    const { email, username, firstName, lastName, password } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    const result = await registerUser(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      ctx.config.auth,
      email,
      password,
      username,
      firstName,
      lastName,
      baseUrl,
    );

    // No cookies set - user must verify email first
    return {
      status: HTTP_STATUS.CREATED,
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
        status: HTTP_STATUS.CREATED,
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
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
