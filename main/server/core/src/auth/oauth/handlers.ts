// main/server/core/src/auth/oauth/handlers.ts
/**
 * OAuth Handlers
 *
 * HTTP request handlers for OAuth authentication flows.
 *
 * @module oauth/handlers
 */

import {
  ERROR_MESSAGES,
  mapErrorToHttpResponse,
  OAuthError,
  TooManyRequestsError,
} from '@bslt/shared';

import { OAUTH_PROVIDERS, type OAuthProvider } from '../../../../db/src';
import { getMetricsCollector } from '../../../../system/src';
import {
  authRateLimiters,
  logOAuthLinkSuccessEvent,
  logOAuthLoginFailureEvent,
  logOAuthLoginSuccessEvent,
  logOAuthUnlinkFailureEvent,
  logOAuthUnlinkSuccessEvent,
  type AuthEndpoint,
} from '../security';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import {
  getAuthorizationUrl,
  getConnectedProviders,
  handleOAuthCallback,
  unlinkOAuthAccount,
} from './service';

import type { AppContext, ReplyWithCookies } from '../types';
import type { OAuthConnectionInfo } from './types';
import type { AuthResponse, HttpErrorResponse } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * OAuth initiate request params.
 */
export interface OAuthInitiateParams {
  /** OAuth provider name */
  provider: string;
}

/**
 * OAuth callback request params.
 */
export interface OAuthCallbackParams {
  /** OAuth provider name */
  provider: string;
}

/**
 * OAuth callback query parameters.
 */
export interface OAuthCallbackQuery {
  /** Authorization code from provider */
  code?: string | undefined;
  /** Encrypted OAuth state */
  state?: string | undefined;
  /** Error from provider */
  error?: string | undefined;
  /** Error description from provider */
  error_description?: string | undefined;
}

/**
 * OAuth link request params.
 */
export interface OAuthLinkParams {
  /** OAuth provider name */
  provider: string;
}

/**
 * OAuth unlink request params.
 */
export interface OAuthUnlinkParams {
  /** OAuth provider name */
  provider: string;
}

