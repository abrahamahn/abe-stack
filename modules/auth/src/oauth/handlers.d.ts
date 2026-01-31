/**
 * OAuth Handlers
 *
 * HTTP request handlers for OAuth authentication flows.
 *
 * @module oauth/handlers
 */
import type { OAuthConnectionInfo } from './types';
import type { AppContext } from '../types';
import type { AuthResponse, HttpErrorResponse } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
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
export declare function handleOAuthInitiate(ctx: AppContext, params: OAuthInitiateParams, request: FastifyRequest, _reply: FastifyReply): Promise<{
    status: 302;
    body: {
        url: string;
    };
} | HttpErrorResponse>;
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
export declare function handleOAuthCallbackRequest(ctx: AppContext, params: OAuthCallbackParams, query: OAuthCallbackQuery, request: FastifyRequest, reply: FastifyReply): Promise<{
    status: 200;
    body: AuthResponse & {
        isNewUser: boolean;
    };
} | {
    status: 200;
    body: {
        linked: boolean;
        provider: string;
    };
} | HttpErrorResponse>;
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
export declare function handleOAuthLink(ctx: AppContext, params: OAuthLinkParams, request: FastifyRequest, _reply: FastifyReply): Promise<{
    status: 200;
    body: {
        url: string;
    };
} | HttpErrorResponse>;
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
export declare function handleOAuthUnlink(ctx: AppContext, params: OAuthUnlinkParams, request: FastifyRequest, _reply: FastifyReply): Promise<{
    status: 200;
    body: {
        message: string;
    };
} | HttpErrorResponse>;
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
export declare function handleGetConnections(ctx: AppContext, request: FastifyRequest, _reply: FastifyReply): Promise<{
    status: 200;
    body: {
        connections: OAuthConnectionInfo[];
    };
} | HttpErrorResponse>;
//# sourceMappingURL=handlers.d.ts.map