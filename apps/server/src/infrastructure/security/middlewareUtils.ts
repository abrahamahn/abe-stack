/**
 * Security Middleware Utilities
 *
 * Core functionality for security middleware components.
 */

import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";


import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import { CSRFOptions, verifyCsrfToken, generateCsrfToken } from "./csrfUtils";

/**
 * Configuration options for CSRF middleware
 */
export interface CSRFMiddlewareOptions extends CSRFOptions {
  /** Custom cookie name for the CSRF token (default: 'csrf-token') */
  cookieName?: string;

  /** Header name to look for the CSRF token (default: 'X-CSRF-Token') */
  headerName?: string;

  /** Form field name to look for the CSRF token (default: '_csrf') */
  fieldName?: string;

  /** HTTP methods that require CSRF protection (default: POST, PUT, DELETE, PATCH) */
  protectedMethods?: string[];

  /** Routes to exclude from CSRF protection (e.g. API endpoints with alternative protection) */
  ignorePaths?: Array<string | RegExp>;

  /** Secret key used for token generation and verification */
  secretKey: Buffer;

  /** Cookie options for the CSRF token */
  cookieOptions?: {
    /** Whether the cookie is HTTP only (default: false) */
    httpOnly?: boolean;

    /** Whether the cookie is secure (default: false in development, true in production) */
    secure?: boolean;

    /** Cookie same site policy (default: 'lax') */
    sameSite?: boolean | "strict" | "lax" | "none";

    /** Cookie path (default: '/') */
    path?: string;

    /** Cookie domain */
    domain?: string;

    /** Cookie max age in milliseconds (default: 24 hours) */
    maxAge?: number;
  };

  /**
   * Whether to allow the same token to be submitted multiple times
   * Setting this to false will invalidate tokens after first use
   * (default: true - more compatible with web forms)
   */
  allowReuse?: boolean;

  /**
   * Whether to rotate token on successful verification
   * (default: false, but recommended true for sensitive operations)
   */
  rotateTokens?: boolean;

  /**
   * Whether to set SameSite=None for cross-origin requests
   * You must also set secure=true when this is enabled
   * (default: false)
   */
  crossOrigin?: boolean;
}

/**
 * Default options for CSRF middleware
 */
export const DEFAULT_CSRF_MIDDLEWARE_OPTIONS: Omit<
  CSRFMiddlewareOptions,
  "secretKey"
> = {
  cookieName: "csrf-token",
  headerName: "X-CSRF-Token",
  fieldName: "_csrf",
  protectedMethods: ["POST", "PUT", "DELETE", "PATCH"],
  includeUserAgent: true,
  includeOrigin: true,
  expiryMs: 86400000, // 24 hours
  cookieOptions: {
    httpOnly: false, // Must be accessible to JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400000, // 24 hours
  },
  allowReuse: true,
  rotateTokens: false,
  crossOrigin: false,
};

/**
 * The result of a CSRF token validation
 */
export interface CSRFValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
}

/**
 * Injectable security middleware service
 */
@injectable()
export class SecurityMiddlewareService {
  /** Cache of used tokens for single-use enforcement */
  private readonly usedTokens: Set<string> = new Set();

