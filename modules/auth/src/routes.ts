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
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  setPasswordRequestSchema,
} from '@abe-stack/core';
import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteResult,
} from '@abe-stack/http';

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

import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';
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

  // Magic link routes
  ...magicLinkRouteEntries,

  // OAuth routes
  ...oauthRouteEntries,
]);
