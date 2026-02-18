// main/shared/src/core/auth/auth.oauth.schemas.test.ts

import { describe, expect, it } from 'vitest';

import { OAUTH_PROVIDERS } from '../constants/auth';
import {
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
} from './auth.oauth.schemas';

// ============================================================================
// Test Fixtures
// ============================================================================

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_ISO_DATE = '2024-01-15T10:30:00.000Z';

/**
 * Minimal valid user object satisfying userSchema.parse requirements.
 * Matches the User interface with required ISO strings for timestamps.
 */
function makeValidUser() {
  return {
    id: VALID_UUID,
    email: 'user@example.com',
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
    createdAt: VALID_ISO_DATE,
    updatedAt: VALID_ISO_DATE,
  };
}

/**
 * Minimal valid OAuthConnection object for reuse across connection tests.
 */
function makeValidConnection(overrides?: Record<string, unknown>) {
  return {
    id: VALID_UUID,
    provider: OAUTH_PROVIDERS[0],
    providerEmail: 'user@provider.com',
    connectedAt: new Date('2024-01-15T10:30:00.000Z'),
    ...overrides,
  };
}

// ============================================================================
// oauthProviderSchema
// ============================================================================

describe('oauthProviderSchema', () => {
  describe('valid providers', () => {
    it('should accept every provider in OAUTH_PROVIDERS', () => {
      for (const provider of OAUTH_PROVIDERS) {
        expect(oauthProviderSchema.parse(provider)).toBe(provider);
      }
    });

    it('should return the exact string value unchanged', () => {
      const provider = OAUTH_PROVIDERS[0];
      const result = oauthProviderSchema.parse(provider);
      expect(result).toBe(provider);
      expect(typeof result).toBe('string');
    });
  });

  describe('type rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthProviderSchema.parse(null)).toThrow('OAuth provider must be a string');
    });

    it('should throw for undefined', () => {
      expect(() => oauthProviderSchema.parse(undefined)).toThrow('OAuth provider must be a string');
    });

    it('should throw for number', () => {
      expect(() => oauthProviderSchema.parse(42)).toThrow('OAuth provider must be a string');
    });

    it('should throw for boolean true', () => {
      expect(() => oauthProviderSchema.parse(true)).toThrow('OAuth provider must be a string');
    });

    it('should throw for object', () => {
      expect(() => oauthProviderSchema.parse({ provider: 'google' })).toThrow(
        'OAuth provider must be a string',
      );
    });

    it('should throw for array', () => {
      expect(() => oauthProviderSchema.parse(['google'])).toThrow('OAuth provider must be a string');
    });
  });

  describe('invalid provider strings', () => {
    it('should throw for an empty string', () => {
      expect(() => oauthProviderSchema.parse('')).toThrow('Invalid OAuth provider');
    });

    it('should throw for a provider not in the list', () => {
      expect(() => oauthProviderSchema.parse('facebook')).toThrow('Invalid OAuth provider');
    });

    it('should throw for a provider name with wrong casing', () => {
      expect(() => oauthProviderSchema.parse('Google')).toThrow('Invalid OAuth provider');
      expect(() => oauthProviderSchema.parse('GOOGLE')).toThrow('Invalid OAuth provider');
    });

    it('should throw for whitespace-padded provider name', () => {
      expect(() => oauthProviderSchema.parse(' google ')).toThrow('Invalid OAuth provider');
    });

    it('should throw for a provider with trailing newline', () => {
      expect(() => oauthProviderSchema.parse('google\n')).toThrow('Invalid OAuth provider');
    });

    it('should include valid providers in the error message', () => {
      let errorMsg = '';
      try {
        oauthProviderSchema.parse('discord');
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : '';
      }
      expect(errorMsg).toContain('Must be one of:');
    });
  });

  describe('safeParse', () => {
    it('should return success for a valid provider', () => {
      const result = oauthProviderSchema.safeParse(OAUTH_PROVIDERS[0]);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(OAUTH_PROVIDERS[0]);
    });

    it('should return failure for an invalid provider', () => {
      const result = oauthProviderSchema.safeParse('invalid');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });
});

