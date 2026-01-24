// apps/server/src/modules/auth/security/__tests__/rateLimitPresets.test.ts
import { AUTH_RATE_LIMITS } from '@auth/security/rateLimitPresets';
import { beforeEach, describe, expect, test } from 'vitest';

// ============================================================================
// Tests: RateLimitPresets
// ============================================================================

describe('AUTH_RATE_LIMITS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.login;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 1000); // 1 minute
      expect(preset.max).toBe(5); // 5 attempts
    });
  });

  describe('register preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.register;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(preset.max).toBe(3); // 3 attempts
    });
  });

  describe('forgotPassword preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.forgotPassword;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(preset.max).toBe(3); // 3 attempts
    });
  });

  describe('verifyEmail preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.verifyEmail;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(preset.max).toBe(5); // 5 attempts
    });
  });

  describe('resendVerification preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.resendVerification;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(preset.max).toBe(3); // 3 attempts
    });
  });

  describe('resetPassword preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.resetPassword;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(preset.max).toBe(5); // 5 attempts
    });
  });

  describe('refresh preset', () => {
    test('should have correct configuration', () => {
      const preset = AUTH_RATE_LIMITS.refresh;

      expect(preset).toBeDefined();
      expect(preset.windowMs).toBe(60 * 1000); // 1 minute
      expect(preset.max).toBe(30); // 30 attempts
    });
  });

  describe('all presets', () => {
    test('should have valid configurations', () => {
      const allPresets = Object.values(AUTH_RATE_LIMITS);

      allPresets.forEach((preset) => {
        expect(preset.windowMs).toBeGreaterThan(0);
        expect(preset.max).toBeGreaterThan(0);
        expect(typeof preset.windowMs).toBe('number');
        expect(typeof preset.max).toBe('number');
      });
    });
  });
});