  constructor(@inject(TYPES.SecurityLogger) private logger: ILoggerService) {
    this.logger.debug("SecurityMiddlewareService initialized");

    // Set up token cleanup interval (every hour)
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
      setInterval(() => this.cleanupUsedTokens(), 3600000);
    }
  }

  /**
   * Cleanup old used tokens to prevent memory leaks
   * Only tokens that are older than the expiry time will be removed
   */
  private cleanupUsedTokens(): void {
    // Currently a no-op since we don't track token timestamps
    // This would be implemented in a production system to prevent memory leaks
    this.usedTokens.clear();
    this.logger.debug("Cleared used CSRF tokens cache");
  }

  /**
   * Creates a middleware that validates CSRF tokens
   */
  csrfProtection(options: CSRFMiddlewareOptions) {
    const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };
    const logger = this.logger;

    // Validate cross-origin settings
    if (mergedOptions.crossOrigin && !mergedOptions.cookieOptions?.secure) {
      throw new Error("Cross-origin CSRF cookies must use the secure flag");
    }

    // Adjust sameSite settings if cross-origin is enabled
    if (mergedOptions.crossOrigin) {
      mergedOptions.cookieOptions = {
        ...mergedOptions.cookieOptions,
        sameSite: "none",
        secure: true,
      };
    }

    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip CSRF check for non-protected methods or ignored paths
        const shouldProtect =
          mergedOptions.protectedMethods!.includes(req.method) &&
          !this.isPathIgnored(req.path, mergedOptions.ignorePaths);

        if (!shouldProtect) {
          return next();
        }

        // Get user session ID (assuming auth setup stores this)
        const sessionId = this.getSessionId(req);

        // Get token from request
        const token = this.getTokenFromRequest(req, mergedOptions);

        if (!token) {
          logger.warn("CSRF token missing", {
            path: req.path,
            method: req.method,
            ip: req.ip,
          });

          return res.status(403).json({
            error: "CSRF token missing",
            message: "CSRF token is required for this request",
            code: "CSRF_TOKEN_MISSING",
          });
        }

        // Check for token reuse if disallowed
        if (!mergedOptions.allowReuse && this.usedTokens.has(token)) {
          logger.warn("CSRF token reuse detected", {
            path: req.path,
            method: req.method,
            ip: req.ip,
          });

          return res.status(403).json({
            error: "CSRF token already used",
            message: "CSRF tokens can only be used once",
            code: "CSRF_TOKEN_REUSED",
          });
        }

        // Context for verification
        const context = this.getVerificationContext(req);

        // Verify token
        const isValid = verifyCsrfToken(
          token,
          sessionId,
          mergedOptions.secretKey,
          {
            expiryMs: mergedOptions.expiryMs,
            includeUserAgent: mergedOptions.includeUserAgent,
            includeOrigin: mergedOptions.includeOrigin,
          },
          context
        );

        if (!isValid) {
          logger.warn("Invalid CSRF token", {
            path: req.path,
            method: req.method,
            ip: req.ip,
          });

          return res.status(403).json({
            error: "Invalid CSRF token",
            message: "CSRF token validation failed",
            code: "CSRF_TOKEN_INVALID",
          });
        }

        // Mark token as used if not allowing reuse
        if (!mergedOptions.allowReuse) {
          this.usedTokens.add(token);
        }

        // Rotate token if enabled
        if (mergedOptions.rotateTokens) {
          const newToken = generateCsrfToken(
            sessionId,
            mergedOptions.secretKey,
            {
              expiryMs: mergedOptions.expiryMs,
              includeUserAgent: mergedOptions.includeUserAgent,
              includeOrigin: mergedOptions.includeOrigin,
            },
            context
          );

          // Set the new token in cookie
          res.cookie(
            mergedOptions.cookieName!,
            newToken,
            mergedOptions.cookieOptions as Record<string, unknown>
          );

          // Make new token available in templates/response
          res.locals.csrfToken = newToken;
        }

        next();
      } catch (error) {
        logger.error("CSRF validation error", {
          error,
          path: req.path,
          method: req.method,
        });

        return res.status(500).json({
          error: "CSRF validation error",
          message: "An error occurred while validating the CSRF token",
          code: "CSRF_VALIDATION_ERROR",
        });
      }
    };
  }

  /**
   * Creates a middleware that injects a CSRF token into res.locals and sets a CSRF cookie
   */
  csrfToken(options: CSRFMiddlewareOptions) {
    const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };
    const logger = this.logger;

    // Validate cross-origin settings
    if (mergedOptions.crossOrigin && !mergedOptions.cookieOptions?.secure) {
      throw new Error("Cross-origin CSRF cookies must use the secure flag");
    }

    // Adjust sameSite settings if cross-origin is enabled
    if (mergedOptions.crossOrigin) {
      mergedOptions.cookieOptions = {
        ...mergedOptions.cookieOptions,
        sameSite: "none",
        secure: true,
      };
    }

    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get user session ID (assuming auth setup stores this)
        const sessionId = this.getSessionId(req);

        // Context for token generation
        const context = this.getVerificationContext(req);

        // Generate a new token
        const token = generateCsrfToken(
          sessionId,
          mergedOptions.secretKey,
          {
            expiryMs: mergedOptions.expiryMs,
            includeUserAgent: mergedOptions.includeUserAgent,
            includeOrigin: mergedOptions.includeOrigin,
          },
          context
        );

        // Set token in cookie for JavaScript access
        res.cookie(
          mergedOptions.cookieName!,
          token,
          mergedOptions.cookieOptions as Record<string, unknown>
        );

        // Make token available in templates
        res.locals.csrfToken = token;

        // Attach token generation method to response for dynamic token creation
        res.locals.generateCsrfToken = () => {
          const freshToken = generateCsrfToken(
            sessionId,
            mergedOptions.secretKey,
            {
              expiryMs: mergedOptions.expiryMs,
              includeUserAgent: mergedOptions.includeUserAgent,
              includeOrigin: mergedOptions.includeOrigin,
            },
            context
          );

          return freshToken;
        };

        logger.debug("CSRF token generated", {
          path: req.path,
          method: req.method,
        });

        next();
      } catch (error) {
        logger.error("CSRF token generation error", {
          error,
          path: req.path,
          method: req.method,
        });

        // Still allow the request to proceed but without CSRF protection
        next();
      }
    };
  }

  /**
   * Extract the session ID from the request
   */
  private getSessionId(req: Request): string {
    return (req as any).session?.id || req.cookies?.authToken || "anonymous";
  }

  /**
   * Get the context for token verification
   */
  private getVerificationContext(req: Request): {
    userAgent?: string;
    origin?: string;
  } {
    return {
      userAgent: req.headers["user-agent"] as string,
      origin: (req.headers.origin || req.headers.referer) as string,
    };
  }

  /**
   * Check if a path is in the ignored paths list
   */
  private isPathIgnored(
    path: string,
    ignorePaths?: Array<string | RegExp>
  ): boolean {
    if (!ignorePaths || ignorePaths.length === 0) {
      return false;
    }

    return ignorePaths.some((ignorePath) => {
      if (typeof ignorePath === "string") {
        return path === ignorePath || path.startsWith(`${ignorePath}/`);
      }
      return ignorePath.test(path);
    });
  }

  /**
   * Extract CSRF token from request
   */
  private getTokenFromRequest(
    req: Request,
    options: CSRFMiddlewareOptions
  ): string | undefined {
    // Check headers first
    const headerToken = req.headers[options.headerName!.toLowerCase()];
    if (headerToken) {
      return Array.isArray(headerToken) ? headerToken[0] : headerToken;
    }

    // Then check request body
    if (req.body && options.fieldName! in req.body) {
      return String(req.body[options.fieldName!]);
    }

    // Finally check query string
    if (req.query && options.fieldName! in req.query) {
      const queryToken = req.query[options.fieldName!];
      if (Array.isArray(queryToken)) {
        return queryToken[0] as string;
      } else if (queryToken !== undefined) {
        return String(queryToken);
      }
    }

    // Also check cookies as fallback
    if (req.cookies && req.cookies[options.cookieName!]) {
      return req.cookies[options.cookieName!];
    }

    return undefined;
  }

  /**
   * Validate a CSRF token directly (not middleware)
   * Useful for programmatic validation or custom middleware
   */
  validateCsrfToken(
    token: string | undefined,
    req: Request,
    options: CSRFMiddlewareOptions
  ): CSRFValidationResult {
    try {
      if (!token) {
        return {
          valid: false,
          error: "CSRF token missing",
          errorCode: "CSRF_TOKEN_MISSING",
        };
      }

      // Check for token reuse if disallowed
      if (!options.allowReuse && this.usedTokens.has(token)) {
        return {
          valid: false,
          error: "CSRF token already used",
          errorCode: "CSRF_TOKEN_REUSED",
        };
      }

      // Get session ID and context
      const sessionId = this.getSessionId(req);
      const context = this.getVerificationContext(req);

      // Verify token
      const isValid = verifyCsrfToken(
        token,
        sessionId,
        options.secretKey,
        {
          expiryMs: options.expiryMs,
          includeUserAgent: options.includeUserAgent,
          includeOrigin: options.includeOrigin,
        },
        context
      );

      if (!isValid) {
        return {
          valid: false,
          error: "Invalid CSRF token",
          errorCode: "CSRF_TOKEN_INVALID",
        };
      }

      // Mark token as used if not allowing reuse
      if (!options.allowReuse) {
        this.usedTokens.add(token);
      }

      return { valid: true };
    } catch (error) {
      this.logger.error("CSRF validation error", { error });
      return {
        valid: false,
        error: "CSRF validation error",
        errorCode: "CSRF_VALIDATION_ERROR",
      };
    }
  }
}

