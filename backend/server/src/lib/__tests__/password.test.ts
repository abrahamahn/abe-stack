// apps/server/src/lib/__tests__/password.test.ts
import { describe, expect, test } from 'vitest';

import { hashPassword, needsRehash, verifyPassword } from '../password';

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

  describe('Migration from bcrypt', () => {
    test('should verify bcrypt hashes correctly', async () => {
      // This is a real bcrypt hash for password "testpassword"
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

      // Note: This test assumes backward compatibility with bcrypt
      // In production, you would migrate users by rehashing on successful login
      const isValid = await verifyPassword('testpassword', bcryptHash);

      expect(isValid).toBe(true);
    });

    test('should flag bcrypt hash for migration', () => {
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

      const shouldRehash = needsRehash(bcryptHash);

      expect(shouldRehash).toBe(true);
    });
  });

  describe('Performance and Security', () => {
    test('should take reasonable time to hash (not too fast, not too slow)', async () => {
      const password = 'PerformanceTest123!';
      const startTime = Date.now();

      await hashPassword(password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 50ms (not instant = secure)
      // But less than 2 seconds (reasonable for user experience)
      expect(duration).toBeGreaterThan(50);
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
});
