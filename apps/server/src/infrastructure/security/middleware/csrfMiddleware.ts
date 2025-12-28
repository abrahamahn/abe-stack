import { Request, Response, NextFunction } from "express";

import {
  generateCsrfToken,
  verifyCsrfToken,
} from "../securityHelpers";

// Extend the Express Request type to include session
declare module "express" {
  interface Request {
    session?: {
      id: string;
      [key: string]: unknown;
    };
  }
}

/**
 * Configuration options for CSRF middleware
 */
export interface CsrfMiddlewareOptions {
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

  /** Token expiry time in milliseconds */
  expiryMs?: number;

  /** Include user agent in token generation */
  includeUserAgent?: boolean;

  /** Include origin in token generation */
  includeOrigin?: boolean;

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
}

/**
 * Default options for CSRF middleware
 */
export const DEFAULT_CSRF_MIDDLEWARE_OPTIONS: Omit<
  CsrfMiddlewareOptions,
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
};

/**
 * Creates a middleware that generates and provides CSRF tokens
 *
 * @param options - CSRF middleware configuration options
 * @returns Express middleware function
 */
export function csrfProtection(options: CsrfMiddlewareOptions) {
  const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for non-protected methods or ignored paths
    const shouldProtect =
      mergedOptions.protectedMethods!.includes(req.method) &&
      !isPathIgnored(req.path, mergedOptions.ignorePaths);

    if (!shouldProtect) {
      return next();
    }

    // Get token from request
    const token = getTokenFromRequest(req, mergedOptions);

    if (!token) {
      return res.status(403).json({
        error: "CSRF token missing",
        message: "CSRF token is required for this request",
      });
    }

    // Verify token
    const isValid = verifyCsrfToken({
      token,
      secretKey: mergedOptions.secretKey,
      includeUserAgent: mergedOptions.includeUserAgent,
      includeOrigin: mergedOptions.includeOrigin,
    });

    if (!isValid) {
      return res.status(403).json({
        error: "Invalid CSRF token",
        message: "CSRF token validation failed",
      });
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
export function csrfToken(options: CsrfMiddlewareOptions) {
  const mergedOptions = { ...DEFAULT_CSRF_MIDDLEWARE_OPTIONS, ...options };

  return (res: Response, next: NextFunction) => {
    // Generate a new token
    const token = generateCsrfToken({
      secretKey: mergedOptions.secretKey,
      expiryMs: mergedOptions.expiryMs,
      includeUserAgent: mergedOptions.includeUserAgent,
      includeOrigin: mergedOptions.includeOrigin,
    });

    // Set token in cookie for JavaScript access
    res.cookie(
      mergedOptions.cookieName!,
      token,
      mergedOptions.cookieOptions as Record<string, unknown>,
    );

    // Make token available in templates
    res.locals.csrfToken = token;

    // Attach token generation method to response for dynamic token creation
    res.locals.generateCsrfToken = () => {
      return generateCsrfToken({
        secretKey: mergedOptions.secretKey,
        expiryMs: mergedOptions.expiryMs,
        includeUserAgent: mergedOptions.includeUserAgent,
        includeOrigin: mergedOptions.includeOrigin,
      });
    };

    next();
  };
}

/**
 * Gets CSRF token from request (checking headers, body, and query parameters)
 */
function getTokenFromRequest(
  req: Request,
  options: CsrfMiddlewareOptions,
): string | undefined {
  return (
    // Check for token in headers
    (req.headers[options.headerName!.toLowerCase()] as string) ||
    // Check for token in body
    (req.body && req.body[options.fieldName!]) ||
    // Check for token in query params
    (req.query[options.fieldName!] as string) ||
    // Check for token in cookies
    req.cookies[options.cookieName!]
  );
}

/**
 * Checks if a path should be ignored for CSRF protection
 */
function isPathIgnored(
  path: string,
  ignorePaths?: Array<string | RegExp>,
): boolean {
  if (!ignorePaths || ignorePaths.length === 0) {
    return false;
  }

  return ignorePaths.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }
    return path === pattern || path.startsWith(`${pattern}/`);
  });
}