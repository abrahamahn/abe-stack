import { describe, it, expect } from "vitest";

import {
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  validatePasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from "@/server/infrastructure/security/passwordUtils";

describe("Password Utilities", () => {
  describe("hashPassword", () => {
    it("should generate a hash for a password", async () => {
      const password = "TestPassword123!";
      const salt = "test-salt";

      const hash = await hashPassword(password, salt);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate consistent hashes for the same password and salt", async () => {
      const password = "TestPassword123!";
      const salt = "test-salt";

      const hash1 = await hashPassword(password, salt);
      const hash2 = await hashPassword(password, salt);

      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different passwords", async () => {
      const salt = "test-salt";

      const hash1 = await hashPassword("password1", salt);
      const hash2 = await hashPassword("password2", salt);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different salts", async () => {
      const password = "TestPassword123!";

      const hash1 = await hashPassword(password, "salt1");
      const hash2 = await hashPassword(password, "salt2");

      expect(hash1).not.toBe(hash2);
    });

    it("should respect custom options", async () => {
      const password = "TestPassword123!";
      const salt = "test-salt";

      // Generate hash with default options
      const defaultHash = await hashPassword(password, salt);

      // Generate hash with custom options
      const customHash = await hashPassword(password, salt, {
        iterations: 32768, // Higher than default
      });

      expect(defaultHash).not.toBe(customHash);
    });
  });

  describe("verifyPassword", () => {
    it("should verify a correct password against its hash", async () => {
      const password = "TestPassword123!";
      const salt = "test-salt";
      const hash = await hashPassword(password, salt);

      const isValid = await verifyPassword(password, hash, salt);

      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const correctPassword = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const salt = "test-salt";
      const hash = await hashPassword(correctPassword, salt);

      const isValid = await verifyPassword(wrongPassword, hash, salt);

      expect(isValid).toBe(false);
    });

    it("should respect custom options when verifying", async () => {
      const password = "TestPassword123!";
      const salt = "test-salt";
      const options = { iterations: 32768 };

      // Generate hash with custom options
      const hash = await hashPassword(password, salt, options);

      // Verify with the same options
      const validWithOptions = await verifyPassword(
        password,
        hash,
        salt,
        options
      );
      expect(validWithOptions).toBe(true);

      // Verify with default options (should fail)
      const validWithDefaultOptions = await verifyPassword(
        password,
        hash,
        salt
      );
      expect(validWithDefaultOptions).toBe(false);
    });
  });

  describe("generateRandomPassword", () => {
    it("should generate a random password of specified length", () => {
      const length = 16;
      const password = generateRandomPassword(length);

      expect(password).toBeDefined();
      expect(typeof password).toBe("string");
      expect(password.length).toBe(length);
    });

    it("should generate passwords with mixed character types", () => {
      const password = generateRandomPassword(20);

      // Should contain at least one uppercase letter
      expect(/[A-Z]/.test(password)).toBe(true);

      // Should contain at least one lowercase letter
      expect(/[a-z]/.test(password)).toBe(true);

      // Should contain at least one digit
      expect(/[0-9]/.test(password)).toBe(true);

      // Should contain at least one special character
      expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
    });

    it("should generate different passwords on each call", () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should validate strong passwords", () => {
      const strongPassword = "StrongP@ssw0rd";
      const result = validatePasswordStrength(strongPassword);

      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("should reject passwords that are too short", () => {
      const shortPassword = "Short1!";
      const result = validatePasswordStrength(shortPassword);

      expect(result.valid).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain("characters long");
    });

    it("should enforce uppercase letter requirement", () => {
      const noUppercase = "lowercase123!";
      const result = validatePasswordStrength(noUppercase);

      expect(result.valid).toBe(false);
      expect(result.reasons.some((r) => r.includes("uppercase"))).toBe(true);
    });

    it("should enforce lowercase letter requirement", () => {
      const noLowercase = "UPPERCASE123!";
      const result = validatePasswordStrength(noLowercase);

      expect(result.valid).toBe(false);
      expect(result.reasons.some((r) => r.includes("lowercase"))).toBe(true);
    });

    it("should enforce number requirement", () => {
      const noNumbers = "Password!";
      const result = validatePasswordStrength(noNumbers);

      expect(result.valid).toBe(false);
      expect(result.reasons.some((r) => r.includes("number"))).toBe(true);
    });

    it("should enforce special character requirement", () => {
      const noSpecial = "Password123";
      const result = validatePasswordStrength(noSpecial);

      expect(result.valid).toBe(false);
      expect(result.reasons.some((r) => r.includes("special"))).toBe(true);
    });

    it("should respect custom requirements", () => {
      const password = "simple123";
      const customRequirements = {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      };

      const result = validatePasswordStrength(password, customRequirements);

      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("should handle multiple validation failures", () => {
      const weakPassword = "weak";
      const result = validatePasswordStrength(weakPassword);

      expect(result.valid).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(1);
    });
  });
});
