/**
 * Authentication Module
 *
 * This module provides a secure cookie-based authentication system with:
 * - User registration and login
 * - Session management
 * - Email verification
 * - Multi-factor authentication (MFA)
 * - Password management (reset, change)
 */

// Export the auth service for direct use
export { AuthService } from "./features/core/providers/auth.service";
export { TokenService } from "./features/token/providers/token.service";
export { PasswordService } from "./features/password/providers/password.service";
export { MfaService } from "./features/mfa/providers/mfa.service";

// Export middleware factories
export { authenticate } from "./middleware/authenticate.middleware";
export { csrfProtection } from "./middleware/csrf.middleware";

// Export DI module setup function
export { registerAuthModule } from "./api/di/module";

// Export controllers
export { AuthController } from "./api/controllers/auth.controller";

// Export types for public use
export type { AuthResult } from "./features/core/types";

/**
 * Authentication Facade
 *
 * Provides a simplified interface to the auth module for common operations
 */
export class Auth {
  /**
   * Check if a request is authenticated
   */
  static isAuthenticated(req: any): boolean {
    return !!req.user;
  }

  /**
   * Get the authenticated user from a request
   */
  static getUser(req: any): any {
    return req.user;
  }

  /**
   * Get the session ID from a request
   */
  static getSessionId(req: any): string | undefined {
    return req.sessionId;
  }

  /**
   * Get a user's roles
   */
  static getUserRoles(req: any): string[] {
    return req.user?.roles || [];
  }

  /**
   * Check if a user has a specific role
   */
  static hasRole(req: any, role: string): boolean {
    return req.user?.roles?.includes(role) || false;
  }

  /**
   * Check if a user has any of the specified roles
   */
  static hasAnyRole(req: any, roles: string[]): boolean {
    return req.user?.roles?.some((r: string) => roles.includes(r)) || false;
  }
}
