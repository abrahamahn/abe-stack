// apps/server/src/modules/auth/routes.ts
/**
 * Auth Routes
 *
 * Route definitions for auth module.
 * Uses the generic router pattern for DRY registration.
 */

import { loginRequestSchema, registerRequestSchema } from '@abe-stack/core';
import { publicRoute, type RouteMap, type RouteResult } from '@infra/router';

import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  type RegisterResult,
} from './handlers';

import type { AuthResponse, LoginRequest, RegisterRequest } from '@abe-stack/core';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const authRoutes: RouteMap = {
  'auth/register': publicRoute<RegisterRequest, RegisterResult | { message: string }>(
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

  'auth/login': publicRoute<LoginRequest, AuthResponse | { message: string }>(
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

  'auth/refresh': publicRoute<undefined, { token: string } | { message: string }>(
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

  'auth/logout': publicRoute<undefined, { message: string }>(
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
};
