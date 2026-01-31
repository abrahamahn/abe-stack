// modules/auth/src/handlers/totp.ts
/**
 * TOTP (2FA) Handlers
 *
 * HTTP layer for TOTP setup, enable, disable, and status.
 *
 * @module handlers/totp
 */

import { mapErrorToHttpResponse } from '@abe-stack/core';

import { disableTotp, enableTotp, getTotpStatus, setupTotp } from '../totp';
import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies } from '../types';
import type {
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
} from '@abe-stack/contracts';
import type { HttpErrorResponse } from '@abe-stack/core';

/**
 * Handle TOTP setup — generate secret and backup codes.
 */
export async function handleTotpSetup(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpSetupResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const email = request.user?.email ?? '';
    const result = await setupTotp(ctx.db, userId, email, ctx.config.auth);

    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP enable — verify code and activate 2FA.
 */
export async function handleTotpEnable(
  ctx: AppContext,
  body: TotpVerifyRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpVerifyResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const result = await enableTotp(ctx.db, userId, body.code, ctx.config.auth);

    if (!result.success) {
      return { status: 400, body: { message: result.message } };
    }

    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP disable — verify code and deactivate 2FA.
 */
export async function handleTotpDisable(
  ctx: AppContext,
  body: TotpVerifyRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpVerifyResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const result = await disableTotp(ctx.db, userId, body.code, ctx.config.auth);

    if (!result.success) {
      return { status: 400, body: { message: result.message } };
    }

    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP status check.
 */
export async function handleTotpStatus(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpStatusResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const result = await getTotpStatus(ctx.db, userId);
    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
