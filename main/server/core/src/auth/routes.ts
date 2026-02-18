// main/server/core/src/auth/routes.ts
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
  acceptTosRequestSchema,
  changeEmailRequestSchema,
  confirmEmailChangeRequestSchema,
  emailVerificationRequestSchema,
  emptyBodySchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  revertEmailChangeRequestSchema,
  setPasswordRequestSchema,
  setPhoneRequestSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  sudoRequestSchema,
  totpLoginVerifyRequestSchema,
  totpVerifyRequestSchema,
  verifyPhoneRequestSchema,
  type AcceptTosRequest,
  type ChangeEmailRequest,
  type ConfirmEmailChangeRequest,
  type EmailVerificationRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type ResendVerificationRequest,
  type ResetPasswordRequest,
  type RevertEmailChangeRequest,
  type SetPasswordRequest,
  type SetPhoneRequest,
  type SmsChallengeRequest,
  type SmsVerifyRequest,
  type SudoRequest,
  type TotpLoginVerifyRequest,
  type TotpVerifyRequest,
  type VerifyPhoneRequest,
} from '@bslt/shared';

import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteDefinition,
  type RouteSchema,
} from '../../../system/src';

import {
  handleAcceptTos,
  handleChangeEmail,
  handleConfirmEmailChange,
  handleForgotPassword,
  handleInvalidateSessions,
  handleListDevices,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleRemovePhone,
  handleResendVerification,
  handleResetPassword,
  handleRevertEmailChange,
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
import { webauthnRouteEntries } from './webauthn';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';

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
      { summary: 'Register new user', tags: ['Auth'] },
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
      { summary: 'Authenticate user', tags: ['Auth'] },
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
      emptyBodySchema,
      { summary: 'Refresh access token', tags: ['Auth'] },
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
      emptyBodySchema,
      { summary: 'Logout current session', tags: ['Auth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Logout all sessions', tags: ['Auth'] },
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
      { summary: 'Request password reset', tags: ['Auth'] },
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
      { summary: 'Reset password with token', tags: ['Auth'] },
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
      { summary: 'Set password', tags: ['Auth'] },
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
      { summary: 'Verify email address', tags: ['Auth'] },
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
      { summary: 'Resend verification email', tags: ['Auth'] },
    ),
  ],

  // TOTP (2FA) routes
  [
    'auth/totp/setup',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleTotpSetup(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
      },
      [],
      emptyBodySchema,
      { summary: 'Setup TOTP 2FA', tags: ['Auth', 'TOTP'] },
    ),
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
      { summary: 'Enable TOTP 2FA', tags: ['Auth', 'TOTP'] },
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
      { summary: 'Disable TOTP 2FA', tags: ['Auth', 'TOTP'] },
    ),
  ],

  [
    'auth/totp/status',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleTotpStatus(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
      },
      [],
      undefined,
      { summary: 'Get TOTP status', tags: ['Auth', 'TOTP'] },
    ),
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
      { summary: 'Verify TOTP login challenge', tags: ['Auth', 'TOTP'] },
    ),
  ],

  // Terms of Service routes
  [
    'auth/tos/status',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleTosStatus(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
      },
      [],
      undefined,
      { summary: 'Get ToS acceptance status', tags: ['Auth', 'Terms of Service'] },
    ),
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
      { summary: 'Accept Terms of Service', tags: ['Auth', 'Terms of Service'] },
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
          body as SudoRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      sudoRequestSchema,
      { summary: 'Elevate to sudo mode', tags: ['Auth'] },
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
      { summary: 'Request email change', tags: ['Auth', 'Email'] },
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
      { summary: 'Confirm email change', tags: ['Auth', 'Email'] },
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
      { summary: 'Revert email change', tags: ['Auth', 'Email'] },
    ),
  ],

  // Device management routes
  [
    'users/me/devices',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleListDevices(asAppContext(ctx), req as unknown as RequestWithCookies);
      },
      [],
      undefined,
      { summary: 'List trusted devices', tags: ['Auth', 'Devices'] },
    ),
  ],

  [
    'users/me/devices/:id/trust',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        const params = (req as unknown as { params: { id: string } }).params;
        return handleTrustDevice(asAppContext(ctx), params, req as unknown as RequestWithCookies);
      },
      [],
      emptyBodySchema,
      { summary: 'Trust device', tags: ['Auth', 'Devices'] },
    ),
  ],

  [
    'users/me/devices/:id',
    protectedRoute(
      'DELETE',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        const params = (req as unknown as { params: { id: string } }).params;
        return handleRevokeDevice(asAppContext(ctx), params, req as unknown as RequestWithCookies);
      },
      [],
      emptyBodySchema,
      { summary: 'Revoke device', tags: ['Auth', 'Devices'] },
    ),
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
      { summary: 'Set phone number', tags: ['Auth', 'Phone'] },
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
      { summary: 'Verify phone number', tags: ['Auth', 'Phone'] },
    ),
  ],

  [
    'users/me/phone/delete',
    protectedRoute(
      'DELETE',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleRemovePhone(asAppContext(ctx), req as unknown as RequestWithCookies);
      },
      'user',
      emptyBodySchema,
      { summary: 'Remove phone number', tags: ['Auth', 'Phone'] },
    ),
  ],

  // Session invalidation (token version bump + revoke all)
  [
    'auth/invalidate-sessions',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleInvalidateSessions(
          asAppContext(ctx),
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      [],
      emptyBodySchema,
      { summary: 'Invalidate all sessions', tags: ['Auth', 'Sessions'] },
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
      { summary: 'Send SMS verification code', tags: ['Auth', 'SMS'] },
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
      { summary: 'Verify SMS code', tags: ['Auth', 'SMS'] },
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
  ...webauthnRouteEntries,
]);
