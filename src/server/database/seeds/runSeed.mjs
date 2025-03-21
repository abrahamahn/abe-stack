/**
 * runSeed.js - JavaScript equivalent of run_seed.sh for cross-platform compatibility
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

// Get current directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const rootDir = path.resolve(__dirname, "../../../..");
const envFile =
  process.env.NODE_ENV === "production"
    ? path.join(rootDir, ".env.production")
    : path.join(rootDir, ".env.development");

// Load environment variables
if (existsSync(envFile)) {
  console.log(`Loading environment variables from ${envFile}`);
  dotenv.config({ path: envFile });
}

// Set database connection variables
const DB_NAME = process.env.DB_NAME || "abe_stack";
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
// Always default to localhost but respect environment variables
let DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "5432";

// If the host is 'postgres', it's probably meant for Docker
// Let's check if we're running outside Docker but trying to connect to a Docker container
if (DB_HOST === "postgres") {
  try {
    // Check if we can resolve the hostname - if not, fall back to localhost
    console.log("Checking if 'postgres' hostname is reachable...");

    // Try the connection with a short timeout
    const checkCmd = `psql -h postgres -p ${DB_PORT} -U ${DB_USER} -d postgres -c "SELECT 1" -t -c "\\q" --connect-timeout=2`;
    try {
      execSync(checkCmd, {
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        stdio: "pipe",
        timeout: 3000,
      });
      console.log("'postgres' hostname is reachable, using it for connection");
    } catch (error) {
      console.warn(
        "Cannot connect to 'postgres' hostname, falling back to localhost"
      );
      DB_HOST = "localhost"; // Fall back to localhost
    }
  } catch (error) {
    console.warn(
      "Error checking Docker connectivity, falling back to localhost"
    );
    DB_HOST = "localhost"; // Fall back to localhost
  }
}

// Display configuration
console.log("Database configuration:");
console.log(`  Environment: ${process.env.NODE_ENV}`);
console.log(`  Database: ${DB_NAME}`);
console.log(`  User: ${DB_USER}`);
console.log(`  Host: ${DB_HOST}`);
console.log(`  Port: ${DB_PORT}`);

// Main function to run the seed
async function runSeed() {
  try {
    // Check if database exists and create it if needed
    console.log(`Checking if database ${DB_NAME} exists...`);

    // Build the database check command
    const checkDbCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'"`;

    let dbExists = false;
    try {
      // Set PGPASSWORD environment for the command
      const result = execSync(checkDbCmd, {
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        stdio: ["ignore", "pipe", "inherit"],
      })
        .toString()
        .trim();
      dbExists = result.includes("1");
    } catch (error) {
      // Likely means psql failed to connect
      console.error("Failed to check if database exists:", error.message);
      console.error(
        "Make sure PostgreSQL is running and the connection details are correct."
      );
      process.exit(1);
    }

    // Create database if it doesn't exist
    if (!dbExists) {
      console.log(`Database ${DB_NAME} does not exist. Creating it...`);
      const createDbCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`;
      try {
        execSync(createDbCmd, {
          env: { ...process.env, PGPASSWORD: DB_PASSWORD },
          stdio: "inherit",
        });
        console.log(`Database ${DB_NAME} created successfully.`);
      } catch (error) {
        console.error("Failed to create database:", error.message);
        process.exit(1);
      }
    } else {
      console.log(`Database ${DB_NAME} already exists.`);
    }

    // Get all SQL files in the directory sorted by filename
    const sqlFiles = readdirSync(__dirname)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (sqlFiles.length === 0) {
      console.error(
        "No SQL files found in the directory. Seeding cannot proceed."
      );
      process.exit(1);
    }

    console.log(`Found ${sqlFiles.length} SQL files to apply.`);

    // Run each SQL file in order
    for (const sqlFile of sqlFiles) {
      const fullPath = path.join(__dirname, sqlFile);
      console.log(`Applying: ${sqlFile}...`);

      try {
        execSync(
          `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${fullPath}"`,
          {
            env: { ...process.env, PGPASSWORD: DB_PASSWORD },
            stdio: "inherit",
          }
        );
        console.log(`Successfully applied ${sqlFile}`);
      } catch (error) {
        console.error(`Error applying ${sqlFile}:`, error.message);
        console.log("Continuing with next file...");
      }
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error.message);
    process.exit(1);
  }
}

runSeed();
