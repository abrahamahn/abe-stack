// packages/shared/src/contracts/oauth.test.ts
/**
 * OAuth Contract Schema Tests
 *
 * Comprehensive validation tests for OAuth schemas including provider validation,
 * authentication flows, account linking, and connection management.
 */

import { describe, expect, it } from 'vitest';

import {
  OAUTH_PROVIDERS,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthProviderSchema,
  oauthUnlinkResponseSchema,
} from './oauth';

describe('OAUTH_PROVIDERS constant', () => {
  it('should contain expected providers', () => {
    expect(OAUTH_PROVIDERS).toContain('google');
    expect(OAUTH_PROVIDERS).toContain('github');
    expect(OAUTH_PROVIDERS).toContain('apple');
    expect(OAUTH_PROVIDERS).toHaveLength(3);
  });
});

describe('oauthProviderSchema', () => {
  it('should validate google provider', () => {
    const result = oauthProviderSchema.parse('google');
    expect(result).toBe('google');
  });

  it('should validate github provider', () => {
    const result = oauthProviderSchema.parse('github');
    expect(result).toBe('github');
  });

  it('should validate apple provider', () => {
    const result = oauthProviderSchema.parse('apple');
    expect(result).toBe('apple');
  });

  it('should reject invalid provider', () => {
    expect(() => oauthProviderSchema.parse('facebook')).toThrow(
      'Invalid OAuth provider. Must be one of: google, github, apple',
    );
  });

  it('should reject non-string values', () => {
    expect(() => oauthProviderSchema.parse(123)).toThrow('OAuth provider must be a string');
    expect(() => oauthProviderSchema.parse(null)).toThrow('OAuth provider must be a string');
    expect(() => oauthProviderSchema.parse(undefined)).toThrow('OAuth provider must be a string');
  });

  it('should be case-sensitive', () => {
    expect(() => oauthProviderSchema.parse('Google')).toThrow('Invalid OAuth provider');
    expect(() => oauthProviderSchema.parse('GOOGLE')).toThrow('Invalid OAuth provider');
  });

  it('should reject empty string', () => {
    expect(() => oauthProviderSchema.parse('')).toThrow('Invalid OAuth provider');
  });
});