// ============================================================================
// oauthInitiateResponseSchema
// ============================================================================

describe('oauthInitiateResponseSchema', () => {
  describe('valid input', () => {
    it('should accept an https URL', () => {
      const result = oauthInitiateResponseSchema.parse({ url: 'https://accounts.google.com/o/oauth2/auth' });
      expect(result).toEqual({ url: 'https://accounts.google.com/o/oauth2/auth' });
    });

    it('should accept an http URL', () => {
      const result = oauthInitiateResponseSchema.parse({ url: 'http://localhost:4000/auth/callback' });
      expect(result.url).toBe('http://localhost:4000/auth/callback');
    });

    it('should accept a URL with query params', () => {
      const url = 'https://auth.example.com/oauth?client_id=abc&redirect_uri=https%3A%2F%2Fapp.example.com';
      const result = oauthInitiateResponseSchema.parse({ url });
      expect(result.url).toBe(url);
    });
  });

  describe('null/undefined/non-object rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthInitiateResponseSchema.parse(null)).toThrow('Invalid OAuth initiate response');
    });

    it('should throw for undefined', () => {
      expect(() => oauthInitiateResponseSchema.parse(undefined)).toThrow('Invalid OAuth initiate response');
    });

    it('should throw for a plain string', () => {
      expect(() => oauthInitiateResponseSchema.parse('https://example.com')).toThrow(
        'Invalid OAuth initiate response',
      );
    });

    it('should throw for a number', () => {
      expect(() => oauthInitiateResponseSchema.parse(42)).toThrow('Invalid OAuth initiate response');
    });
  });

  describe('invalid URL values', () => {
    it('should throw when url field is missing', () => {
      expect(() => oauthInitiateResponseSchema.parse({})).toThrow('URL must be a valid URL');
    });

    it('should throw when url is not a string', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: 123 })).toThrow('URL must be a valid URL');
    });

    it('should throw when url is null', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: null })).toThrow('URL must be a valid URL');
    });

    it('should throw for a relative path (no protocol)', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: '/auth/callback' })).toThrow(
        'URL must be a valid URL',
      );
    });

    it('should throw for a bare domain without protocol', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: 'example.com' })).toThrow(
        'URL must be a valid URL',
      );
    });

    it('should throw for an empty string url', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: '' })).toThrow('URL must be a valid URL');
    });

    it('should throw for whitespace-only url', () => {
      expect(() => oauthInitiateResponseSchema.parse({ url: '   ' })).toThrow('URL must be a valid URL');
    });
  });

  describe('extra fields are stripped', () => {
    it('should return only the url field', () => {
      const result = oauthInitiateResponseSchema.parse({
        url: 'https://example.com/auth',
        extra: 'should-be-ignored',
      });
      expect(result).toEqual({ url: 'https://example.com/auth' });
      expect('extra' in result).toBe(false);
    });
  });
});

// ============================================================================
// oauthCallbackQuerySchema
// ============================================================================

