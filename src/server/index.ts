// Load environment variables from .env file
import fs from 'fs';
import http from 'http';
import path from 'path';

import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import express, { Express, RequestHandler as ExpressHandler } from 'express';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';

import { DatabaseConnectionManager } from './database/config';

// Load environment-specific .env file
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

// First try to load environment-specific file, then fall back to .env
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log(`Loading environment from ${envFile}`);

// Create Express app
const app: Express = express();
const server = http.createServer(app as unknown as http.RequestListener);

// Apply CORS middleware
const corsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const corsMiddleware = cors(corsOptions) as ExpressHandler;
const jsonMiddleware = (express.json as () => ExpressHandler)();
const cookieMiddleware = cookieParser() as ExpressHandler;

app.use(corsMiddleware);
app.use(jsonMiddleware);
app.use(cookieMiddleware);

// Server configuration
const config = {
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
};

// Initialize DatabaseConnectionManager
void (async () => {
  try {
    await DatabaseConnectionManager.initialize();
    console.log('DatabaseConnectionManager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize DatabaseConnectionManager:', error);
  }
})();

// Database connection
const dbConfig = new URL(config.dbConnectionString);
export const pool = new Pool({
  user: dbConfig.username,
  password: dbConfig.password,
  host: dbConfig.hostname,
  port: parseInt(dbConfig.port || '5432'),
  database: dbConfig.pathname.split('/')[1],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Type definition for WebSocket with proper methods
interface TypedWebSocket {
  send(data: string): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

// Handle WebSocket connections
wss.on('connection', (ws, _req) => {
  const typedWs = ws as TypedWebSocket;
  console.log('WebSocket connection established');
  
  // Send a welcome message
  const welcomeMessage = JSON.stringify({ type: 'welcome', message: 'Connected to WebSocket server' });
  typedWs.send(welcomeMessage);
  
  // Handle messages
  typedWs.on('message', (...args) => {
    const messageData = args[0];
    if (!(messageData instanceof Buffer || typeof messageData === 'string')) return;
    
    try {
      const messageStr = messageData instanceof Buffer ? messageData.toString() : messageData;
      const data = JSON.parse(messageStr as string) as { type: string; [key: string]: unknown };
      
      // Handle different message types
      if (data.type === 'ping') {
        typedWs.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.log('Received message:', data);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error parsing WebSocket message:', error.message);
      } else {
        console.error('Error parsing WebSocket message:', error);
      }
      typedWs.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  // Handle close
  typedWs.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Find an available port
function findAvailablePort(startPort: number): number {
  // This is a placeholder implementation since the actual implementation was removed
  // In a real scenario, you would implement port checking logic here
  return startPort;
}

// Start the server
void startServer();

async function startServer() {
  try {
    // Try to use port 8080 first, then fall back to other ports
    // We'll avoid port 5432 (PostgreSQL) and 3000-3005 (likely used by the client)
    const preferredPorts = [8080, 8081, 8082, 8083, 8084, 8085];
    let port = config.port;
    
    // Try each preferred port in order
    for (const preferredPort of preferredPorts) {
      try {
        const testServer = http.createServer();
        await new Promise<void>((resolve, _reject) => {
          testServer.on('error', () => {
            console.log(`Port ${preferredPort} is in use, trying next port...`);
            resolve();
          });
          
          testServer.on('listening', () => {
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
    
    // If none of our preferred ports are available, find any available port
    if (!preferredPorts.includes(port)) {
      port = findAvailablePort(8086); // Start from 8086 if all preferred ports are taken
    }
    
    // Update the config with the actual port
    config.port = port;
    config.baseUrl = `http://localhost:${port}`;
    
    // Start listening
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API available at http://localhost:${port}/api`);
      
      // Write the port to a file so the client can read it
      const portFilePath = path.join(process.cwd(), '.port');
      fs.writeFileSync(portFilePath, port.toString());
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to start server:', error.message);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}