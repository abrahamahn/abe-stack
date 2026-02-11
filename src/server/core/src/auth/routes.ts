// src/server/core/src/auth/routes.ts
/**
 * Auth Routes
 *
 * Route definitions for auth module.
 * Uses the generic router pattern for DRY registration.
 *
 * Route handlers accept HandlerContext (Record<string, unknown>) from the
 * generic router and narrow it to AppContext at the call boundary.
 * This keeps the auth package decoupled from the server's concrete context.
 *
 * @module routes
 */

import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteDefinition,
  type RouteSchema,
} from '@abe-stack/server-engine';
import {
  acceptTosRequestSchema,
  changeEmailRequestSchema,
  confirmEmailChangeRequestSchema,
  revertEmailChangeRequestSchema,
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  setPasswordRequestSchema,
  setPhoneRequestSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  totpLoginVerifyRequestSchema,
  totpVerifyRequestSchema,
  verifyPhoneRequestSchema,
  type AcceptTosRequest,
  type ChangeEmailRequest,
  type ConfirmEmailChangeRequest,
  type RevertEmailChangeRequest,
  type EmailVerificationRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type ResendVerificationRequest,
  type ResetPasswordRequest,
  type SetPasswordRequest,
  type SetPhoneRequest,
  type SmsChallengeRequest,
  type SmsVerifyRequest,
  type TotpLoginVerifyRequest,
  type TotpVerifyRequest,
  type VerifyPhoneRequest,
} from '@abe-stack/shared';

import {
  handleAcceptTos,
  handleChangeEmail,
  handleConfirmEmailChange,
  handleRevertEmailChange,
  handleForgotPassword,
  handleListDevices,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleRemovePhone,
  handleRevokeDevice,
  handleSendSmsCode,
  handleSetPassword,
  handleSetPhone,
  handleSudoElevate,
  handleTosStatus,
  handleTotpDisable,
  handleTotpEnable,
  handleTotpLoginVerify,
  handleTotpSetup,
  handleTotpStatus,
  handleTrustDevice,
  handleVerifyEmail,
  handleVerifyPhone,
  handleVerifySmsCode,
} from './handlers';
import { magicLinkRouteEntries } from './magic-link';
import { oauthRouteEntries } from './oauth';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Narrow HandlerContext to AppContext.
 * The server composition root ensures the context implements AppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed AppContext
 * @complexity O(1)
 */
