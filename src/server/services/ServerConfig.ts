// src/server/services/ServerConfig.ts
import { env } from '../config/environment';
import path from 'path';

export type ServerConfig = {
  production: boolean;
  port: number;
  domain: string;
  baseUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
  queuePath: string;
  signatureSecret: Buffer;
  passwordSalt: Buffer;
  dbPath: string;
  db: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
}

// Default fallback secrets
const DEFAULT_SIGNATURE_SECRET = "4BwkW2TpsYjWt5i6pg8jDt6AA6iz+UAFjSmIeCboLXfln81sud1aLu3jA3vCVdUyTsXFoHijg1RgZ2NNHMMpdO+Fvmsill+2dh8QFgvzhqqm8txmsmC9rkg9FnbIrYG9g7Nom17g/afg/bk7JHGBpEDgWsLZQ3537w81b7dP2HI=";
const DEFAULT_PASSWORD_SALT = "8hrqUP5KLtWI8BmSOe9dSHti2Iz2QA2cCo0Pe3YFGhE=";

// Load signature secret from env or use default
const signatureSecretString = env.NODE_ENV === 'production' 
  ? (process.env.SIGNATURE_SECRET || DEFAULT_SIGNATURE_SECRET)
  : DEFAULT_SIGNATURE_SECRET;

// Password salt for hashing
const passwordSaltString = env.NODE_ENV === 'production'
  ? (process.env.PASSWORD_SALT || DEFAULT_PASSWORD_SALT)
  : DEFAULT_PASSWORD_SALT;

export const config: ServerConfig = {
  production: env.NODE_ENV === 'production',
  port: env.PORT,
  domain: env.HOST,
  baseUrl: env.BASE_URL,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS,
  queuePath: process.env.QUEUE_PATH || path.resolve(process.cwd(), "db/queue.json"),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), "db/data.json"),
  signatureSecret: Buffer.from(signatureSecretString, "base64"),
  passwordSalt: Buffer.from(passwordSaltString, "base64"),
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD
  }
};