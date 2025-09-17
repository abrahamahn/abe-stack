import { Express } from "express";
import { Container } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { csrfProtection, csrfToken } from "@/server/infrastructure/security";

import { registerAuthModule } from "./di/module";
import { createAuthRoutes } from "./routes";

/**
 * Set up the authentication module in the application
 * @param app Express application
 * @param container DI container
 */
export const setupAuthModule = (app: Express, container: Container): void => {
  // Get logger
  const logger = container.get<ILoggerService>(TYPES.LoggerService);

  try {
    // Register services in the DI container
    registerAuthModule(container);
    logger.info("Auth2 module services registered");

    // Get security configuration
    const apiConfig: any = container.get(TYPES.ApiConfig);
    const config = apiConfig.getConfig();

    // Set up CSRF protection
    app.use(
      csrfToken({
        secretKey: config.signatureSecret,
        cookieName: "csrf-token",
        headerName: "X-CSRF-Token",
        expiryMs: 24 * 60 * 60 * 1000, // 24 hours
      })
    );

    // Add CSRF protection for state-changing operations
    app.use(
      "/api",
      csrfProtection({
        secretKey: config.signatureSecret,
        cookieName: "csrf-token",
        headerName: "X-CSRF-Token",
        ignorePaths: [
          "/api/auth/login",
          "/api/auth/logout",
          "/api/auth/refresh-token",
        ],
      })
    );

    // Create auth routes
    const authRoutes = createAuthRoutes(container);

    // Register auth routes
    app.use("/api/auth", authRoutes);
    logger.info("Auth routes registered at /api/auth");
  } catch (error) {
    logger.error("Failed to set up auth2 module", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
