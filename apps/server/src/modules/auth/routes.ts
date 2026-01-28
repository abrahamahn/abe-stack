// apps/server/src/modules/auth/routes.ts
/**
 * Auth Routes
 *
 * Route definitions for auth module.
 * Uses the generic router pattern for DRY registration.
 */

import {
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  setPasswordRequestSchema,
} from '@abe-stack/core';
import { createRouteMap, protectedRoute, publicRoute, type RouteResult } from '@http/router';

import {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleSetPassword,
  handleVerifyEmail,
  type RegisterResult,
} from './handlers';
import { magicLinkRouteEntries } from './magic-link';
import { oauthRouteEntries } from './oauth';

import type {
  AuthResponse,
  EmailVerificationRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SetPasswordRequest,
} from '@abe-stack/core';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const authRoutes = createRouteMap([
  [
    'auth/register',
    publicRoute<RegisterRequest, RegisterResult | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: RegisterRequest,
        _req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<RegisterResult | { message: string }>> => {
        return handleRegister(ctx, body, reply);
      },
      registerRequestSchema,
    ),
  ],

  [
    'auth/login',
    publicRoute<LoginRequest, AuthResponse | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: LoginRequest,
        req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<AuthResponse | { message: string }>> => {
        return handleLogin(ctx, body, req, reply);
      },
      loginRequestSchema,
    ),
  ],

  [
    'auth/refresh',
    publicRoute<undefined, { token: string } | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        _body: undefined,
        req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<{ token: string } | { message: string }>> => {
        return handleRefresh(ctx, req, reply);
      },
    ),
  ],

  [
    'auth/logout',
    publicRoute<undefined, { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        _body: undefined,
        req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleLogout(ctx, req, reply);
      },
    ),
  ],

  [
    'auth/logout-all',
    protectedRoute<undefined, { message: string }>(
      'POST',
      (
        ctx: AppContext,
        _body: undefined,
        req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleLogoutAll(ctx, req, reply);
      },
    ),
  ],

  [
    'auth/forgot-password',
    publicRoute<ForgotPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: ForgotPasswordRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleForgotPassword(ctx, body);
      },
      forgotPasswordRequestSchema,
    ),
  ],

  [
    'auth/reset-password',
    publicRoute<ResetPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: ResetPasswordRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleResetPassword(ctx, body);
      },
      resetPasswordRequestSchema,
    ),
  ],

  [
    'auth/set-password',
    protectedRoute<SetPasswordRequest, { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: SetPasswordRequest,
        req: RequestWithCookies,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleSetPassword(ctx, body, req);
      },
      'user',
      setPasswordRequestSchema,
    ),
  ],

  [
    'auth/verify-email',
    publicRoute<EmailVerificationRequest, (AuthResponse & { verified: boolean }) | { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: EmailVerificationRequest,
        _req: RequestWithCookies,
        reply: ReplyWithCookies,
      ): Promise<RouteResult<(AuthResponse & { verified: boolean }) | { message: string }>> => {
        return handleVerifyEmail(ctx, body, reply);
      },
      emailVerificationRequestSchema,
    ),
  ],

  [
    'auth/resend-verification',
    publicRoute<ResendVerificationRequest, { message: string }>(
      'POST',
      async (
        ctx: AppContext,
        body: ResendVerificationRequest,
      ): Promise<RouteResult<{ message: string }>> => {
        return handleResendVerification(ctx, body);
      },
      resendVerificationRequestSchema,
    ),
  ],

  // Magic link routes
  ...magicLinkRouteEntries,

  // OAuth routes
  ...oauthRouteEntries,
]);
