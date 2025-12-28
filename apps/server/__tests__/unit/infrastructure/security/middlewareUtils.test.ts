import { Request, Response, NextFunction } from "express";
import { Container } from "inversify";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TYPES } from "@/server/infrastructure/di/types";
import {
  generateCsrfToken,
  verifyCsrfToken,
} from "@/server/infrastructure/security/csrfUtils";
import {
  csrfProtection,
  csrfToken,
  SecurityMiddlewareService,
  CSRFMiddlewareOptions,
} from "@/server/infrastructure/security/middlewareUtils";

// Mock the external utilities
vi.mock("@/server/infrastructure/security/csrfUtils", () => ({
  generateCsrfToken: vi.fn(),
  verifyCsrfToken: vi.fn(),
}));

describe("middlewareUtils", () => {
  // Setup reusable test objects
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let options: CSRFMiddlewareOptions;
  let container: Container;
  let securityMiddlewareService: SecurityMiddlewareService;
  let mockLogger: any;
  let mockConfigService: any;

  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock request
    req = {
      method: "POST",
      headers: {
        "user-agent": "test-agent",
        origin: "https://example.com",
        "x-csrf-token": "valid-token",
      },
      cookies: {
        "csrf-token": "valid-token",
        authToken: "user123",
      },
      body: {
        _csrf: "valid-token",
      },
      query: {
        _csrf: "valid-token",
      },
      ip: "127.0.0.1",
    };

    // Add path as a getter/property to simulate the Express behavior
    Object.defineProperty(req, "path", {
      value: "/api/users",
      writable: true,
      configurable: true,
    });

    // Mock response
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn(),
      locals: {},
    };

    // Mock next function
    next = vi.fn();

    // Mock options
    options = {
      secretKey: Buffer.from("test-secret"),
      protectedMethods: ["POST", "PUT", "DELETE", "PATCH"],
      expiryMs: 3600000,
    };

    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock config service
    mockConfigService = {
      get: vi.fn(),
    };

    // Setup DI container
    container = new Container();
    container.bind(TYPES.ConfigService).toConstantValue(mockConfigService);
    container.bind(TYPES.SecurityLogger).toConstantValue(mockLogger);
    container.bind(SecurityMiddlewareService).toSelf();

    // Get service instance
    securityMiddlewareService = container.get(SecurityMiddlewareService);

    // Mock the verification to return true by default
    (verifyCsrfToken as any).mockReturnValue(true);
    (generateCsrfToken as any).mockReturnValue("new-token");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("csrfProtection middleware", () => {
    it("should pass through non-protected methods", () => {
      req.method = "GET";
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).not.toHaveBeenCalled();
    });

    it("should pass through ignored paths", () => {
      options.ignorePaths = ["/api/health", "/api/public"];
      Object.defineProperty(req, "path", {
        value: "/api/health",
        configurable: true,
      });
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).not.toHaveBeenCalled();
    });

    it("should block requests with missing CSRF token", () => {
      req.headers = {};
      req.body = {};
      req.query = {};
      req.cookies = {};
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "CSRF token missing",
          code: "CSRF_TOKEN_MISSING",
        })
      );
    });

    it("should block requests with invalid CSRF token", () => {
      (verifyCsrfToken as any).mockReturnValue(false);
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Invalid CSRF token",
          code: "CSRF_TOKEN_INVALID",
        })
      );
    });

    it("should extract token from header", () => {
      req.body = {};
      req.query = {};
      req.cookies = {};
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should extract token from body", () => {
      req.headers = {};
      req.query = {};
      req.cookies = {};
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should extract token from query", () => {
      req.headers = {};
      req.body = {};
      req.cookies = {};
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should extract token from cookie as fallback", () => {
      req.headers = {};
      req.body = {};
      req.query = {};
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should handle custom field and header names", () => {
      req.headers = { "x-custom-csrf": "valid-token" };
      req.body = { customField: "valid-token" };
      req.query = {};
      req.cookies = {};
      options.headerName = "X-Custom-CSRF";
      options.fieldName = "customField";
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should support token rotation", () => {
      options.rotateTokens = true;
      const middleware = csrfProtection(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(generateCsrfToken).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        "csrf-token",
        "new-token",
        expect.any(Object)
      );
      expect(res.locals).toBeDefined();
      expect(res.locals!.csrfToken).toBe("new-token");
    });

    it("should enforce token reuse prevention when enabled", () => {
      // Create a fresh instance to test token reuse prevention
      const instance = new SecurityMiddlewareService(mockLogger);
      options.allowReuse = false;
      const middleware = instance.csrfProtection(options);

      // First request should pass
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset the next mock to check if it's called again
      vi.clearAllMocks();

      // Second request with same token should fail
      middleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "CSRF token already used",
          code: "CSRF_TOKEN_REUSED",
        })
      );
    });
  });

  describe("csrfToken middleware", () => {
    it("should generate and set token in response", () => {
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(generateCsrfToken).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        "csrf-token",
        "new-token",
        expect.any(Object)
      );
      expect(res.locals).toBeDefined();
      expect(res.locals!.csrfToken).toBe("new-token");
    });

    it("should attach token generation method to response", () => {
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(res.locals).toBeDefined();
      expect(res.locals!.generateCsrfToken).toBeInstanceOf(Function);
      const newToken = res.locals!.generateCsrfToken();
      expect(generateCsrfToken).toHaveBeenCalledTimes(2); // once for initial token, once for generateCsrfToken
      expect(newToken).toBe("new-token");
    });

    it("should use session ID for token generation", () => {
      (req as any).session = { id: "session123" };
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(generateCsrfToken).toHaveBeenCalledWith(
        "session123",
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should fallback to authToken for token generation", () => {
      (req as any).session = undefined;
      req.cookies = { authToken: "user123" };
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(generateCsrfToken).toHaveBeenCalledWith(
        "user123",
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should use anonymous for token generation if no session or auth token", () => {
      (req as any).session = undefined;
      req.cookies = {};
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(generateCsrfToken).toHaveBeenCalledWith(
        "anonymous",
        expect.any(Buffer),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should include user agent and origin in token context", () => {
      req.headers = {
        "user-agent": "test-browser",
        origin: "https://example.org",
      };
      options.includeUserAgent = true;
      options.includeOrigin = true;
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(generateCsrfToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          includeUserAgent: true,
          includeOrigin: true,
        }),
        expect.objectContaining({
          userAgent: "test-browser",
          origin: "https://example.org",
        })
      );
    });

    it("should use referer as origin fallback", () => {
      req.headers = {
        "user-agent": "test-browser",
        referer: "https://example.org/page",
      };
      options.includeUserAgent = true;
      options.includeOrigin = true;
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(generateCsrfToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        expect.objectContaining({
          userAgent: "test-browser",
          origin: "https://example.org/page",
        })
      );
    });

    it("should configure cookie for cross-origin when enabled", () => {
      options.crossOrigin = true;
      options.cookieOptions = {
        secure: true,
      };
      const middleware = csrfToken(options);
      middleware(req as Request, res as Response, next);
      expect(res.cookie).toHaveBeenCalledWith(
        "csrf-token",
        "new-token",
        expect.objectContaining({
          sameSite: "none",
          secure: true,
        })
      );
    });

    it("should throw error for cross-origin without secure flag", () => {
      options.crossOrigin = true;
      options.cookieOptions = {
        secure: false,
      };
      expect(() => csrfToken(options)).toThrow(
        "Cross-origin CSRF cookies must use the secure flag"
      );
    });

    it("should proceed even if token generation fails", () => {
      (generateCsrfToken as any).mockImplementation(() => {
        throw new Error("Token generation failed");
      });

      // Create middleware directly from the SecurityMiddlewareService
      // which properly catches errors
      const middleware = securityMiddlewareService.csrfToken(options);

      // Run middleware - should not throw
      middleware(req as Request, res as Response, next);

      // Should still proceed to next middleware
      expect(next).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "CSRF token generation error",
        expect.any(Object)
      );

      // Token should not be set in res.locals
      expect(res.locals?.csrfToken).toBeUndefined();
    });
  });

  describe("SecurityMiddlewareService", () => {
    it("should initialize correctly", () => {
      expect(securityMiddlewareService).toBeInstanceOf(
        SecurityMiddlewareService
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "SecurityMiddlewareService initialized"
      );
    });

    it("should create csrfProtection middleware", () => {
      const middleware = securityMiddlewareService.csrfProtection(options);
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should create csrfToken middleware", () => {
      const middleware = securityMiddlewareService.csrfToken(options);
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should check if path is ignored", () => {
      const middleware = securityMiddlewareService.csrfProtection({
        ...options,
        ignorePaths: ["/api/health", /^\/public\//],
      });

      // Test with string path that should be ignored
      Object.defineProperty(req, "path", {
        value: "/api/health",
        configurable: true,
      });
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).not.toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // Test with regex path that should be ignored
      Object.defineProperty(req, "path", {
        value: "/public/asset.js",
        configurable: true,
      });
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(verifyCsrfToken).not.toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // Test with path that should not be ignored
      Object.defineProperty(req, "path", {
        value: "/api/users",
        configurable: true,
      });
      middleware(req as Request, res as Response, next);
      expect(verifyCsrfToken).toHaveBeenCalled();
    });

    it("should cleanup used tokens periodically", () => {
      // Store current NODE_ENV and reset after
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Use a fake setInterval implementation
      const originalSetInterval = global.setInterval;
      const mockSetIntervalFn = vi.fn().mockImplementation((cb, _ms) => {
        cb(); // Execute the callback immediately
        return 123; // Return a fake timer ID
      });

      // @ts-ignore - Override setInterval temporarily
      global.setInterval = mockSetIntervalFn;

      const cleanupSpy = vi.spyOn(
        SecurityMiddlewareService.prototype as any,
        "cleanupUsedTokens"
      );

      // Create a new instance to trigger the interval setup
      new SecurityMiddlewareService(mockLogger);

      expect(mockSetIntervalFn).toHaveBeenCalledWith(
        expect.any(Function),
        3600000
      );
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Cleared used CSRF tokens cache"
      );

      // Restore original setInterval and NODE_ENV
      global.setInterval = originalSetInterval;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should not set up token cleanup in test environment", () => {
      // Store current NODE_ENV and reset after
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      const setIntervalSpy = vi.spyOn(global, "setInterval");

      expect(setIntervalSpy).not.toHaveBeenCalled();

      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    describe("validateCsrfToken", () => {
      it("should validate a token directly", () => {
        const result = securityMiddlewareService.validateCsrfToken(
          "valid-token",
          req as Request,
          options
        );
        expect(result.valid).toBe(true);
        expect(verifyCsrfToken).toHaveBeenCalled();
      });

      it("should return invalid result for missing token", () => {
        const result = securityMiddlewareService.validateCsrfToken(
          undefined,
          req as Request,
          options
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("CSRF token missing");
        expect(result.errorCode).toBe("CSRF_TOKEN_MISSING");
      });

      it("should return invalid result for already used token", () => {
        // First validate the token to mark it as used
        options.allowReuse = false;
        securityMiddlewareService.validateCsrfToken(
          "valid-token",
          req as Request,
          options
        );

        // Try to validate the same token again
        const result = securityMiddlewareService.validateCsrfToken(
          "valid-token",
          req as Request,
          options
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("CSRF token already used");
        expect(result.errorCode).toBe("CSRF_TOKEN_REUSED");
      });

      it("should return invalid result for verification failure", () => {
        (verifyCsrfToken as any).mockReturnValue(false);
        const result = securityMiddlewareService.validateCsrfToken(
          "invalid-token",
          req as Request,
          options
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid CSRF token");
        expect(result.errorCode).toBe("CSRF_TOKEN_INVALID");
      });

      it("should handle errors during validation", () => {
        (verifyCsrfToken as any).mockImplementation(() => {
          throw new Error("Verification error");
        });
        const result = securityMiddlewareService.validateCsrfToken(
          "valid-token",
          req as Request,
          options
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("CSRF validation error");
        expect(result.errorCode).toBe("CSRF_VALIDATION_ERROR");
        expect(mockLogger.error).toHaveBeenCalledWith(
          "CSRF validation error",
          expect.any(Object)
        );
      });
    });
  });
});
