import fs from "fs";
import path from "path";

import dotenv from "dotenv";

import { ServerEnvironment, ServerConfig } from "./ConfigService";

/**
 * Load environment files in order of priority
 *
 * @throws Error if critical environment variables are missing
 */
export function loadEnvFiles(): void {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Define environment file based on NODE_ENV - use the correct file for each environment
  const envFile = `.env.${nodeEnv}`;

  // Navigate up from apps/server to monorepo root, then to config/env
  const rootDir = path.resolve(__dirname, "../../../../../");
  const envDir = path.join(rootDir, "config", "env");
  const loadedFiles: string[] = [];

  const logWarnings = process.env.LOG_ENV_WARNINGS === "true";

  try {
    // Check in the .env directory first
    const envFilePath = path.join(envDir, envFile);
    if (fs.existsSync(envFilePath)) {
      const result = dotenv.config({ path: envFilePath });
      if (!result.error) {
        loadedFiles.push(`config/.env/${envFile}`);
      }
    }

    // If we didn't find the file and we're in test mode, try the development file as fallback
    if (loadedFiles.length === 0 && nodeEnv === "test") {
      const fallbackPath = path.join(envDir, ".env.development");
      if (fs.existsSync(fallbackPath)) {
        const result = dotenv.config({ path: fallbackPath });
        if (!result.error) {
          console.log(
            "WARNING: Using .env.development as fallback for test environment",
          );
          loadedFiles.push("config/.env/.env.development (fallback)");
        }
      }
    }

    if (loadedFiles.length > 0) {
      console.log(`Loaded environment files: ${loadedFiles.join(", ")}`);
    } else if (logWarnings) {
      console.log(`No environment file ${envFile} found in ${envDir}`);
    }
  } catch (error) {
    console.error("Error loading environment files:", error);
  }
}

// Load environment files on module import
loadEnvFiles();

/**
 * Check if the application is running in development mode
 */
export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || "development") === "development";
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if the application is running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Validates that a server configuration contains all required values
 *
 * @param config Server configuration to validate
 * @returns Array of error messages, empty if valid
 */
function validateServerConfig(config: ServerConfig): string[] {
  const errors: string[] = [];

  // Check that port is a valid number
  if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
    errors.push(
      `Invalid port: ${config.port}. Must be a number between 1-65535.`,
    );
  }

  // Check that baseUrl is valid
  try {
    new URL(config.baseUrl);
  } catch (_e) {
    errors.push(`Invalid baseUrl: ${config.baseUrl}. Must be a valid URL.`);
  }

  // Check for empty required fields
  if (!config.host) errors.push("Host cannot be empty");
  if (!config.uploadPath) errors.push("Upload path cannot be empty");
  if (!config.tempPath) errors.push("Temp path cannot be empty");
  if (!config.storagePath) errors.push("Storage path cannot be empty");

  return errors;
}

/**
 * Get the server environment configuration
 *
 * @param validate Whether to validate the configuration (defaults to true)
 * @returns Server environment configuration
 * @throws Error if validation is enabled and configuration is invalid
 */
export function getServerEnvironment(validate = true): ServerEnvironment {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Create server config from environment variables
  const config: ServerConfig = {
    production: isProduction(),
    baseUrl: process.env.BASE_URL || "http://localhost:3003",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    signatureSecret: Buffer.from(
      process.env.SIGNATURE_SECRET || "default-signature-secret",
    ),
    passwordSalt: process.env.PASSWORD_SALT || "default-password-salt",
    port: parseInt(process.env.PORT || "3003", 10),
    host: process.env.HOST || "localhost",
    uploadPath: process.env.UPLOAD_PATH || "./uploads",
    tempPath: process.env.TEMP_PATH || "./temp",
    storagePath: process.env.STORAGE_PATH || "./storage",
    storageUrl: process.env.STORAGE_URL || "http://localhost:3003/storage",
  };

  // Validate configuration if requested
  if (validate) {
    const errors = validateServerConfig(config);
    if (errors.length > 0) {
      const errorMessage = `Invalid server configuration:\n${errors.join("\n")}`;
      console.error(errorMessage);

      // Only throw in production, just warn in development/test
      if (isProduction()) {
        throw new Error(errorMessage);
      }
    }
  }

  return {
    nodeEnv,
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    isTest: isTest(),
    config,
  };
}

/**
 * Ensures all required environment variables are set
 * Use this function to fail fast if critical environment variables are missing
 *
 * @throws Error if critical environment variables are missing
 */
export function ensureRequiredEnvironmentVariables(): void {
  // List of variables that are required in production
  const requiredInProduction = ["SIGNATURE_SECRET", "PASSWORD_SALT"];

  // If we're in production, check for required variables
  if (isProduction()) {
    const missing: string[] = [];

    for (const key of requiredInProduction) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }
}

// Re-export process.env for convenience and type safety
export const env = process.env;
