/**
 * Authentication middleware
 */
import { Request, Response, NextFunction } from "express";

import { ServerEnvironment } from "@/server/infrastructure/config/ConfigService";

import { verifyAccessToken } from "../features/token/token.utils";

// Re-export role-based access control middleware
export * from "./rbac.middleware";

// Re-export WebSocket authentication middleware
export * from "./ws-authentication.middleware";

// Export middleware factories
export { authenticate, type AuthOptions } from "./authenticate.middleware";
export { csrfProtection, type CsrfOptions } from "./csrf.middleware";

/**
 * Middleware that authenticates requests using JWT
 */
export function authenticate(
  options: {
    optional?: boolean;
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization;

      // If no auth header and auth is required, return 401
      if (!authHeader) {
        if (!options.optional) {
          return res.status(401).json({
            error: "Authentication required",
          });
        } else {
          return next();
        }
      }

      // Extract token
      const [scheme, token] = authHeader.split(" ");

      // Check if it's a Bearer token
      if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
          error: "Invalid authentication scheme",
        });
      }

      // Verify token
      const env = req.app.locals.env as ServerEnvironment;
      const tokenResult = await verifyAccessToken(env, token);

      if (!tokenResult.valid) {
        return res.status(401).json({
          error: tokenResult.error || "Invalid token",
        });
      }

      // Attach user to request
      req.user = {
        id: tokenResult.payload!.userId,
        roles: tokenResult.payload!.roles || [],
        ...tokenResult.payload,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware that attaches user to request if token is valid
 */
export function attachUserToRequest() {
  return authenticate({ optional: true });
}

/**
 * Middleware that requires specific roles
 */
export function requireRoles(roles: string[]) {
  const { authenticate } = require("./authenticate.middleware");
  return authenticate({ roles });
}

// Add type definition for req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: string[];
        [key: string]: any;
      };
    }
  }
}
