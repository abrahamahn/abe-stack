// apps/server/src/modules/auth/oauth/handlers.ts
/**
 * OAuth Handlers
 *
 * HTTP request handlers for OAuth authentication flows.
 */

import { OAUTH_PROVIDERS, type OAuthProvider } from '@infrastructure';
import { mapErrorToResponse, OAuthError, type AppContext } from '@shared';

import { setRefreshTokenCookie } from '../utils';

import {
  getAuthorizationUrl,
  getConnectedProviders,
  handleOAuthCallback,
  unlinkOAuthAccount,
} from './service';

import type { OAuthConnectionInfo } from './types';
import type { AuthResponse } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface OAuthInitiateParams {
  provider: string;
}

export interface OAuthCallbackParams {
  provider: string;
}

export interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface OAuthLinkParams {
  provider: string;
}

export interface OAuthUnlinkParams {
  provider: string;
}

// Request with authenticated user
interface AuthenticatedRequest extends FastifyRequest {
  user: { userId: string; role: 'user' | 'admin' | 'moderator' };
}

// ============================================================================
// Validation
// ============================================================================

function isValidProvider(provider: string): provider is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(provider);
}

function validateProvider(provider: string): OAuthProvider {
  if (!isValidProvider(provider)) {
    throw new OAuthError(
      `Invalid OAuth provider: ${provider}. Supported: ${OAUTH_PROVIDERS.join(', ')}`,
      provider,
      'INVALID_PROVIDER',
    );
  }
  return provider;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Initiate OAuth flow - redirect to provider
 * GET /api/auth/oauth/:provider
 */
export function handleOAuthInitiate(
  ctx: AppContext,
  params: OAuthInitiateParams,
  request: FastifyRequest,
  _reply: FastifyReply,
):
  | { status: 302; body: { url: string } }
  | { status: number; body: { message: string; code?: string } } {
  try {
    const provider = validateProvider(params.provider);

    // Build redirect URI from request
    const protocol = String(request.headers['x-forwarded-proto'] || 'http');
    const host = String(request.headers['host'] || 'localhost:3000');
    const redirectUri = `${protocol}://${host}/api/auth/oauth/${provider}/callback`;

    // Check if user is authenticated (for linking)
    const user = (request as AuthenticatedRequest).user;
    const isLinking = !!user;
    const userId = user?.userId;

    const { url } = getAuthorizationUrl(provider, ctx.config.auth, redirectUri, isLinking, userId);

    return {
      status: 302,
      body: { url },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Handle OAuth callback from provider
 * GET /api/auth/oauth/:provider/callback
 */
export async function handleOAuthCallbackRequest(
  ctx: AppContext,
  params: OAuthCallbackParams,
  query: OAuthCallbackQuery,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<
  | { status: 200; body: AuthResponse & { isNewUser: boolean } }
  | { status: 200; body: { linked: boolean; provider: string } }
  | { status: number; body: { message: string; code?: string } }
> {
  try {
    const provider = validateProvider(params.provider);

    // Check for OAuth error from provider
    if (query.error) {
      throw new OAuthError(
        query.error_description || query.error,
        provider,
        `PROVIDER_ERROR_${query.error.toUpperCase()}`,
      );
    }

    if (!query.code || !query.state) {
      throw new OAuthError('Missing code or state parameter', provider, 'MISSING_PARAMS');
    }

    // Build redirect URI (must match initiate)
    const protocol = String(request.headers['x-forwarded-proto'] || 'http');
    const host = String(request.headers['host'] || 'localhost:3000');
    const redirectUri = `${protocol}://${host}/api/auth/oauth/${provider}/callback`;

    const result = await handleOAuthCallback(
      ctx.db,
      ctx.config.auth,
      provider,
      query.code,
      query.state,
      redirectUri,
    );

    if (result.isLinking) {
      return {
        status: 200,
        body: { linked: result.linked ?? false, provider },
      };
    }

    if (!result.auth) {
      throw new OAuthError('OAuth authentication failed', provider, 'AUTH_FAILED');
    }

    // Set refresh token cookie
    const replyWithCookies = reply as FastifyReply & {
      setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
    };
    setRefreshTokenCookie(replyWithCookies, result.auth.refreshToken, ctx.config.auth);

    return {
      status: 200,
      body: {
        token: result.auth.accessToken,
        user: result.auth.user,
        isNewUser: result.auth.isNewUser,
      },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Initiate OAuth linking flow
 * POST /api/auth/oauth/:provider/link
 */
export function handleOAuthLink(
  ctx: AppContext,
  params: OAuthLinkParams,
  request: FastifyRequest,
  _reply: FastifyReply,
):
  | { status: 200; body: { url: string } }
  | { status: number; body: { message: string; code?: string } } {
  try {
    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return {
        status: 401,
        body: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      };
    }

    // Build redirect URI
    const protocol = String(request.headers['x-forwarded-proto'] || 'http');
    const host = String(request.headers['host'] || 'localhost:3000');
    const redirectUri = `${protocol}://${host}/api/auth/oauth/${provider}/callback`;

    const { url } = getAuthorizationUrl(
      provider,
      ctx.config.auth,
      redirectUri,
      true,
      user.userId,
    );

    return {
      status: 200,
      body: { url },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Unlink OAuth provider from account
 * DELETE /api/auth/oauth/:provider
 */
export async function handleOAuthUnlink(
  ctx: AppContext,
  params: OAuthUnlinkParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { message: string } }
  | { status: number; body: { message: string; code?: string } }
> {
  try {
    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return {
        status: 401,
        body: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      };
    }

    await unlinkOAuthAccount(ctx.db, user.userId, provider);

    return {
      status: 200,
      body: { message: `${provider} account unlinked successfully` },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Get connected OAuth providers
 * GET /api/auth/oauth/connections
 */
export async function handleGetConnections(
  ctx: AppContext,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { connections: OAuthConnectionInfo[] } }
  | { status: number; body: { message: string; code?: string } }
> {
  try {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return {
        status: 401,
        body: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      };
    }

    const connections = await getConnectedProviders(ctx.db, user.userId);

    return {
      status: 200,
      body: { connections },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}