describe('oauthCallbackQuerySchema', () => {
  describe('permissive null/undefined handling', () => {
    it('should return empty object for null', () => {
      expect(oauthCallbackQuerySchema.parse(null)).toEqual({});
    });

    it('should return empty object for undefined', () => {
      expect(oauthCallbackQuerySchema.parse(undefined)).toEqual({});
    });

    it('should return empty object for a number', () => {
      expect(oauthCallbackQuerySchema.parse(42)).toEqual({});
    });

    it('should return empty object for a string', () => {
      expect(oauthCallbackQuerySchema.parse('not-an-object')).toEqual({});
    });

    it('should return empty object for a boolean', () => {
      expect(oauthCallbackQuerySchema.parse(false)).toEqual({});
    });
  });

  describe('optional fields', () => {
    it('should parse code when present as a string', () => {
      const result = oauthCallbackQuerySchema.parse({ code: 'auth_code_123' });
      expect(result.code).toBe('auth_code_123');
    });

    it('should parse state when present', () => {
      const result = oauthCallbackQuerySchema.parse({ state: 'csrf_state_token' });
      expect(result.state).toBe('csrf_state_token');
    });

    it('should parse error when present', () => {
      const result = oauthCallbackQuerySchema.parse({ error: 'access_denied' });
      expect(result.error).toBe('access_denied');
    });

    it('should parse error_description when present', () => {
      const result = oauthCallbackQuerySchema.parse({ error_description: 'User denied access' });
      expect(result.error_description).toBe('User denied access');
    });

    it('should parse all four fields simultaneously', () => {
      const input = {
        code: 'abc',
        state: 'xyz',
        error: 'some_error',
        error_description: 'details',
      };
      const result = oauthCallbackQuerySchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe('non-string field values are dropped', () => {
    it('should drop numeric code and return undefined', () => {
      const result = oauthCallbackQuerySchema.parse({ code: 12345 });
      expect(result.code).toBeUndefined();
    });

    it('should drop boolean state and return undefined', () => {
      const result = oauthCallbackQuerySchema.parse({ state: true });
      expect(result.state).toBeUndefined();
    });

    it('should drop null error and return undefined', () => {
      const result = oauthCallbackQuerySchema.parse({ error: null });
      expect(result.error).toBeUndefined();
    });

    it('should drop array error_description and return undefined', () => {
      const result = oauthCallbackQuerySchema.parse({ error_description: ['msg'] });
      expect(result.error_description).toBeUndefined();
    });
  });

  describe('empty object input', () => {
    it('should return object with all fields undefined', () => {
      const result = oauthCallbackQuerySchema.parse({});
      expect(result.code).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.error_description).toBeUndefined();
    });
  });
});

// ============================================================================
// oauthCallbackResponseSchema
// ============================================================================

describe('oauthCallbackResponseSchema', () => {
  describe('valid input', () => {
    it('should parse a complete valid callback response', () => {
      const input = {
        token: 'jwt.token.value',
        user: makeValidUser(),
        isNewUser: false,
      };
      const result = oauthCallbackResponseSchema.parse(input);
      expect(result.token).toBe('jwt.token.value');
      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('user@example.com');
    });

    it('should accept isNewUser=true', () => {
      const result = oauthCallbackResponseSchema.parse({
        token: 'token123',
        user: makeValidUser(),
        isNewUser: true,
      });
      expect(result.isNewUser).toBe(true);
    });
  });

  describe('null/undefined/non-object rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthCallbackResponseSchema.parse(null)).toThrow('Invalid OAuth callback response');
    });

    it('should throw for undefined', () => {
      expect(() => oauthCallbackResponseSchema.parse(undefined)).toThrow(
        'Invalid OAuth callback response',
      );
    });

    it('should throw for a plain string', () => {
      expect(() => oauthCallbackResponseSchema.parse('token')).toThrow(
        'Invalid OAuth callback response',
      );
    });
  });

  describe('token validation', () => {
    it('should throw when token is missing', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ user: makeValidUser(), isNewUser: false }),
      ).toThrow('Token must be a string');
    });

    it('should throw when token is a number', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 123, user: makeValidUser(), isNewUser: false }),
      ).toThrow('Token must be a string');
    });

    it('should throw when token is null', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: null, user: makeValidUser(), isNewUser: false }),
      ).toThrow('Token must be a string');
    });

    it('should accept an empty string token (no length validation)', () => {
      const result = oauthCallbackResponseSchema.parse({
        token: '',
        user: makeValidUser(),
        isNewUser: false,
      });
      expect(result.token).toBe('');
    });
  });

  describe('isNewUser validation', () => {
    it('should throw when isNewUser is missing', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 'tok', user: makeValidUser() }),
      ).toThrow('isNewUser must be a boolean');
    });

    it('should throw when isNewUser is a string "true"', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({
          token: 'tok',
          user: makeValidUser(),
          isNewUser: 'true',
        }),
      ).toThrow('isNewUser must be a boolean');
    });

    it('should throw when isNewUser is 1 (truthy number)', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 'tok', user: makeValidUser(), isNewUser: 1 }),
      ).toThrow('isNewUser must be a boolean');
    });

    it('should throw when isNewUser is null', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 'tok', user: makeValidUser(), isNewUser: null }),
      ).toThrow('isNewUser must be a boolean');
    });
  });

  describe('user field delegation', () => {
    it('should throw when user is missing', () => {
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 'tok', isNewUser: false }),
      ).toThrow();
    });

    it('should throw when user has an invalid email', () => {
      const badUser = { ...makeValidUser(), email: 'not-an-email' };
      expect(() =>
        oauthCallbackResponseSchema.parse({ token: 'tok', user: badUser, isNewUser: false }),
      ).toThrow();
    });
  });
});

