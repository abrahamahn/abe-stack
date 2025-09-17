/**
 * WebSocket Authentication Service
 *
 * This service handles authentication for WebSocket connections using
 * the dependency injection pattern with proper error handling and logging.
 */

import { IncomingMessage } from "http";
import { parse as parseUrl } from "url";

import { parse as parseCookies } from "cookie";
import { inject, injectable } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import { TokenManager, TokenPayload } from "./TokenManager";

/**
 * WebSocket authentication result
 */
export interface WebSocketAuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** User ID if authenticated */
  userId?: string;
  /** User roles if authenticated */
  roles?: string[];
  /** Error message if authentication failed */
  error?: string;
  /** Full token payload if authenticated */
  payload?: TokenPayload;
  /** IP address of the connection */
  ip?: string;
  /** Additional metadata about the connection */
  metadata?: Record<string, any>;
}

/**
 * Connection attempt tracking for rate limiting
 */
interface ConnectionAttempt {
  timestamp: number;
  ip: string;
  success: boolean;
}

/**
 * WebSocket authentication service
 */
@injectable()
export class WebSocketAuthService {
  private connectionAttempts: ConnectionAttempt[] = [];
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(TYPES.TokenManager) private tokenManager: TokenManager,
    @inject(TYPES.SecurityLogger) private logger: ILoggerService
  ) {}

  /**
   * Authenticate a WebSocket connection request
   * @param request The HTTP upgrade request for the WebSocket connection
   * @returns Authentication result
   */
  async authenticateConnection(
    request: IncomingMessage
  ): Promise<WebSocketAuthResult> {
    const ip = this.getClientIp(request);
    const metadata: Record<string, any> = { ip };

    try {
      // Check for rate limiting
      if (this.isRateLimited(ip)) {
        this.logger.warn("Rate limited WebSocket connection attempt", { ip });
        return {
          authenticated: false,
          error: "Too many failed connection attempts. Please try again later.",
          ip,
          metadata,
        };
      }

      // Get token from query string or cookies
      const token = this.extractToken(request);

      if (!token) {
        this.trackConnectionAttempt(ip, false);
        return {
          authenticated: false,
          error: "No authentication token provided",
          ip,
          metadata,
        };
      }

      // Verify the token
      const verificationResult =
        await this.tokenManager.verifyAccessToken(token);

      if (!verificationResult.valid || !verificationResult.payload) {
        this.trackConnectionAttempt(ip, false);
        this.logger.warn("Invalid token for WebSocket connection", {
          ip,
          error: verificationResult.error,
        });

        return {
          authenticated: false,
          error: verificationResult.error || "Invalid authentication token",
          ip,
          metadata,
        };
      }

      // Successfully authenticated
      const payload = verificationResult.payload;
      this.trackConnectionAttempt(ip, true);

      // Add connection metadata
      metadata.userAgent = request.headers["user-agent"];
      metadata.origin = request.headers.origin;
      metadata.referer = request.headers.referer;

      this.logger.debug("WebSocket connection authenticated", {
        userId: payload.userId,
        ip,
        metadata,
      });

      return {
        authenticated: true,
        userId: payload.userId,
        roles: payload.roles || [],
        payload,
        ip,
        metadata,
      };
    } catch (error) {
      this.trackConnectionAttempt(ip, false);
      this.logger.error("WebSocket authentication error", {
        ip,
        error,
        metadata,
      });

      return {
        authenticated: false,
        error: "Authentication error",
        ip,
        metadata,
      };
    }
  }

  /**
   * Extract token from request (query string or cookies)
   * @param request HTTP request
   * @returns Token string or null if not found
   */
  private extractToken(request: IncomingMessage): string | null {
    try {
      // Try to get token from query string
      if (request.url) {
        const parsedUrl = parseUrl(request.url, true);
        const token = parsedUrl.query.token;

        if (token && typeof token === "string") {
          return token;
        }
      }

      // Try to get token from cookies
      const cookieHeader = request.headers.cookie;

      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);

        // Check for token in various cookie names
        const tokenCookieName = [
          "access_token",
          "accessToken",
          "auth_token",
          "authToken",
          "token",
        ].find((name) => cookies[name]);

        if (tokenCookieName) {
          return cookies[tokenCookieName];
        }
      }

      // Try to get token from Authorization header
      const authHeader = request.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
      }

      return null;
    } catch (error) {
      this.logger.error("Error extracting WebSocket auth token", { error });
      return null;
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: IncomingMessage): string {
    const forwardedFor = request.headers["x-forwarded-for"];

    if (forwardedFor && typeof forwardedFor === "string") {
      // Get the first IP in X-Forwarded-For header
      return forwardedFor.split(",")[0].trim();
    }

    return request.socket.remoteAddress || "0.0.0.0";
  }

  /**
   * Track connection attempt for rate limiting
   */
  private trackConnectionAttempt(ip: string, success: boolean): void {
    const now = Date.now();

    // Cleanup old attempts
    this.connectionAttempts = this.connectionAttempts.filter(
      (attempt) => now - attempt.timestamp < this.ATTEMPT_WINDOW_MS
    );

    // Add new attempt
    this.connectionAttempts.push({
      timestamp: now,
      ip,
      success,
    });
  }

  /**
   * Check if an IP is rate limited due to too many failed attempts
   */
  private isRateLimited(ip: string): boolean {
    const now = Date.now();
    const recentFailures = this.connectionAttempts.filter(
      (attempt) =>
        attempt.ip === ip &&
        !attempt.success &&
        now - attempt.timestamp < this.ATTEMPT_WINDOW_MS
    );

    return recentFailures.length >= this.MAX_FAILED_ATTEMPTS;
  }

  /**
   * Validate user permissions for specific WebSocket actions
   * @param userId User ID
   * @param requiredPermissions Required permissions
   * @returns Whether the user has the required permissions
   */
  async validatePermissions(
    userId: string,
    requiredPermissions: string[]
  ): Promise<boolean> {
    try {
      // Log the permission check attempt
      this.logger.debug("Checking WebSocket permissions", {
        userId,
        requiredPermissions,
      });

      // In a real implementation, we would check against a permission database
      // or call an authorization service. Below is a placeholder implementation.

      if (!userId || !requiredPermissions || requiredPermissions.length === 0) {
        return false;
      }

      // Get user roles from database or cached source
      // This is a placeholder - in a real app, you would fetch this data
      const userRoles = await this.getUserRoles(userId);

      // Check for required permissions based on roles
      const hasAllPermissions = requiredPermissions.every((permission) =>
        this.checkPermissionForRoles(permission, userRoles)
      );

      return hasAllPermissions;
    } catch (error) {
      this.logger.error("Error validating WebSocket permissions", {
        userId,
        requiredPermissions,
        error,
      });

      // Default to denying access on error
      return false;
    }
  }

  /**
   * Get user roles - placeholder implementation
   * In a real application, this would query a database or external service
   */
  private async getUserRoles(_userId: string): Promise<string[]> {
    // This is a placeholder
    // In a real application, you would fetch roles from a database
    return ["user"];
  }

  /**
   * Check if a set of roles has a specific permission
   */
  private checkPermissionForRoles(
    permission: string,
    roles: string[]
  ): boolean {
    // This is a simplified permission check
    // In a real application, you would have a more complex permission system

    // Admin role has all permissions
    if (roles.includes("admin")) {
      return true;
    }

    // Example of role-based permissions
    const rolePermissions: Record<string, string[]> = {
      user: ["read", "write"],
      moderator: ["read", "write", "moderate"],
      editor: ["read", "write", "publish"],
    };

    // Check if any of the user's roles grants the required permission
    return roles.some((role) => {
      const permissions = rolePermissions[role] || [];
      return permissions.includes(permission);
    });
  }
}
