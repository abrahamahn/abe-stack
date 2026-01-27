// apps/server/src/modules/auth/utils/__tests__/cookies.test.ts
import { REFRESH_COOKIE_NAME } from '@shared/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../cookies';

import type { AuthConfig } from '@/config';

// ============================================================================
// Mock Helpers
// ============================================================================

interface MockReply {
  setCookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
}

function createMockReply(): MockReply {
  return {
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
}

function createMockAuthConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    strategies: ['local'],
    jwt: {
      secret: 'test-jwt-secret-32-characters-min',
      accessTokenExpiry: '15m',
      issuer: 'test-issuer',
      audience: 'test-audience',
    },
    refreshToken: {
      expiryDays: 7,
      gracePeriodSeconds: 30,
    },
    argon2: {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    },
    password: {
      minLength: 8,
      maxLength: 64,
      minZxcvbnScore: 3,
    },
    lockout: {
      maxAttempts: 10,
      lockoutDurationMs: 1800000,
      progressiveDelay: true,
      baseDelayMs: 1000,
    },
    bffMode: false,
    proxy: {
      trustProxy: false,
      trustedProxies: [],
      maxProxyDepth: 1,
    },
    rateLimit: {
      login: { max: 5, windowMs: 900000 },
      register: { max: 3, windowMs: 3600000 },
      forgotPassword: { max: 3, windowMs: 3600000 },
      verifyEmail: { max: 10, windowMs: 3600000 },
    },
    cookie: {
      name: 'refreshToken',
      secret: 'test-cookie-secret',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    },
    oauth: {},
    magicLink: {
      tokenExpiryMinutes: 15,
      maxAttempts: 3,
    },
    totp: {
      issuer: 'Test App',
      window: 1,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests: setRefreshTokenCookie
// ============================================================================

describe('setRefreshTokenCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should set cookie with correct name', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig();
    const token = 'test-refresh-token-12345';

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], token, config);

    expect(reply.setCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, token, expect.any(Object));
  });

  test('should set cookie with provided token', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig();
    const token = 'my-unique-refresh-token';

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], token, config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      'my-unique-refresh-token',
      expect.any(Object),
    );
  });

  test('should use httpOnly setting from config', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      cookie: {
        ...createMockAuthConfig().cookie,
        httpOnly: true,
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  test('should use secure setting from config', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      cookie: {
        ...createMockAuthConfig().cookie,
        secure: true,
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

  test('should use sameSite setting from config', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      cookie: {
        ...createMockAuthConfig().cookie,
        sameSite: 'strict',
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ sameSite: 'strict' }),
    );
  });

  test('should use path setting from config', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      cookie: {
        ...createMockAuthConfig().cookie,
        path: '/api',
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ path: '/api' }),
    );
  });

  test('should calculate maxAge from refreshToken expiryDays', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      refreshToken: {
        expiryDays: 7,
        gracePeriodSeconds: 30,
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    const expectedMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ maxAge: expectedMaxAge }),
    );
  });

  test('should handle different expiry days', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      refreshToken: {
        expiryDays: 30,
        gracePeriodSeconds: 30,
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    const expectedMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ maxAge: expectedMaxAge }),
    );
  });

  test('should handle development config (secure: false, sameSite: lax)', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig({
      cookie: {
        ...createMockAuthConfig().cookie,
        secure: false,
        sameSite: 'lax',
      },
    });

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        secure: false,
        sameSite: 'lax',
      }),
    );
  });

  test('should handle empty token', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig();

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], '', config);

    expect(reply.setCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, '', expect.any(Object));
  });

  test('should handle long tokens', () => {
    const reply = createMockReply();
    const config = createMockAuthConfig();
    const longToken = 'a'.repeat(1000);

    setRefreshTokenCookie(reply as Parameters<typeof setRefreshTokenCookie>[0], longToken, config);

    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      longToken,
      expect.any(Object),
    );
  });
});

// ============================================================================
// Tests: clearRefreshTokenCookie
// ============================================================================

describe('clearRefreshTokenCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should clear cookie with correct name', () => {
    const reply = createMockReply();

    clearRefreshTokenCookie(reply as Parameters<typeof clearRefreshTokenCookie>[0]);

    expect(reply.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.any(Object));
  });

  test('should clear cookie with path "/"', () => {
    const reply = createMockReply();

    clearRefreshTokenCookie(reply as Parameters<typeof clearRefreshTokenCookie>[0]);

    expect(reply.clearCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ path: '/' }),
    );
  });

  test('should only pass path option', () => {
    const reply = createMockReply();

    clearRefreshTokenCookie(reply as Parameters<typeof clearRefreshTokenCookie>[0]);

    // The clearCookie should only have path option
    expect(reply.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, { path: '/' });
  });

  test('should call clearCookie exactly once', () => {
    const reply = createMockReply();

    clearRefreshTokenCookie(reply as Parameters<typeof clearRefreshTokenCookie>[0]);

    expect(reply.clearCookie).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Tests: REFRESH_COOKIE_NAME constant
// ============================================================================

describe('REFRESH_COOKIE_NAME', () => {
  test('should be defined', () => {
    expect(REFRESH_COOKIE_NAME).toBeDefined();
  });

  test('should be "refreshToken"', () => {
    expect(REFRESH_COOKIE_NAME).toBe('refreshToken');
  });

  test('should be used consistently', () => {
    // Verify both functions use the same constant
    const setReply = createMockReply();
    const clearReply = createMockReply();
    const config = createMockAuthConfig();

    setRefreshTokenCookie(setReply as Parameters<typeof setRefreshTokenCookie>[0], 'token', config);
    clearRefreshTokenCookie(clearReply as Parameters<typeof clearRefreshTokenCookie>[0]);

    expect(setReply.setCookie).toHaveBeenCalledTimes(1);
    expect(clearReply.clearCookie).toHaveBeenCalledTimes(1);

    const setCallName = setReply.setCookie.mock.calls[0]?.[0];
    const clearCallName = clearReply.clearCookie.mock.calls[0]?.[0];

    expect(setCallName).toBeDefined();
    expect(clearCallName).toBeDefined();

    expect(setCallName).toBe(clearCallName);
    expect(setCallName).toBe(REFRESH_COOKIE_NAME);
  });
});