// ============================================================================
// oauthLinkResponseSchema
// ============================================================================

describe('oauthLinkResponseSchema', () => {
  describe('valid input', () => {
    it('should parse a valid link response', () => {
      const result = oauthLinkResponseSchema.parse({ url: 'https://accounts.google.com/link' });
      expect(result).toEqual({ url: 'https://accounts.google.com/link' });
    });
  });

  describe('rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthLinkResponseSchema.parse(null)).toThrow('Invalid OAuth link response');
    });

    it('should throw for undefined', () => {
      expect(() => oauthLinkResponseSchema.parse(undefined)).toThrow('Invalid OAuth link response');
    });

    it('should throw for a missing url field', () => {
      expect(() => oauthLinkResponseSchema.parse({})).toThrow('URL must be a valid URL');
    });

    it('should throw for a relative URL', () => {
      expect(() => oauthLinkResponseSchema.parse({ url: '/link/callback' })).toThrow(
        'URL must be a valid URL',
      );
    });

    it('should throw for a number url', () => {
      expect(() => oauthLinkResponseSchema.parse({ url: 42 })).toThrow('URL must be a valid URL');
    });
  });
});

// ============================================================================
// oauthLinkCallbackResponseSchema
// ============================================================================

describe('oauthLinkCallbackResponseSchema', () => {
  describe('valid input', () => {
    it('should parse linked=true with a valid provider', () => {
      const result = oauthLinkCallbackResponseSchema.parse({
        linked: true,
        provider: OAUTH_PROVIDERS[0],
      });
      expect(result.linked).toBe(true);
      expect(result.provider).toBe(OAUTH_PROVIDERS[0]);
    });

    it('should parse linked=false', () => {
      const result = oauthLinkCallbackResponseSchema.parse({
        linked: false,
        provider: OAUTH_PROVIDERS[0],
      });
      expect(result.linked).toBe(false);
    });
  });

  describe('null/undefined rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthLinkCallbackResponseSchema.parse(null)).toThrow(
        'Invalid OAuth link callback response',
      );
    });

    it('should throw for undefined', () => {
      expect(() => oauthLinkCallbackResponseSchema.parse(undefined)).toThrow(
        'Invalid OAuth link callback response',
      );
    });
  });

  describe('linked field validation', () => {
    it('should throw when linked is missing', () => {
      expect(() =>
        oauthLinkCallbackResponseSchema.parse({ provider: OAUTH_PROVIDERS[0] }),
      ).toThrow('Linked must be a boolean');
    });

    it('should throw when linked is a string "true"', () => {
      expect(() =>
        oauthLinkCallbackResponseSchema.parse({ linked: 'true', provider: OAUTH_PROVIDERS[0] }),
      ).toThrow('Linked must be a boolean');
    });

    it('should throw when linked is 1', () => {
      expect(() =>
        oauthLinkCallbackResponseSchema.parse({ linked: 1, provider: OAUTH_PROVIDERS[0] }),
      ).toThrow('Linked must be a boolean');
    });

    it('should throw when linked is null', () => {
      expect(() =>
        oauthLinkCallbackResponseSchema.parse({ linked: null, provider: OAUTH_PROVIDERS[0] }),
      ).toThrow('Linked must be a boolean');
    });
  });

  describe('provider field validation', () => {
    it('should throw when provider is invalid', () => {
      expect(() =>
        oauthLinkCallbackResponseSchema.parse({ linked: true, provider: 'facebook' }),
      ).toThrow('Invalid OAuth provider');
    });

    it('should throw when provider is missing', () => {
      expect(() => oauthLinkCallbackResponseSchema.parse({ linked: true })).toThrow();
    });
  });
});

// ============================================================================
// oauthUnlinkResponseSchema
// ============================================================================

