import { Response, Request } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  ServerEnvironment,
  ServerConfig,
} from "@/server/infrastructure/config/ConfigService";
import {
  getPasswordHash,
  setAuthCookies,
  getAuthTokenCookie,
  clearAuthCookies,
} from "@/server/infrastructure/security/authHelpers";
import {
  createSignature,
  verifySignature as verifySecuritySignature,
} from "@/server/infrastructure/security/securityHelpers";
import {
  generateSignature,
  verifySignature,
} from "@/server/infrastructure/security/signatureHelpers";

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

    it("should set authentication cookies correctly", () => {
      const authToken = "test-token";
      const userId = "test-user";
      const expiration = new Date(Date.now() + 3600000); // 1 hour from now

      setAuthCookies(
        mockEnvironment as ServerEnvironment,
        { authToken, expiration, userId },
        mockResponse as Response,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        authToken,
        expect.objectContaining({
          secure: false,
          httpOnly: true,
          expires: expiration,
        }),
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "userId",
        userId,
        expect.objectContaining({
          secure: false,
          httpOnly: false,
          expires: expiration,
        }),
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
        mockResponse as Response,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        authToken,
        expect.objectContaining({
          secure: true,
          domain: "http://localhost:3000",
        }),
      );
    });

    it("should retrieve auth token from cookies", () => {
      const authToken = "test-token";
      mockRequest.cookies = { authToken };

      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        },
      );
      expect(result).toBe(authToken);
    });

    it("should handle missing auth token", () => {
      mockRequest.cookies = {};
      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        },
      );
      expect(result).toBeUndefined();
    });

    it("should clear authentication cookies", () => {
      clearAuthCookies(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith("authToken");
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("userId");
    });
  });

  describe("Signature Helpers", () => {
    const secretKey = "test-secret-key";
    const testData = {
      id: "123",
      timestamp: Date.now(),
      action: "test",
    };

    it("should generate consistent signatures for the same data", () => {
      const signature1 = generateSignature(secretKey, testData);
      const signature2 = generateSignature(secretKey, testData);

      expect(signature1).toBeDefined();
      expect(signature2).toBeDefined();
      expect(signature1).toBe(signature2);
    });

    it("should generate different signatures for different data", () => {
      const data1 = { ...testData, timestamp: Date.now() };
      const data2 = { ...testData, timestamp: Date.now() + 1 };

      const signature1 = generateSignature(secretKey, data1);
      const signature2 = generateSignature(secretKey, data2);

      expect(signature1).not.toBe(signature2);
    });

    it("should verify valid signatures", () => {
      const signature = generateSignature(secretKey, testData);
      const isValid = verifySignature(secretKey, signature, testData);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const signature = generateSignature(secretKey, testData);
      const modifiedData = { ...testData, action: "modified" };
      const isValid = verifySignature(secretKey, signature, modifiedData);
      expect(isValid).toBe(false);
    });

    it("should handle empty data objects", () => {
      const signature = generateSignature(secretKey, {});
      const isValid = verifySignature(secretKey, signature, {});
      expect(isValid).toBe(true);
    });

    it("should handle nested data objects", () => {
      const nestedData = {
        ...testData,
        nested: {
          key: "value",
          number: 42,
        },
      };

      const signature = generateSignature(secretKey, nestedData);
      const isValid = verifySignature(secretKey, signature, nestedData);
      expect(isValid).toBe(true);
    });
  });

  describe("Security Helpers", () => {
    const secretKey = Buffer.from("test-secret-key");
    const testData = {
      id: "123",
      timestamp: Date.now(),
      action: "test",
    };

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
  });
});
