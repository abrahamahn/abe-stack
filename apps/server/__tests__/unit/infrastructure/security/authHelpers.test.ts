import { Response, Request } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ServerConfig,
  ServerEnvironment,
} from "@server/infrastructure/config/ConfigService";

import {
  getPasswordHash,
  setAuthCookies,
  getAuthTokenCookie,
  clearAuthCookies,
} from "../../../../../server/infrastructure/security/authHelpers";

describe("authHelpers", () => {
  const mockConfig: ServerConfig = {
    baseUrl: "http://localhost:3000",
    signatureSecret: Buffer.from("test-secret"),
    production: false,
    corsOrigin: "localhost",
    passwordSalt: "test-salt",
    port: 3000,
    host: "localhost",
    uploadPath: "uploads",
    tempPath: "temp",
    storagePath: "storage",
    storageUrl: "http://localhost:3000/storage",
  };

  const mockEnvironment: ServerEnvironment = {
    nodeEnv: "development",
    isProduction: false,
    isDevelopment: true,
    isTest: false,
    config: mockConfig,
  };

  describe("getPasswordHash", () => {
    it("should generate consistent hash for same password", async () => {
      const password = "test-password";
      const hash1 = await getPasswordHash({ config: mockConfig }, password);
      const hash2 = await getPasswordHash({ config: mockConfig }, password);
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different passwords", async () => {
      const hash1 = await getPasswordHash({ config: mockConfig }, "password1");
      const hash2 = await getPasswordHash({ config: mockConfig }, "password2");
      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes with different salts", async () => {
      const password = "test-password";
      const config1 = { ...mockConfig, passwordSalt: "salt1" };
      const config2 = { ...mockConfig, passwordSalt: "salt2" };
      const hash1 = await getPasswordHash({ config: config1 }, password);
      const hash2 = await getPasswordHash({ config: config2 }, password);
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty password", async () => {
      const hash = await getPasswordHash({ config: mockConfig }, "");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("setAuthCookies", () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        cookie: vi.fn(),
      };
    });

    it("should set auth token cookie", () => {
      const token = "test-token";
      const userId = "test-user";
      const expiration = new Date();
      setAuthCookies(
        mockEnvironment,
        { authToken: token, userId, expiration },
        mockResponse as Response,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        token,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          expires: expiration,
        }),
      );
    });

    it("should set secure cookie in production", () => {
      const token = "test-token";
      const userId = "test-user";
      const expiration = new Date();
      const prodEnvironment = {
        ...mockEnvironment,
        config: { ...mockConfig, production: true },
      };
      setAuthCookies(
        prodEnvironment,
        { authToken: token, userId, expiration },
        mockResponse as Response,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "authToken",
        token,
        expect.objectContaining({
          secure: true,
        }),
      );
    });
  });

  describe("getAuthTokenCookie", () => {
    let mockRequest: Partial<Request>;

    beforeEach(() => {
      mockRequest = {
        cookies: {},
      };
    });

    it("should extract auth token from cookies", () => {
      const token = "test-token";
      mockRequest.cookies = { authToken: token };
      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        },
      );
      expect(result).toBe(token);
    });

    it("should return undefined for missing auth token", () => {
      mockRequest.cookies = { other: "value" };
      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        },
      );
      expect(result).toBeUndefined();
    });

    it("should handle empty cookies", () => {
      mockRequest.cookies = {};
      const result = getAuthTokenCookie(
        mockRequest as Request & {
          cookies: { [key: string]: string | undefined };
        },
      );
      expect(result).toBeUndefined();
    });
  });

  describe("clearAuthCookies", () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        clearCookie: vi.fn(),
      };
    });

    it("should clear auth token cookie", () => {
      clearAuthCookies(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith("authToken");
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("userId");
    });
  });
});
