// main/shared/src/core/auth/auth.helpers.logic.test.ts
/**
 * @file Auth Configuration Helpers Tests
 * @description Tests for pure utility functions that operate on AuthConfig.
 * @module Core/Auth/Tests
 */

import { describe, expect, it } from 'vitest';

import { getRefreshCookieOptions, isStrategyEnabled } from './auth.helpers.logic';

import type { AuthConfig, AuthStrategy } from './auth.helpers.logic';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal AuthConfig for testing.
 *
 * @returns AuthConfig with sensible test defaults
 * @complexity O(1)
 */
function createTestAuthConfig(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    strategies: ['local', 'magic'] as AuthStrategy[],
    refreshToken: {
      expiryDays: 7,
    },
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    },
    ...overrides,
  };
}

// ============================================================================
// Tests: getRefreshCookieOptions
// ============================================================================

describe('getRefreshCookieOptions', () => {
  it('should return cookie options matching auth config', () => {
    const config = createTestAuthConfig();

    const options = getRefreshCookieOptions(config);

    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('should calculate maxAge from expiryDays in milliseconds', () => {
    const config = createTestAuthConfig({
      refreshToken: { expiryDays: 30 },
    });

    const options = getRefreshCookieOptions(config);

    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('should handle 1-day expiry', () => {
    const config = createTestAuthConfig({
      refreshToken: { expiryDays: 1 },
    });

    const options = getRefreshCookieOptions(config);

    expect(options.maxAge).toBe(86400000);
  });

  it('should reflect secure=false for development', () => {
    const config = createTestAuthConfig({
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      },
    });

    const options = getRefreshCookieOptions(config);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe('lax');
  });

  it('should use the configured cookie path', () => {
    const config = createTestAuthConfig({
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/auth',
      },
    });

    const options = getRefreshCookieOptions(config);

    expect(options.path).toBe('/api/auth');
  });

  it('should handle sameSite=none', () => {
    const config = createTestAuthConfig({
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      },
    });

    const options = getRefreshCookieOptions(config);

    expect(options.sameSite).toBe('none');
  });
});

// ============================================================================
// Tests: isStrategyEnabled
// ============================================================================

describe('isStrategyEnabled', () => {
  it('should return true for an enabled strategy', () => {
    const config = createTestAuthConfig({ strategies: ['local', 'magic'] });

    expect(isStrategyEnabled(config, 'local')).toBe(true);
    expect(isStrategyEnabled(config, 'magic')).toBe(true);
  });

  it('should return false for a disabled strategy', () => {
    const config = createTestAuthConfig({ strategies: ['local'] });

    expect(isStrategyEnabled(config, 'magic')).toBe(false);
    expect(isStrategyEnabled(config, 'google')).toBe(false);
  });

  it('should handle empty strategies array', () => {
    const config = createTestAuthConfig({ strategies: [] });

    expect(isStrategyEnabled(config, 'local')).toBe(false);
    expect(isStrategyEnabled(config, 'magic')).toBe(false);
  });

  it('should handle all OAuth strategies', () => {
    const config = createTestAuthConfig({
      strategies: ['google', 'github', 'facebook', 'microsoft', 'apple'],
    });

    expect(isStrategyEnabled(config, 'google')).toBe(true);
    expect(isStrategyEnabled(config, 'github')).toBe(true);
    expect(isStrategyEnabled(config, 'facebook')).toBe(true);
    expect(isStrategyEnabled(config, 'microsoft')).toBe(true);
    expect(isStrategyEnabled(config, 'apple')).toBe(true);
    expect(isStrategyEnabled(config, 'local')).toBe(false);
  });

  it('should handle webauthn strategy', () => {
    const config = createTestAuthConfig({ strategies: ['webauthn'] });

    expect(isStrategyEnabled(config, 'webauthn')).toBe(true);
    expect(isStrategyEnabled(config, 'local')).toBe(false);
  });

  it('should handle all strategies enabled', () => {
    const allStrategies: AuthStrategy[] = [
      'local',
      'magic',
      'webauthn',
      'google',
      'github',
      'facebook',
      'microsoft',
      'apple',
    ];
    const config = createTestAuthConfig({ strategies: allStrategies });

    for (const strategy of allStrategies) {
      expect(isStrategyEnabled(config, strategy)).toBe(true);
    }
  });
});