describe('oauthInitiateResponseSchema', () => {
  it('should validate valid URL', () => {
    const response = { url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123' };
    const result = oauthInitiateResponseSchema.parse(response);
    expect(result.url).toBe('https://accounts.google.com/o/oauth2/v2/auth?client_id=123');
  });

  it('should validate different URL protocols', () => {
    const urls = [
      'https://example.com',
      'http://localhost:3000/callback',
      'https://auth.example.com:8443/oauth',
    ];

    for (const url of urls) {
      const result = oauthInitiateResponseSchema.parse({ url });
      expect(result.url).toBe(url);
    }
  });

  it('should reject invalid URL', () => {
    const response = { url: 'not-a-url' };
    expect(() => oauthInitiateResponseSchema.parse(response)).toThrow('URL must be a valid URL');
  });

  it('should reject relative URL', () => {
    const response = { url: '/oauth/callback' };
    expect(() => oauthInitiateResponseSchema.parse(response)).toThrow('URL must be a valid URL');
  });

  it('should reject missing URL', () => {
    expect(() => oauthInitiateResponseSchema.parse({})).toThrow('URL must be a valid URL');
  });

  it('should reject non-string URL', () => {
    const response = { url: 12345 };
    expect(() => oauthInitiateResponseSchema.parse(response)).toThrow('URL must be a valid URL');
  });

  it('should reject empty string URL', () => {
    const response = { url: '' };
    expect(() => oauthInitiateResponseSchema.parse(response)).toThrow('URL must be a valid URL');
  });

  it('should reject null', () => {
    expect(() => oauthInitiateResponseSchema.parse(null)).toThrow(
      'Invalid OAuth initiate response',
    );
  });
});

describe('oauthCallbackQuerySchema', () => {
  it('should validate success callback with code and state', () => {
    const query = {
      code: 'auth_code_123',
      state: 'state_token_456',
    };
    const result = oauthCallbackQuerySchema.parse(query);
    expect(result.code).toBe('auth_code_123');
    expect(result.state).toBe('state_token_456');
    expect(result.error).toBeUndefined();
  });

  it('should validate error callback', () => {
    const query = {
      error: 'access_denied',
      error_description: 'User denied access',
    };
    const result = oauthCallbackQuerySchema.parse(query);
    expect(result.error).toBe('access_denied');
    expect(result.error_description).toBe('User denied access');
    expect(result.code).toBeUndefined();
  });

  it('should validate empty query', () => {
    const result = oauthCallbackQuerySchema.parse({});
    expect(result.code).toBeUndefined();
    expect(result.state).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.error_description).toBeUndefined();
  });

  it('should handle partial query', () => {
    const query = { code: 'auth_code' };
    const result = oauthCallbackQuerySchema.parse(query);
    expect(result.code).toBe('auth_code');
    expect(result.state).toBeUndefined();
  });

  it('should filter out non-string values', () => {
    const query = {
      code: 'valid_code',
      state: 123,
      error: true,
    };
    const result = oauthCallbackQuerySchema.parse(query);
    expect(result.code).toBe('valid_code');
    expect(result.state).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('should handle null input', () => {
    const result = oauthCallbackQuerySchema.parse(null);
    expect(result).toEqual({});
  });

  it('should handle undefined input', () => {
    const result = oauthCallbackQuerySchema.parse(undefined);
    expect(result).toEqual({});
  });
});

describe('oauthCallbackResponseSchema', () => {
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: null,
    role: 'user',
    isVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('should validate successful auth response for new user', () => {
    const response = {
      token: 'jwt_token_abc',
      user: validUser,
      isNewUser: true,
    };
    const result = oauthCallbackResponseSchema.parse(response);
    expect(result.token).toBe('jwt_token_abc');
    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toBe('user@example.com');
  });

  it('should validate successful auth response for existing user', () => {
    const response = {
      token: 'jwt_token_xyz',
      user: validUser,
      isNewUser: false,
    };
    const result = oauthCallbackResponseSchema.parse(response);
    expect(result.isNewUser).toBe(false);
  });

  it('should reject missing token', () => {
    const response = {
      user: validUser,
      isNewUser: true,
    };
    expect(() => oauthCallbackResponseSchema.parse(response)).toThrow('Token must be a string');
  });

  it('should reject non-string token', () => {
    const response = {
      token: 123,
      user: validUser,
      isNewUser: true,
    };
    expect(() => oauthCallbackResponseSchema.parse(response)).toThrow('Token must be a string');
  });

  it('should reject non-boolean isNewUser', () => {
    const response = {
      token: 'jwt_token',
      user: validUser,
      isNewUser: 'true',
    };
    expect(() => oauthCallbackResponseSchema.parse(response)).toThrow(
      'isNewUser must be a boolean',
    );
  });

  it('should reject invalid user', () => {
    const response = {
      token: 'jwt_token',
      user: { invalid: 'user' },
      isNewUser: true,
    };
    expect(() => oauthCallbackResponseSchema.parse(response)).toThrow();
  });

  it('should reject null', () => {
    expect(() => oauthCallbackResponseSchema.parse(null)).toThrow(
      'Invalid OAuth callback response',
    );
  });
});

describe('oauthLinkResponseSchema', () => {
  it('should validate link response', () => {
    const response = { url: 'https://accounts.google.com/o/oauth2/auth?state=link_123' };
    const result = oauthLinkResponseSchema.parse(response);
    expect(result.url).toBe('https://accounts.google.com/o/oauth2/auth?state=link_123');
  });

  it('should reject invalid URL', () => {
    const response = { url: 'invalid-url' };
    expect(() => oauthLinkResponseSchema.parse(response)).toThrow('URL must be a valid URL');
  });

  it('should reject missing URL', () => {
    expect(() => oauthLinkResponseSchema.parse({})).toThrow('URL must be a valid URL');
  });
});

describe('oauthLinkCallbackResponseSchema', () => {
  it('should validate successful link', () => {
    const response = {
      linked: true,
      provider: 'google',
    };
    const result = oauthLinkCallbackResponseSchema.parse(response);
    expect(result.linked).toBe(true);
    expect(result.provider).toBe('google');
  });

  it('should validate failed link', () => {
    const response = {
      linked: false,
      provider: 'github',
    };
    const result = oauthLinkCallbackResponseSchema.parse(response);
    expect(result.linked).toBe(false);
  });

  it('should validate all providers', () => {
    for (const provider of OAUTH_PROVIDERS) {
      const response = { linked: true, provider };
      const result = oauthLinkCallbackResponseSchema.parse(response);
      expect(result.provider).toBe(provider);
    }
  });

  it('should reject non-boolean linked', () => {
    const response = { linked: 'true', provider: 'google' };
    expect(() => oauthLinkCallbackResponseSchema.parse(response)).toThrow(
      'Linked must be a boolean',
    );
  });

  it('should reject invalid provider', () => {
    const response = { linked: true, provider: 'invalid' };
    expect(() => oauthLinkCallbackResponseSchema.parse(response)).toThrow();
  });

  it('should reject null', () => {
    expect(() => oauthLinkCallbackResponseSchema.parse(null)).toThrow(
      'Invalid OAuth link callback response',
    );
  });
});

describe('oauthUnlinkResponseSchema', () => {
  it('should validate unlink response', () => {
    const response = { message: 'Google account unlinked successfully' };
    const result = oauthUnlinkResponseSchema.parse(response);
    expect(result.message).toBe('Google account unlinked successfully');
  });

  it('should reject non-string message', () => {
    const response = { message: 123 };
    expect(() => oauthUnlinkResponseSchema.parse(response)).toThrow('Message must be a string');
  });

  it('should reject missing message', () => {
    expect(() => oauthUnlinkResponseSchema.parse({})).toThrow('Message must be a string');
  });

  it('should reject null', () => {
    expect(() => oauthUnlinkResponseSchema.parse(null)).toThrow('Invalid OAuth unlink response');
  });
});

describe('oauthConnectionSchema', () => {
  it('should validate connection with email', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'google',
      providerEmail: 'user@gmail.com',
      connectedAt: '2024-01-01T00:00:00Z',
    };
    const result = oauthConnectionSchema.parse(connection);
    expect(result.provider).toBe('google');
    expect(result.providerEmail).toBe('user@gmail.com');
  });

  it('should validate connection with null email', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'github',
      providerEmail: null,
      connectedAt: '2024-01-01T00:00:00Z',
    };
    const result = oauthConnectionSchema.parse(connection);
    expect(result.providerEmail).toBeNull();
  });

  it('should parse Date object for connectedAt', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'apple',
      providerEmail: null,
      connectedAt: date,
    };
    const result = oauthConnectionSchema.parse(connection);
    expect(result.connectedAt).toEqual(date);
  });

  it('should parse string date for connectedAt', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'google',
      providerEmail: null,
      connectedAt: '2024-01-01T00:00:00Z',
    };
    const result = oauthConnectionSchema.parse(connection);
    expect(result.connectedAt).toBeInstanceOf(Date);
  });

  it('should parse timestamp number for connectedAt', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'github',
      providerEmail: null,
      connectedAt: 1704067200000,
    };
    const result = oauthConnectionSchema.parse(connection);
    expect(result.connectedAt).toBeInstanceOf(Date);
  });

  it('should reject invalid UUID for id', () => {
    const connection = {
      id: 'not-a-uuid',
      provider: 'google',
      providerEmail: null,
      connectedAt: '2024-01-01T00:00:00Z',
    };
    expect(() => oauthConnectionSchema.parse(connection)).toThrow();
  });

  it('should reject invalid provider', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'invalid',
      providerEmail: null,
      connectedAt: '2024-01-01T00:00:00Z',
    };
    expect(() => oauthConnectionSchema.parse(connection)).toThrow();
  });

  it('should reject non-string providerEmail', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'google',
      providerEmail: 123,
      connectedAt: '2024-01-01T00:00:00Z',
    };
    expect(() => oauthConnectionSchema.parse(connection)).toThrow(
      'Provider email must be a string or null',
    );
  });

  it('should reject invalid date string', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'google',
      providerEmail: null,
      connectedAt: 'invalid-date',
    };
    expect(() => oauthConnectionSchema.parse(connection)).toThrow('Invalid connectedAt date');
  });

  it('should reject missing connectedAt', () => {
    const connection = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'google',
      providerEmail: null,
    };
    expect(() => oauthConnectionSchema.parse(connection)).toThrow('connectedAt must be a date');
  });
});