// Request with possibly authenticated user
interface AuthenticatedRequest extends FastifyRequest {
  user?: { userId: string; email: string; role: 'user' | 'admin' | 'moderator' };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a provider string is a valid OAuth provider.
 *
 * @param provider - Provider string to check
 * @returns True if valid
 * @complexity O(n) where n is the number of supported providers
 */
function isValidProvider(provider: string): provider is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Validate and return a typed OAuth provider.
 *
 * @param provider - Provider string to validate
 * @returns Validated OAuthProvider
 * @throws {OAuthError} If provider is invalid
 * @complexity O(n) where n is the number of supported providers
 */
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
 * Get the full callback URL for a provider from config.
 * Uses server.appBaseUrl + oauth.{provider}.callbackUrl.
 * More secure than constructing from request headers (prevents open redirect).
 *
 * @param ctx - Application context
 * @param provider - OAuth provider
 * @returns Full callback URL
 * @throws {OAuthError} If provider is not configured
 * @complexity O(1)
 */
function getCallbackUrl(ctx: AppContext, provider: OAuthProvider): string {
  const providerConfig = ctx.config.auth.oauth[provider as keyof typeof ctx.config.auth.oauth];

  if (providerConfig == null) {
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
 * Check rate limit for OAuth endpoint.
 *
 * @param endpoint - Auth endpoint name
 * @param ip - Client IP address
 * @throws {TooManyRequestsError} If limit exceeded
 * @complexity O(1)
 */
async function checkRateLimit(endpoint: AuthEndpoint, ip: string): Promise<void> {
  const info = await authRateLimiters.check(endpoint, ip);
  if (!info.allowed) {
    const retryAfter = Math.ceil(info.resetMs / 1000);
    throw new TooManyRequestsError(
      `Rate limit exceeded for ${endpoint}. Please try again in ${String(retryAfter)} seconds.`,
    );
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Initiate OAuth flow - redirect to provider.
 * GET /api/auth/oauth/:provider
 *
 * @param ctx - Application context
 * @param params - Route params with provider name
 * @param request - Fastify request
 * @param _reply - Fastify reply
 * @returns Redirect URL or error
 * @complexity O(1)
 */
export async function handleOAuthInitiate(
  ctx: AppContext,
  params: OAuthInitiateParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: 302; body: { url: string } } | HttpErrorResponse> {
  try {
    // Rate limit check
    await checkRateLimit('oauthInitiate', request.ip);

    const provider = validateProvider(params.provider);

    // Get redirect URI from config (more secure than constructing from headers)
    const redirectUri = getCallbackUrl(ctx, provider);

    // Check if user is authenticated (for linking)
    const user = (request as AuthenticatedRequest).user;
    const isLinking = user != null;
    const userId = user != null ? user.userId : undefined;

    const { url } = getAuthorizationUrl(provider, ctx.config.auth, redirectUri, isLinking, userId);

    return {
      status: 302,
      body: { url },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle OAuth callback from provider.
 * GET /api/auth/oauth/:provider/callback
 *
 * @param ctx - Application context
 * @param params - Route params with provider name
 * @param query - Query parameters from provider callback
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @returns Auth response, link confirmation, or error
 * @complexity O(1)
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
  | HttpErrorResponse
> {
  const metrics = getMetricsCollector();
  const providerName = params.provider;

  try {
    // Rate limit check
    await checkRateLimit('oauthCallback', request.ip);

    const provider = validateProvider(params.provider);
    metrics.recordLoginAttempt(provider);

    // Check for OAuth error from provider
    if (query.error != null && query.error !== '') {
      throw new OAuthError(
        query.error_description ?? query.error,
        provider,
        `PROVIDER_ERROR_${query.error.toUpperCase()}`,
      );
    }

    if (query.code == null || query.code === '' || query.state == null || query.state === '') {
      throw new OAuthError('Missing code or state parameter', provider, 'MISSING_PARAMS');
    }

    // Get redirect URI from config (must match the one used in initiate)
    const redirectUri = getCallbackUrl(ctx, provider);

    const result = await handleOAuthCallback(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      provider,
      query.code,
      query.state,
      redirectUri,
    );

    if (result.isLinking) {
      // Log successful link event
      const user = (request as AuthenticatedRequest).user;
      if (user != null) {
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

    if (result.auth == null) {
      throw new OAuthError('OAuth authentication failed', provider, 'AUTH_FAILED');
    }

    // Record login success
    metrics.recordLoginSuccess(provider);

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
    const replyWithCookies = reply as FastifyReply & ReplyWithCookies;
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
    // Record login failure if provider is valid
    try {
      const provider = validateProvider(providerName);
      metrics.recordLoginFailure(provider);
    } catch {
      // Ignore if provider invalid
    }

    // Log OAuth failure event
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logOAuthLoginFailureEvent(
      ctx.db,
      providerName,
      errorMessage,
      undefined,
      request.ip,
      request.headers['user-agent'],
    );

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Initiate OAuth linking flow.
 * POST /api/auth/oauth/:provider/link
 *
 * @param ctx - Application context
 * @param params - Route params with provider name
 * @param request - Fastify request
 * @param _reply - Fastify reply
 * @returns Authorization URL or error
 * @complexity O(1)
 */
export async function handleOAuthLink(
  ctx: AppContext,
  params: OAuthLinkParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: 200; body: { url: string } } | HttpErrorResponse> {
  try {
    // Rate limit check
    await checkRateLimit('oauthLink', request.ip);

    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (user == null) {
      return {
        status: 401,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED, code: 'UNAUTHORIZED' },
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
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Unlink OAuth provider from account.
 * DELETE /api/auth/oauth/:provider
 *
 * @param ctx - Application context
 * @param params - Route params with provider name
 * @param request - Fastify request
 * @param _reply - Fastify reply
 * @returns Success message or error
 * @complexity O(1)
 */
export async function handleOAuthUnlink(
  ctx: AppContext,
  params: OAuthUnlinkParams,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    // Rate limit check
    await checkRateLimit('oauthUnlink', request.ip);

    const provider = validateProvider(params.provider);

    const user = (request as AuthenticatedRequest).user;
    if (user == null) {
      return {
        status: 401,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED, code: 'UNAUTHORIZED' },
      };
    }

    await unlinkOAuthAccount(ctx.db, ctx.repos, user.userId, provider);

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
    if (userForLog != null) {
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

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Get connected OAuth providers.
 * GET /api/auth/oauth/connections
 *
 * @param ctx - Application context
 * @param request - Fastify request
 * @param _reply - Fastify reply
 * @returns Connected providers list or error
 * @complexity O(n) where n is the number of connections
 */
export async function handleGetConnections(
  ctx: AppContext,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: 200; body: { connections: OAuthConnectionInfo[] } } | HttpErrorResponse> {
  try {
    const user = (request as AuthenticatedRequest).user;
    if (user == null) {
      return {
        status: 401,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED, code: 'UNAUTHORIZED' },
      };
    }

    const connections = await getConnectedProviders(ctx.db, ctx.repos, user.userId);

    return {
      status: 200,
      body: { connections },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Get enabled OAuth providers from server configuration.
 * GET /api/auth/oauth/providers
 *
 * @param ctx - Application context
 * @returns Enabled provider names
 * @complexity O(n) where n is number of supported providers
 */
export function handleGetEnabledProviders(ctx: AppContext): {
  status: 200;
  body: { providers: OAuthProvider[] };
} {
  const enabledProviders = OAUTH_PROVIDERS.filter((provider) => {
    return ctx.config.auth.oauth[provider] !== undefined;
  });

  return {
    status: 200,
    body: { providers: enabledProviders },
  };
}
