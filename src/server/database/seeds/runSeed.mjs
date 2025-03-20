/**
 * runSeed.js - JavaScript equivalent of run_seed.sh for cross-platform compatibility
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

// Get current directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const rootDir = path.resolve(__dirname, '../../../..');
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(rootDir, '.env.production')
  : path.join(rootDir, '.env.development');

// Load environment variables
if (existsSync(envFile)) {
  console.log(`Loading environment variables from ${envFile}`);
  dotenv.config({ path: envFile });
}

// Set database connection variables
const DB_NAME = process.env.DB_NAME || 'abe_stack';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

// Display configuration
console.log('Database configuration:');
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
        stdio: ['ignore', 'pipe', 'inherit'] 
      }).toString().trim();
      dbExists = result.includes('1');
    } catch (error) {
      // Likely means psql failed to connect
      console.error('Failed to check if database exists:', error.message);
    }

    // Create database if it doesn't exist
    if (!dbExists) {
      console.log(`Database ${DB_NAME} does not exist. Creating it...`);
      const createDbCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`;
      try {
        execSync(createDbCmd, { 
          env: { ...process.env, PGPASSWORD: DB_PASSWORD },
          stdio: 'inherit' 
        });
        console.log(`Database ${DB_NAME} created successfully.`);
      } catch (error) {
        console.error('Failed to create database:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`Database ${DB_NAME} already exists.`);
    }
    
    // Run the schema and seed SQL files
    const schemaFile = path.join(__dirname, 'schema.sql');
    const seedFile = path.join(__dirname, 'seed_data.sql');
    
    if (existsSync(schemaFile)) {
      console.log('Applying database schema...');
      execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${schemaFile}"`, { 
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        stdio: 'inherit' 
      });
    } else {
      console.log('Schema file not found. Skipping schema creation.');
    }
    
    if (existsSync(seedFile)) {
      console.log('Seeding database with sample data...');
      execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${seedFile}"`, { 
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        stdio: 'inherit' 
      });
    } else {
      console.log('Seed data file not found. Skipping data seeding.');
    }
    
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error during database seeding:', error.message);
    process.exit(1);
  }
}

runSeed(); 