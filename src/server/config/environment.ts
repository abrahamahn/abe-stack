// src/server/config/environment.ts
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine which .env file to load based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

// Fallback to .env if environment-specific file doesn't exist
if (!fs.existsSync(envPath)) {
  dotenv.config();
} else {
  dotenv.config({ path: envPath } as any);
}

// Define the configuration schema with types and validation
export interface EnvConfig {
  // Server
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PORT: number;
  HOST: string;
  BASE_URL: string;
  
  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  
  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB_BLACKLIST: number;
  
  // Auth
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  
  // File Storage
  UPLOADS_DIR: string;
  MAX_FILE_SIZE: number;
  
  // Cors
  CORS_ORIGINS: string[];
}

// Helper function to parse environment variables with type conversion
function parseEnv<T>(key: string, defaultValue?: T, parser?: (value: string) => T): T {
  const value = process.env[key];
  
  // Return default if no value found
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  
  // Parse the value if parser provided
  if (parser) {
    try {
      return parser(value);
    } catch (error: unknown) {
      // Type guard for error object with message property
      if (error instanceof Error) {
        throw new Error(`Failed to parse environment variable ${key}: ${error.message}`);
      }
      // For other types of errors
      throw new Error(`Failed to parse environment variable ${key}: Unknown error`);
    }
  }
  
  return value as unknown as T;
}

// Parse array from comma-separated string
function parseArray(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Create and validate the config object
export const env: EnvConfig = {
  // Server
  NODE_ENV: parseEnv<'development' | 'test' | 'staging' | 'production'>(
    'NODE_ENV', 
    'development',
    (v) => {
      if (!['development', 'test', 'staging', 'production'].includes(v)) {
        throw new Error(`Invalid NODE_ENV: ${v}`);
      }
      return v as 'development' | 'test' | 'staging' | 'production';
    }
  ),
  PORT: parseEnv<number>('PORT', 8080, parseInt),
  HOST: parseEnv<string>('HOST', 'localhost'),
  BASE_URL: parseEnv<string>(
    'BASE_URL', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : `http://localhost:${parseEnv<number>('PORT', 8080)}`
  ),
  
  // Database
  DB_HOST: parseEnv<string>('DB_HOST', 'localhost'),
  DB_PORT: parseEnv<number>('DB_PORT', 5432, parseInt),
  DB_NAME: parseEnv<string>('DB_NAME', 'abe_stack'),
  DB_USER: parseEnv<string>('DB_USER', 'postgres'),
  DB_PASSWORD: parseEnv<string>('DB_PASSWORD', 'postgres'),
  
  // Redis
  REDIS_HOST: parseEnv<string>('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseEnv<number>('REDIS_PORT', 6379, parseInt),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB_BLACKLIST: parseEnv<number>('REDIS_DB_BLACKLIST', 1, parseInt),
  
  // Auth
  JWT_SECRET: parseEnv<string>(
    'JWT_SECRET', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : 'development-jwt-secret-key-change-in-production'
  ),
  JWT_EXPIRATION: parseEnv<string>('JWT_EXPIRATION', '15m'),
  JWT_REFRESH_SECRET: parseEnv<string>(
    'JWT_REFRESH_SECRET', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : 'development-jwt-refresh-secret-key-change-in-production'
  ),
  ACCESS_TOKEN_SECRET: parseEnv<string>(
    'ACCESS_TOKEN_SECRET', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : 'development-access-token-secret-key-change-in-production'
  ),
  REFRESH_TOKEN_SECRET: parseEnv<string>(
    'REFRESH_TOKEN_SECRET', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : 'development-refresh-token-secret-key-change-in-production'
  ),
  ACCESS_TOKEN_EXPIRY: parseEnv<string>('ACCESS_TOKEN_EXPIRY', '15'),
  REFRESH_TOKEN_EXPIRY: parseEnv<string>('REFRESH_TOKEN_EXPIRY', '7'),
  
  // File Storage
  UPLOADS_DIR: parseEnv<string>('UPLOADS_DIR', path.resolve(process.cwd(), 'uploads')),
  MAX_FILE_SIZE: parseEnv<number>('MAX_FILE_SIZE', 10 * 1024 * 1024, parseInt), // 10MB default
  
  // Cors
  CORS_ORIGINS: parseEnv<string[]>(
    'CORS_ORIGINS', 
    process.env.NODE_ENV === 'production' 
      ? undefined 
      : ['http://localhost:3000'],
    parseArray
  ),
};

// Freeze the config object to prevent modifications
Object.freeze(env);

export default env;