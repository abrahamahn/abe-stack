import { emptyBodySchema, errorResponseSchema } from '../engine/http/response';
import {
    oauthCallbackQuerySchema,
    oauthCallbackResponseSchema,
    oauthConnectionsResponseSchema,
    oauthEnabledProvidersResponseSchema,
    oauthInitiateResponseSchema,
    oauthLinkResponseSchema,
    oauthUnlinkResponseSchema,
} from '../core/auth/auth-oauth.schemas';

import type { Contract } from '../primitives/api';

// ============================================================================
// OAuth Contract
// ============================================================================

/** OAuth API contract definition */
export const oauthContract = {
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
  linkGoogle: {
    method: 'POST' as const,
    path: '/api/auth/oauth/google/link',
    body: emptyBodySchema,
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
    body: emptyBodySchema,
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
    body: emptyBodySchema,
    responses: {
      200: oauthLinkResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link Apple account to authenticated user',
  },
  unlinkGoogle: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/google/unlink',
    body: emptyBodySchema,
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
    body: emptyBodySchema,
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
    body: emptyBodySchema,
    responses: {
      200: oauthUnlinkResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink Apple account from authenticated user',
  },
  getConnections: {
    method: 'GET' as const,
    path: '/api/auth/oauth/connections',
    responses: {
      200: oauthConnectionsResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get OAuth connections for authenticated user',
  },
  getEnabledProviders: {
    method: 'GET' as const,
    path: '/api/auth/oauth/providers',
    responses: {
      200: oauthEnabledProvidersResponseSchema,
    },
    summary: 'Get list of enabled OAuth providers',
  },
} satisfies Contract;
