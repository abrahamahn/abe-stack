// packages/core/src/infrastructure/crypto/__tests__/jwt.test.ts
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { 
  jwtSign, 
  jwtVerify, 
  jwtDecode, 
  JwtError, 
  type JwtPayload,
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig
} from '../jwt';

// Mock crypto for Node.js environment
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual('node:crypto');
  return {
    ...actual,
    randomFillSync: vi.fn((buffer) => {
      // Fill buffer with predictable values for consistent tests
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = i % 256;
      }
      return buffer;
    }),
  };
});

describe('JWT Utilities', () => {
  const secret = 'test-secret-32-characters-long!!';
  const payload: JwtPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('jwtSign', () => {
    test('should create a valid JWT token', async () => {
      const token = await jwtSign(payload, secret);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      // Decode to verify content
      const decoded = jwtDecode(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should include provided options in token', async () => {
      const customPayload = { ...payload, customField: 'custom-value' };
      const token = await jwtSign(customPayload, secret);

      const decoded = jwtDecode(token);
      expect(decoded.customField).toBe('custom-value');
    });

    test('should handle different secret lengths', async () => {
      const shortSecret = 'short';
      const longSecret = 'very-long-secret-key-that-is-much-longer-than-required';
      
      const token1 = await jwtSign(payload, shortSecret);
      const token2 = await jwtSign(payload, longSecret);

      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
      expect(token1).not.toBe(token2);
    });

    test('should throw error for invalid secret', async () => {
      await expect(jwtSign(payload, '')).rejects.toThrow(JwtError);
      await expect(jwtSign(payload, null as unknown as string)).rejects.toThrow(JwtError);
    });
  });

  describe('jwtVerify', () => {
    test('should verify a valid token', async () => {
      const token = await jwtSign(payload, secret);
      const result = await jwtVerify<JwtPayload>(token, secret);

      expect(result).toEqual(payload);
    });

    test('should throw error for invalid token', async () => {
      await expect(jwtVerify('invalid.token.format', secret)).rejects.toThrow(JwtError);
      await expect(jwtVerify('header.payload.signature', secret)).rejects.toThrow(JwtError);
    });

    test('should throw error for expired token', async () => {
      const expiredPayload = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const token = await jwtSign(expiredPayload, secret);

      await expect(jwtVerify(token, secret)).rejects.toThrow(JwtError);
    });

    test('should throw error for invalid signature', async () => {
      const token = await jwtSign(payload, secret);
      const tamperedToken = token.substring(0, token.length - 5) + 'aaaaa';

      await expect(jwtVerify(tamperedToken, secret)).rejects.toThrow(JwtError);
    });

    test('should throw error for wrong secret', async () => {
      const token = await jwtSign(payload, secret);
      const wrongSecret = 'different-secret-key';

      await expect(jwtVerify(token, wrongSecret)).rejects.toThrow(JwtError);
    });
  });

  describe('jwtDecode', () => {
    test('should decode a valid token without verification', () => {
      const token = jwtSign(payload, secret) as string; // Synchronous for this test
      const decoded = jwtDecode(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should handle tokens with special characters in payload', () => {
      const specialPayload = { ...payload, special: 'café naïve résumé' };
      const token = jwtSign(specialPayload, secret) as string;
      const decoded = jwtDecode(token);

      expect(decoded.special).toBe('café naïve résumé');
    });

    test('should throw error for invalid token format', () => {
      expect(() => jwtDecode('invalid')).toThrow(JwtError);
      expect(() => jwtDecode('header.payload')).toThrow(JwtError);
      expect(() => jwtDecode('')).toThrow(JwtError);
    });

    test('should handle malformed base64 in payload', () => {
      expect(() => jwtDecode('header.invalid_base64_payload.signature')).toThrow(JwtError);
    });
  });

  describe('checkTokenSecret', () => {
    test('should return true for valid secret', () => {
      expect(checkTokenSecret(secret)).toBe(true);
    });

    test('should return false for empty secret', () => {
      expect(checkTokenSecret('')).toBe(false);
    });

    test('should return false for null/undefined secret', () => {
      expect(checkTokenSecret(null as unknown as string)).toBe(false);
      expect(checkTokenSecret(undefined as unknown as string)).toBe(false);
    });

    test('should return true for secrets of various lengths', () => {
      expect(checkTokenSecret('a')).toBe(true);
      expect(checkTokenSecret('a'.repeat(10))).toBe(true);
      expect(checkTokenSecret('a'.repeat(100))).toBe(true);
    });
  });

  describe('JWT Rotation', () => {
    const oldSecret = 'old-secret-key-thats-32-chars!!';
    const newSecret = 'new-secret-key-thats-32-chars!!';
    const rotationConfig: JwtRotationConfig = {
      currentSecret: newSecret,
      previousSecret: oldSecret,
      algorithm: 'HS256',
    };

    test('signWithRotation should create token with current secret', async () => {
      const token = await signWithRotation(payload, rotationConfig);
      const decoded = jwtDecode(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.exp).toBe(payload.exp);
    });

    test('verifyWithRotation should verify with current secret', async () => {
      const token = await signWithRotation(payload, rotationConfig);
      const result = await verifyWithRotation<JwtPayload>(token, rotationConfig);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
    });

    test('verifyWithRotation should verify with previous secret', async () => {
      // Create token with old secret
      const legacyToken = await jwtSign(payload, oldSecret);
      
      // Verify with rotation config (should work with previous secret)
      const result = await verifyWithRotation<JwtPayload>(legacyToken, rotationConfig);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
    });

    test('verifyWithRotation should fail with neither secret', async () => {
      const token = await jwtSign(payload, 'neither-current-nor-previous');
      
      await expect(verifyWithRotation(token, rotationConfig)).rejects.toThrow(JwtError);
    });

    test('createJwtRotationHandler should create a verification function', async () => {
      const handler = createJwtRotationHandler(rotationConfig);
      const token = await jwtSign(payload, oldSecret);
      
      const result = await handler<JwtPayload>(token);

      expect(result.userId).toBe(payload.userId);
    });
  });

  describe('Edge cases', () => {
    test('should handle very large payloads', async () => {
      const largePayload = {
        ...payload,
        largeData: 'x'.repeat(10000), // 10KB of data
      };
      
      const token = await jwtSign(largePayload, secret);
      const result = await jwtVerify<JwtPayload & { largeData: string }>(token, secret);

      expect(result.largeData).toBe(largePayload.largeData);
    });

    test('should handle numeric claims', async () => {
      const numericPayload = {
        ...payload,
        numericId: 12345,
        floatVal: 123.45,
      };
      
      const token = await jwtSign(numericPayload, secret);
      const result = await jwtVerify<JwtPayload & { numericId: number; floatVal: number }>(token, secret);

      expect(result.numericId).toBe(12345);
      expect(result.floatVal).toBe(123.45);
    });

    test('should handle nested objects in payload', async () => {
      const nestedPayload = {
        ...payload,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
      };
      
      const token = await jwtSign(nestedPayload, secret);
      const result = await jwtVerify<JwtPayload & {
        profile: {
          firstName: string;
          lastName: string;
          settings: { theme: string; notifications: boolean };
        };
      }>(token, secret);

      expect(result.profile.firstName).toBe('John');
      expect(result.profile.settings.theme).toBe('dark');
    });
  });
});