describe('oauthUnlinkResponseSchema', () => {
  describe('valid input', () => {
    it('should parse a valid unlink response', () => {
      const result = oauthUnlinkResponseSchema.parse({ message: 'Provider unlinked successfully' });
      expect(result).toEqual({ message: 'Provider unlinked successfully' });
    });

    it('should accept an empty string message', () => {
      const result = oauthUnlinkResponseSchema.parse({ message: '' });
      expect(result.message).toBe('');
    });
  });

  describe('null/undefined rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthUnlinkResponseSchema.parse(null)).toThrow('Invalid OAuth unlink response');
    });

    it('should throw for undefined', () => {
      expect(() => oauthUnlinkResponseSchema.parse(undefined)).toThrow('Invalid OAuth unlink response');
    });

    it('should throw for a plain string', () => {
      expect(() => oauthUnlinkResponseSchema.parse('unlinked')).toThrow(
        'Invalid OAuth unlink response',
      );
    });
  });

  describe('message field validation', () => {
    it('should throw when message is missing', () => {
      expect(() => oauthUnlinkResponseSchema.parse({})).toThrow('Message must be a string');
    });

    it('should throw when message is a number', () => {
      expect(() => oauthUnlinkResponseSchema.parse({ message: 42 })).toThrow(
        'Message must be a string',
      );
    });

    it('should throw when message is null', () => {
      expect(() => oauthUnlinkResponseSchema.parse({ message: null })).toThrow(
        'Message must be a string',
      );
    });

    it('should throw when message is a boolean', () => {
      expect(() => oauthUnlinkResponseSchema.parse({ message: true })).toThrow(
        'Message must be a string',
      );
    });
  });
});

// ============================================================================
// oauthConnectionSchema
// ============================================================================

