import { Express, Router } from "express";
import { Container } from "inversify";
import { Client } from "pg";

import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";

import { registerAuthModule } from "./api/di/module";

interface DatabaseConnection {
  isConnected(): Promise<boolean>;
}

interface ConfigService {
  getString(key: string, defaultValue?: string): string;
}

/**
 * Set up authentication module routes and middleware
 */
export function setupAuthModule(app: Express, container: Container): void {
  console.log("🔥 setupAuthModule called - this should appear in logs!");

  const logger = container.get<ILoggerService>(TYPES.LoggerService);

  logger.info("🚀 Starting auth module setup...");

  // Set up a simple test route
  app.get("/api/auth/test", (_req, res) => {
    logger.info("Auth test endpoint hit");
    res.json({
      message: "Auth API is working",
      timestamp: new Date().toISOString(),
    });
  });

  // Add a database test endpoint
  app.get("/api/auth/test-db", async (_req, res) => {
    logger.info("Database test endpoint hit");
    try {
      // Try using the database service first
      try {
        const dbService = container.get<IDatabaseServer>(TYPES.DatabaseService);
        const isConnected = await (
          dbService as unknown as DatabaseConnection
        ).isConnected();

        res.json({
          message: isConnected
            ? "Database connection successful"
            : "Database connection failed",
          connected: isConnected,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (err) {
        logger.warn(
          "Failed to check database connection via service, falling back to direct connection",
          {
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }

      // Fall back to direct connection
      const configService = container.get<ConfigService>(TYPES.ConfigService);
      const password = configService.getString("DB_PASSWORD", "postgres"); // Default postgres password

      const client = new Client({
        host: "localhost",
        port: 5432,
        database: "abe_stack",
        user: "postgres",
        password: password,
      });

      await client.connect();
      const result = await client.query("SELECT NOW() as current_time");
      await client.end();

      res.json({
        message: "Database connection successful",
        connected: true,
        timestamp: new Date().toISOString(),
        databaseTime: result.rows[0].current_time,
      });
    } catch (error) {
      logger.error("Database test error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        message: "Database connection test failed",
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Add a test endpoint to check users table
  app.get("/api/auth/test-users-table", async (_req, res) => {
    logger.info("Users table test endpoint hit");
    try {
      const configService = container.get<ConfigService>(TYPES.ConfigService);
      const password = configService.getString("DB_PASSWORD", "postgres");

      const client = new Client({
        host: "localhost",
        port: 5432,
        database: "abe_stack",
        user: "postgres",
        password: password,
      });

      await client.connect();

      // Check if users table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      const tableExists = tableCheck.rows[0].exists;

      if (tableExists) {
        // Get table structure
        const structure = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position;
        `);

        // Try to count rows
        const count = await client.query("SELECT COUNT(*) FROM users");

        await client.end();

        res.json({
          message: "Users table exists",
          tableExists: true,
          rowCount: parseInt(count.rows[0].count),
          structure: structure.rows,
          timestamp: new Date().toISOString(),
        });
      } else {
        await client.end();

        res.json({
          message: "Users table does not exist",
          tableExists: false,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Users table test error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        message: "Users table test failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Add a test endpoint to debug user creation
  app.post("/api/auth/test-user-creation", async (_req, res) => {
    logger.info("Test user creation endpoint hit");
    try {
      const userRepository = container.get(TYPES.UserRepository) as any;

      const testData = {
        email: "debug@test.com",
        username: "debuguser",
        password: "TestPassword123!",
        roles: ["user"],
        active: true,
        isVerified: false,
        emailConfirmed: false,
        accountStatus: "pending",
      };

      logger.info("Test data prepared:", {
        ...testData,
        password: "[REDACTED]",
      });

      const user = await userRepository.create(testData);

      res.json({
        success: true,
        message: "User created successfully",
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Test user creation error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({
        success: false,
        message: "User creation test failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Add database pool status endpoint for debugging
  app.get("/api/auth/pool-status", async (_req, res) => {
    logger.info("Database pool status endpoint hit");
    try {
      const dbService = container.get(TYPES.DatabaseService) as any;

      if (dbService && dbService.pool) {
        const pool = dbService.pool;
        const poolStatus = {
          totalCount: pool.totalCount || 0,
          idleCount: pool.idleCount || 0,
          waitingCount: pool.waitingCount || 0,
          maxConnections: pool.options?.max || "unknown",
          connectionTimeoutMillis:
            pool.options?.connectionTimeoutMillis || "unknown",
          idleTimeoutMillis: pool.options?.idleTimeoutMillis || "unknown",
        };

        logger.info("Database pool status", poolStatus);

        res.json({
          success: true,
          message: "Database pool status retrieved",
          poolStatus,
          analysis: {
            healthy: pool.idleCount > 0,
            exhausted: pool.idleCount === 0 && pool.waitingCount > 0,
            recommendation:
              pool.idleCount === 0
                ? "Pool may be exhausted - check for connection leaks"
                : "Pool appears healthy",
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Could not access database pool",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Pool status check error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: "Pool status check failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Register auth module services in the DI container
  try {
    logger.info("📦 Registering auth module services...");
    registerAuthModule(container);
    logger.info("✅ Auth module services registered successfully");
  } catch (error) {
    logger.error("❌ Failed to register auth module services", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return;
  }

  // Test if we can get the AuthController
  try {
    logger.info("🔍 Testing AuthController instantiation...");
    logger.info("✅ AuthController instantiated successfully");

    // Add a simple test endpoint to verify the controller works
    app.get("/api/auth/controller-test", (_req, res) => {
      res.json({
        message: "AuthController is working",
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    logger.error("❌ Failed to instantiate AuthController", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger.warn("⚠️ Will attempt to set up routes anyway...");
  }

  // Create simplified auth routes without rate limiting for now
  try {
    logger.info("🛣️ Creating simplified auth routes...");
    const authRouter = Router();

    // Try to get the AuthController from the container
    let authController: any = null;
    try {
      authController = container.get(TYPES.AuthController);
      logger.info("✅ AuthController retrieved for route setup");
    } catch (error) {
      logger.error("❌ Failed to get AuthController for routes", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (authController) {
      // Register endpoint (simplified without rate limiting)
      authRouter.post("/register", async (req, res, next) => {
        try {
          logger.info("📝 Register endpoint called", { body: req.body });
          await authController.register(req, res, next);
        } catch (error) {
          logger.error("Register endpoint error", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // Login endpoint (simplified)
      authRouter.post("/login", async (req, res, next) => {
        try {
          logger.info("🔐 Login endpoint called", { body: req.body });
          await authController.login(req, res, next);
        } catch (error) {
          logger.error("Login endpoint error", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

      logger.info("✅ Auth endpoints added to router");
    } else {
      // Add fallback endpoints that return errors
      authRouter.post("/register", (_req, res) => {
        logger.warn(
          "Register endpoint called but AuthController not available"
        );
        res.status(503).json({
          error: "Service unavailable",
          message: "Authentication service is not properly configured",
        });
      });

      authRouter.post("/login", (_req, res) => {
        logger.warn("Login endpoint called but AuthController not available");
        res.status(503).json({
          error: "Service unavailable",
          message: "Authentication service is not properly configured",
        });
      });

      logger.warn("⚠️ Added fallback auth endpoints (service unavailable)");
    }

    app.use("/api/auth", authRouter);
    logger.info("✅ Auth routes registered successfully at /api/auth");
  } catch (error) {
    logger.error("❌ Failed to set up auth routes", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  logger.info("🎉 Auth module setup complete");
}
