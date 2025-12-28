import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  generateCsrfToken,
  verifyCsrfToken,
  createCSRFMiddleware,
  createCSRFTokenPair,
  verifyCSRFTokenPair,
  DEFAULT_CSRF_OPTIONS,
  CSRFOptions,
} from "@/server/infrastructure/security/csrfUtils";

describe("CSRF Utilities", () => {
  const testKey = Buffer.from(
    "testsecretkeythatislongenoughforcrypto",
    "utf-8"
  );
  const testSessionId = "user-session-12345";

  beforeEach(() => {
    // Setup fake timers for deterministic testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  describe("generateCsrfToken", () => {
    it("should generate a token string", () => {
      const token = generateCsrfToken(testSessionId, testKey);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should include user agent if specified", () => {
      const context = { userAgent: "test-user-agent" };
      const options: CSRFOptions = { includeUserAgent: true };

      const token = generateCsrfToken(testSessionId, testKey, options, context);

      // Decode and check token contents
      const decoded = JSON.parse(
        Buffer.from(token, "base64").toString("utf-8")
      );
      expect(decoded.payload.userAgent).toBe(context.userAgent);
    });

    it("should include origin if specified", () => {
      const context = { origin: "https://example.com" };
      const options: CSRFOptions = { includeOrigin: true };

      const token = generateCsrfToken(testSessionId, testKey, options, context);

      // Decode and check token contents
      const decoded = JSON.parse(
        Buffer.from(token, "base64").toString("utf-8")
      );
      expect(decoded.payload.origin).toBe(context.origin);
    });

    it("should always include timestamp and nonce", () => {
      const token = generateCsrfToken(testSessionId, testKey);

      // Decode and check token contents
      const decoded = JSON.parse(
        Buffer.from(token, "base64").toString("utf-8")
      );
      expect(decoded.payload.timestamp).toBeDefined();
      expect(decoded.payload.nonce).toBeDefined();
      expect(typeof decoded.payload.nonce).toBe("string");
    });

    it("should throw an error when invalid session ID is provided", () => {
      expect(() => generateCsrfToken("", testKey)).toThrow();
      expect(() => generateCsrfToken(null as any, testKey)).toThrow();
      expect(() => generateCsrfToken(undefined as any, testKey)).toThrow();
    });

    it("should generate different tokens on each call", () => {
      const token1 = generateCsrfToken(testSessionId, testKey);
      const token2 = generateCsrfToken(testSessionId, testKey);
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyCsrfToken", () => {
    it("should verify a valid token", () => {
      const token = generateCsrfToken(testSessionId, testKey);
      const isValid = verifyCsrfToken(token, testSessionId, testKey);
      expect(isValid).toBe(true);
    });

    it("should reject tokens with incorrect session ID", () => {
      const token = generateCsrfToken(testSessionId, testKey);
      const isValid = verifyCsrfToken(token, "different-session-id", testKey);
      expect(isValid).toBe(false);
    });

    it("should reject expired tokens", () => {
      const options: CSRFOptions = { expiryMs: 1000 }; // 1 second expiry
      const token = generateCsrfToken(testSessionId, testKey, options);

      // Fast-forward time past expiration
      vi.advanceTimersByTime(1001);

      const isValid = verifyCsrfToken(token, testSessionId, testKey, options);
      expect(isValid).toBe(false);
    });

    it("should validate user agent if included", () => {
      const userAgent = "Mozilla/5.0 Test Browser";
      const options: CSRFOptions = { includeUserAgent: true };

      const token = generateCsrfToken(testSessionId, testKey, options, {
        userAgent,
      });

      // Verify with matching user agent
      const validResult = verifyCsrfToken(
        token,
        testSessionId,
        testKey,
        options,
        { userAgent }
      );
      expect(validResult).toBe(true);

      // Verify with different user agent
      const invalidResult = verifyCsrfToken(
        token,
        testSessionId,
        testKey,
        options,
        { userAgent: "Different Browser" }
      );
      expect(invalidResult).toBe(false);
    });

    it("should validate origin if included", () => {
      const origin = "https://example.com";
      const options: CSRFOptions = { includeOrigin: true };

      const token = generateCsrfToken(testSessionId, testKey, options, {
        origin,
      });

      // Verify with matching origin
      const validResult = verifyCsrfToken(
        token,
        testSessionId,
        testKey,
        options,
        { origin }
      );
      expect(validResult).toBe(true);

      // Verify with different origin
      const invalidResult = verifyCsrfToken(
        token,
        testSessionId,
        testKey,
        options,
        { origin: "https://evil-site.com" }
      );
      expect(invalidResult).toBe(false);
    });

    it("should handle tampered tokens", () => {
      // Generate a valid token
      const token = generateCsrfToken(testSessionId, testKey);

      // Tamper with the token
      const decoded = JSON.parse(
        Buffer.from(token, "base64").toString("utf-8")
      );
      decoded.payload.sessionId = "hacked-session";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString(
        "base64"
      );

      // Verify the tampered token
      const isValid = verifyCsrfToken(tamperedToken, testSessionId, testKey);
      expect(isValid).toBe(false);
    });

    it("should handle malformed tokens gracefully", () => {
      const invalidToken = "not-a-valid-base64-token";
      const result = verifyCsrfToken(invalidToken, testSessionId, testKey);
      expect(result).toBe(false);
    });

    it("should handle empty or null tokens", () => {
      expect(verifyCsrfToken("", testSessionId, testKey)).toBe(false);
      expect(verifyCsrfToken(null as any, testSessionId, testKey)).toBe(false);
      expect(verifyCsrfToken(undefined as any, testSessionId, testKey)).toBe(
        false
      );
    });

    it("should handle invalid session ID in verification", () => {
      const token = generateCsrfToken(testSessionId, testKey);
      expect(verifyCsrfToken(token, "", testKey)).toBe(false);
      expect(verifyCsrfToken(token, null as any, testKey)).toBe(false);
    });

    it("should handle partially valid base64 but invalid JSON", () => {
      // Create a valid base64 string that doesn't decode to valid JSON
      const invalidToken = Buffer.from("not-valid-json").toString("base64");
      const result = verifyCsrfToken(invalidToken, testSessionId, testKey);
      expect(result).toBe(false);
    });

    it("should handle missing payload properties", () => {
      // Create a token with missing properties
      const invalidPayload = {
        payload: { sessionId: testSessionId }, // missing timestamp and nonce
        signature: "invalid-signature",
      };
      const invalidToken = Buffer.from(JSON.stringify(invalidPayload)).toString(
        "base64"
      );

      const result = verifyCsrfToken(invalidToken, testSessionId, testKey);
      expect(result).toBe(false);
    });
  });

  describe("createCSRFMiddleware", () => {
    it("should create middleware configuration", () => {
      const config = createCSRFMiddleware();
      expect(config).toBeDefined();
      expect(config.cookieName).toBe(DEFAULT_CSRF_OPTIONS.cookieName);
      expect(config.headerName).toBe(DEFAULT_CSRF_OPTIONS.headerName);
    });

    it("should merge provided options with defaults", () => {
      const customOptions: CSRFOptions = {
        expiryMs: 60000, // 1 minute
        cookieName: "custom-csrf-token",
        headerName: "X-Custom-CSRF-Token",
      };

      const config = createCSRFMiddleware(customOptions);
      expect(config.cookieName).toBe(customOptions.cookieName);
      expect(config.headerName).toBe(customOptions.headerName);
      expect(config.expiryMinutes).toBe(1); // 60000ms = 1 minute
    });

    it("should include security settings in the configuration", () => {
      const config = createCSRFMiddleware();
      expect(config.httpOnly).toBe(true);
      expect(config.secure).toBe(true);
      expect(config.sameSite).toBe("strict");
    });

    it("should override security settings with custom options", () => {
      const customOptions: CSRFOptions = {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
      };

      const config = createCSRFMiddleware(customOptions);
      expect(config.httpOnly).toBe(false);
      expect(config.secure).toBe(false);
      expect(config.sameSite).toBe("lax");
    });
  });

  describe("createCSRFTokenPair and verifyCSRFTokenPair", () => {
    it("should create token and hash pair", () => {
      const { token, hash } = createCSRFTokenPair("test-secret");

      expect(token).toBeDefined();
      expect(hash).toBeDefined();
      expect(typeof token).toBe("string");
      expect(typeof hash).toBe("string");
    });

    it("should verify valid token pairs", () => {
      const { token, hash } = createCSRFTokenPair("test-secret");
      const isValid = verifyCSRFTokenPair(token, hash, "test-secret");
      expect(isValid).toBe(true);
    });

    it("should reject invalid token pairs", () => {
      const pair1 = createCSRFTokenPair("test-secret");
      const pair2 = createCSRFTokenPair("test-secret");

      // Cross-verify tokens and hashes
      const isValid = verifyCSRFTokenPair(
        pair1.token,
        pair2.hash,
        "test-secret"
      );
      expect(isValid).toBe(false);
    });

    it("should reject token pair with different secret", () => {
      const { token, hash } = createCSRFTokenPair("test-secret-1");
      const isValid = verifyCSRFTokenPair(token, hash, "test-secret-2");
      expect(isValid).toBe(false);
    });

    it("should handle empty or null tokens and hashes", () => {
      expect(verifyCSRFTokenPair("", "hash", "secret")).toBe(false);
      expect(verifyCSRFTokenPair("token", "", "secret")).toBe(false);
      expect(verifyCSRFTokenPair(null as any, "hash", "secret")).toBe(false);
      expect(verifyCSRFTokenPair("token", null as any, "secret")).toBe(false);
    });

    it("should generate different pairs each time", () => {
      const pair1 = createCSRFTokenPair("test-secret");
      const pair2 = createCSRFTokenPair("test-secret");

      expect(pair1.token).not.toBe(pair2.token);
      expect(pair1.hash).not.toBe(pair2.hash);
    });
  });
});
