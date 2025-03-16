// src/server/config/environment.ts
import path from 'path';

import dotenv from 'dotenv';

// Load environment-specific .env file first, then fall back to .env
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log(`Loading environment from ${envFile}`);

// Environment configuration type definition
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
  DB_CONNECTION_STRING: string;
  
  // Auth
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  
  // CORS
  CORS_ORIGINS: string[];
  
  // File Storage
  UPLOADS_DIR: string;
  MAX_FILE_SIZE: number;
  QUEUE_PATH: string;
  
  // Security
  SIGNATURE_SECRET: Buffer;
  PASSWORD_SALT: Buffer;
  
  // Email
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  APP_NAME: string;
  APP_URL: string;
}

// Helper function to parse environment variables with type conversion
function parseEnv<T>(key: string, defaultValue?: T, parser?: (value: string) => T): T {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  
  if (parser) {
    try {
      return parser(value);
    } catch (error) {
      throw new Error(`Failed to parse environment variable ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return value as unknown as T;
}

// Parse array from comma-separated string
function parseArray(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Create and validate the environment configuration
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
  BASE_URL: parseEnv<string>('BASE_URL', `http://localhost:${parseEnv<number>('PORT', 8080)}`),
  
  // Database
  DB_HOST: parseEnv<string>('DB_HOST', 'localhost'),
  DB_PORT: parseEnv<number>('DB_PORT', 5432, parseInt),
  DB_NAME: parseEnv<string>('DB_NAME', 'abe_stack'),
  DB_USER: parseEnv<string>('DB_USER', 'postgres'),
  DB_PASSWORD: parseEnv<string>('DB_PASSWORD', 'postgres'),
  DB_CONNECTION_STRING: parseEnv<string>(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/abe_stack'
  ),
  
  // Auth
  JWT_SECRET: parseEnv<string>('JWT_SECRET', 'development-jwt-secret'),
  JWT_REFRESH_SECRET: parseEnv<string>('JWT_REFRESH_SECRET', 'development-jwt-refresh-secret'),
  ACCESS_TOKEN_SECRET: parseEnv<string>('ACCESS_TOKEN_SECRET', 'development-access-token-secret'),
  REFRESH_TOKEN_SECRET: parseEnv<string>('REFRESH_TOKEN_SECRET', 'development-refresh-token-secret'),
  ACCESS_TOKEN_EXPIRY: parseEnv<string>('ACCESS_TOKEN_EXPIRY', '15'),
  REFRESH_TOKEN_EXPIRY: parseEnv<string>('REFRESH_TOKEN_EXPIRY', '7'),
  
  // CORS
  CORS_ORIGINS: parseEnv<string[]>(
    'CORS_ORIGINS',
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    parseArray
  ),
  
  // File Storage
  UPLOADS_DIR: parseEnv<string>('UPLOADS_DIR', path.resolve(process.cwd(), 'uploads')),
  MAX_FILE_SIZE: parseEnv<number>('MAX_FILE_SIZE', 10 * 1024 * 1024, parseInt),
  QUEUE_PATH: parseEnv<string>('QUEUE_PATH', path.resolve(process.cwd(), 'queue')),
  
  // Security
  SIGNATURE_SECRET: Buffer.from(parseEnv<string>('SIGNATURE_SECRET', 'signature-secret-key')),
  PASSWORD_SALT: Buffer.from(parseEnv<string>('PASSWORD_SALT', 'password-salt')),
  
  // Email
  EMAIL_HOST: parseEnv<string>('EMAIL_HOST', 'smtp.gmail.com'),
  EMAIL_PORT: parseEnv<number>('EMAIL_PORT', 587, parseInt),
  EMAIL_SECURE: parseEnv<boolean>('EMAIL_SECURE', false, (v) => v === 'true'),
  EMAIL_USER: parseEnv<string>('EMAIL_USER', 'test@example.com'),
  EMAIL_PASSWORD: parseEnv<string>('EMAIL_PASSWORD', 'password'),
  APP_NAME: parseEnv<string>('APP_NAME', 'ABE Stack'),
  APP_URL: parseEnv<string>('APP_URL', 'http://localhost:8080')
};

// Freeze the config object to prevent modifications
Object.freeze(env);

export default env;