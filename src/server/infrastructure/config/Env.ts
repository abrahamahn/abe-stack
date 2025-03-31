/**
 * Types for server environment and configuration
 */

/**
 * Server environment configuration
 */
export interface ServerEnvironment {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  config: ServerConfig;
}

/**
 * Server configuration settings
 */
export interface ServerConfig {
  production: boolean;
  baseUrl: string;
  corsOrigin: string | string[];
  signatureSecret: Buffer;
  passwordSalt: string;
  port: number;
  host: string;
  uploadPath: string;
  tempPath: string;
  storagePath: string;
  storageUrl: string;
}
