// src/shared/src/domain/auth/auth.oauth.test.ts
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
} from './auth.oauth';

// ============================================================================
// oauthProviderSchema
// ============================================================================

describe('oauthProviderSchema', () => {
  it('should parse valid providers', () => {
    expect(oauthProviderSchema.parse('google')).toBe('google');
    expect(oauthProviderSchema.parse('github')).toBe('github');
    expect(oauthProviderSchema.parse('apple')).toBe('apple');
  });

  it('should reject invalid provider', () => {
    expect(() => oauthProviderSchema.parse('facebook')).toThrow('Invalid OAuth provider');
  });

  it('should reject non-string', () => {
    expect(() => oauthProviderSchema.parse(123)).toThrow('OAuth provider must be a string');
  });

  it('should export all providers', () => {
    expect(OAUTH_PROVIDERS).toEqual(['google', 'github', 'apple']);
  });
});

// ============================================================================
// oauthInitiateResponseSchema
// ============================================================================

describe('oauthInitiateResponseSchema', () => {
  it('should parse valid response', () => {
    const result = oauthInitiateResponseSchema.parse({
      url: 'https://accounts.google.com/o/oauth2/auth?client_id=123',
    });
    expect(result.url).toBe('https://accounts.google.com/o/oauth2/auth?client_id=123');
  });

  it('should reject invalid URL', () => {
    expect(() => oauthInitiateResponseSchema.parse({ url: 'not-a-url' })).toThrow(
      'URL must be a valid URL',
    );
  });

  it('should reject missing url', () => {
    expect(() => oauthInitiateResponseSchema.parse({})).toThrow('URL must be a valid URL');
  });

  it('should reject non-object', () => {
    expect(() => oauthInitiateResponseSchema.parse('string')).toThrow(
      'Invalid OAuth initiate response',
    );
  });

  it('should reject null', () => {
    expect(() => oauthInitiateResponseSchema.parse(null)).toThrow(
      'Invalid OAuth initiate response',
    );
  });
});

// ============================================================================
// oauthCallbackQuerySchema
// ============================================================================

describe('oauthCallbackQuerySchema', () => {
  it('should parse full query', () => {
    const result = oauthCallbackQuerySchema.parse({
      code: 'abc123',
      state: 'state456',
      error: undefined,
      error_description: undefined,
    });
    expect(result.code).toBe('abc123');
    expect(result.state).toBe('state456');
  });

  it('should parse error query', () => {
    const result = oauthCallbackQuerySchema.parse({
      error: 'access_denied',
      error_description: 'The user denied access',
    });
    expect(result.error).toBe('access_denied');
    expect(result.error_description).toBe('The user denied access');
    expect(result.code).toBeUndefined();
  });

  it('should return empty object for null input', () => {
    const result = oauthCallbackQuerySchema.parse(null);
    expect(result).toEqual({});
  });

  it('should ignore non-string fields', () => {
    const result = oauthCallbackQuerySchema.parse({ code: 123, state: true });
    expect(result.code).toBeUndefined();
    expect(result.state).toBeUndefined();
  });
});

// ============================================================================
// oauthCallbackResponseSchema
// ============================================================================

describe('oauthCallbackResponseSchema', () => {
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should parse valid response', () => {
    const result = oauthCallbackResponseSchema.parse({
      token: 'jwt-token-123',
      user: validUser,
      isNewUser: false,
    });
    expect(result.token).toBe('jwt-token-123');
    expect(result.isNewUser).toBe(false);
  });

  it('should reject missing token', () => {
    expect(() =>
      oauthCallbackResponseSchema.parse({ user: validUser, isNewUser: false }),
    ).toThrow('Token must be a string');
  });

  it('should reject missing isNewUser', () => {
    expect(() =>
      oauthCallbackResponseSchema.parse({ token: 'tok', user: validUser }),
    ).toThrow('isNewUser must be a boolean');
  });

  it('should reject non-object', () => {
    expect(() => oauthCallbackResponseSchema.parse(null)).toThrow(
      'Invalid OAuth callback response',
    );
  });
});

// ============================================================================
// oauthLinkResponseSchema
// ============================================================================

describe('oauthLinkResponseSchema', () => {
  it('should parse valid link response', () => {
    const result = oauthLinkResponseSchema.parse({
      url: 'https://github.com/login/oauth/authorize',
    });
    expect(result.url).toBe('https://github.com/login/oauth/authorize');
  });

  it('should reject invalid URL', () => {
    expect(() => oauthLinkResponseSchema.parse({ url: 'bad' })).toThrow(
      'URL must be a valid URL',
    );
  });

  it('should reject non-object', () => {
    expect(() => oauthLinkResponseSchema.parse(undefined)).toThrow(
      'Invalid OAuth link response',
    );
  });
});

// ============================================================================
// oauthLinkCallbackResponseSchema
// ============================================================================

