import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import * as jwt from "jsonwebtoken";

import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Authentication middleware options
 */
export interface AuthOptions {
  /** Require specific roles */
  roles?: string[];
  /** Skip auth for specific paths (regex or string) */
  skipPaths?: (string | RegExp)[];
  /** Redirect on auth failure instead of 401 */
  redirect?: string;
}

/**
 * Middleware factory for authentication
 */
export function authenticate(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip authentication for specified paths
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

      // Get session cookie
      const sessionCookie = req.cookies.session;
      if (!sessionCookie) {
        if (options.redirect) {
          return res.redirect(options.redirect);
        }
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify session token
      let decoded;
      try {
        decoded = jwt.verify(
          sessionCookie,
          process.env.COOKIE_SECRET || "default-secret-change-me"
        ) as { userId: string; sessionId: string };
      } catch (err) {
        // Clear invalid cookies
        res.clearCookie("session", { path: "/" });
        res.clearCookie("csrf", { path: "/" });

        if (options.redirect) {
          return res.redirect(options.redirect);
        }
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      // Get all required services - via singleton container to avoid circular deps
      const container = globalThis.__container__;
      const userRepository = container.get(TYPES.UserRepository);
      const sessionService = container.get(TYPES.SessionService);

      // Verify session is valid in database
      const session = await sessionService.getSession(decoded.sessionId);
      if (!session || session.userId !== decoded.userId || !session.isActive) {
        res.clearCookie("session", { path: "/" });
        res.clearCookie("csrf", { path: "/" });

        if (options.redirect) {
          return res.redirect(options.redirect);
        }
        return res.status(401).json({ error: "Session not found or expired" });
      }

      // Get user
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        res.clearCookie("session", { path: "/" });
        res.clearCookie("csrf", { path: "/" });

        if (options.redirect) {
          return res.redirect(options.redirect);
        }
        return res.status(401).json({ error: "User not found" });
      }

      // Check required roles if specified
      if (options.roles && options.roles.length > 0) {
        const userRoles = user.roles || [];
        const hasRequiredRole = options.roles.some((role) =>
          userRoles.includes(role)
        );

        if (!hasRequiredRole) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      // Update session last activity
      await sessionService.updateLastActive(decoded.sessionId);

      // Attach user to request
      req.user = user;
      req.sessionId = decoded.sessionId;

      next();
    } catch (error) {
      next(error);
    }
  };
}
