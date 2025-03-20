import fs from "fs";
import http from "http";
import path from "path";

import express, {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import helmet from "helmet";
import { WebSocketServer } from "ws";

import { DatabaseConnectionManager } from "@database/config";
import {
  env,
  ServerConfig,
  DatabaseApi,
  PubsubApi,
  ServerEnvironment,
} from "@server/config/environment";
import { PubsubServer } from "@server/core/pubsub/PubsubServer";
import { QueueDatabase } from "@server/core/queue/QueueDatabase";
import QueueServer from "@server/core/queue/QueueServer";
import { FileServer } from "@server/core/storage/FileServer";
import { Logger } from "@services/dev/logger/LoggerService";

const logger = new Logger("Server");

// Create a complete config object that matches ServerConfig type
const config: ServerConfig = {
  port: env.PORT,
  dbConnectionString: env.DB_CONNECTION_STRING,
  production: env.NODE_ENV === "production",
  domain: env.HOST,
  baseUrl: env.BASE_URL,
  corsOrigin: env.CORS_ORIGINS.join(","),
  corsOrigins: env.CORS_ORIGINS,
  jwtSecret: env.JWT_SECRET,
  uploadDir: env.UPLOADS_DIR,
  queuePath: env.QUEUE_PATH,
  signatureSecret: env.SIGNATURE_SECRET,
  passwordSalt: env.PASSWORD_SALT,
  dbPath: path.join(process.cwd(), "db"),
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
  },
};

async function startServer(): Promise<void> {
  const app: Express = express();

  if (config.production) {
    // Basic server hardening settings including CORS
    const helmetMiddleware = (helmet as () => RequestHandler)();
    app.use(helmetMiddleware);
  }

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    (
      res as unknown as { on: (event: string, callback: () => void) => void }
    ).on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // Serve static files from the uploads directory
  app.use(
    "/uploads",
    (express.static as unknown as (path: string) => RequestHandler)(
      path.join(process.cwd(), "uploads"),
    ),
  );

  // Initialize databases
  await DatabaseConnectionManager.initialize();

  // Create a wrapper that implements the DatabaseApi interface
  const db: DatabaseApi = {
    query: async <T = unknown>(
      text: string,
      params?: unknown[],
    ): Promise<{ rows: T[] }> => {
      const pool = DatabaseConnectionManager.getPool();
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
    getClient: async () => {
      const pool = DatabaseConnectionManager.getPool();
      if ("connect" in pool) {
        return await pool.connect();
      }
      throw new Error("Pool does not support client connections");
    },
  };

  const queue = new QueueDatabase();

  // Type assertion to convert Express Application to RequestListener
  const server = http.createServer(app as unknown as http.RequestListener);

  // WebSocket server setup
  const wss = new WebSocketServer({ server });

  // Type definition for WebSocket with proper methods
  interface TypedWebSocket {
    send(data: string): void;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  // Handle WebSocket connections
  wss.on("connection", (ws, _req) => {
    const typedWs = ws as TypedWebSocket;
    console.log("WebSocket connection established");

    // Send a welcome message
    const welcomeMessage = JSON.stringify({
      type: "welcome",
      message: "Connected to WebSocket server",
    });
    typedWs.send(welcomeMessage);

    // Handle messages
    typedWs.on("message", (...args) => {
      const messageData = args[0];
      if (!(messageData instanceof Buffer || typeof messageData === "string"))
        return;

      try {
        const messageStr =
          messageData instanceof Buffer ? messageData.toString() : messageData;
        const data = JSON.parse(messageStr as string) as {
          type: string;
          [key: string]: unknown;
        };

        // Handle different message types
        if (data.type === "ping") {
          typedWs.send(JSON.stringify({ type: "pong" }));
        } else {
          console.log("Received message:", data);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error parsing WebSocket message:", error.message);
        } else {
          console.error("Error parsing WebSocket message:", error);
        }
        typedWs.send(
          JSON.stringify({ type: "error", message: "Invalid message format" }),
        );
      }
    });

    // Handle close
    typedWs.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  // Use a direct type assertion to bypass type checking
  // @ts-expect-error PubsubServer expects a different type structure
  const pubsubServer = PubsubServer({ config, db }, server);

  // Create a wrapper that implements the PubsubApi interface
  const pubsub: PubsubApi = {
    broadcast: (key: string, value: unknown) => {
      // Use WebsocketPubsubServer's publish method
      void pubsubServer.publish([{ key, value }]);
    },
    publish: (channel: string, message: unknown) => {
      // Use WebsocketPubsubServer's publish method
      void pubsubServer.publish([{ key: channel, value: message }]);
    },
    subscribe: (_key: string, _callback: (value: unknown) => void) => {
      // Return unsubscribe function
      return () => {};
    },
  };

  // Setup the server environment.
  const environment: ServerEnvironment = { config, db, queue, pubsub };

  // Use type assertions for server functions
  FileServer(environment, app);
  QueueServer(environment);

  // Try to use port 8080 first, then fall back to other ports
  // We'll avoid port 5432 (PostgreSQL) and 3000-3005 (likely used by the client)
  const preferredPorts = [8080, 8081, 8082, 8083, 8084, 8085];
  let port = config.port;

  // Try each preferred port in order
  for (const preferredPort of preferredPorts) {
    try {
      const testServer = http.createServer();
      await new Promise<void>((resolve, _reject) => {
        testServer.on("error", () => {
          console.log(`Port ${preferredPort} is in use, trying next port...`);
          resolve();
        });

        testServer.on("listening", () => {
          port = preferredPort;
          testServer.close(() => resolve());
        });

        testServer.listen(preferredPort);
      });

      if (port === preferredPort) {
        // We found an available port from our preferred list
        break;
      }
    } catch (err) {
      console.log(`Error testing port ${preferredPort}:`, err);
    }
  }

  // Update the config with the actual port
  config.port = port;
  config.baseUrl = `http://localhost:${port}`;

  // Start listening
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`API available at http://localhost:${port}/api`);

    // Write the port to a file so the client can read it
    const portFilePath = path.join(process.cwd(), ".port");
    fs.writeFileSync(portFilePath, port.toString());
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
