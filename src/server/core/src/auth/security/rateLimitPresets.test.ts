// src/server/core/src/auth/security/rateLimitPresets.test.ts
/**
 * Auth Rate Limit Presets Tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import {
  AUTH_RATE_LIMITS,
  authRateLimiters,
  createAuthRateLimitHook,
  type AuthEndpoint,
} from './rateLimitPresets';

describe('AUTH_RATE_LIMITS', () => {
  it('should have login limits of 5 per minute', () => {
    expect(AUTH_RATE_LIMITS.login).toEqual({
      max: 5,
      windowMs: 60_000,
    });
  });

  it('should have register limits of 3 per hour', () => {
    expect(AUTH_RATE_LIMITS.register).toEqual({
      max: 3,
      windowMs: 3_600_000,
    });
  });

  it('should have forgotPassword limits of 3 per hour', () => {
    expect(AUTH_RATE_LIMITS.forgotPassword).toEqual({
      max: 3,
      windowMs: 3_600_000,
    });
  });

  it('should have resetPassword limits of 5 per hour', () => {
    expect(AUTH_RATE_LIMITS.resetPassword).toEqual({
      max: 5,
      windowMs: 3_600_000,
    });
  });

  it('should have verifyEmail limits of 5 per hour', () => {
    expect(AUTH_RATE_LIMITS.verifyEmail).toEqual({
      max: 5,
      windowMs: 3_600_000,
    });
  });

  it('should have resendVerification limits of 3 per hour', () => {
    expect(AUTH_RATE_LIMITS.resendVerification).toEqual({
      max: 3,
      windowMs: 3_600_000,
    });
  });

  it('should have refresh limits of 30 per minute', () => {
    expect(AUTH_RATE_LIMITS.refresh).toEqual({
      max: 30,
      windowMs: 60_000,
    });
  });
});

describe('authRateLimiters', () => {
  afterEach(async () => {
    // Clean up rate limiters between tests
    await authRateLimiters.destroy();
  });

  it('should allow requests within limit', async () => {
    const result = await authRateLimiters.check('login', '127.0.0.1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 1 = 4
    expect(result.limit).toBe(5);
  });

  it('should block requests when limit exceeded', async () => {
    const endpoint: AuthEndpoint = 'register';
    const ip = '192.168.1.1';

    // Use all 3 allowed attempts
    await authRateLimiters.check(endpoint, ip);
    await authRateLimiters.check(endpoint, ip);
    await authRateLimiters.check(endpoint, ip);

    // Fourth attempt should be blocked
    const result = await authRateLimiters.check(endpoint, ip);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different IPs separately', async () => {
    const endpoint: AuthEndpoint = 'login';

    // Exhaust limit for first IP
    for (let i = 0; i < 5; i++) {
      await authRateLimiters.check(endpoint, '10.0.0.1');
    }

    // Second IP should still be allowed
    const result = await authRateLimiters.check(endpoint, '10.0.0.2');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should track different endpoints separately', async () => {
    const ip = '10.0.0.1';

    // Exhaust login limit
    for (let i = 0; i < 5; i++) {
      await authRateLimiters.check('login', ip);
    }

    // Register endpoint should still be allowed (different limiter)
    const result = await authRateLimiters.check('register', ip);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});

describe('createAuthRateLimitHook', () => {
  afterEach(async () => {
    await authRateLimiters.destroy();
  });

  it('should set rate limit headers', async () => {
    const hook = createAuthRateLimitHook('login');
    const headers: Record<string, string> = {};

    const mockReq = { ip: '127.0.0.1' };
    const mockReply = {
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn((name: string, value: string) => {
        headers[name] = value;
      }),
    };

    await hook(mockReq, mockReply);

    expect(headers['X-RateLimit-Limit']).toBe('5');
    expect(headers['X-RateLimit-Remaining']).toBe('4');
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const hook = createAuthRateLimitHook('register');
    const ip = '127.0.0.2';

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await authRateLimiters.check('register', ip);
    }

    const mockReq = { ip };
    const sendMock = vi.fn();
    const mockReply = {
      status: vi.fn().mockReturnValue({ send: sendMock }),
      header: vi.fn(),
    };

    await hook(mockReq, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(429);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Too Many Requests',
        message: expect.stringContaining('Rate limit exceeded'),
      }),
    );
  });

  it('should set Retry-After header when rate limited', async () => {
    const hook = createAuthRateLimitHook('register');
    const ip = '127.0.0.3';
    const headers: Record<string, string> = {};

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await authRateLimiters.check('register', ip);
    }

    const mockReq = { ip };
    const mockReply = {
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn((name: string, value: string) => {
        headers[name] = value;
      }),
    };

    await hook(mockReq, mockReply);

    expect(headers['Retry-After']).toBeDefined();
    expect(parseInt(headers['Retry-After'] ?? '0', 10)).toBeGreaterThan(0);
  });
});
