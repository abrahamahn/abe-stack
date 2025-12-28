import path from "path";
import "reflect-metadata";
import { container } from "./infrastructure/di";
import { ServerManager } from "./infrastructure/server";
import TYPES from "./infrastructure/di/types";
import { ILoggerService } from "./infrastructure/logging";
import { ConfigService } from "./infrastructure/config";

export async function initializeServer() {
  try {
    console.log("Starting server initialization...");

    // Get the existing container
    if (!container) {
      throw new Error("DI container not initialized");
    }
    console.log("Container loaded");

    // Initialize logger first
    const logger = container.get<ILoggerService>(TYPES.LoggerService);
    console.log("Logger service initialized");
    logger.info("Logger service initialized successfully");

    // Get config from container
    const configService = container.get<ConfigService>(TYPES.ConfigService);
    const config = {
      port: configService.getNumber("PORT") || 8080,
      host: configService.getString("HOST") || "localhost",
      isProduction: process.env.NODE_ENV === "production",
      storagePath: path.resolve(
        process.cwd(),
        configService.getString("STORAGE_PATH") || "uploads",
      ),
    };

    // Create and initialize server manager
    const serverManager = new ServerManager(logger, container);

    // Register shutdown handlers
    serverManager.setupGracefulShutdown();

    // Initialize the server
    await serverManager.initialize(config);

    logger.info("Server initialization completed successfully");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
initializeServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
