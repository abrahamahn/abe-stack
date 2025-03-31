import fs from "fs";
import path from "path";

import dotenv from "dotenv";

/**
 * Load environment files in order of priority
 */
export function loadEnvFiles(): void {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envFiles = [
    `.env.${nodeEnv}.local`,
    `.env.${nodeEnv}`,
    ".env.local",
    ".env",
  ];

  const rootDir = process.cwd();
  const configDir = path.join(
    rootDir,
    "src",
    "server",
    "infrastructure",
    "config",
  );
  const loadedFiles: string[] = [];

  // Check both the root directory and the config directory
  for (const file of envFiles) {
    // Try in config directory first
    const configFilePath = path.join(configDir, file);
    if (fs.existsSync(configFilePath)) {
      dotenv.config({ path: configFilePath });
      loadedFiles.push(`config/${file}`);
      continue;
    }

    // Then try in root directory
    const rootFilePath = path.join(rootDir, file);
    if (fs.existsSync(rootFilePath)) {
      dotenv.config({ path: rootFilePath });
      loadedFiles.push(file);
    }
  }

  if (loadedFiles.length > 0) {
    console.log(`Loaded environment files: ${loadedFiles.join(", ")}`);
  } else {
    console.log(`No environment files found in ${rootDir} or ${configDir}`);
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

// Re-export process.env for convenience and type safety
export const env = process.env;
