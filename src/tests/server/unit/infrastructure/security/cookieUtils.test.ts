import crypto from "crypto";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IConfigService } from "@/server/infrastructure/config";
import type { ServerConfig } from "@/server/infrastructure/config/ConfigService";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";
import {
  CookieService,
  CookieOptions,
  setAuthCookies,
  getAuthTokenCookie,
  clearAuthCookies,
  setCookie,
  getCookie,
  clearCookie,
  setSignedCookie,
  getSignedCookie,
  setEncryptedCookie,
  getEncryptedCookie,
} from "@/server/infrastructure/security/cookieUtils";

import type { Request, Response } from "express";


// Mock Express response and request objects
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (cookies = {}) => {
  return {
    cookies,
    headers: {},
    get: vi.fn((name) => {
      if (name === "cookie") {
        return Object.entries(cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ");
      }
      return null;
    }),
  } as unknown as Request;
};

// Mock server config
const mockServerConfig: ServerConfig = {
  production: false,
  corsOrigin: "http://localhost:3000",
  baseUrl: "http://localhost",
  signatureSecret: Buffer.from("secret"),
  passwordSalt: "salt",
  port: 3000,
  host: "localhost",
  uploadPath: "/uploads",
  tempPath: "/temp",
  storagePath: "/storage",
  storageUrl: "/storage",
};

// Mock dependencies
const mockConfigService: Partial<IConfigService> = {
  get: vi.fn().mockReturnValue(mockServerConfig),
  initialize: vi.fn(),
  getWithDefault: vi.fn(),
  getNumber: vi.fn(),
  getBoolean: vi.fn(),
  getString: vi.fn(),
  getArray: vi.fn(),
  getObject: vi.fn(),
  isProduction: vi.fn(),
  isDevelopment: vi.fn(),
  isTest: vi.fn(),
  ensureValid: vi.fn(),
  validate: vi.fn(),
  getErrors: vi.fn(),
  clearErrors: vi.fn(),
  hasErrors: vi.fn(),
  getConfig: vi.fn(),
};

const mockLoggerService: Partial<ILoggerService> = {
  debug: vi.fn(),
  debugObj: vi.fn(),
  error: vi.fn(),
  errorObj: vi.fn(),
  warn: vi.fn(),
  warnObj: vi.fn(),
  info: vi.fn(),
  infoObj: vi.fn(),
  createLogger: vi.fn(),
  withContext: vi.fn(),
  addTransport: vi.fn(),
  setTransports: vi.fn(),
  setMinLevel: vi.fn(),
  initialize: vi.fn(),
  shutdown: vi.fn(),
};

// Mock container setup
vi.mock("@/server/infrastructure/di/container", () => ({
  container: {
    get: vi.fn((type) => {
      if (type === TYPES.ConfigService) return mockConfigService;
      if (type === TYPES.SecurityLogger) return mockLoggerService;
      return null;
    }),
  },
}));

describe("Cookie Utilities", () => {
  describe("Function-based API", () => {
    describe("setAuthCookies", () => {
      it("should set authentication cookies with correct options", () => {
        const res = mockResponse();
        const authData = {
          authToken: "test-auth-token",
          userId: "user123",
          expiration: new Date(Date.now() + 3600000), // 1 hour from now
        };

        setAuthCookies(mockServerConfig, authData, res);

        // Verify auth token cookie is set with correct options
        expect(res.cookie).toHaveBeenCalledWith(
          "authToken",
          authData.authToken,
          expect.objectContaining({
            httpOnly: true,
            secure: false, // Because we're in non-production
            expires: authData.expiration,
            sameSite: "strict",
          })
        );

        // Verify user ID cookie is also set
        expect(res.cookie).toHaveBeenCalledWith(
          "userId",
          authData.userId,
          expect.objectContaining({
            httpOnly: false, // User ID is client-accessible
            secure: false, // Because we're in non-production
            expires: authData.expiration,
            sameSite: "strict",
          })
        );
      });

      it("should use secure cookies in production environment", () => {
        const res = mockResponse();
        const productionConfig: ServerConfig = {
          ...mockServerConfig,
          production: true,
          corsOrigin: "https://example.com",
          baseUrl: "https://example.com",
          port: 443,
        };

        const authData = {
          authToken: "test-auth-token",
          userId: "user123",
          expiration: new Date(Date.now() + 3600000),
        };

        setAuthCookies(productionConfig, authData, res);

        // Verify cookies use secure flag in production
        expect(res.cookie).toHaveBeenCalledWith(
          "authToken",
          authData.authToken,
          expect.objectContaining({
            secure: true,
          })
        );

        expect(res.cookie).toHaveBeenCalledWith(
          "userId",
          authData.userId,
          expect.objectContaining({
            secure: true,
          })
        );
      });
    });

    describe("getAuthTokenCookie", () => {
      it("should return the auth token from cookies", () => {
        const req = mockRequest({ authToken: "test-auth-token" }) as Request & {
          cookies: { [key: string]: string | undefined };
        };
        const token = getAuthTokenCookie(req);
        expect(token).toBe("test-auth-token");
      });

      it("should return undefined when no auth token cookie exists", () => {
        const req = mockRequest({}) as Request & {
          cookies: { [key: string]: string | undefined };
        };
        const token = getAuthTokenCookie(req);
        expect(token).toBeUndefined();
      });
    });

    describe("clearAuthCookies", () => {
      it("should clear authentication cookies", () => {
        const res = mockResponse();
        clearAuthCookies(res);

        expect(res.clearCookie).toHaveBeenCalledWith("authToken");
        expect(res.clearCookie).toHaveBeenCalledWith("userId");
      });
    });

    describe("setCookie", () => {
      it("should set a cookie with default options", () => {
        const res = mockResponse();
        setCookie(res, "testCookie", "testValue");

        expect(res.cookie).toHaveBeenCalledWith(
          "testCookie",
          "testValue",
          expect.objectContaining({})
        );
      });

      it("should set a cookie with custom options", () => {
        const res = mockResponse();
        const options: CookieOptions = {
          httpOnly: true,
          secure: true,
          maxAge: 3600000,
          path: "/api",
          domain: "example.com",
        };

        setCookie(res, "testCookie", "testValue", options);

        expect(res.cookie).toHaveBeenCalledWith(
          "testCookie",
          "testValue",
          expect.objectContaining(options)
        );
      });
    });

    describe("getCookie", () => {
      it("should return the value of an existing cookie", () => {
        const req = mockRequest({ testCookie: "testValue" });
        const value = getCookie(req, "testCookie");
        expect(value).toBe("testValue");
      });

      it("should return undefined for a non-existent cookie", () => {
        const req = mockRequest({});
        const value = getCookie(req, "nonExistentCookie");
        expect(value).toBeUndefined();
      });
    });

    describe("clearCookie", () => {
      it("should clear a cookie with default options", () => {
        const res = mockResponse();
        clearCookie(res, "testCookie");

        expect(res.clearCookie).toHaveBeenCalledWith(
          "testCookie",
          expect.objectContaining({})
        );
      });

      it("should clear a cookie with custom options", () => {
        const res = mockResponse();
        const options: Omit<CookieOptions, "maxAge"> = {
          path: "/api",
          domain: "example.com",
        };

        clearCookie(res, "testCookie", options);

        expect(res.clearCookie).toHaveBeenCalledWith(
          "testCookie",
          expect.objectContaining(options)
        );
      });
    });

    describe("setSignedCookie", () => {
      it("should set a signed cookie", () => {
        const res = mockResponse();
        const secret = "supersecretkey";
        const value = "testValue";

        setSignedCookie(res, "signedCookie", value, secret);

        const hmac = crypto.createHmac("sha256", secret);
        const signature = hmac.update(value).digest("base64url");
        const signedValue = `${value}.${signature}`;

        expect(res.cookie).toHaveBeenCalledWith(
          "signedCookie",
          signedValue,
          expect.objectContaining({})
        );
      });
    });

    describe("getSignedCookie", () => {
      it("should return the original value of a valid signed cookie", () => {
        const secret = "supersecretkey";
        const value = "testValue";
        const hmac = crypto.createHmac("sha256", secret);
        const signature = hmac.update(value).digest("base64url");
        const signedValue = `${value}.${signature}`;

        const req = mockRequest({ signedCookie: signedValue });
        const result = getSignedCookie(req, "signedCookie", secret);

        expect(result).toBe(value);
      });

      it("should return undefined for an invalid signed cookie", () => {
        const secret = "supersecretkey";
        const req = mockRequest({ signedCookie: "invalid.value" });
        const result = getSignedCookie(req, "signedCookie", secret);

        expect(result).toBeUndefined();
      });
    });

    describe("setEncryptedCookie", () => {
      it("should set an encrypted cookie", () => {
        const res = mockResponse();
        const encryptionKey = crypto.randomBytes(32);
        const value = "testValue";

        setEncryptedCookie(res, "encryptedCookie", value, encryptionKey);

        expect(res.cookie).toHaveBeenCalledWith(
          "encryptedCookie",
          expect.any(String),
          expect.objectContaining({})
        );
      });

      it("should throw an error if encryption key is invalid", () => {
        const res = mockResponse();
        const invalidKey = crypto.randomBytes(16); // Not 32 bytes
        const value = "testValue";

        expect(() => {
          setEncryptedCookie(res, "encryptedCookie", value, invalidKey);
        }).toThrow("Encryption key must be 32 bytes for AES-256-GCM");
      });
    });

    describe("getEncryptedCookie", () => {
      it("should return the original value of a valid encrypted cookie", () => {
        const encryptionKey = crypto.randomBytes(32);
        const value = "testValue";

        // Encrypt the value manually
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
        let encrypted = cipher.update(value, "utf8", "base64");
        encrypted += cipher.final("base64");
        const authTag = cipher.getAuthTag().toString("base64");
        const cookieValue = `${iv.toString("base64")}.${encrypted}.${authTag}`;

        const req = mockRequest({ encryptedCookie: cookieValue });
        const result = getEncryptedCookie(
          req,
          "encryptedCookie",
          encryptionKey
        );

        expect(result).toBe(value);
      });

      it("should return undefined for an invalid encrypted cookie", () => {
        const encryptionKey = crypto.randomBytes(32);
        const req = mockRequest({ encryptedCookie: "invalid.value" });
        const result = getEncryptedCookie(
          req,
          "encryptedCookie",
          encryptionKey
        );

        expect(result).toBeUndefined();
      });

      it("should throw an error if decryption key is invalid", () => {
        const invalidKey = crypto.randomBytes(16); // Not 32 bytes
        const req = mockRequest({ encryptedCookie: "some.value" });

        expect(() => {
          getEncryptedCookie(req, "encryptedCookie", invalidKey);
        }).toThrow("Encryption key must be 32 bytes for AES-256-GCM");
      });
    });
  });

  describe("CookieService Class", () => {
    let cookieService: CookieService;

    beforeEach(() => {
      cookieService = new CookieService(
        mockConfigService as unknown as IConfigService,
        mockLoggerService as unknown as ILoggerService
      );
    });

    describe("setAuthCookies", () => {
      it("should set authentication cookies with correct options", () => {
        const res = mockResponse();
        const authData = {
          authToken: "test-auth-token",
          userId: "user123",
          expiration: new Date(Date.now() + 3600000),
        };

        cookieService.setAuthCookies(authData, res);

        // Verify auth token cookie is set with correct options
        expect(res.cookie).toHaveBeenCalledWith(
          "authToken",
          authData.authToken,
          expect.objectContaining({
            httpOnly: true,
            secure: false,
            expires: authData.expiration,
            sameSite: "strict",
          })
        );

        // Verify user ID cookie is also set
        expect(res.cookie).toHaveBeenCalledWith(
          "userId",
          authData.userId,
          expect.objectContaining({
            httpOnly: false,
            secure: false,
            expires: authData.expiration,
            sameSite: "strict",
          })
        );
      });

      it("should handle errors gracefully", () => {
        const res = mockResponse();
        res.cookie = vi.fn().mockImplementation(() => {
          throw new Error("Cookie error");
        });

        const authData = {
          authToken: "test-auth-token",
          userId: "user123",
          expiration: new Date(Date.now() + 3600000),
        };

        cookieService.setAuthCookies(authData, res);

        expect(mockLoggerService.error).toHaveBeenCalledWith(
          "Failed to set auth cookies",
          expect.objectContaining({ error: expect.any(Error) })
        );
      });
    });

    describe("getAuthTokenCookie", () => {
      it("should return the auth token from cookies", () => {
        const req = mockRequest({ authToken: "test-auth-token" }) as Request & {
          cookies: { [key: string]: string | undefined };
        };
        const token = cookieService.getAuthTokenCookie(req);
        expect(token).toBe("test-auth-token");
      });

      it("should return undefined when no auth token cookie exists", () => {
        const req = mockRequest({}) as Request & {
          cookies: { [key: string]: string | undefined };
        };
        const token = cookieService.getAuthTokenCookie(req);
        expect(token).toBeUndefined();
      });

      it("should handle errors gracefully", () => {
        // Create a request that throws an error when accessing cookies
        const req = {} as Request & {
          cookies: { [key: string]: string | undefined };
        };

        // Set up cookies to throw an error when accessed
        Object.defineProperty(req, "cookies", {
          get: () => {
            throw new Error("Cookie error");
          },
        });

        // Clear previous mock calls
        vi.clearAllMocks();

        const token = cookieService.getAuthTokenCookie(req);

        expect(token).toBeUndefined();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          "Error retrieving auth token from cookies",
          expect.objectContaining({ error: expect.any(Error) })
        );
      });
    });

    describe("clearAuthCookies", () => {
      it("should clear authentication cookies", () => {
        const res = mockResponse();
        cookieService.clearAuthCookies(res);

        expect(res.clearCookie).toHaveBeenCalledWith("authToken");
        expect(res.clearCookie).toHaveBeenCalledWith("userId");
      });

      it("should handle errors gracefully", () => {
        const res = mockResponse();
        res.clearCookie = vi.fn().mockImplementation(() => {
          throw new Error("Clear cookie error");
        });

        cookieService.clearAuthCookies(res);

        expect(mockLoggerService.error).toHaveBeenCalledWith(
          "Failed to clear auth cookies",
          expect.objectContaining({ error: expect.any(Error) })
        );
      });
    });

    describe("cookie operations", () => {
      it("should set, get, and clear cookies", () => {
        const res = mockResponse();
        const req = mockRequest({ testCookie: "testValue" });

        cookieService.setCookie(res, "testCookie", "testValue");
        const value = cookieService.getCookie(req, "testCookie");
        expect(value).toBe("testValue");

        cookieService.clearCookie(res, "testCookie");
        expect(res.clearCookie).toHaveBeenCalledWith(
          "testCookie",
          expect.objectContaining({})
        );
      });

      it("should handle errors when setting cookies", () => {
        const res = mockResponse();
        res.cookie = vi.fn().mockImplementation(() => {
          throw new Error("Cookie error");
        });

        expect(() => {
          cookieService.setCookie(res, "testCookie", "testValue");
        }).toThrow("Failed to set cookie");
      });

      it("should handle errors when getting cookies", () => {
        const req = { cookies: undefined } as unknown as Request;
        const value = cookieService.getCookie(req, "testCookie");
        expect(value).toBeUndefined();
      });

      it("should handle errors when clearing cookies", () => {
        const res = mockResponse();
        res.clearCookie = vi.fn().mockImplementation(() => {
          throw new Error("Clear cookie error");
        });

        expect(() => {
          cookieService.clearCookie(res, "testCookie");
        }).toThrow("Failed to clear cookie");
      });
    });

    describe("signed cookies", () => {
      it("should set and verify signed cookies", () => {
        const res = mockResponse();
        const secret = "supersecretkey";
        const value = "testValue";

        cookieService.setSignedCookie(res, "signedCookie", value, secret);

        // Mock that the cookie was set
        const hmac = crypto.createHmac("sha256", secret);
        const signature = hmac.update(value).digest("base64url");
        const signedValue = `${value}.${signature}`;

        // Update the mock req with the signed cookie
        const reqWithCookie = mockRequest({ signedCookie: signedValue });

        const result = cookieService.getSignedCookie(
          reqWithCookie,
          "signedCookie",
          secret
        );
        expect(result).toBe(value);
      });

      it("should handle invalid signature", () => {
        const secret = "supersecretkey";
        const req = mockRequest({ signedCookie: "value.invalidsignature" });

        const result = cookieService.getSignedCookie(
          req,
          "signedCookie",
          secret
        );
        expect(result).toBeUndefined();
        expect(mockLoggerService.warn).toHaveBeenCalledWith(
          "Cookie signature verification failed",
          expect.objectContaining({ name: "signedCookie" })
        );
      });

      it("should handle errors when setting signed cookies", () => {
        const res = mockResponse();
        res.cookie = vi.fn().mockImplementation(() => {
          throw new Error("Cookie error");
        });

        expect(() => {
          cookieService.setSignedCookie(res, "signedCookie", "value", "secret");
        }).toThrow("Failed to set signed cookie");
      });

      it("should handle errors when verifying signed cookies", () => {
        const req = { cookies: {} as any } as Request;
        req.cookies = null;

        const result = cookieService.getSignedCookie(
          req,
          "signedCookie",
          "secret"
        );
        expect(result).toBeUndefined();
      });
    });

    describe("encrypted cookies", () => {
      it("should encrypt and decrypt cookies", () => {
        const res = mockResponse();
        const encryptionKey = crypto.randomBytes(32);
        const value = "testValue";

        cookieService.setEncryptedCookie(
          res,
          "encryptedCookie",
          value,
          encryptionKey
        );

        // Get the cookie value from the res.cookie mock call
        const cookieData = (res.cookie as any).mock.calls[0];
        const encryptedValue = cookieData[1];

        // Create a request with the encrypted cookie
        const reqWithCookie = mockRequest({ encryptedCookie: encryptedValue });

        // Now decrypt
        vi.spyOn(cookieService, "getCookie").mockReturnValue(encryptedValue);

        const decrypted = cookieService.getEncryptedCookie(
          reqWithCookie,
          "encryptedCookie",
          encryptionKey
        );
        expect(decrypted).toBe(value);
      });

      it("should validate encryption key length", () => {
        const res = mockResponse();
        const invalidKey = crypto.randomBytes(16); // Not 32 bytes

        expect(() => {
          cookieService.setEncryptedCookie(
            res,
            "encryptedCookie",
            "value",
            invalidKey
          );
        }).toThrow("Encryption key must be 32 bytes for AES-256-GCM");
      });

      it("should handle invalid encrypted cookie format", () => {
        const encryptionKey = crypto.randomBytes(32);
        const req = mockRequest({ encryptedCookie: "invalid.format" });

        const result = cookieService.getEncryptedCookie(
          req,
          "encryptedCookie",
          encryptionKey
        );
        expect(result).toBeUndefined();
        expect(mockLoggerService.warn).toHaveBeenCalledWith(
          "Invalid encrypted cookie format",
          expect.objectContaining({ name: "encryptedCookie" })
        );
      });

      it("should handle decryption errors", () => {
        const encryptionKey = crypto.randomBytes(32);
        // Create a cookie with invalid encryption data
        const invalidCookieValue = `${Buffer.from("iv").toString("base64")}.invaliddata.${Buffer.from("tag").toString("base64")}`;
        const req = mockRequest({ encryptedCookie: invalidCookieValue });

        vi.spyOn(cookieService, "getCookie").mockReturnValue(
          invalidCookieValue
        );

        const result = cookieService.getEncryptedCookie(
          req,
          "encryptedCookie",
          encryptionKey
        );
        expect(result).toBeUndefined();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          "Error decrypting cookie",
          expect.objectContaining({
            name: "encryptedCookie",
            error: expect.any(Error),
          })
        );
      });
    });
  });
});
