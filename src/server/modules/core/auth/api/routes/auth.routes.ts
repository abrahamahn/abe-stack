import { Router } from "express";
import { Container } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { rateLimitMiddleware } from "@/server/infrastructure/security/rateLimitMiddleware";

import { AuthController } from "../controllers/auth.controller";


/**
 * Create auth routes for the application
 */
export const createAuthRoutes = (container: Container): Router => {
  const router = Router();
  const logger = container.get<ILoggerService>(TYPES.LoggerService);
  const authController = container.get<AuthController>(TYPES.AuthController);

  try {
    // Login endpoint
    router.post(
      "/login",
      rateLimitMiddleware("login"),
      authController.login.bind(authController)
    );

    // Register endpoint
    router.post(
      "/register",
      rateLimitMiddleware("register"),
      authController.register.bind(authController)
    );

    // Logout endpoint
    router.post("/logout", authController.logout.bind(authController));

    // Token endpoints
    router.post(
      "/refresh-token",
      authController.refreshToken.bind(authController)
    );

    // MFA endpoints
    router.post("/mfa/setup", authController.setupMfa.bind(authController));
    router.post("/mfa/verify", authController.verifyMfa.bind(authController));

    // Password reset endpoints
    router.post(
      "/password/forgot",
      rateLimitMiddleware("passwordReset"),
      authController.forgotPassword.bind(authController)
    );
    router.post(
      "/password/reset",
      authController.resetPassword.bind(authController)
    );

    // Email verification
    router.get(
      "/verify-email",
      rateLimitMiddleware("emailVerification"),
      authController.verifyEmail.bind(authController)
    );

    // Resend verification email
    router.post(
      "/resend-verification",
      rateLimitMiddleware("emailVerification"),
      authController.resendVerificationEmail.bind(authController)
    );

    // Alias for frontend compatibility
    router.post(
      "/resend-confirmation",
      rateLimitMiddleware("emailVerification"),
      authController.resendVerificationEmail.bind(authController)
    );

    // Test endpoint for diagnosing database issues
    router.post(
      "/test-findbyemail",
      authController.testFindByEmail.bind(authController)
    );

    // Test endpoint for diagnosing service dependencies
    router.get(
      "/test-services",
      authController.test.bind(authController)
    );

    // Get current user (protected route)
    router.get("/me", (_req, res) => {
      // This would normally be protected by an auth middleware
      // For now, just return an error or mock user
      res.status(401).json({ error: "Not implemented yet" });
    });

    logger.info("Auth routes created");
    return router;
  } catch (error) {
    logger.error("Failed to create auth routes", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
