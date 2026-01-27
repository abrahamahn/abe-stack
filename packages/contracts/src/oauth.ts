// packages/contracts/src/oauth.ts
/**
 * OAuth Contract
 *
 * OAuth authentication schemas and API contract definitions.
 */

import { emptyBodySchema } from './auth';
import { errorResponseSchema, uuidSchema } from './common';
import { createSchema } from './schema';
import type { Contract, Schema } from './types';
import { userSchema, type User } from './users';

// ============================================================================
// Constants
// ============================================================================

export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

// ============================================================================
// Schemas
// ============================================================================

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * OAuth provider enum
 */
export const oauthProviderSchema: Schema<OAuthProvider> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('OAuth provider must be a string');
  }
  if (!OAUTH_PROVIDERS.includes(data as OAuthProvider)) {
    throw new Error(`Invalid OAuth provider. Must be one of: ${OAUTH_PROVIDERS.join(', ')}`);
  }
  return data as OAuthProvider;
});

/**
 * URL validation helper
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * OAuth initiate response - returns URL to redirect to
 */
export interface OAuthInitiateResponse {
  url: string;
}

export const oauthInitiateResponseSchema: Schema<OAuthInitiateResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth initiate response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['url'] !== 'string' || !isValidUrl(obj['url'])) {
      throw new Error('URL must be a valid URL');
    }
    return { url: obj['url'] };
  },
);

/**
 * OAuth callback request (query parameters)
 */
export interface OAuthCallbackQuery {
  code?: string | undefined;
  state?: string | undefined;
  error?: string | undefined;
  error_description?: string | undefined;
}

export const oauthCallbackQuerySchema: Schema<OAuthCallbackQuery> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      return {};
    }
    const obj = data as Record<string, unknown>;
    return {
      code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
      state: typeof obj['state'] === 'string' ? obj['state'] : undefined,
      error: typeof obj['error'] === 'string' ? obj['error'] : undefined,
      error_description:
        typeof obj['error_description'] === 'string' ? obj['error_description'] : undefined,
    };
  },
);

/**
 * OAuth callback response - auth result
 */
export interface OAuthCallbackResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

export const oauthCallbackResponseSchema: Schema<OAuthCallbackResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth callback response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    if (typeof obj['isNewUser'] !== 'boolean') {
      throw new Error('isNewUser must be a boolean');
    }
    return {
      token: obj['token'],
      user: userSchema.parse(obj['user']),
      isNewUser: obj['isNewUser'],
    };
  },
);

/**
 * OAuth link response
 */
export interface OAuthLinkResponse {
  url: string;
}

export const oauthLinkResponseSchema: Schema<OAuthLinkResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid OAuth link response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['url'] !== 'string' || !isValidUrl(obj['url'])) {
    throw new Error('URL must be a valid URL');
  }
  return { url: obj['url'] };
});

/**
 * OAuth link callback response
 */
export interface OAuthLinkCallbackResponse {
  linked: boolean;
  provider: OAuthProvider;
}

export const oauthLinkCallbackResponseSchema: Schema<OAuthLinkCallbackResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth link callback response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['linked'] !== 'boolean') {
      throw new Error('Linked must be a boolean');
    }
    return {
      linked: obj['linked'],
      provider: oauthProviderSchema.parse(obj['provider']),
    };
  },
);

/**
 * OAuth unlink response
 */
export interface OAuthUnlinkResponse {
  message: string;
}

export const oauthUnlinkResponseSchema: Schema<OAuthUnlinkResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth unlink response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

/**
 * OAuth connection info
 */
export interface OAuthConnection {
  id: string;
  provider: OAuthProvider;
  providerEmail: string | null;
  connectedAt: Date;
}

export const oauthConnectionSchema: Schema<OAuthConnection> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid OAuth connection');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj['id']);
  const provider = oauthProviderSchema.parse(obj['provider']);

  let providerEmail: string | null = null;
  if (obj['providerEmail'] !== null && obj['providerEmail'] !== undefined) {
    if (typeof obj['providerEmail'] !== 'string') {
      throw new Error('Provider email must be a string or null');
    }
    providerEmail = obj['providerEmail'];
  }

  let connectedAt: Date;
  if (obj['connectedAt'] instanceof Date) {
    connectedAt = obj['connectedAt'];
  } else if (typeof obj['connectedAt'] === 'string' || typeof obj['connectedAt'] === 'number') {
    connectedAt = new Date(obj['connectedAt']);
    if (isNaN(connectedAt.getTime())) {
      throw new Error('Invalid connectedAt date');
    }
  } else {
    throw new Error('connectedAt must be a date');
  }

  return { id, provider, providerEmail, connectedAt };
});

/**
 * OAuth connections response
 */
export interface OAuthConnectionsResponse {
  connections: OAuthConnection[];
}

export const oauthConnectionsResponseSchema: Schema<OAuthConnectionsResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth connections response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['connections'])) {
      throw new Error('Connections must be an array');
    }
    return {
      connections: obj['connections'].map((c) => oauthConnectionSchema.parse(c)),
    };
  },
);

/**
 * Enabled OAuth providers response
 */
export interface OAuthEnabledProvidersResponse {
  providers: OAuthProvider[];
}

export const oauthEnabledProvidersResponseSchema: Schema<OAuthEnabledProvidersResponse> =
  createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid enabled providers response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['providers'])) {
      throw new Error('Providers must be an array');
    }
    return {
      providers: obj['providers'].map((p) => oauthProviderSchema.parse(p)),
    };
  });

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

  // Unlink OAuth accounts
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

  // Get enabled OAuth providers (public)
  getEnabledProviders: {
    method: 'GET' as const,
    path: '/api/auth/oauth/providers',
    responses: {
      200: oauthEnabledProvidersResponseSchema,
    },
    summary: 'Get list of enabled OAuth providers',
  },
} satisfies Contract;
