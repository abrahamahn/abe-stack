// apps/server/src/modules/auth/oauth/handlers.ts
/**
 * OAuth Handlers
 *
 * HTTP request handlers for OAuth authentication flows.
 */

import { OAUTH_PROVIDERS, type OAuthProvider } from '@infrastructure';
import { mapErrorToResponse, OAuthError, TooManyRequestsError, type AppContext } from '@shared';

import {
  authRateLimiters,
  logOAuthLinkSuccessEvent,
  logOAuthLoginFailureEvent,
  logOAuthLoginSuccessEvent,
  logOAuthUnlinkFailureEvent,
  logOAuthUnlinkSuccessEvent,
  type AuthEndpoint,
} from '../security';
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

// Request with possibly authenticated user
interface AuthenticatedRequest extends FastifyRequest {
  user?: { userId: string; role: 'user' | 'admin' | 'moderator' };
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

/**
 * Get the full callback URL for a provider from config
 * Uses server.appBaseUrl + oauth.{provider}.callbackUrl
 *
 * This is more secure than constructing from request headers,
 * which could be spoofed for open redirect attacks.
 */
function getCallbackUrl(ctx: AppContext, provider: OAuthProvider): string {
  const providerConfig = ctx.config.auth.oauth[provider as keyof typeof ctx.config.auth.oauth];

  if (!providerConfig) {
    throw new OAuthError(
      `OAuth provider ${provider} is not configured`,
      provider,
      'NOT_CONFIGURED',
    );
  }

  const baseUrl = ctx.config.server.appBaseUrl;
  const callbackPath = providerConfig.callbackUrl;

  // If callbackUrl is already a full URL, use it directly
  if (callbackPath.startsWith('http://') || callbackPath.startsWith('https://')) {
    return callbackPath;
  }

  // Otherwise, combine with base URL
  // Ensure no double slashes
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Check rate limit for OAuth endpoint
 * Throws TooManyRequestsError if limit exceeded
 */
async function checkRateLimit(endpoint: AuthEndpoint, ip: string): Promise<void> {
  const info = await authRateLimiters.check(endpoint, ip);
  if (!info.allowed) {
    const retryAfter = Math.ceil(info.resetMs / 1000);
    throw new TooManyRequestsError(
      `Rate limit exceeded for ${endpoint}. Please try again in ${String(retryAfter)} seconds.`,
      retryAfter,
    );
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Initiate OAuth flow - redirect to provider
 * GET /api/auth/oauth/:provider
 */
export async function handleOAuthInitiate(
  ctx: AppContext,
  params: OAuthInitiateParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 302; body: { url: string } }
  | { status: number; body: { message: string; code?: string } }
> {
  try {
    // Rate limit check
    await checkRateLimit('oauthInitiate', request.ip);

    const provider = validateProvider(params.provider);

    // Get redirect URI from config (more secure than constructing from headers)
    const redirectUri = getCallbackUrl(ctx, provider);

    // Check if user is authenticated (for linking)
    const user = (request as AuthenticatedRequest).user;
    const isLinking = !!user;
    const userId = user ? user.userId : undefined;

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
    // Rate limit check
    await checkRateLimit('oauthCallback', request.ip);

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

    // Get redirect URI from config (must match the one used in initiate)
    const redirectUri = getCallbackUrl(ctx, provider);

    const result = await handleOAuthCallback(
      ctx.db,
      ctx.config.auth,
      provider,
      query.code,
      query.state,
      redirectUri,
    );

    if (result.isLinking) {
      // Log successful link event
      const user = (request as AuthenticatedRequest).user;
      if (user) {
        await logOAuthLinkSuccessEvent(
          ctx.db,
          user.userId,
          '', // Email not available in link flow
          provider,
          request.ip,
          request.headers['user-agent'],
        );
      }

      return {
        status: 200,
        body: { linked: result.linked ?? false, provider },
      };
    }

    if (!result.auth) {
      throw new OAuthError('OAuth authentication failed', provider, 'AUTH_FAILED');
    }

    // Log successful login/registration event
    await logOAuthLoginSuccessEvent(
      ctx.db,
      result.auth.user.id,
      result.auth.user.email,
      provider,
      result.auth.isNewUser,
      request.ip,
      request.headers['user-agent'],
    );

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
    // Log OAuth failure event
    const providerName = params.provider;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logOAuthLoginFailureEvent(
      ctx.db,
      providerName,
      errorMessage,
      undefined,
      request.ip,
      request.headers['user-agent'],
    );

    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Initiate OAuth linking flow
 * POST /api/auth/oauth/:provider/link
 */
export async function handleOAuthLink(
  ctx: AppContext,
  params: OAuthLinkParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { url: string } }
  | { status: number; body: { message: string; code?: string } }
> {
  try {
    // Rate limit check
    await checkRateLimit('oauthLink', request.ip);

    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return {
        status: 401,
        body: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      };
    }

    // Get redirect URI from config (more secure than constructing from headers)
    const redirectUri = getCallbackUrl(ctx, provider);

    const { url } = getAuthorizationUrl(provider, ctx.config.auth, redirectUri, true, user.userId);

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
    // Rate limit check
    await checkRateLimit('oauthUnlink', request.ip);

    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return {
        status: 401,
        body: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      };
    }

    await unlinkOAuthAccount(ctx.db, user.userId, provider);

    // Log successful unlink event
    await logOAuthUnlinkSuccessEvent(
      ctx.db,
      user.userId,
      '', // Email not directly available
      provider,
      request.ip,
      request.headers['user-agent'],
    );

    return {
      status: 200,
      body: { message: `${provider} account unlinked successfully` },
    };
  } catch (error) {
    // Log unlink failure event
    const userForLog = (request as AuthenticatedRequest).user;
    if (userForLog) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logOAuthUnlinkFailureEvent(
        ctx.db,
        userForLog.userId,
        '',
        params.provider,
        errorMessage,
        request.ip,
        request.headers['user-agent'],
      );
    }

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
