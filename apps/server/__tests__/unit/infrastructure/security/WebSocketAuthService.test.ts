import { IncomingMessage } from "http";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IConfigService } from "@/server/infrastructure/config";
import { TokenManager } from "@/server/infrastructure/security/TokenManager";
import {
  WebSocketAuthService,
  WebSocketAuthResult,
} from "@/server/infrastructure/security/WebSocketAuthService";

// Mock the TokenManager with all dependencies
vi.mock("@/server/infrastructure/security/TokenManager", () => ({
  TokenManager: vi.fn().mockImplementation(() => ({
    verifyAccessToken: vi.fn().mockResolvedValue({
      valid: true,
      payload: { userId: "test-user", roles: ["user"] },
    }),
  })),
}));

// Mock the dependencies for TokenManager
const mockTokenStorage = {
  storeToken: vi.fn(),
  getTokenData: vi.fn(),
  removeToken: vi.fn(),
  hasToken: vi.fn(),
  getAllUserTokens: vi.fn(),
  removeAllUserTokens: vi.fn(),
  clearExpiredTokens: vi.fn(),
};
const mockTokenBlacklist = {
  check: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  getMetadata: vi.fn(),
  listAll: vi.fn(),
};
const mockConfigService = {
  initialize: vi.fn(),
  get: vi.fn(),
  getWithDefault: vi.fn(),
  getNumber: vi.fn(),
  getBoolean: vi.fn(),
  getString: vi.fn(),
  getArray: vi.fn(),
  getObject: vi.fn(),
  getConfig: vi.fn(),
  isProduction: vi.fn(),
  isDevelopment: vi.fn(),
  isTest: vi.fn(),
  ensureValid: vi.fn(),
  validateConfig: vi.fn(),
  loadConfig: vi.fn(),
  reloadConfig: vi.fn(),
  getConfigPath: vi.fn(),
  getEnvironment: vi.fn(),
  getConfigSchema: vi.fn(),
  validate: vi.fn(),
  getErrors: vi.fn(),
  clearErrors: vi.fn(),
  hasErrors: vi.fn(),
};

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Helper to create a mock request
const createMockRequest = (options: {
  url?: string;
  headers?: Record<string, any>;
  ip?: string;
}) => {
  return {
    url: options.url || "/",
    headers: options.headers || {},
    socket: { remoteAddress: options.ip || "127.0.0.1" },
  } as IncomingMessage;
};