describe('oauthConnectionSchema', () => {
  describe('valid input', () => {
    it('should parse a connection with a Date object', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = oauthConnectionSchema.parse(makeValidConnection({ connectedAt: date }));
      expect(result.id).toBe(VALID_UUID);
      expect(result.provider).toBe(OAUTH_PROVIDERS[0]);
      expect(result.connectedAt).toEqual(date);
    });

    it('should coerce an ISO date string to a Date', () => {
      const result = oauthConnectionSchema.parse(
        makeValidConnection({ connectedAt: '2024-06-01T00:00:00Z' }),
      );
      expect(result.connectedAt).toBeInstanceOf(Date);
      expect(result.connectedAt.getFullYear()).toBe(2024);
    });

    it('should coerce a Unix timestamp number to a Date', () => {
      const ts = 1700000000000;
      const result = oauthConnectionSchema.parse(makeValidConnection({ connectedAt: ts }));
      expect(result.connectedAt).toBeInstanceOf(Date);
      expect(result.connectedAt.getTime()).toBe(ts);
    });

    it('should accept providerEmail as null', () => {
      const result = oauthConnectionSchema.parse(makeValidConnection({ providerEmail: null }));
      expect(result.providerEmail).toBeNull();
    });

    it('should accept providerEmail as undefined (treated as null)', () => {
      const result = oauthConnectionSchema.parse(makeValidConnection({ providerEmail: undefined }));
      expect(result.providerEmail).toBeNull();
    });

    it('should accept a valid providerEmail string', () => {
      const result = oauthConnectionSchema.parse(
        makeValidConnection({ providerEmail: 'oauth@gmail.com' }),
      );
      expect(result.providerEmail).toBe('oauth@gmail.com');
    });
  });

  describe('null/undefined/non-object rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthConnectionSchema.parse(null)).toThrow('Invalid OAuth connection');
    });

    it('should throw for undefined', () => {
      expect(() => oauthConnectionSchema.parse(undefined)).toThrow('Invalid OAuth connection');
    });

    it('should throw for a plain string', () => {
      expect(() => oauthConnectionSchema.parse('connection')).toThrow('Invalid OAuth connection');
    });

    it('should throw for a number', () => {
      expect(() => oauthConnectionSchema.parse(0)).toThrow('Invalid OAuth connection');
    });
  });

  describe('id validation', () => {
    it('should throw when id is missing', () => {
      const conn = makeValidConnection();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { id: _removed, ...withoutId } = conn as any;
      expect(() => oauthConnectionSchema.parse(withoutId)).toThrow();
    });

    it('should throw when id is not a valid UUID', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ id: 'not-a-uuid' })),
      ).toThrow();
    });

    it('should throw when id is a number', () => {
      expect(() => oauthConnectionSchema.parse(makeValidConnection({ id: 123 }))).toThrow();
    });
  });

  describe('provider validation', () => {
    it('should throw when provider is invalid', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ provider: 'twitter' })),
      ).toThrow('Invalid OAuth provider');
    });

    it('should throw when provider is missing', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ provider: undefined })),
      ).toThrow();
    });
  });

  describe('providerEmail type checking', () => {
    it('should throw when providerEmail is a number', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ providerEmail: 42 })),
      ).toThrow('Provider email must be a string or null');
    });

    it('should throw when providerEmail is true', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ providerEmail: true })),
      ).toThrow('Provider email must be a string or null');
    });

    it('should throw when providerEmail is an object', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ providerEmail: {} })),
      ).toThrow('Provider email must be a string or null');
    });
  });

  describe('connectedAt Date coercion edge cases', () => {
    it('should throw for an invalid date string', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: 'not-a-date' })),
      ).toThrow('Invalid connectedAt date');
    });

    it('should throw for NaN numeric timestamp', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: NaN })),
      ).toThrow('Invalid connectedAt date');
    });

    it('should throw for boolean connectedAt', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: true })),
      ).toThrow('connectedAt must be a date');
    });

    it('should throw for null connectedAt', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: null })),
      ).toThrow('connectedAt must be a date');
    });

    it('should throw for array connectedAt', () => {
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: [2024] })),
      ).toThrow('connectedAt must be a date');
    });

    it('should throw for an empty string connectedAt', () => {
      // new Date('') is Invalid Date
      expect(() =>
        oauthConnectionSchema.parse(makeValidConnection({ connectedAt: '' })),
      ).toThrow('Invalid connectedAt date');
    });

    it('should accept zero as Unix epoch (valid Date)', () => {
      const result = oauthConnectionSchema.parse(makeValidConnection({ connectedAt: 0 }));
      expect(result.connectedAt.getTime()).toBe(0);
    });

    it('should accept a negative timestamp (pre-epoch date)', () => {
      const result = oauthConnectionSchema.parse(makeValidConnection({ connectedAt: -1000 }));
      expect(result.connectedAt).toBeInstanceOf(Date);
      expect(result.connectedAt.getTime()).toBe(-1000);
    });
  });
});

// ============================================================================
// oauthConnectionsResponseSchema
// ============================================================================

describe('oauthConnectionsResponseSchema', () => {
  describe('valid input', () => {
    it('should parse an empty connections array', () => {
      const result = oauthConnectionsResponseSchema.parse({ connections: [] });
      expect(result.connections).toEqual([]);
    });

    it('should parse a single valid connection', () => {
      const result = oauthConnectionsResponseSchema.parse({
        connections: [makeValidConnection()],
      });
      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].provider).toBe(OAUTH_PROVIDERS[0]);
    });

    it('should parse multiple connections', () => {
      const connections = OAUTH_PROVIDERS.slice(0, 2).map((provider) =>
        makeValidConnection({ provider }),
      );
      const result = oauthConnectionsResponseSchema.parse({ connections });
      expect(result.connections).toHaveLength(2);
    });
  });

  describe('null/undefined/non-object rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthConnectionsResponseSchema.parse(null)).toThrow(
        'Invalid OAuth connections response',
      );
    });

    it('should throw for undefined', () => {
      expect(() => oauthConnectionsResponseSchema.parse(undefined)).toThrow(
        'Invalid OAuth connections response',
      );
    });

    it('should throw for a plain string', () => {
      expect(() => oauthConnectionsResponseSchema.parse('[]')).toThrow(
        'Invalid OAuth connections response',
      );
    });
  });

  describe('connections field validation', () => {
    it('should throw when connections field is missing', () => {
      expect(() => oauthConnectionsResponseSchema.parse({})).toThrow('Connections must be an array');
    });

    it('should throw when connections is an object (not array)', () => {
      expect(() =>
        oauthConnectionsResponseSchema.parse({ connections: {} }),
      ).toThrow('Connections must be an array');
    });

    it('should throw when connections is null', () => {
      expect(() =>
        oauthConnectionsResponseSchema.parse({ connections: null }),
      ).toThrow('Connections must be an array');
    });

    it('should throw when connections is a number', () => {
      expect(() =>
        oauthConnectionsResponseSchema.parse({ connections: 5 }),
      ).toThrow('Connections must be an array');
    });
  });

  describe('element-level validation', () => {
    it('should throw when any connection in the array is invalid', () => {
      expect(() =>
        oauthConnectionsResponseSchema.parse({
          connections: [makeValidConnection(), { invalid: true }],
        }),
      ).toThrow();
    });

    it('should throw when an element has an invalid provider', () => {
      expect(() =>
        oauthConnectionsResponseSchema.parse({
          connections: [makeValidConnection({ provider: 'discord' })],
        }),
      ).toThrow('Invalid OAuth provider');
    });
  });
});