function asAppContext(ctx: HandlerContext): AppContext {
  return ctx as unknown as AppContext;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Auth route entries as typed tuples for createRouteMap.
 * Spread operators produce (string | RouteDefinition)[][] which loses
 * the [string, RouteDefinition] tuple shape. We build the entries array
 * with an explicit type assertion on the spread entries to preserve the
 * tuple type expected by createRouteMap.
 *
 * @complexity O(n) where n = number of routes
 */
const coreAuthEntries: [string, RouteDefinition][] = [
  [
    'auth/register',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleRegister(
          asAppContext(ctx),
          body as RegisterRequest,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      registerRequestSchema,
    ),
  ],

  [
    'auth/login',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleLogin(
          asAppContext(ctx),
          body as LoginRequest,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      loginRequestSchema,
    ),
  ],

  [
    'auth/refresh',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleRefresh(
          asAppContext(ctx),
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
    ),
  ],

  [
    'auth/logout',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleLogout(
          asAppContext(ctx),
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
    ),
  ],

  [
    'auth/logout-all',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleLogoutAll(
          asAppContext(ctx),
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
    ),
  ],

  [
    'auth/forgot-password',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleForgotPassword(
          asAppContext(ctx),
          body as ForgotPasswordRequest,
          req as unknown as RequestWithCookies,
        );
      },
      forgotPasswordRequestSchema,
    ),
  ],

  [
    'auth/reset-password',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleResetPassword(
          asAppContext(ctx),
          body as ResetPasswordRequest,
          req as unknown as RequestWithCookies,
        );
      },
      resetPasswordRequestSchema,
    ),
  ],

  [
    'auth/set-password',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleSetPassword(
          asAppContext(ctx),
          body as SetPasswordRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      setPasswordRequestSchema,
    ),
  ],

  [
    'auth/verify-email',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, _req: FastifyRequest, reply: FastifyReply) => {
        return handleVerifyEmail(
          asAppContext(ctx),
          body as EmailVerificationRequest,
          reply as unknown as ReplyWithCookies,
        );
      },
      emailVerificationRequestSchema,
    ),
  ],

  [
    'auth/resend-verification',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown) => {
        return handleResendVerification(asAppContext(ctx), body as ResendVerificationRequest);
      },
      resendVerificationRequestSchema,
    ),
  ],

  // TOTP (2FA) routes
  [
    'auth/totp/setup',
    protectedRoute('POST', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      return handleTotpSetup(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
    }),
  ],

  [
    'auth/totp/enable',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleTotpEnable(
          asAppContext(ctx),
          body as TotpVerifyRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      totpVerifyRequestSchema,
    ),
  ],

  [
    'auth/totp/disable',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleTotpDisable(
          asAppContext(ctx),
          body as TotpVerifyRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      totpVerifyRequestSchema,
    ),
  ],

  [
    'auth/totp/status',
    protectedRoute('GET', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      return handleTotpStatus(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
    }),
  ],

  [
    'auth/totp/verify-login',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, _req: FastifyRequest, reply: FastifyReply) => {
        return handleTotpLoginVerify(
          asAppContext(ctx),
          body as TotpLoginVerifyRequest,
          _req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      totpLoginVerifyRequestSchema,
    ),
  ],

  // Terms of Service routes
  [
    'auth/tos/status',
    protectedRoute('GET', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      return handleTosStatus(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
    }),
  ],

  [
    'auth/tos/accept',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleAcceptTos(
          asAppContext(ctx),
          body as AcceptTosRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      acceptTosRequestSchema as RouteSchema,
    ),
  ],

  // Sudo mode
  [
    'auth/sudo',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleSudoElevate(
          asAppContext(ctx),
          body as { password?: string; totpCode?: string },
          req as unknown as RequestWithCookies,
        );
      },
      'user',
    ),
  ],

  // Email change routes
  [
    'auth/change-email',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleChangeEmail(
          asAppContext(ctx),
          body as ChangeEmailRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      changeEmailRequestSchema,
    ),
  ],

  [
    'auth/change-email/confirm',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleConfirmEmailChange(
          asAppContext(ctx),
          body as ConfirmEmailChangeRequest,
          req as unknown as RequestWithCookies,
        );
      },
      confirmEmailChangeRequestSchema,
    ),
  ],

  [
    'auth/change-email/revert',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown) => {
        return handleRevertEmailChange(asAppContext(ctx), body as RevertEmailChangeRequest);
      },
      revertEmailChangeRequestSchema,
    ),
  ],

  // Device management routes
  [
    'users/me/devices',
    protectedRoute('GET', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      return handleListDevices(asAppContext(ctx), req as unknown as RequestWithCookies);
    }),
  ],

  [
    'users/me/devices/:id/trust',
    protectedRoute('POST', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      const params = (req as unknown as { params: { id: string } }).params;
      return handleTrustDevice(asAppContext(ctx), params, req as unknown as RequestWithCookies);
    }),
  ],

  [
    'users/me/devices/:id',
    protectedRoute('DELETE', async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
      const params = (req as unknown as { params: { id: string } }).params;
      return handleRevokeDevice(asAppContext(ctx), params, req as unknown as RequestWithCookies);
    }),
  ],

  // Phone management routes
  [
    'users/me/phone',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleSetPhone(
          asAppContext(ctx),
          body as SetPhoneRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      setPhoneRequestSchema,
    ),
  ],

  [
    'users/me/phone/verify',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleVerifyPhone(
          asAppContext(ctx),
          body as VerifyPhoneRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      verifyPhoneRequestSchema,
    ),
  ],

  [
    'users/me/phone',
    protectedRoute(
      'DELETE',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleRemovePhone(asAppContext(ctx), req as unknown as RequestWithCookies);
      },
      'user',
    ),
  ],

  // SMS 2FA challenge routes (during login flow)
  [
    'auth/sms/send',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleSendSmsCode(
          asAppContext(ctx),
          body as SmsChallengeRequest,
          req as unknown as RequestWithCookies,
        );
      },
      smsChallengeRequestSchema,
    ),
  ],

  [
    'auth/sms/verify',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleVerifySmsCode(
          asAppContext(ctx),
          body as SmsVerifyRequest,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      smsVerifyRequestSchema,
    ),
  ],
];

/**
 * Auth route map with all authentication endpoints.
 *
 * @complexity O(n) where n = total route entries including magic-link and oauth
 */
export const authRoutes = createRouteMap([
  ...coreAuthEntries,
  ...magicLinkRouteEntries,
  ...oauthRouteEntries,
]);
