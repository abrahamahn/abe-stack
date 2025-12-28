import { describe, it, expect } from "vitest";

import {
  createSignature,
  verifySignature,
  sanitizeInput,
  generateSecureRandomString,
  generateNonce,
  securityHeaders,
  validateSafeUrl,
  createRateLimiter,
  createCSP,
  sanitizeForDatabase,
  serialize,
} from "@/server/infrastructure/security/securityHelpers";

describe("securityHelpers", () => {
  describe("sanitizeInput", () => {
    it("should sanitize HTML special characters", () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe(
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
      );
    });

    it("should handle empty strings", () => {
      expect(sanitizeInput("")).toBe("");
    });

    it("should handle non-malicious strings", () => {
      const input = "Regular text without special chars";
      expect(sanitizeInput(input)).toBe(input);
    });
  });

  describe("generateSecureRandomString", () => {
    it("should generate a string of the specified length", () => {
      const length = 16;
      const result = generateSecureRandomString(length);
      expect(result.length).toBe(length);
    });

    it("should generate a hex string", () => {
      const result = generateSecureRandomString();
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it("should generate different strings on each call", () => {
      const string1 = generateSecureRandomString();
      const string2 = generateSecureRandomString();
      expect(string1).not.toBe(string2);
    });

    it("should use the default length of 32 if not specified", () => {
      const result = generateSecureRandomString();
      expect(result.length).toBe(32);
    });
  });

  describe("generateNonce", () => {
    it("should generate a 16 character random string", () => {
      const nonce = generateNonce();
      expect(nonce.length).toBe(16);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("securityHeaders", () => {
    it("should return an object with security headers", () => {
      const headers = securityHeaders();
      expect(headers).toHaveProperty("X-Content-Type-Options", "nosniff");
      expect(headers).toHaveProperty("X-Frame-Options", "DENY");
      expect(headers).toHaveProperty("X-XSS-Protection", "1; mode=block");
      expect(headers).toHaveProperty("Strict-Transport-Security");
      expect(headers).toHaveProperty("Content-Security-Policy");
      expect(headers).toHaveProperty("Referrer-Policy", "no-referrer");
      expect(headers).toHaveProperty("Permissions-Policy");
    });
  });

  describe("validateSafeUrl", () => {
    it("should validate HTTP URLs", () => {
      expect(validateSafeUrl("http://example.com")).toBe(true);
    });

    it("should validate HTTPS URLs", () => {
      expect(validateSafeUrl("https://example.com")).toBe(true);
    });

    it("should reject non-HTTP/HTTPS URLs", () => {
      expect(validateSafeUrl("ftp://example.com")).toBe(false);
      expect(validateSafeUrl("javascript:alert(1)")).toBe(false);
      expect(
        validateSafeUrl(
          "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="
        )
      ).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(validateSafeUrl("not a url")).toBe(false);
    });

    it("should validate URLs from allowed domains", () => {
      const allowedDomains = ["example.com", "trusted.org"];
      expect(validateSafeUrl("https://example.com/path", allowedDomains)).toBe(
        true
      );
      expect(
        validateSafeUrl("https://sub.example.com/path", allowedDomains)
      ).toBe(true);
      expect(validateSafeUrl("https://trusted.org/path", allowedDomains)).toBe(
        true
      );
      expect(
        validateSafeUrl("https://untrusted.com/path", allowedDomains)
      ).toBe(false);
    });
  });

  describe("createRateLimiter", () => {
    it("should create a rate limiter configuration with default values", () => {
      const config = createRateLimiter();
      expect(config).toEqual({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
      });
    });

    it("should create a rate limiter with custom values", () => {
      const windowMs = 60 * 1000;
      const max = 10;
      const config = createRateLimiter(windowMs, max);
      expect(config).toEqual({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
      });
    });
  });

  describe("createCSP", () => {
    it("should create a basic CSP with default-src 'self'", () => {
      const csp = createCSP();
      expect(csp).toBe("default-src 'self'");
    });

    it("should include custom directives", () => {
      const csp = createCSP({
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "trusted.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      });
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' trusted.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("should include sandbox directive if enabled", () => {
      const csp = createCSP({ sandbox: true });
      expect(csp).toContain("sandbox");
    });

    it("should include report-uri if specified", () => {
      const csp = createCSP({ reportUri: "https://example.com/report" });
      expect(csp).toContain("report-uri https://example.com/report");
    });
  });

  describe("sanitizeForDatabase", () => {
    it("should remove SQL injection patterns", () => {
      const input = "Robert'); DROP TABLE Students;--";
      const sanitized = sanitizeForDatabase(input);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(";");
      expect(sanitized).not.toContain("--");
      expect(sanitized).not.toContain("DROP TABLE");
    });

    it("should remove multiple SQL injection patterns", () => {
      const input = "SELECT * FROM users; INSERT INTO logs VALUES ('hacked')";
      const sanitized = sanitizeForDatabase(input);
      expect(sanitized).not.toContain("SELECT * FROM");
      expect(sanitized).not.toContain("INSERT INTO");
    });

    it("should handle empty strings", () => {
      expect(sanitizeForDatabase("")).toBe("");
    });
  });

  describe("serialize", () => {
    it("should return strings unchanged", () => {
      const data = "test string";
      expect(serialize(data)).toBe(data);
    });

    it("should serialize objects to JSON with sorted keys", () => {
      const data = { b: 2, a: 1, c: 3 };
      expect(serialize(data)).toBe('{"a":1,"b":2,"c":3}');
    });

    it("should convert non-string/non-object values to strings", () => {
      expect(serialize(123)).toBe("123");
      expect(serialize(null)).toBe("null");
      expect(serialize(undefined)).toBe("undefined");
      expect(serialize(true)).toBe("true");
    });

    it("should handle nested objects", () => {
      const data = { b: { d: 4, c: 3 }, a: 1 };
      expect(serialize(data)).toBe('{"a":1,"b":{"c":3,"d":4}}');
    });
  });

  const secretKey = Buffer.from("test-secret-key");

  describe("createSignature", () => {
    it("should create a valid signature for string data", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(() => Buffer.from(signature, "base64")).not.toThrow();
    });

    it("should create a valid signature for object data", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(() => Buffer.from(signature, "base64")).not.toThrow();
    });

    it("should create different signatures for different data", () => {
      const data1 = "test-data-1";
      const data2 = "test-data-2";

      const signature1 = createSignature({ data: data1, secretKey });
      const signature2 = createSignature({ data: data2, secretKey });

      expect(signature1).not.toBe(signature2);
    });

    it("should create different signatures for different secret keys", () => {
      const data = "test-data";
      const secretKey1 = Buffer.from("test-secret-key-1");
      const secretKey2 = Buffer.from("test-secret-key-2");

      const signature1 = createSignature({ data, secretKey: secretKey1 });
      const signature2 = createSignature({ data, secretKey: secretKey2 });

      expect(signature1).not.toBe(signature2);
    });

    it("should handle empty data", () => {
      const data = "";
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
    });

    it("should use the specified algorithm", () => {
      const data = "test-data";
      const sha256Signature = createSignature({
        data,
        secretKey,
        algorithm: "sha256",
      });
      const sha512Signature = createSignature({
        data,
        secretKey,
        algorithm: "sha512",
      });

      expect(sha256Signature).not.toBe(sha512Signature);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature for string data", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should verify a valid signature for object data", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const data = "test-data";
      const invalidSignature = "invalid-signature";

      const isValid = verifySignature({
        data,
        signature: invalidSignature,
        secretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should reject signature with different data", () => {
      const data1 = "test-data-1";
      const data2 = "test-data-2";
      const signature = createSignature({ data: data1, secretKey });

      const isValid = verifySignature({ data: data2, signature, secretKey });
      expect(isValid).toBe(false);
    });

    it("should reject signature with different secret key", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });
      const differentSecretKey = Buffer.from("different-secret-key");

      const isValid = verifySignature({
        data,
        signature,
        secretKey: differentSecretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should handle empty data", () => {
      const data = "";
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should handle different object key orders", () => {
      const data1 = {
        key1: "value1",
        key2: "value2",
      };
      const data2 = {
        key2: "value2",
        key1: "value1",
      };

      const signature = createSignature({ data: data1, secretKey });
      const isValid = verifySignature({ data: data2, signature, secretKey });

      expect(isValid).toBe(true);
    });

    it("should use the specified algorithm", () => {
      const data = "test-data";
      const signature = createSignature({
        data,
        secretKey,
        algorithm: "sha256",
      });

      // Verify with correct algorithm
      expect(
        verifySignature({ data, signature, secretKey, algorithm: "sha256" })
      ).toBe(true);

      // Verify with incorrect algorithm
      expect(
        verifySignature({ data, signature, secretKey, algorithm: "sha512" })
      ).toBe(false);
    });
  });
});
