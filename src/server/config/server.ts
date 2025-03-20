// src/config/server.ts
import path from "path";

// Server configuration
export const serverConfig = {
  port: parseInt(process.env.PORT || "3003"), // Use port 3003 by default
  dbConnectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/abe_stack",
  production: process.env.NODE_ENV === "production",
  domain: process.env.DOMAIN || "localhost",
  baseUrl: process.env.BASE_URL || "http://localhost:3003", // Updated to match default port
  corsOrigin: process.env.CORS_ORIGIN || "*",
  corsOrigins: (process.env.CORS_ORIGIN || "*").split(","),
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  queuePath: process.env.QUEUE_PATH || path.join(process.cwd(), "queue"),
  signatureSecret: Buffer.from(
    process.env.SIGNATURE_SECRET || "signature-secret-key",
  ),
  passwordSalt: Buffer.from(process.env.PASSWORD_SALT || "password-salt"),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), "db"),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "abe_stack",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
};