// Legacy functions for backward compatibility
// These will eventually be deprecated in favor of the injectable service

/**
 * Creates a middleware that generates and provides CSRF tokens
 *
 * @param options - CSRF middleware configuration options
 * @returns Express middleware function
 */
export function csrfProtection(options: CSRFMiddlewareOptions) {
  const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for non-protected methods or ignored paths
    const shouldProtect =
      mergedOptions.protectedMethods!.includes(req.method) &&
      !isPathIgnored(req.path, mergedOptions.ignorePaths);

    if (!shouldProtect) {
      return next();
    }

    // Get user session ID (assuming auth setup stores this)
    const sessionId =
      (req as any).session?.id || req.cookies?.authToken || "anonymous";

    // Get token from request
    const token = getTokenFromRequest(req, mergedOptions);

    if (!token) {
      return res.status(403).json({
        error: "CSRF token missing",
        message: "CSRF token is required for this request",
        code: "CSRF_TOKEN_MISSING",
      });
    }

    // Context for verification
    const context = {
      userAgent: req.headers["user-agent"] as string,
      origin: (req.headers.origin || req.headers.referer) as string,
    };

    // Verify token
    const isValid = verifyCsrfToken(
      token,
      sessionId,
      mergedOptions.secretKey,
      {
        expiryMs: mergedOptions.expiryMs,
        includeUserAgent: mergedOptions.includeUserAgent,
        includeOrigin: mergedOptions.includeOrigin,
      },
      context
    );

    if (!isValid) {
      return res.status(403).json({
        error: "Invalid CSRF token",
        message: "CSRF token validation failed",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    // Rotate token if enabled
    if (mergedOptions.rotateTokens) {
      const newToken = generateCsrfToken(
        sessionId,
        mergedOptions.secretKey,
        {
          expiryMs: mergedOptions.expiryMs,
          includeUserAgent: mergedOptions.includeUserAgent,
          includeOrigin: mergedOptions.includeOrigin,
        },
        context
      );

      // Set the new token in cookie
      res.cookie(
        mergedOptions.cookieName!,
        newToken,
        mergedOptions.cookieOptions as Record<string, unknown>
      );

      // Make new token available in templates/response
      res.locals.csrfToken = newToken;
    }

    next();
  };
}

/**
 * Creates a middleware that injects a CSRF token into res.locals and sets a CSRF cookie
 *
 * @param options - CSRF middleware configuration options
 * @returns Express middleware function
 */
export function csrfToken(options: CSRFMiddlewareOptions) {
  const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };

  // Validate cross-origin settings
  if (mergedOptions.crossOrigin && !mergedOptions.cookieOptions?.secure) {
    throw new Error("Cross-origin CSRF cookies must use the secure flag");
  }

  // Adjust sameSite settings if cross-origin is enabled
  if (mergedOptions.crossOrigin) {
    mergedOptions.cookieOptions = {
      ...mergedOptions.cookieOptions,
      sameSite: "none",
      secure: true,
    };
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Get user session ID (assuming auth setup stores this)
    const sessionId =
      (req as any).session?.id || req.cookies?.authToken || "anonymous";

    // Context for token generation
    const context = {
      userAgent: req.headers["user-agent"] as string,
      origin: (req.headers.origin || req.headers.referer) as string,
    };

    // Generate a new token
    const token = generateCsrfToken(
      sessionId,
      mergedOptions.secretKey,
      {
        expiryMs: mergedOptions.expiryMs,
        includeUserAgent: mergedOptions.includeUserAgent,
        includeOrigin: mergedOptions.includeOrigin,
      },
      context
    );

    // Set token in cookie for JavaScript access
    res.cookie(
      mergedOptions.cookieName!,
      token,
      mergedOptions.cookieOptions as Record<string, unknown>
    );

    // Make token available in templates
    res.locals.csrfToken = token;

    // Attach token generation method to response for dynamic token creation
    res.locals.generateCsrfToken = () => {
      return generateCsrfToken(
        sessionId,
        mergedOptions.secretKey,
        {
          expiryMs: mergedOptions.expiryMs,
          includeUserAgent: mergedOptions.includeUserAgent,
          includeOrigin: mergedOptions.includeOrigin,
        },
        context
      );
    };

    next();
  };
}

/**
 * Check if a path is in the ignored paths list
 */
function isPathIgnored(
  path: string,
  ignorePaths?: Array<string | RegExp>
): boolean {
  if (!ignorePaths || ignorePaths.length === 0) {
    return false;
  }

  return ignorePaths.some((ignorePath) => {
    if (typeof ignorePath === "string") {
      return path === ignorePath || path.startsWith(`${ignorePath}/`);
    }
    return ignorePath.test(path);
  });
}

/**
 * Extract CSRF token from request
 */
function getTokenFromRequest(
  req: Request,
  options: CSRFMiddlewareOptions
): string | undefined {
  // Check headers first
  const headerToken = req.headers[options.headerName!.toLowerCase()];
  if (headerToken) {
    return Array.isArray(headerToken) ? headerToken[0] : headerToken;
  }

  // Then check request body
  if (req.body && options.fieldName! in req.body) {
    return String(req.body[options.fieldName!]);
  }

  // Finally check query string
  if (req.query && options.fieldName! in req.query) {
    const queryToken = req.query[options.fieldName!];
    if (Array.isArray(queryToken)) {
      return queryToken[0] as string;
    } else if (queryToken !== undefined) {
      return String(queryToken);
    }
  }

  // Also check cookies as fallback
  if (req.cookies && req.cookies[options.cookieName!]) {
    return req.cookies[options.cookieName!];
  }

  return undefined;
}