describe('oauthConnectionsResponseSchema', () => {
  it('should validate empty connections', () => {
    const response = { connections: [] };
    const result = oauthConnectionsResponseSchema.parse(response);
    expect(result.connections).toEqual([]);
  });

  it('should validate multiple connections', () => {
    const response = {
      connections: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          provider: 'google',
          providerEmail: 'user@gmail.com',
          connectedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          provider: 'github',
          providerEmail: null,
          connectedAt: '2024-01-02T00:00:00Z',
        },
      ],
    };
    const result = oauthConnectionsResponseSchema.parse(response);
    expect(result.connections).toHaveLength(2);
    expect(result.connections[0]?.provider).toBe('google');
    expect(result.connections[1]?.provider).toBe('github');
  });

  it('should reject non-array connections', () => {
    const response = { connections: 'not-array' };
    expect(() => oauthConnectionsResponseSchema.parse(response)).toThrow(
      'Connections must be an array',
    );
  });

  it('should reject invalid connection in array', () => {
    const response = {
      connections: [{ invalid: 'connection' }],
    };
    expect(() => oauthConnectionsResponseSchema.parse(response)).toThrow();
  });

  it('should reject null', () => {
    expect(() => oauthConnectionsResponseSchema.parse(null)).toThrow(
      'Invalid OAuth connections response',
    );
  });
});

describe('oauthEnabledProvidersResponseSchema', () => {
  it('should validate single provider', () => {
    const response = { providers: ['google'] };
    const result = oauthEnabledProvidersResponseSchema.parse(response);
    expect(result.providers).toEqual(['google']);
  });

  it('should validate multiple providers', () => {
    const response = { providers: ['google', 'github', 'apple'] };
    const result = oauthEnabledProvidersResponseSchema.parse(response);
    expect(result.providers).toHaveLength(3);
  });

  it('should validate empty providers', () => {
    const response = { providers: [] };
    const result = oauthEnabledProvidersResponseSchema.parse(response);
    expect(result.providers).toEqual([]);
  });

  it('should reject non-array providers', () => {
    const response = { providers: 'google' };
    expect(() => oauthEnabledProvidersResponseSchema.parse(response)).toThrow(
      'Providers must be an array',
    );
  });

  it('should reject invalid provider in array', () => {
    const response = { providers: ['google', 'invalid'] };
    expect(() => oauthEnabledProvidersResponseSchema.parse(response)).toThrow();
  });

  it('should reject null', () => {
    expect(() => oauthEnabledProvidersResponseSchema.parse(null)).toThrow(
      'Invalid enabled providers response',
    );
  });
});
