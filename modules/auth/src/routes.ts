// modules/auth/src/routes.ts
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
  changeEmailRequestSchema,
  confirmEmailChangeRequestSchema,
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  setPasswordRequestSchema,
  totpVerifyRequestSchema,
} from '@abe-stack/core';
import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteResult,
} from '@abe-stack/http';

import {
  handleChangeEmail,
  handleConfirmEmailChange,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleSetPassword,
  handleTotpDisable,
  handleTotpEnable,
  handleTotpSetup,
  handleTotpStatus,
  handleVerifyEmail,
  type RegisterResult,
} from './handlers';
import { magicLinkRouteEntries } from './magic-link';
import { oauthRouteEntries } from './oauth';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';
import type {
  AuthResponse,
  ChangeEmailRequest,
  ConfirmEmailChangeRequest,
  EmailVerificationRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SetPasswordRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
  ChangeEmailResponse,
  ConfirmEmailChangeResponse,
} from '@abe-stack/core';
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
 * Auth route map with all authentication endpoints.
 */
export const authRoutes = createRouteMap([
  [
    'auth/register',
    publicRoute<RegisterRequest, RegisterResult | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: RegisterRequest,
        _req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<RegisterResult | { message: string }>> => {
        return handleRegister(asAppContext(ctx), body, reply as unknown as ReplyWithCookies);
      },
      registerRequestSchema,
    ),
  ],

  [
    'auth/login',
    publicRoute<LoginRequest, AuthResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: LoginRequest,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<AuthResponse | { message: string }>> => {
        return handleLogin(
          asAppContext(ctx),
          body,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      loginRequestSchema,
    ),
  ],

  [
    'auth/refresh',
    publicRoute<undefined, { token: string } | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<{ token: string } | { message: string }>> => {
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
    publicRoute<undefined, { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<{ message: string }>> => {
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
    protectedRoute<undefined, { message: string }>(
      'POST',
      (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<{ message: string }>> => {
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
    publicRoute<ForgotPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: ForgotPasswordRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleForgotPassword(asAppContext(ctx), body);
      },
      forgotPasswordRequestSchema,
    ),
  ],

  [
    'auth/reset-password',
    publicRoute<ResetPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: ResetPasswordRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleResetPassword(asAppContext(ctx), body);
      },
      resetPasswordRequestSchema,
    ),
  ],

  [
    'auth/set-password',
    protectedRoute<SetPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: SetPasswordRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleSetPassword(asAppContext(ctx), body, req as unknown as RequestWithCookies);
      },
      'user',
      setPasswordRequestSchema,
    ),
  ],

  [
    'auth/verify-email',
    publicRoute<
      EmailVerificationRequest,
      (AuthResponse & { verified: boolean }) | { message: string }
    >(
      'POST',
      async (
        ctx: HandlerContext,
        body: EmailVerificationRequest,
        _req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<(AuthResponse & { verified: boolean }) | { message: string }>> => {
        return handleVerifyEmail(asAppContext(ctx), body, reply as unknown as ReplyWithCookies);
      },
      emailVerificationRequestSchema,
    ),
  ],

  [
    'auth/resend-verification',
    publicRoute<ResendVerificationRequest, { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: ResendVerificationRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleResendVerification(asAppContext(ctx), body);
      },
      resendVerificationRequestSchema,
    ),
  ],

  // TOTP (2FA) routes
  [
    'auth/totp/setup',
    protectedRoute<undefined, TotpSetupResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<TotpSetupResponse | { message: string }>> => {
        return handleTotpSetup(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
      },
    ),
  ],

  [
    'auth/totp/enable',
    protectedRoute<TotpVerifyRequest, TotpVerifyResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: TotpVerifyRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<TotpVerifyResponse | { message: string }>> => {
        return handleTotpEnable(asAppContext(ctx), body, req as unknown as RequestWithCookies);
      },
      'user',
      totpVerifyRequestSchema,
    ),
  ],

  [
    'auth/totp/disable',
    protectedRoute<TotpVerifyRequest, TotpVerifyResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: TotpVerifyRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<TotpVerifyResponse | { message: string }>> => {
        return handleTotpDisable(asAppContext(ctx), body, req as unknown as RequestWithCookies);
      },
      'user',
      totpVerifyRequestSchema,
    ),
  ],

  [
    'auth/totp/status',
    protectedRoute<undefined, TotpStatusResponse | { message: string }>(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<TotpStatusResponse | { message: string }>> => {
        return handleTotpStatus(asAppContext(ctx), undefined, req as unknown as RequestWithCookies);
      },
    ),
  ],

  // Email change routes
  [
    'auth/change-email',
    protectedRoute<ChangeEmailRequest, ChangeEmailResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: ChangeEmailRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<ChangeEmailResponse | { message: string }>> => {
        return handleChangeEmail(asAppContext(ctx), body, req as unknown as RequestWithCookies);
      },
      'user',
      changeEmailRequestSchema,
    ),
  ],

  [
    'auth/change-email/confirm',
    publicRoute<ConfirmEmailChangeRequest, ConfirmEmailChangeResponse | { message: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: ConfirmEmailChangeRequest,
      ): Promise<RouteResult<ConfirmEmailChangeResponse | { message: string }>> => {
        return handleConfirmEmailChange(asAppContext(ctx), body);
      },
      confirmEmailChangeRequestSchema,
    ),
  ],

  // Magic link routes
  ...magicLinkRouteEntries,

  // OAuth routes
  ...oauthRouteEntries,
]);
