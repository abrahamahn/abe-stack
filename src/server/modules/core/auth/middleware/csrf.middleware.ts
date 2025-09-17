import { Request, Response, NextFunction } from "express";

/**
 * CSRF Protection middleware options
 */
export interface CsrfOptions {
  /** Methods to skip CSRF check for (defaults to GET, HEAD, OPTIONS) */
  skipMethods?: string[];
  /** Custom header name (defaults to X-CSRF-Token) */
  headerName?: string;
  /** Skip CSRF check for specific paths */
  skipPaths?: (string | RegExp)[];
}

/**
 * CSRF protection middleware factory
 */
export function csrfProtection(options: CsrfOptions = {}) {
  // Default options
  const skipMethods = options.skipMethods || ["GET", "HEAD", "OPTIONS"];
  const headerName = options.headerName || "x-csrf-token";

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip for certain HTTP methods
      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Skip for specified paths
      if (options.skipPaths) {
        const currentPath = req.path;
        for (const path of options.skipPaths) {
          if (typeof path === "string" && path === currentPath) {
            return next();
          } else if (path instanceof RegExp && path.test(currentPath)) {
            return next();
          }
        }
      }

      // Get CSRF token from request header and cookie
      const csrfHeader = req.headers[headerName.toLowerCase()];
      const csrfCookie = req.cookies.csrf;

      // Validate CSRF token
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ error: "CSRF token validation failed" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
