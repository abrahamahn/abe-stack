// apps/server/src/infrastructure/security/crypto/__tests__/jwtRotation.test.ts
import { describe, expect, test } from 'vitest';

import { JwtError, jwtSign } from '../index';
import {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
} from '../jwtRotation';

import type { JwtRotation } from '../jwtRotation';

// ============================================================================
// Test Fixtures
// ============================================================================

const CURRENT_SECRET = 'current-secret-key-for-testing-must-be-32-chars';
const PREVIOUS_SECRET = 'previous-secret-key-for-testing-must-be-32-chars';
const INVALID_SECRET = 'wrong-secret-key-for-testing-must-be-32-chars';

const TEST_PAYLOAD = { userId: 'user-123', email: 'test@example.com', role: 'user' };

// ============================================================================
// Tests
// ============================================================================

describe('JWT Rotation', () => {
  describe('signWithRotation', () => {
    test('should sign token with current secret', () => {
      const config: JwtRotation = { secret: CURRENT_SECRET };

      const token = signWithRotation(TEST_PAYLOAD, config);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should sign token with expiration', () => {
      const config: JwtRotation = { secret: CURRENT_SECRET };

      const token = signWithRotation(TEST_PAYLOAD, config, { expiresIn: '1h' });
      const payload = verifyWithRotation(token, config);

      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('should throw if secret is missing', () => {
      const config: JwtRotation = { secret: '' };

      expect(() => signWithRotation(TEST_PAYLOAD, config)).toThrow(JwtError);
    });

    test('should ignore previousSecret when signing', () => {
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      const token = signWithRotation(TEST_PAYLOAD, config);

      // Token should verify with current secret
      const payload = verifyWithRotation(token, { secret: CURRENT_SECRET });
      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });
  });

  describe('verifyWithRotation', () => {
    test('should verify token signed with current secret', () => {
      const config: JwtRotation = { secret: CURRENT_SECRET };
      const token = signWithRotation(TEST_PAYLOAD, config);

      const payload = verifyWithRotation(token, config);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
      expect(payload.email).toBe(TEST_PAYLOAD.email);
    });

    test('should verify token signed with previous secret during rotation', () => {
      // Sign with previous secret (simulating old token)
      const oldToken = jwtSign(TEST_PAYLOAD, PREVIOUS_SECRET);

      // Verify with rotation  that has both secrets
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      const payload = verifyWithRotation(oldToken, config);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });

    test('should reject token signed with unknown secret', () => {
      const invalidToken = jwtSign(TEST_PAYLOAD, INVALID_SECRET);

      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      expect(() => verifyWithRotation(invalidToken, config)).toThrow(JwtError);
    });

    test('should not try previous secret for expired tokens', async () => {
      // Create a token that expires in 1 second
      const shortLivedToken = jwtSign(TEST_PAYLOAD, CURRENT_SECRET, { expiresIn: '1s' });

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      expect(() => verifyWithRotation(shortLivedToken, config)).toThrow(JwtError);
    });

    test('should not try previous secret for malformed tokens', () => {
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      expect(() => verifyWithRotation('invalid.token', config)).toThrow(JwtError);
    });

    test('should throw if secret is missing', () => {
      const token = jwtSign(TEST_PAYLOAD, CURRENT_SECRET);
      const config: JwtRotation = { secret: '' };

      expect(() => verifyWithRotation(token, config)).toThrow(JwtError);
    });

    test('should work without previousSecret configured', () => {
      const config: JwtRotation = { secret: CURRENT_SECRET };
      const token = signWithRotation(TEST_PAYLOAD, config);

      const payload = verifyWithRotation(token, config);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });
  });

  describe('checkTokenSecret', () => {
    test('should identify token signed with current secret', () => {
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };
      const token = signWithRotation(TEST_PAYLOAD, config);

      const result = checkTokenSecret(token, config);

      expect(result.isValid).toBe(true);
      expect(result.usedSecret).toBe('current');
      expect(result.error).toBeUndefined();
    });

    test('should identify token signed with previous secret', () => {
      const oldToken = jwtSign(TEST_PAYLOAD, PREVIOUS_SECRET);

      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      const result = checkTokenSecret(oldToken, config);

      expect(result.isValid).toBe(true);
      expect(result.usedSecret).toBe('previous');
    });

    test('should identify invalid token', () => {
      const invalidToken = jwtSign(TEST_PAYLOAD, INVALID_SECRET);

      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      };

      const result = checkTokenSecret(invalidToken, config);

      expect(result.isValid).toBe(false);
      expect(result.usedSecret).toBe('none');
      expect(result.error).toBeDefined();
    });

    test('should handle missing secret', () => {
      const token = jwtSign(TEST_PAYLOAD, CURRENT_SECRET);
      const config: JwtRotation = { secret: '' };

      const result = checkTokenSecret(token, config);

      expect(result.isValid).toBe(false);
      expect(result.usedSecret).toBe('none');
      expect(result.error).toBeInstanceOf(JwtError);
    });
  });

  describe('createJwtRotationHandler', () => {
    test('should create handler with sign and verify functions', () => {
      const config: JwtRotation = { secret: CURRENT_SECRET };
      const handler = createJwtRotationHandler();

      const token = handler.sign(TEST_PAYLOAD, { expiresIn: '1h' });
      const payload = handler.verify(token);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });

    test('should support rotation through handler', () => {
      const oldToken = jwtSign(TEST_PAYLOAD, PREVIOUS_SECRET);

      const handler = createJwtRotationHandler({
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      });

      const payload = handler.verify(oldToken);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });

    test('should report rotation status', () => {
      const withRotation = createJwtRotationHandler({
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      });

      const withoutRotation = createJwtRotationHandler({
        secret: CURRENT_SECRET,
      });

      expect(withRotation.isRotating()).toBe(true);
      expect(withoutRotation.isRotating()).toBe(false);
    });

    test('should provide  info', () => {
      const handler = createJwtRotationHandler({
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      });

      const config = handler.get();

      expect(config.hasSecret).toBe(true);
      expect(config.hasPreviousSecret).toBe(true);
    });

    test('checkSecret method should work through handler', () => {
      const handler = createJwtRotationHandler({
        secret: CURRENT_SECRET,
        previousSecret: PREVIOUS_SECRET,
      });

      const newToken = handler.sign(TEST_PAYLOAD);
      const oldToken = jwtSign(TEST_PAYLOAD, PREVIOUS_SECRET);

      expect(handler.checkSecret(newToken).usedSecret).toBe('current');
      expect(handler.checkSecret(oldToken).usedSecret).toBe('previous');
    });
  });

  describe('edge cases', () => {
    test('should handle undefined previousSecret', () => {
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: undefined,
      };

      const token = signWithRotation(TEST_PAYLOAD, config);
      const payload = verifyWithRotation(token, config);

      expect(payload.userId).toBe(TEST_PAYLOAD.userId);
    });

    test('should handle empty string previousSecret', () => {
      const config: JwtRotation = {
        secret: CURRENT_SECRET,
        previousSecret: '',
      };

      // Should not try to verify with empty previous secret
      const invalidToken = jwtSign(TEST_PAYLOAD, INVALID_SECRET);

      expect(() => verifyWithRotation(invalidToken, config)).toThrow(JwtError);
    });

    test('should preserve payload properties through rotation', () => {
      const complexPayload = {
        userId: 'user-456',
        email: 'complex@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        metadata: { theme: 'dark', locale: 'en-US' },
      };

      const config: JwtRotation = { secret: CURRENT_SECRET };
      const token = signWithRotation(complexPayload, config);
      const payload = verifyWithRotation(token, config);

      expect(payload.userId).toBe(complexPayload.userId);
      expect(payload.permissions).toEqual(complexPayload.permissions);
      expect(payload.metadata).toEqual(complexPayload.metadata);
    });
  });
});
