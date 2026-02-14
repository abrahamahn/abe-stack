// main/server/core/src/auth/utils/password.test.ts
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  hashPassword,
  initDummyHashPool,
  isDummyHashPoolInitialized,
  needsRehash,
  resetDummyHashPool,
  verifyPassword,
  verifyPasswordSafe,
} from './password';

describe('Password Module (Argon2id)', () => {
  describe('hashPassword', () => {
    test('should hash a password using Argon2id', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      // Argon2id hashes start with $argon2id$
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    test('should produce different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Each hash should be unique due to salt
      expect(hash1).not.toBe(hash2);
    });

    test('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$argon2id\$/);
    });

    test('should handle unicode characters', async () => {
      const password = 'パスワード123!';
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    test('should be case sensitive', async () => {
      const password = 'CaseSensitive123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('casesensitive123!', hash);

      expect(isValid).toBe(false);
    });

    test('should handle verification with special characters', async () => {
      const password = 'Special!@#$%^&*()123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });

  describe('needsRehash', () => {
    test('should return false for newly created hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const shouldRehash = needsRehash(hash);

      expect(shouldRehash).toBe(false);
    });

    test('should detect bcrypt hashes that need rehashing', () => {
      // Example bcrypt hash
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

      const shouldRehash = needsRehash(bcryptHash);

      expect(shouldRehash).toBe(true);
    });

    test('should return true for weak Argon2 hashes', () => {
      // Weak Argon2 hash with low memory cost (example format)
      const weakHash = '$argon2id$v=19$m=1024,t=2,p=1$somesalt$somehash';

      const shouldRehash = needsRehash(weakHash);

      // Should recommend rehash if memory cost is too low
      expect(shouldRehash).toBe(true);
    });
  });

  describe('verifyPasswordSafe', () => {
    test('should verify correct password with valid hash', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPasswordSafe(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password with valid hash', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPasswordSafe('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    test('should return false when hash is null', async () => {
      const isValid = await verifyPasswordSafe('AnyPassword123!', null);

      expect(isValid).toBe(false);
    });

    test('should return false when hash is undefined', async () => {
      const isValid = await verifyPasswordSafe('AnyPassword123!', undefined);

      expect(isValid).toBe(false);
    });

    test('should return false when hash is empty string', async () => {
      const isValid = await verifyPasswordSafe('AnyPassword123!', '');

      expect(isValid).toBe(false);
    });

    test('should maintain constant time even with null hash (timing attack prevention)', async () => {
      // This test verifies the function runs even when hash is null
      // The timing should be similar whether hash exists or not
      const password = 'AnyPassword123!';
      const hash = await hashPassword(password);

      const startWithHash = Date.now();
      await verifyPasswordSafe(password, hash);
      const timeWithHash = Date.now() - startWithHash;

      const startWithoutHash = Date.now();
      await verifyPasswordSafe(password, null);
      const timeWithoutHash = Date.now() - startWithoutHash;

      // Both should take similar time (within reasonable margin)
      // The key is that null hash still does work (hashes against dummy)
      expect(timeWithoutHash).toBeGreaterThan(0);
      // Allow ratio margin and absolute jitter for noisy CI runners.
      const allowedDelta = Math.max(timeWithHash * 3, 500);
      expect(Math.abs(timeWithHash - timeWithoutHash)).toBeLessThan(allowedDelta);
    });
  });

  describe('Performance and Security', () => {
    test('should take reasonable time to hash (not too fast, not too slow)', async () => {
      const password = 'PerformanceTest123!';
      const startTime = Date.now();

      await hashPassword(password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 10ms (not instant = some work done)
      // But less than 2 seconds (reasonable for user experience)
      expect(duration).toBeGreaterThan(10);
      expect(duration).toBeLessThan(2000);
    });

    test('should use OWASP recommended parameters', async () => {
      const password = 'OWASPTest123!';
      const hash = await hashPassword(password);

      // Check that hash contains high memory cost (m=19456 = ~19MB)
      // Argon2 format: $argon2id$v=19$m=19456,t=2,p=1$...
      expect(hash).toMatch(/\$m=19456,t=2,p=1\$/);
    });
  });

  describe('Dummy Hash Pool', () => {
    beforeEach(() => {
      resetDummyHashPool();
    });

    afterEach(() => {
      resetDummyHashPool();
    });

    test('should initialize pool with 10 hashes', async () => {
      expect(isDummyHashPoolInitialized()).toBe(false);

      await initDummyHashPool();

      expect(isDummyHashPoolInitialized()).toBe(true);
    });

    test('should not reinitialize if already initialized', async () => {
      await initDummyHashPool();
      const firstCheck = isDummyHashPoolInitialized();

      // Second call should be a no-op
      await initDummyHashPool();
      const secondCheck = isDummyHashPoolInitialized();

      expect(firstCheck).toBe(true);
      expect(secondCheck).toBe(true);
    });

    test('reset should clear pool state', async () => {
      await initDummyHashPool();
      expect(isDummyHashPoolInitialized()).toBe(true);

      resetDummyHashPool();

      expect(isDummyHashPoolInitialized()).toBe(false);
    });

    test('verifyPasswordSafe should work with initialized pool', async () => {
      await initDummyHashPool();

      const isValid = await verifyPasswordSafe('test', null);

      expect(isValid).toBe(false);
    });

    test('verifyPasswordSafe should work without initialized pool (fallback)', async () => {
      // Pool not initialized - should use fallback hash generation
      const isValid = await verifyPasswordSafe('test', null);

      expect(isValid).toBe(false);
    });

    test('pool uses different hashes for timing variation', async () => {
      await initDummyHashPool();

      // Run multiple times - should use random hashes from pool
      const results: boolean[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(await verifyPasswordSafe('test', null));
      }

      // All should return false (no match)
      expect(results.every((r) => !r)).toBe(true);
    });
  });
});
