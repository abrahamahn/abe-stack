import { Response, Request } from "express";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Add CsrfOptions interface definition

import {
  ServerEnvironment,
  ServerConfig,
} from "@/server/infrastructure/config/ConfigService";
import {
  createSignature,
  verifySignature as verifySecuritySignature,
  SignatureOptions as StringSignatureOptions,
  generateCsrfToken,
  verifyCsrfToken,
} from "@/server/infrastructure/security";
import {
  generateSignature,
  verifySignature,
  serializeSignature,
  deserializeSignature,
  SecuritySignature,
  SignatureOptions as ObjectSignatureOptions,
} from "@/server/infrastructure/security";
import { CSRFOptions } from "@/server/infrastructure/security/csrfUtils";
import {
  getPasswordHash,
  setAuthCookies,
  getAuthTokenCookie,
  clearAuthCookies,
  validatePasswordStrength,
} from "@/server/modules/core/auth/helpers/auth.helpers";

describe("Security Infrastructure Integration Tests", () => {
  describe("Authentication Helpers", () => {
    let mockEnvironment: { config: ServerConfig };
    let mockResponse: Partial<Response>;
    let mockRequest: Partial<Request>;

    beforeEach(() => {
      mockEnvironment = {
        config: {
          passwordSalt: "test-salt",
          production: false,
          corsOrigin: "http://localhost:3000",
          baseUrl: "http://localhost:3000",
          signatureSecret: Buffer.from("test-signature-secret"),
          port: 3000,
          host: "localhost",
          uploadPath: "/uploads",
          tempPath: "/temp",
          storagePath: "/storage",
          storageUrl: "http://localhost:3000/storage",
        },
      };

      mockResponse = {
        cookie: vi.fn(),
        clearCookie: vi.fn(),
      };

      mockRequest = {
        cookies: {},
      };
    });

    it("should generate consistent password hashes", async () => {
      const password = "test-password";
      const hash1 = await getPasswordHash(mockEnvironment, password);
      const hash2 = await getPasswordHash(mockEnvironment, password);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(password);
    });

    it("should respect custom iteration count for password hashing", async () => {
      const password = "test-password";
      const hash1 = await getPasswordHash(mockEnvironment, password, 16384);
      const hash2 = await getPasswordHash(mockEnvironment, password, 32768);

      expect(hash1).not.toBe(hash2);
    });

    it("should validate password strength correctly", () => {
      // Strong password that meets all requirements
      const strongPassword = "StrongP@ss123";
      const strongResult = validatePasswordStrength(strongPassword);
      expect(strongResult.valid).toBe(true);
      expect(strongResult.reasons).toHaveLength(0);

      // Weak password missing requirements
      const weakPassword = "weak";
      const weakResult = validatePasswordStrength(weakPassword);
      expect(weakResult.valid).toBe(false);
      expect(weakResult.reasons.length).toBeGreaterThan(0);

      // Check individual requirements
      expect(
        validatePasswordStrength("short", {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
        }).valid
      ).toBe(false);

      expect(
        validatePasswordStrength("nouppercase123!", {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
        }).valid
      ).toBe(false);

      expect(
        validatePasswordStrength("NOLOWERCASE123!", {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
        }).valid
      ).toBe(false);

      expect(
        validatePasswordStrength("NoNumbers!", {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: true,
          requireSpecialChars: false,
        }).valid
      ).toBe(false);

      expect(
        validatePasswordStrength("NoSpecialChars123", {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: true,
        }).valid
      ).toBe(false);
    });

    it("should set authentication cookies correctly", () => {
      const authToken = "test-token";
      const userId = "test-user";
      const expiration = new Date(Date.now() + 3600000); // 1 hour from now

      setAuthCookies(
        mockEnvironment as ServerEnvironment,
        { authToken, expiration, userId },
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        authToken,
        expect.objectContaining({
          secure: false,
          httpOnly: true,
          expires: expiration,
          sameSite: "strict",
        })
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "userId",
        userId,
        expect.objectContaining({
          secure: false,
          httpOnly: false,
          expires: expiration,
          sameSite: "strict",
        })
      );
    });

    it("should handle production environment cookies", () => {
      const prodEnvironment = {
        config: {
          ...mockEnvironment.config,
          production: true,
        },
      };

      const authToken = "test-token";
      const userId = "test-user";
      const expiration = new Date(Date.now() + 3600000);

      setAuthCookies(
        prodEnvironment as ServerEnvironment,
        { authToken, expiration, userId },
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        authToken,
        expect.objectContaining({
          secure: true,
          domain: "http://localhost:3000",
          sameSite: "strict",
        })
      );
    });

    it("should retrieve auth token from cookies", () => {
      const authToken = "test-token";
      mockRequest.cookies = { authToken };

      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        }
      );
      expect(result).toBe(authToken);
    });

    it("should handle missing auth token", () => {
      mockRequest.cookies = {};
      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        }
      );
      expect(result).toBeUndefined();
    });

    it("should clear authentication cookies", () => {
      clearAuthCookies(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith("authToken", {
        secure: false,
        httpOnly: true,
        sameSite: "strict",
        domain: undefined,
      });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("userId", {
        secure: false,
        httpOnly: false,
        sameSite: "strict",
        domain: undefined,
      });
    });
  });

  describe("Signature Helpers", () => {
    const secretKey = "test-secret-key";
    const testData = {
      id: "123",
      timestamp: Date.now(),
      action: "test",
    };

    let originalDateNow: () => number;

    beforeEach(() => {
      originalDateNow = Date.now;
      // Mock Date.now for deterministic tests
      Date.now = vi.fn(() => 1609459200000); // 2021-01-01
    });

    afterEach(() => {
      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it("should generate consistent signatures for the same data", () => {
      // Use returnRaw=true to get string signatures for direct comparison
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      const signature1 = generateSignature(
        secretKey,
        testData,
        options,
        true
      ) as string;
      const signature2 = generateSignature(
        secretKey,
        testData,
        options,
        true
      ) as string;

      expect(signature1).toBeDefined();
      expect(signature2).toBeDefined();
      expect(signature1).toBe(signature2);
    });

    it("should generate different signatures for different data", () => {
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      const data1 = { ...testData, timestamp: Date.now() };
      const data2 = { ...testData, timestamp: Date.now() + 1 };

      const signature1 = generateSignature(secretKey, data1, options, true);
      const signature2 = generateSignature(secretKey, data2, options, true);

      expect(signature1).not.toBe(signature2);
    });

    it("should verify valid signatures", () => {
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      // Create a signature string directly
      const signature = generateSignature(
        secretKey,
        testData,
        options,
        true
      ) as string;

      // Verify with the same options
      const isValid = verifySignature(secretKey, signature, testData, options);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      const signature = generateSignature(
        secretKey,
        testData,
        options,
        true
      ) as string;
      const modifiedData = { ...testData, action: "modified" };
      const isValid = verifySignature(
        secretKey,
        signature,
        modifiedData,
        options
      );
      expect(isValid).toBe(false);
    });

    it("should handle empty data objects", () => {
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      const signature = generateSignature(
        secretKey,
        {},
        options,
        true
      ) as string;
      const isValid = verifySignature(secretKey, signature, {}, options);
      expect(isValid).toBe(true);
    });

    it("should handle nested data objects", () => {
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      const nestedData = {
        ...testData,
        nested: {
          key: "value",
          number: 42,
        },
      };

      const signature = generateSignature(
        secretKey,
        nestedData,
        options,
        true
      ) as string;
      const isValid = verifySignature(
        secretKey,
        signature,
        nestedData,
        options
      );
      expect(isValid).toBe(true);
    });

    it("should serialize and deserialize signatures correctly", () => {
      const signature = generateSignature(
        secretKey,
        testData
      ) as SecuritySignature;
      const serialized = serializeSignature(signature);

      expect(typeof serialized).toBe("string");

      const deserialized = deserializeSignature(serialized);
      expect(deserialized.signature).toBe(signature.signature);
      if (signature.timestamp) {
        expect(deserialized.timestamp).toBe(signature.timestamp);
      }
      if (signature.nonce) {
        expect(deserialized.nonce).toBe(signature.nonce);
      }
    });

    it("should handle signature expiration", () => {
      // Generate signature with timestamps
      const options: ObjectSignatureOptions = {
        includeTimestamp: true,
        maxAge: 3600000, // 1 hour
        includeNonce: false,
      };

      const signature = generateSignature(
        secretKey,
        testData,
        options
      ) as SecuritySignature;

      // Verify with current time (should pass)
      expect(verifySignature(secretKey, signature, testData, options)).toBe(
        true
      );

      // Fast-forward time past expiration
      Date.now = vi.fn(() => 1609459200000 + 3600001); // 1 hour + 1ms later

      // Verify again (should fail due to expiration)
      expect(verifySignature(secretKey, signature, testData, options)).toBe(
        false
      );
    });

    it("should handle signature with nonce", () => {
      // Test that nonce is included in the signature object
      const withNonceOptions: ObjectSignatureOptions = {
        includeNonce: true,
        includeTimestamp: false,
      };

      const sigObj = generateSignature(
        secretKey,
        testData,
        withNonceOptions
      ) as SecuritySignature;
      expect(sigObj.nonce).toBeDefined();
      expect(typeof sigObj.nonce).toBe("string");
      expect(sigObj.nonce?.length).toBeGreaterThan(0);
    });

    it("should handle signature without nonce", () => {
      // Test without nonce
      const withoutNonceOptions: ObjectSignatureOptions = {
        includeNonce: false,
        includeTimestamp: false,
      };

      const sigObj = generateSignature(
        secretKey,
        testData,
        withoutNonceOptions
      ) as SecuritySignature;
      expect(sigObj.nonce).toBeUndefined();
    });

    it("should serialize and deserialize signature objects", () => {
      // Create a signature object and test serialization/deserialization
      const sigObj = generateSignature(
        secretKey,
        testData
      ) as SecuritySignature;
      const serialized = serializeSignature(sigObj);
      expect(typeof serialized).toBe("string");

      const deserialized = deserializeSignature(serialized);
      expect(deserialized).toEqual(sigObj);
    });

    it("should verify signatures with options", () => {
      // Test with a very simple set of options
      const options: ObjectSignatureOptions = {
        includeTimestamp: false,
        includeNonce: false,
      };

      // Generate a raw signature with options
      const rawSignature = generateSignature(
        secretKey,
        testData,
        options,
        true
      ) as string;

      // Verification should work with same options
      expect(verifySignature(secretKey, rawSignature, testData, options)).toBe(
        true
      );

      // Tampering with data should fail verification
      const tamperedData = { ...testData, id: "456" };
      expect(
        verifySignature(secretKey, rawSignature, tamperedData, options)
      ).toBe(false);
    });

    it("should handle invalid signature format", () => {
      // Completely invalid format
      expect(() => deserializeSignature("not-valid-base64")).toThrow();

      // Valid base64 but invalid structure
      const invalidBase64 = Buffer.from('{"not":"valid-signature"}').toString(
        "base64"
      );
      expect(() => {
        const result = deserializeSignature(invalidBase64);
        expect(result.signature).toBeUndefined();
      }).not.toThrow();

      // Verification should gracefully handle errors
      expect(verifySignature(secretKey, "invalid-signature", testData)).toBe(
        false
      );
      expect(
        verifySignature(secretKey, { signature: "invalid" }, testData)
      ).toBe(false);
    });
  });

  describe("Security Helpers", () => {
    const secretKey = Buffer.from("test-secret-key");
    const testData = {
      id: "123",
      timestamp: Date.now(),
      action: "test",
    };

    let originalDateNow: () => number;

    beforeEach(() => {
      originalDateNow = Date.now;
      // Mock Date.now for deterministic tests
      Date.now = vi.fn(() => 1609459200000); // 2021-01-01
    });

    afterEach(() => {
      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it("should create consistent signatures for string data", () => {
      const data = "test-string";
      const signature1 = createSignature({ data, secretKey });
      const signature2 = createSignature({ data, secretKey });

      expect(signature1).toBeDefined();
      expect(signature2).toBeDefined();
      expect(signature1).toBe(signature2);
    });

    it("should create consistent signatures for object data", () => {
      const signature1 = createSignature({ data: testData, secretKey });
      const signature2 = createSignature({ data: testData, secretKey });

      expect(signature1).toBeDefined();
      expect(signature2).toBeDefined();
      expect(signature1).toBe(signature2);
    });

    it("should verify valid signatures", () => {
      const signature = createSignature({ data: testData, secretKey });
      const isValid = verifySecuritySignature({
        data: testData,
        signature,
        secretKey,
      });
      expect(isValid).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const signature = createSignature({ data: testData, secretKey });
      const modifiedData = { ...testData, action: "modified" };
      const isValid = verifySecuritySignature({
        data: modifiedData,
        signature,
        secretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should handle different signature lengths", () => {
      const signature = createSignature({ data: testData, secretKey });
      const invalidSignature = signature.slice(0, -1);
      const isValid = verifySecuritySignature({
        data: testData,
        signature: invalidSignature,
        secretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should handle empty data", () => {
      const signature = createSignature({ data: "", secretKey });
      const isValid = verifySecuritySignature({
        data: "",
        signature,
        secretKey,
      });
      expect(isValid).toBe(true);
    });

    it("should handle empty object data", () => {
      const signature = createSignature({ data: {}, secretKey });
      const isValid = verifySecuritySignature({
        data: {},
        signature,
        secretKey,
      });
      expect(isValid).toBe(true);
    });

    it("should support different algorithms and output formats", () => {
      // Test sha256 with hex output
      const options1: StringSignatureOptions = {
        algorithm: "sha256",
        format: "hex",
      };

      const signature1 = createSignature({
        data: testData,
        secretKey,
        options: options1,
      });

      expect(signature1).toMatch(/^[0-9a-f]+$/i); // Should be hex format

      // Verification should work with matching options
      expect(
        verifySecuritySignature({
          data: testData,
          signature: signature1,
          secretKey,
          options: options1,
        })
      ).toBe(true);

      // Test sha384 with base64 output
      const options2: StringSignatureOptions = {
        algorithm: "sha384",
        format: "base64",
      };

      const signature2 = createSignature({
        data: testData,
        secretKey,
        options: options2,
      });

      // Should be different from the sha256 signature
      expect(signature2).not.toBe(signature1);

      // Verification should work with matching options
      expect(
        verifySecuritySignature({
          data: testData,
          signature: signature2,
          secretKey,
          options: options2,
        })
      ).toBe(true);

      // Verification should fail with mismatched options
      expect(
        verifySecuritySignature({
          data: testData,
          signature: signature2,
          secretKey,
          options: options1, // Using sha256/hex options with sha384/base64 signature
        })
      ).toBe(false);
    });

    it("should handle timestamps and expiration", () => {
      const options: StringSignatureOptions = {
        addTimestamp: true,
        verifyMaxAge: 3600000, // 1 hour
      };

      const signature = createSignature({
        data: testData,
        secretKey,
        options,
      });

      // Verify with current time (should pass)
      expect(
        verifySecuritySignature({
          data: testData,
          signature,
          secretKey,
          options,
        })
      ).toBe(true);

      // Fast-forward time past expiration
      Date.now = vi.fn(() => 1609459200000 + 3600001); // 1 hour + 1ms later

      // Create a new signature after the time change
      const newSignature = createSignature({
        data: testData,
        secretKey,
        options,
      });

      // The original signature should be expired
      expect(
        verifySecuritySignature({
          data: testData,
          signature,
          secretKey,
          options,
        })
      ).toBe(false);

      // The new signature should be valid
      expect(
        verifySecuritySignature({
          data: testData,
          signature: newSignature,
          secretKey,
          options,
        })
      ).toBe(true);
    });

    it("should handle serialization correctly for different types", () => {
      // Test null values
      const dataWithNull = { ...testData, nullValue: null };
      const sigWithNull = createSignature({ data: dataWithNull, secretKey });
      expect(
        verifySecuritySignature({
          data: dataWithNull,
          signature: sigWithNull,
          secretKey,
        })
      ).toBe(true);

      // Test nested objects
      const nestedData = {
        ...testData,
        nested: {
          level1: {
            level2: "deep",
          },
        },
      };
      const nestedSig = createSignature({ data: nestedData, secretKey });
      expect(
        verifySecuritySignature({
          data: nestedData,
          signature: nestedSig,
          secretKey,
        })
      ).toBe(true);

      // Changing nested value should invalidate
      const modifiedNested = {
        ...nestedData,
        nested: {
          level1: {
            level2: "changed", // Changed from 'deep'
          },
        },
      };
      expect(
        verifySecuritySignature({
          data: modifiedNested,
          signature: nestedSig,
          secretKey,
        })
      ).toBe(false);
    });
  });

  describe("CSRF token functionality", () => {
    const testKey = Buffer.from(
      "testsecretkeythatislongenoughforcrypto",
      "utf-8"
    );
    const testSessionId = "user-session-12345";

    beforeEach(() => {
      // Setup fake timers
      vi.useFakeTimers();
    });

    afterEach(() => {
      // Restore real timers
      vi.useRealTimers();
    });

    it("should generate and verify a CSRF token", () => {
      // Generate a token
      const token = generateCsrfToken(testSessionId, testKey);

      // Verify the token
      const isValid = verifyCsrfToken(token, testSessionId, testKey);

      expect(isValid).toBe(true);
    });

    it("should validate session binding", () => {
      // Generate a token
      const token = generateCsrfToken(testSessionId, testKey);

      // Verify with wrong session ID
      const isValid = verifyCsrfToken(token, "different-session", testKey);

      expect(isValid).toBe(false);
    });

    it("should respect token expiration", () => {
      // Generate a token with short expiry
      const options: CSRFOptions = {
        expiryMs: 1, // 1ms expiry
      };
      const token = generateCsrfToken(testSessionId, testKey, options);

      // Wait for token to expire
      vi.advanceTimersByTime(10);

      // Verify the token
      const isValid = verifyCsrfToken(token, testSessionId, testKey, options);

      expect(isValid).toBe(false);
    });

    it("should validate user agent if enabled", () => {
      const userAgent = "Mozilla/5.0 Test Browser";
      const options: CSRFOptions = {
        includeUserAgent: true,
      };

      // Generate token with user agent
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

    it("should validate origin if enabled", () => {
      const origin = "https://example.com";
      const options: CSRFOptions = {
        includeOrigin: true,
      };

      // Generate token with origin
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

    it("should detect token tampering", () => {
      // Generate a valid token
      const token = generateCsrfToken(testSessionId, testKey);

      // Decode the token
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);

      // Tamper with the session ID
      parsed.payload.sessionId = "hacked-session";

      // Re-encode
      const tamperedToken = Buffer.from(JSON.stringify(parsed)).toString(
        "base64"
      );

      // Verify the tampered token
      const isValid = verifyCsrfToken(tamperedToken, testSessionId, testKey);

      expect(isValid).toBe(false);
    });

    it("should handle malformed tokens gracefully", () => {
      // Test with an invalid token format
      const invalidToken = "not-a-valid-base64-token";
      const result = verifyCsrfToken(invalidToken, testSessionId, testKey);

      expect(result).toBe(false);
    });
  });
});
