// src/server/core/src/auth/handlers/phone.ts
/**
 * Phone Management Handlers
 *
 * HTTP layer for setting, verifying, and removing phone numbers.
 *
 * @module handlers/phone
 */

import { ERROR_MESSAGES, HTTP_STATUS, mapErrorToHttpResponse } from '@abe-stack/shared';

import { assertUserActive } from '../middleware';
import { checkSmsRateLimit } from '../sms-2fa/rate-limit';
import { sendSms2faCode, verifySms2faCode } from '../sms-2fa/service';
import { createErrorMapperLogger, type AppContext, type RequestWithCookies } from '../types';

import type { SetPhoneRequest, VerifyPhoneRequest } from '../sms-2fa/types';
import type { HttpErrorResponse } from '@abe-stack/shared';

// ============================================================================
// Phone Regex (E.164-compatible, loose)
// ============================================================================

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle setting a phone number and sending a verification code.
 *
 * POST /api/users/me/phone
 * Requires authentication.
 */
export async function handleSetPhone(
  ctx: AppContext,
  body: SetPhoneRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED } };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    // Validate phone format
    if (!PHONE_REGEX.test(body.phone)) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Invalid phone number format' } };
    }

    // Check rate limit
    const rateLimit = await checkSmsRateLimit(ctx.db, userId);
    if (!rateLimit.allowed) {
      return {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        body: {
          message: 'Too many SMS requests. Please try again later.',
        },
      };
    }

    // Get the SMS provider from context (may not be configured)
    if (ctx.sms === undefined) {
      ctx.log.error('SMS provider not configured');
      return { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, body: { message: 'SMS service unavailable' } };
    }
    const smsProvider = ctx.sms;

    // Send verification code
    const result = await sendSms2faCode(ctx.db, smsProvider, userId, body.phone);

    if (!result.success) {
      ctx.log.error({ error: result.error }, 'Failed to send SMS verification code');
      return { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, body: { message: 'Failed to send verification code' } };
    }

    return { status: HTTP_STATUS.OK, body: { message: 'Verification code sent' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle verifying a phone number with a code.
 *
 * POST /api/users/me/phone/verify
 * Requires authentication.
 */
export async function handleVerifyPhone(
  ctx: AppContext,
  body: VerifyPhoneRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { verified: true } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED } };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    // Verify the code
    const result = await verifySms2faCode(ctx.db, userId, body.code);

    if (!result.valid) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: result.message } };
    }

    // Get the phone number from the verified code record
    const pendingCode = await ctx.db.raw<{ phone: string }>(
      `SELECT phone FROM sms_verification_codes
       WHERE user_id = $1 AND verified = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );

    const phone = pendingCode[0]?.phone;
    if (phone === undefined) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'No phone number to verify' } };
    }

    // Update user record with verified phone
    await ctx.db.raw(
      `UPDATE users SET phone = $1, phone_verified = true, updated_at = NOW() WHERE id = $2`,
      [phone, userId],
    );

    return { status: HTTP_STATUS.OK, body: { verified: true } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle removing a phone number.
 *
 * DELETE /api/users/me/phone
 * Requires authentication + sudo mode.
 */
export async function handleRemovePhone(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED } };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    // Clear phone and phoneVerified
    await ctx.db.raw(
      `UPDATE users SET phone = NULL, phone_verified = NULL, updated_at = NOW() WHERE id = $1`,
      [userId],
    );

    return { status: HTTP_STATUS.OK, body: { message: 'Phone number removed' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
