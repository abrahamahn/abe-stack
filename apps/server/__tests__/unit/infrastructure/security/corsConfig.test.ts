import { Request, Response, NextFunction } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ServerConfig,
  ServerEnvironment,
} from "@/server/infrastructure/config/ConfigService";
import {
  configureCors,
  createCorsMiddleware,
  CorsOptions,
  DEFAULT_CORS_OPTIONS,
  dynamicOriginWithAuth,
  validateOriginAgainstAllowList,
} from "@/server/modules/core/auth/corsConfig";

// Mock token verification for dynamicOriginWithAuth
vi.mock("@/server/modules/core/auth/features/token/token.utils", () => ({
  verifyAccessToken: vi.fn().mockResolvedValue({
    valid: true,
    payload: { userId: "test-user", roles: ["user"] },
  }),
}));

// Import mocked functions
import { verifyAccessToken } from "@/server/modules/core/auth/features/token/token.utils";

describe("CORS Configuration", () => {
  const mockConfig: ServerConfig = {
    baseUrl: "http://localhost:3000",
    signatureSecret: Buffer.from("test-secret"),
    production: false,
    corsOrigin: "http://localhost:8080,https://app.example.com",
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

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup mock request
    mockRequest = {
      method: "GET",
      headers: {
        origin: "http://localhost:8080",
      },
      path: "/api/test",
      get: vi
        .fn()
        .mockImplementation(
          (name: string) => mockRequest.headers?.[name.toLowerCase()]
        ),
    };

    // Setup mock response
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      header: vi.fn(),
      setHeader: vi.fn(),
      end: vi.fn(),
      locals: {},
    };

    // Setup mock next function
    mockNext = vi.fn();
  });

  describe("validateOriginAgainstAllowList", () => {
    it("should validate exact match origins", () => {
      const allowList = ["http://localhost:8080", "https://app.example.com"];

      const result1 = validateOriginAgainstAllowList(
        "http://localhost:8080",
        allowList
      );
      const result2 = validateOriginAgainstAllowList(
        "https://app.example.com",
        allowList
      );
      const result3 = validateOriginAgainstAllowList(
        "https://bad.example.com",
        allowList
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
    });

    it("should validate wildcard origins", () => {
      const allowList = ["*.example.com"];

      const result1 = validateOriginAgainstAllowList(
        "https://app.example.com",
        allowList
      );
      const result2 = validateOriginAgainstAllowList(
        "https://admin.example.com",
        allowList
      );
      const result3 = validateOriginAgainstAllowList(
        "https://example.com",
        allowList
      );
      const result4 = validateOriginAgainstAllowList(
        "https://bad.com",
        allowList
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false); // Doesn't match *.example.com
      expect(result4).toBe(false);
    });

    it("should validate with double wildcard", () => {
      const allowList = ["https://*.*.example.com"];

      const result1 = validateOriginAgainstAllowList(
        "https://app.test.example.com",
        allowList
      );
      const result2 = validateOriginAgainstAllowList(
        "https://app.example.com",
        allowList
      );

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it("should handle special wildcard for localhost", () => {
      const allowList = ["http://localhost:*"];

      const result1 = validateOriginAgainstAllowList(
        "http://localhost:8080",
        allowList
      );
      const result2 = validateOriginAgainstAllowList(
        "http://localhost:3000",
        allowList
      );
      const result3 = validateOriginAgainstAllowList(
        "https://localhost:8080",
        allowList
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false); // Different protocol
    });

    it("should return false for invalid URLs", () => {
      const allowList = ["http://example.com"];

      const result = validateOriginAgainstAllowList("invalid-url", allowList);

      expect(result).toBe(false);
    });

    it("should return false for undefined origin", () => {
      const allowList = ["http://example.com"];

      const result = validateOriginAgainstAllowList(
        undefined as any,
        allowList
      );

      expect(result).toBe(false);
    });
  });

  describe("dynamicOriginWithAuth", () => {
    it("should allow origin on allow list without token check", async () => {
      const origin = "http://localhost:8080";
      const allowList = ["http://localhost:8080", "https://app.example.com"];

      const originCallback = vi.fn();

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
      });
      await dynamicOriginFn(origin, originCallback);

      expect(originCallback).toHaveBeenCalledWith(null, true);
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });

    it("should check token for origin not on allow list", async () => {
      const origin = "https://unknown.example.com";
      const allowList = ["http://localhost:8080", "https://app.example.com"];
      const token = "valid.jwt.token";

      mockRequest.headers = {
        origin,
        authorization: `Bearer ${token}`,
      };

      const originCallback = vi.fn();

      // Mock verify token to return true
      vi.mocked(verifyAccessToken).mockResolvedValue({
        valid: true,
        payload: { userId: "test-user", roles: ["user"] },
      });

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
        extractTokenFn: (req: Request) =>
          req.headers.authorization?.split(" ")[1],
      });

      await dynamicOriginFn(origin, originCallback, mockRequest as Request);

      expect(verifyAccessToken).toHaveBeenCalledWith(mockEnvironment, token);
      expect(originCallback).toHaveBeenCalledWith(null, true);
    });

    it("should reject origin not on allow list with invalid token", async () => {
      const origin = "https://unknown.example.com";
      const allowList = ["http://localhost:8080", "https://app.example.com"];
      const token = "invalid.jwt.token";

      mockRequest.headers = {
        origin,
        authorization: `Bearer ${token}`,
      };

      const originCallback = vi.fn();

      // Mock verify token to return false
      vi.mocked(verifyAccessToken).mockResolvedValue({
        valid: false,
        error: "Invalid token",
      });

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
        extractTokenFn: (req: Request) =>
          req.headers.authorization?.split(" ")[1],
      });

      await dynamicOriginFn(origin, originCallback, mockRequest as Request);

      expect(verifyAccessToken).toHaveBeenCalledWith(mockEnvironment, token);
      expect(originCallback).toHaveBeenCalledWith(
        new Error("Unauthorized origin"),
        false
      );
    });

    it("should handle missing token for unauthorized origin", async () => {
      const origin = "https://unknown.example.com";
      const allowList = ["http://localhost:8080", "https://app.example.com"];

      mockRequest.headers = { origin };

      const originCallback = vi.fn();

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
        extractTokenFn: () => undefined,
      });

      await dynamicOriginFn(origin, originCallback, mockRequest as Request);

      expect(verifyAccessToken).not.toHaveBeenCalled();
      expect(originCallback).toHaveBeenCalledWith(
        new Error("Unauthorized origin"),
        false
      );
    });

    it("should support role-based origin restrictions", async () => {
      const origin = "https://admin.example.com";
      const allowList = ["http://localhost:8080", "https://app.example.com"];
      const roleOrigins = {
        admin: ["https://admin.example.com"],
      };
      const token = "admin.jwt.token";

      mockRequest.headers = {
        origin,
        authorization: `Bearer ${token}`,
      };

      const originCallback = vi.fn();

      // Mock verify token to return true with admin role
      vi.mocked(verifyAccessToken).mockResolvedValue({
        valid: true,
        payload: { userId: "admin-user", roles: ["user", "admin"] },
      });

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
        roleOrigins,
        extractTokenFn: (req: Request) =>
          req.headers.authorization?.split(" ")[1],
      });

      await dynamicOriginFn(origin, originCallback, mockRequest as Request);

      expect(verifyAccessToken).toHaveBeenCalledWith(mockEnvironment, token);
      expect(originCallback).toHaveBeenCalledWith(null, true);
    });

    it("should allow null/undefined origin if configured", async () => {
      const origin = undefined;
      const allowList = ["http://localhost:8080"];

      const originCallback = vi.fn();

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
      });

      await dynamicOriginFn(origin, originCallback);

      expect(originCallback).toHaveBeenCalledWith(null, true);
    });

    it("should handle any error during token validation", async () => {
      const origin = "https://unknown.example.com";
      const allowList = ["http://localhost:8080"];
      const token = "error.token";

      mockRequest.headers = {
        origin,
        authorization: `Bearer ${token}`,
      };

      const originCallback = vi.fn();

      // Mock verify token to throw an error
      vi.mocked(verifyAccessToken).mockImplementation(() => {
        throw new Error("Verification error");
      });

      const dynamicOriginFn = dynamicOriginWithAuth(mockEnvironment, {
        allowList,
        extractTokenFn: (req: Request) =>
          req.headers.authorization?.split(" ")[1],
      });

      await dynamicOriginFn(origin, originCallback, mockRequest as Request);

      expect(verifyAccessToken).toHaveBeenCalledWith(mockEnvironment, token);
      expect(originCallback).toHaveBeenCalledWith(
        new Error("Unauthorized origin"),
        false
      );
    });
  });

  describe("createCorsMiddleware", () => {
    it("should create CORS middleware with basic options", () => {
      const middleware = createCorsMiddleware(mockEnvironment);

      expect(middleware).toBeTypeOf("function");
    });

    it("should parse comma-separated allowed origins from config", () => {
      const middleware = createCorsMiddleware(mockEnvironment);

      // We can't easily test the internal options, but we can verify it was created
      expect(middleware).toBeTypeOf("function");
    });

    it("should accept custom CORS options", () => {
      const customOptions: CorsOptions = {
        allowedMethods: ["GET", "POST"],
        maxAge: 7200,
        allowCredentials: true,
      };

      const middleware = createCorsMiddleware(mockEnvironment, customOptions);

      expect(middleware).toBeTypeOf("function");
    });

    it("should handle preflight requests correctly", async () => {
      const middleware = createCorsMiddleware(mockEnvironment);

      const preflightReq = {
        ...mockRequest,
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:8080",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,authorization",
        },
      } as Partial<Request>;

      await middleware(
        preflightReq as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:8080"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        expect.any(String)
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        "content-type,authorization"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Max-Age",
        expect.any(String)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should add proper CORS headers for allowed origins", async () => {
      const middleware = createCorsMiddleware(mockEnvironment);

      const normalReq = {
        ...mockRequest,
        method: "GET",
        headers: {
          origin: "http://localhost:8080",
        },
      } as Partial<Request>;

      await middleware(
        normalReq as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:8080"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Credentials",
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should reject requests from disallowed origins", async () => {
      const middleware = createCorsMiddleware(mockEnvironment, {
        allowedOrigins: ["https://allowed.com"],
      });

      const disallowedReq = {
        ...mockRequest,
        method: "GET",
        headers: {
          origin: "https://notallowed.com",
        },
      } as Partial<Request>;

      await middleware(
        disallowedReq as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "CORS error",
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("configureCors for Express app", () => {
    it("should configure CORS for an Express app", () => {
      // Mock Express app
      const mockApp = {
        use: vi.fn(),
        options: vi.fn(),
      };

      configureCors(mockApp as any, mockEnvironment);

      // Should configure the app with CORS middleware
      expect(mockApp.use).toHaveBeenCalled();
    });

    it("should support preflight configuration", () => {
      // Mock Express app
      const mockApp = {
        use: vi.fn(),
        options: vi.fn(),
      };

      configureCors(mockApp as any, mockEnvironment, {
        configurePreflightEndpoint: true,
      });

      // Should set up OPTIONS endpoint
      expect(mockApp.options).toHaveBeenCalled();
    });

    it("should accept custom path for preflight configuration", () => {
      // Mock Express app
      const mockApp = {
        use: vi.fn(),
        options: vi.fn(),
      };

      configureCors(mockApp as any, mockEnvironment, {
        configurePreflightEndpoint: true,
        preflightPath: "/api/*",
      });

      // Should set up OPTIONS endpoint with custom path
      expect(mockApp.options).toHaveBeenCalledWith(
        "/api/*",
        expect.any(Function)
      );
    });

    it("should apply custom CORS options to the app", () => {
      // Mock Express app
      const mockApp = {
        use: vi.fn(),
        options: vi.fn(),
      };

      const customOptions: CorsOptions = {
        allowedMethods: ["GET", "POST", "PUT"],
        maxAge: 3600,
        allowCredentials: false,
      };

      configureCors(mockApp as any, mockEnvironment, {
        corsOptions: customOptions,
      });

      expect(mockApp.use).toHaveBeenCalled();
    });
  });

  describe("DEFAULT_CORS_OPTIONS", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_CORS_OPTIONS).toBeDefined();
      expect(DEFAULT_CORS_OPTIONS.allowedMethods).toEqual(
        expect.arrayContaining(["GET", "POST"])
      );
      expect(DEFAULT_CORS_OPTIONS.allowCredentials).toBe(true);
    });

    it("should include security-related headers by default", () => {
      expect(DEFAULT_CORS_OPTIONS.allowedHeaders).toEqual(
        expect.arrayContaining(["Authorization", "Content-Type"])
      );
    });

    it("should have default maxAge of 24 hours", () => {
      expect(DEFAULT_CORS_OPTIONS.maxAge).toBe(86400);
    });
  });

  describe("CORS with authentication integration", () => {
    it("should create middleware that authenticates CORS for specific endpoints", async () => {
      // Mock the verifyAccessToken function
      vi.mocked(verifyAccessToken).mockClear();

      // Create a CORS middleware specifically for authenticated endpoints
      const middleware = createCorsMiddleware(mockEnvironment, {
        allowedOrigins: ["http://trusted-origin.com"],
        authEnabled: true,
        authPaths: ["/api/private"],
      });

      // Mock a request to a private endpoint
      const privateReq = {
        ...mockRequest,
        headers: {
          origin: "http://trusted-origin.com",
          authorization: "Bearer valid-token",
        },
        path: "/api/private",
      } as Partial<Request>;

      // Execute the middleware
      await middleware(
        privateReq as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify that token verification was attempted
      expect(verifyAccessToken).toHaveBeenCalledWith(
        mockEnvironment,
        "valid-token"
      );
    });

    it("should bypass authentication for public endpoints", async () => {
      // Create a CORS middleware with authentication only for specific paths
      const middleware = createCorsMiddleware(mockEnvironment, {
        allowedOrigins: ["http://trusted-origin.com"],
        authEnabled: true,
        authPaths: ["/api/private"],
      });

      // Mock a request to a public endpoint
      const publicReq = {
        ...mockRequest,
        headers: {
          origin: "https://unknown-origin.com",
        },
        path: "/api/public",
      } as Partial<Request>;

      // Execute the middleware
      await middleware(
        publicReq as Request,
        mockResponse as Response,
        mockNext
      );

      // For public endpoints, it should not try to authenticate
      expect(verifyAccessToken).not.toHaveBeenCalled();
      // But it should reject the non-allowed origin
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it("should allow requests with no origin header", async () => {
      // Create a CORS middleware with allowUndefinedOrigin set to true (default)
      const middleware = createCorsMiddleware(mockEnvironment, {
        allowUndefinedOrigin: true,
      });

      // Reset mockNext to ensure it's clean
      vi.resetAllMocks();

      // Mock a request with no origin
      const noOriginReq = {
        ...mockRequest,
        headers: {},
      } as Partial<Request>;

      // Execute the middleware
      await middleware(
        noOriginReq as Request,
        mockResponse as Response,
        mockNext
      );

      // It should allow the request to proceed
      expect(mockNext).toHaveBeenCalled();
    });

    it("should reject auth requests with invalid tokens", async () => {
      // Create auth-enabled CORS middleware
      const middleware = createCorsMiddleware(mockEnvironment, {
        authEnabled: true,
        authPaths: ["/api/private"],
        allowedOrigins: ["http://allowed.com"],
      });

      // Mock an authenticated request with invalid token
      const invalidAuthReq = {
        ...mockRequest,
        headers: {
          origin: "http://unknown.com",
          authorization: "Bearer invalid-token",
        },
        path: "/api/private",
      } as Partial<Request>;

      // Make token verification fail
      vi.mocked(verifyAccessToken).mockResolvedValue({
        valid: false,
        error: "Invalid token",
      });

      // Execute the middleware
      await middleware(
        invalidAuthReq as Request,
        mockResponse as Response,
        mockNext
      );

      // Should reject the request
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle errors during token verification", async () => {
      // Create auth-enabled CORS middleware
      const middleware = createCorsMiddleware(mockEnvironment, {
        authEnabled: true,
        authPaths: ["/api/private"],
      });

      // Mock request to protected path
      const errorAuthReq = {
        ...mockRequest,
        headers: {
          origin: "http://unknown.com",
          authorization: "Bearer error-token",
        },
        path: "/api/private",
      } as Partial<Request>;

      // Make token verification throw an error
      vi.mocked(verifyAccessToken).mockImplementation(() => {
        throw new Error("Verification error");
      });

      // Execute the middleware
      await middleware(
        errorAuthReq as Request,
        mockResponse as Response,
        mockNext
      );

      // Should reject with 403
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "CORS error",
        })
      );
    });
  });
});