describe('oauthLinkCallbackResponseSchema', () => {
  it('should parse valid link callback', () => {
    const result = oauthLinkCallbackResponseSchema.parse({
      linked: true,
      provider: 'google',
    });
    expect(result.linked).toBe(true);
    expect(result.provider).toBe('google');
  });

  it('should reject invalid provider in link callback', () => {
    expect(() =>
      oauthLinkCallbackResponseSchema.parse({ linked: true, provider: 'twitter' }),
    ).toThrow('Invalid OAuth provider');
  });

  it('should reject non-boolean linked', () => {
    expect(() =>
      oauthLinkCallbackResponseSchema.parse({ linked: 'yes', provider: 'google' }),
    ).toThrow('Linked must be a boolean');
  });
});

// ============================================================================
// oauthUnlinkResponseSchema
// ============================================================================

describe('oauthUnlinkResponseSchema', () => {
  it('should parse valid unlink response', () => {
    const result = oauthUnlinkResponseSchema.parse({ message: 'Successfully unlinked' });
    expect(result.message).toBe('Successfully unlinked');
  });

  it('should reject non-string message', () => {
    expect(() => oauthUnlinkResponseSchema.parse({ message: 123 })).toThrow(
      'Message must be a string',
    );
  });

  it('should reject non-object', () => {
    expect(() => oauthUnlinkResponseSchema.parse(null)).toThrow(
      'Invalid OAuth unlink response',
    );
  });
});

// ============================================================================
// oauthConnectionSchema
// ============================================================================

describe('oauthConnectionSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('should parse connection with Date connectedAt', () => {
    const date = new Date('2026-01-15T10:00:00Z');
    const result = oauthConnectionSchema.parse({
      id: validUuid,
      provider: 'github',
      providerEmail: 'user@github.com',
      connectedAt: date,
    });
    expect(result.id).toBe(validUuid);
    expect(result.provider).toBe('github');
    expect(result.providerEmail).toBe('user@github.com');
    expect(result.connectedAt).toEqual(date);
  });

  it('should parse connection with string connectedAt', () => {
    const result = oauthConnectionSchema.parse({
      id: validUuid,
      provider: 'apple',
      providerEmail: null,
      connectedAt: '2026-01-15T10:00:00Z',
    });
    expect(result.providerEmail).toBeNull();
    expect(result.connectedAt).toBeInstanceOf(Date);
  });

  it('should parse connection with numeric connectedAt', () => {
    const ts = Date.now();
    const result = oauthConnectionSchema.parse({
      id: validUuid,
      provider: 'google',
      providerEmail: null,
      connectedAt: ts,
    });
    expect(result.connectedAt.getTime()).toBe(ts);
  });

  it('should reject invalid connectedAt string', () => {
    expect(() =>
      oauthConnectionSchema.parse({
        id: validUuid,
        provider: 'google',
        providerEmail: null,
        connectedAt: 'not-a-date',
      }),
    ).toThrow('Invalid connectedAt date');
  });

  it('should reject missing connectedAt', () => {
    expect(() =>
      oauthConnectionSchema.parse({
        id: validUuid,
        provider: 'google',
        providerEmail: null,
      }),
    ).toThrow('connectedAt must be a date');
  });

  it('should reject non-string providerEmail', () => {
    expect(() =>
      oauthConnectionSchema.parse({
        id: validUuid,
        provider: 'google',
        providerEmail: 123,
        connectedAt: new Date(),
      }),
    ).toThrow('Provider email must be a string or null');
  });

  it('should reject non-object', () => {
    expect(() => oauthConnectionSchema.parse('string')).toThrow('Invalid OAuth connection');
  });
});

// ============================================================================
// oauthConnectionsResponseSchema
// ============================================================================

describe('oauthConnectionsResponseSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('should parse empty connections array', () => {
    const result = oauthConnectionsResponseSchema.parse({ connections: [] });
    expect(result.connections).toEqual([]);
  });

  it('should parse connections array', () => {
    const result = oauthConnectionsResponseSchema.parse({
      connections: [
        {
          id: validUuid,
          provider: 'google',
          providerEmail: 'user@gmail.com',
          connectedAt: new Date(),
        },
      ],
    });
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].provider).toBe('google');
  });

  it('should reject non-array connections', () => {
    expect(() => oauthConnectionsResponseSchema.parse({ connections: 'bad' })).toThrow(
      'Connections must be an array',
    );
  });
});

// ============================================================================
// oauthEnabledProvidersResponseSchema
// ============================================================================

describe('oauthEnabledProvidersResponseSchema', () => {
  it('should parse valid providers list', () => {
    const result = oauthEnabledProvidersResponseSchema.parse({
      providers: ['google', 'github'],
    });
    expect(result.providers).toEqual(['google', 'github']);
  });

  it('should parse empty providers list', () => {
    const result = oauthEnabledProvidersResponseSchema.parse({ providers: [] });
    expect(result.providers).toEqual([]);
  });

  it('should reject invalid provider in list', () => {
    expect(() =>
      oauthEnabledProvidersResponseSchema.parse({ providers: ['google', 'twitter'] }),
    ).toThrow('Invalid OAuth provider');
  });

  it('should reject non-array providers', () => {
    expect(() => oauthEnabledProvidersResponseSchema.parse({ providers: 'google' })).toThrow(
      'Providers must be an array',
    );
  });

  it('should reject non-object', () => {
    expect(() => oauthEnabledProvidersResponseSchema.parse(null)).toThrow(
      'Invalid enabled providers response',
    );
  });
});