// ============================================================================
// oauthEnabledProvidersResponseSchema
// ============================================================================

describe('oauthEnabledProvidersResponseSchema', () => {
  describe('valid input', () => {
    it('should parse an empty providers array', () => {
      const result = oauthEnabledProvidersResponseSchema.parse({ providers: [] });
      expect(result.providers).toEqual([]);
    });

    it('should parse all valid OAUTH_PROVIDERS', () => {
      const result = oauthEnabledProvidersResponseSchema.parse({
        providers: [...OAUTH_PROVIDERS],
      });
      expect(result.providers).toEqual([...OAUTH_PROVIDERS]);
    });

    it('should parse a single valid provider', () => {
      const result = oauthEnabledProvidersResponseSchema.parse({
        providers: [OAUTH_PROVIDERS[0]],
      });
      expect(result.providers).toHaveLength(1);
      expect(result.providers[0]).toBe(OAUTH_PROVIDERS[0]);
    });
  });

  describe('null/undefined/non-object rejection', () => {
    it('should throw for null', () => {
      expect(() => oauthEnabledProvidersResponseSchema.parse(null)).toThrow(
        'Invalid enabled providers response',
      );
    });

    it('should throw for undefined', () => {
      expect(() => oauthEnabledProvidersResponseSchema.parse(undefined)).toThrow(
        'Invalid enabled providers response',
      );
    });

    it('should throw for a plain string', () => {
      expect(() => oauthEnabledProvidersResponseSchema.parse('providers')).toThrow(
        'Invalid enabled providers response',
      );
    });
  });

  describe('providers field validation', () => {
    it('should throw when providers field is missing', () => {
      expect(() => oauthEnabledProvidersResponseSchema.parse({})).toThrow(
        'Providers must be an array',
      );
    });

    it('should throw when providers is null', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: null }),
      ).toThrow('Providers must be an array');
    });

    it('should throw when providers is an object', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: {} }),
      ).toThrow('Providers must be an array');
    });

    it('should throw when providers is a string', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: 'google' }),
      ).toThrow('Providers must be an array');
    });
  });

  describe('element-level validation', () => {
    it('should throw when providers array contains an invalid provider string', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: ['google', 'microsoft'] }),
      ).toThrow('Invalid OAuth provider');
    });

    it('should throw when providers array contains a number', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: [1] }),
      ).toThrow('OAuth provider must be a string');
    });

    it('should throw when providers array contains null', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: [null] }),
      ).toThrow('OAuth provider must be a string');
    });

    it('should throw when providers array contains an empty string', () => {
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({ providers: [''] }),
      ).toThrow('Invalid OAuth provider');
    });

    it('should throw on first invalid provider (fail-fast per .map)', () => {
      // Mixed valid and invalid; the invalid one causes a throw during map
      const validProvider = OAUTH_PROVIDERS[0];
      expect(() =>
        oauthEnabledProvidersResponseSchema.parse({
          providers: [validProvider, 'invalid_provider'],
        }),
      ).toThrow('Invalid OAuth provider');
    });
  });
});