describe("WebSocketAuthService", () => {
  let authService: WebSocketAuthService;
  let tokenManager: TokenManager;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    tokenManager = new TokenManager(
      mockTokenStorage,
      mockTokenBlacklist,
      mockLogger as any,
      mockConfigService as unknown as IConfigService
    );
    authService = new WebSocketAuthService(tokenManager, mockLogger as any);
  });

  describe("authenticateConnection", () => {
    it("should authenticate a valid token from query string", async () => {
      const request = createMockRequest({
        url: "/?token=valid-token",
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe("test-user");
      expect(result.roles).toContain("user");
      expect(result.ip).toBe("127.0.0.1");
      expect(tokenManager.verifyAccessToken).toHaveBeenCalledWith(
        "valid-token"
      );
    });

    it("should authenticate a valid token from cookies", async () => {
      const request = createMockRequest({
        headers: { cookie: "auth_token=valid-token" },
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe("test-user");
      expect(result.roles).toContain("user");
      expect(tokenManager.verifyAccessToken).toHaveBeenCalledWith(
        "valid-token"
      );
    });

    it("should authenticate a valid token from authorization header", async () => {
      const request = createMockRequest({
        headers: { authorization: "Bearer valid-token" },
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe("test-user");
      expect(result.roles).toContain("user");
      expect(tokenManager.verifyAccessToken).toHaveBeenCalledWith(
        "valid-token"
      );
    });

    it("should reject an invalid token", async () => {
      vi.mocked(tokenManager.verifyAccessToken).mockResolvedValueOnce({
        valid: false,
        error: "Invalid token",
      });

      const request = createMockRequest({
        url: "/?token=invalid-token",
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Invalid token");
      expect(tokenManager.verifyAccessToken).toHaveBeenCalledWith(
        "invalid-token"
      );
    });

    it("should handle missing token gracefully", async () => {
      const request = createMockRequest({});

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("No authentication token provided");
    });

    it("should correctly extract client IP from X-Forwarded-For header", async () => {
      const request = createMockRequest({
        url: "/?token=valid-token",
        headers: { "x-forwarded-for": "10.0.0.1, 192.168.1.1" },
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(true);
      expect(result.ip).toBe("10.0.0.1");
    });

    it("should include connection metadata in the result", async () => {
      const request = createMockRequest({
        url: "/?token=valid-token",
        headers: {
          "user-agent": "test-agent",
          origin: "https://example.com",
          referer: "https://example.com/page",
        },
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(true);
      expect(result.metadata).toEqual(
        expect.objectContaining({
          ip: "127.0.0.1",
          userAgent: "test-agent",
          origin: "https://example.com",
          referer: "https://example.com/page",
        })
      );
    });

    it("should handle errors during authentication", async () => {
      vi.mocked(tokenManager.verifyAccessToken).mockRejectedValueOnce(
        new Error("Unexpected error")
      );

      const request = createMockRequest({
        url: "/?token=valid-token",
      });

      const result: WebSocketAuthResult =
        await authService.authenticateConnection(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Authentication error");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("validatePermissions", () => {
    it("should validate permissions successfully for allowed actions", async () => {
      const userId = "test-user";
      const requiredPermissions = ["read", "write"];

      // Spy on the internal methods
      const getUserRolesSpy = vi
        .spyOn(authService as any, "getUserRoles")
        .mockResolvedValue(["user"]);

      const result = await authService.validatePermissions(
        userId,
        requiredPermissions
      );

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Checking WebSocket permissions",
        { userId, requiredPermissions }
      );
      expect(getUserRolesSpy).toHaveBeenCalledWith(userId);
    });

    it("should reject permissions for disallowed actions", async () => {
      const userId = "test-user";
      const requiredPermissions = ["moderate"];

      // Spy on the internal methods
      const getUserRolesSpy = vi
        .spyOn(authService as any, "getUserRoles")
        .mockResolvedValue(["user"]);

      const result = await authService.validatePermissions(
        userId,
        requiredPermissions
      );

      expect(result).toBe(false);
      expect(getUserRolesSpy).toHaveBeenCalledWith(userId);
    });

    it("should allow all permissions for admin role", async () => {
      const userId = "admin-user";
      const requiredPermissions = ["moderate", "publish", "delete"];

      // Spy on the internal methods
      const getUserRolesSpy = vi
        .spyOn(authService as any, "getUserRoles")
        .mockResolvedValue(["admin"]);

      const result = await authService.validatePermissions(
        userId,
        requiredPermissions
      );

      expect(result).toBe(true);
      expect(getUserRolesSpy).toHaveBeenCalledWith(userId);
    });

    it("should handle permission validation errors", async () => {
      const userId = "test-user";
      const requiredPermissions = ["admin"];

      // Mock the logger.debug method to throw an error
      mockLogger.debug.mockImplementationOnce(() => {
        throw new Error("Permission error");
      });

      const result = await authService.validatePermissions(
        userId,
        requiredPermissions
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error validating WebSocket permissions",
        { userId, requiredPermissions, error: expect.any(Error) }
      );
    });

    it("should reject permissions check for empty user ID", async () => {
      const result = await authService.validatePermissions("", ["read"]);

      expect(result).toBe(false);
    });

    it("should reject permissions check for empty permissions array", async () => {
      const result = await authService.validatePermissions("test-user", []);

      expect(result).toBe(false);
    });
  });

  describe("rate limiting", () => {
    it("should rate limit after multiple failed attempts", async () => {
      vi.mocked(tokenManager.verifyAccessToken).mockResolvedValue({
        valid: false,
        error: "Invalid token",
      });

      const request = createMockRequest({
        url: "/?token=invalid-token",
        ip: "192.168.1.1",
      });

      // Set the private property for testing
      Object.defineProperty(authService, "MAX_FAILED_ATTEMPTS", { value: 3 });

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        const result = await authService.authenticateConnection(request);
        expect(result.authenticated).toBe(false);
      }

      // Next attempt should be rate limited
      const result = await authService.authenticateConnection(request);
      expect(result.authenticated).toBe(false);
      expect(result.error).toContain("Too many failed connection attempts");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Rate limited WebSocket connection attempt",
        expect.objectContaining({ ip: "192.168.1.1" })
      );
    });

    it("should not rate limit different IP addresses independently", async () => {
      vi.mocked(tokenManager.verifyAccessToken).mockResolvedValue({
        valid: false,
        error: "Invalid token",
      });

      const request1 = createMockRequest({
        url: "/?token=invalid-token",
        ip: "192.168.1.1",
      });

      const request2 = createMockRequest({
        url: "/?token=invalid-token",
        ip: "192.168.1.2",
      });

      // Set the private property for testing
      Object.defineProperty(authService, "MAX_FAILED_ATTEMPTS", { value: 3 });

      // Make multiple failed attempts for first IP
      for (let i = 0; i < 3; i++) {
        await authService.authenticateConnection(request1);
      }

      // First IP should be rate limited
      const result1 = await authService.authenticateConnection(request1);
      expect(result1.error).toContain("Too many failed connection attempts");

      // Second IP should not be rate limited yet
      const result2 = await authService.authenticateConnection(request2);
      expect(result2.error).not.toContain(
        "Too many failed connection attempts"
      );
    });
  });
});
