// packages/core/src/contracts/oauth.ts
/**
 * OAuth Contract
 *
 * OAuth authentication schemas and API contract definitions.
 */

import { z } from 'zod';


import { errorResponseSchema } from './common';
import { userSchema } from './users';

import type { Contract } from './types';

// ============================================================================
// Constants
// ============================================================================

export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

// ============================================================================
// Schemas
// ============================================================================

/**
 * OAuth provider enum
 */
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS);

/**
 * OAuth initiate response - returns URL to redirect to
 */
export const oauthInitiateResponseSchema = z.object({
  url: z.url(),
});

/**
 * OAuth callback request (query parameters)
 */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * OAuth callback response - auth result
 */
export const oauthCallbackResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
  isNewUser: z.boolean(),
});

/**
 * OAuth link response
 */
export const oauthLinkResponseSchema = z.object({
  url: z.url(),
});

/**
 * OAuth link callback response
 */
export const oauthLinkCallbackResponseSchema = z.object({
  linked: z.boolean(),
  provider: oauthProviderSchema,
});

/**
 * OAuth unlink response
 */
export const oauthUnlinkResponseSchema = z.object({
  message: z.string(),
});

/**
 * OAuth connection info
 */
export const oauthConnectionSchema = z.object({
  id: z.uuid(),
  provider: oauthProviderSchema,
  providerEmail: z.email().nullable(),
  connectedAt: z.coerce.date(),
});

/**
 * OAuth connections response
 */
export const oauthConnectionsResponseSchema = z.object({
  connections: z.array(oauthConnectionSchema),
});

// ============================================================================
// Types
// ============================================================================

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthInitiateResponse = z.infer<typeof oauthInitiateResponseSchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type OAuthCallbackResponse = z.infer<typeof oauthCallbackResponseSchema>;
export type OAuthLinkResponse = z.infer<typeof oauthLinkResponseSchema>;
export type OAuthLinkCallbackResponse = z.infer<typeof oauthLinkCallbackResponseSchema>;
export type OAuthUnlinkResponse = z.infer<typeof oauthUnlinkResponseSchema>;
export type OAuthConnection = z.infer<typeof oauthConnectionSchema>;
export type OAuthConnectionsResponse = z.infer<typeof oauthConnectionsResponseSchema>;

// ============================================================================
// OAuth Contract
// ============================================================================

export const oauthContract = {
  // Initiate OAuth flow
  initiateGoogle: {
    method: 'GET' as const,
    path: '/api/auth/oauth/google',
    responses: {
      302: oauthInitiateResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Initiate Google OAuth flow',
  },
  initiateGithub: {
    method: 'GET' as const,
    path: '/api/auth/oauth/github',
    responses: {
      302: oauthInitiateResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Initiate GitHub OAuth flow',
  },
  initiateApple: {
    method: 'GET' as const,
    path: '/api/auth/oauth/apple',
    responses: {
      302: oauthInitiateResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Initiate Apple OAuth flow',
  },

  // OAuth callbacks
  callbackGoogle: {
    method: 'GET' as const,
    path: '/api/auth/oauth/google/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: oauthCallbackResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Handle Google OAuth callback',
  },
  callbackGithub: {
    method: 'GET' as const,
    path: '/api/auth/oauth/github/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: oauthCallbackResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Handle GitHub OAuth callback',
  },
  callbackApple: {
    method: 'GET' as const,
    path: '/api/auth/oauth/apple/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: oauthCallbackResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Handle Apple OAuth callback',
  },

  // Link OAuth accounts
  linkGoogle: {
    method: 'POST' as const,
    path: '/api/auth/oauth/google/link',
    body: z.object({}),
    responses: {
      200: oauthLinkResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link Google account to authenticated user',
  },
  linkGithub: {
    method: 'POST' as const,
    path: '/api/auth/oauth/github/link',
    body: z.object({}),
    responses: {
      200: oauthLinkResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link GitHub account to authenticated user',
  },
  linkApple: {
    method: 'POST' as const,
    path: '/api/auth/oauth/apple/link',
    body: z.object({}),
    responses: {
      200: oauthLinkResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link Apple account to authenticated user',
  },

  // Unlink OAuth accounts
  unlinkGoogle: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/google/unlink',
    body: z.object({}),
    responses: {
      200: oauthUnlinkResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink Google account from authenticated user',
  },
  unlinkGithub: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/github/unlink',
    body: z.object({}),
    responses: {
      200: oauthUnlinkResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink GitHub account from authenticated user',
  },
  unlinkApple: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/apple/unlink',
    body: z.object({}),
    responses: {
      200: oauthUnlinkResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink Apple account from authenticated user',
  },

  // Get connected providers
  getConnections: {
    method: 'GET' as const,
    path: '/api/auth/oauth/connections',
    responses: {
      200: oauthConnectionsResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get OAuth connections for authenticated user',
  },
} satisfies Contract;
