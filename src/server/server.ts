// abe-stack\src\server\server.ts
import http from "http"
import path from "path"

import express, { Express, Request, Response, NextFunction, RequestHandler } from "express"
import helmet from "helmet"

import { ApiServer } from "./ApiServer"
import { FileServer } from "./FileServer"
import { PubsubServer } from "./PubsubServer"
import QueueServer from "./QueueServer"
import { Database } from "./services/Database"
import { Logger } from "./services/LoggerService"
import { QueueDatabase } from "./services/QueueDatabase"
import { ServerConfig, DatabaseApi, PubsubApi, ServerEnvironment } from "./services/ServerEnvironment"

const logger = new Logger('Server');

// Create a complete config object that matches ServerConfig type
const config: ServerConfig = {
  port: parseInt(process.env.PORT || '8080'),
  dbConnectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/abe_stack',
  production: process.env.NODE_ENV === 'production',
  domain: process.env.DOMAIN || 'localhost',
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  corsOrigins: (process.env.CORS_ORIGIN || '*').split(','),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  queuePath: process.env.QUEUE_PATH || path.join(process.cwd(), 'queue'),
  signatureSecret: Buffer.from(process.env.SIGNATURE_SECRET || 'signature-secret-key'),
  passwordSalt: Buffer.from(process.env.PASSWORD_SALT || 'password-salt'),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'db'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'abe_stack',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  }
}

async function startServer() {
  const app: Express = express();

  if (config.production) {
    // Basic server hardening settings including CORS
    const helmetMiddleware = (helmet as () => RequestHandler)();
    app.use(helmetMiddleware);
  }

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    (res as unknown as { on: (event: string, callback: () => void) => void })
      .on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
      });
    next();
  });

  // Serve static files from the uploads directory
  app.use('/uploads', (express.static as unknown as (path: string) => RequestHandler)(path.join(process.cwd(), 'uploads')));

  // Initialize databases
  const dbInstance = new Database(config.dbPath);
  await dbInstance.initialize();
  
  // Create a wrapper that implements the DatabaseApi interface
  const db: DatabaseApi = {
    query: async <T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }> => {
      // Use the pool from the Database instance to perform queries
      const pool = dbInstance.getPool();
      if (!pool) {
        throw new Error("Database pool not initialized");
      }
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
    getClient: async () => {
      // Get a client from the pool
      const pool = dbInstance.getPool();
      if (!pool) {
        throw new Error("Database pool not initialized");
      }
      
      // Check if pool is a Pool instance with connect method
      if ('connect' in pool) {
        return await pool.connect();
      } else {
        throw new Error("Pool does not support client connections");
      }
    }
  };
  
  const queue = new QueueDatabase();

  // Type assertion to convert Express Application to RequestListener
  const server = http.createServer(app as unknown as http.RequestListener)
  
  // Use a direct type assertion to bypass type checking
  // @ts-expect-error PubsubServer expects a different type structure
  const pubsubServer = PubsubServer({ config, db }, server)
  
  // Create a wrapper that implements the PubsubApi interface
  const pubsub: PubsubApi = {
    broadcast: (key: string, value: unknown) => {
      // Use WebsocketPubsubServer's publish method
      void pubsubServer.publish([{ key, value }]);
    },
    subscribe: (_key: string, _callback: (value: unknown) => void) => {
      // Return unsubscribe function
      return () => {};
    }
  };

  // Setup the server environment.
  const environment: ServerEnvironment = { config, db, queue, pubsub }

  // Use type assertions for server functions
  FileServer(environment, app)
  QueueServer(environment)
  ApiServer(environment, app)

  server.listen(config.port, () => console.log(`Listening: http://localhost:${config.port}`))
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})