// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

// First try to load environment-specific file, then fall back to .env
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log(`Loading environment from ${envFile}`);

import express from 'express';
import type { Express, Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import { ServerEnvironment } from './services/ServerEnvironment';
import { ApiServer } from './ApiServer';
import { FileServer } from './FileServer';
import { EventEmitter } from 'events';
import { QueueDatabase } from './services/QueueDatabase';
import fs from 'fs';
import { DatabaseConnectionManager } from './database/config';

// Create Express app
const expressApp = express as unknown as {
  (): Express;
  json: (options?: any) => RequestHandler;
  urlencoded: (options?: any) => RequestHandler;
  static: (path: string) => RequestHandler;
};

const app = expressApp();
const server = http.createServer(app);

// Apply CORS middleware first, before anything else
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Other middleware
app.use(expressApp.json());
app.use(cookieParser());

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
(async () => {
  try {
    await DatabaseConnectionManager.initialize();
    console.log('DatabaseConnectionManager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize DatabaseConnectionManager:', error);
  }
})();

// Database connection
const dbConfig = new URL(config.dbConnectionString);
const pool = new Pool({
  user: dbConfig.username,
  password: dbConfig.password,
  host: dbConfig.hostname,
  port: parseInt(dbConfig.port || '5432'),
  database: dbConfig.pathname.split('/')[1],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Database API
const db = {
  query: async <T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> => {
    const result = await pool.query(text, params);
    return result;
  },
  getClient: async () => {
    return await pool.connect();
  }
};

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Pubsub API for real-time updates
const pubsub = {
  broadcast: (key: string, value: any) => {
    const message = JSON.stringify({ type: 'change', key, value });
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  },
  subscribe: (_key: string, _callback: (value: any) => void) => {
    // In a more complete implementation, we would track subscriptions
    return () => {
      // Unsubscribe function
    };
  }
};

// Initialize the queue database
const queue = new QueueDatabase(config.queuePath);

// Create server environment
const environment: ServerEnvironment = {
  config,
  db,
  pubsub,
  wss,
  queue // Add the queue to the environment
};

// Initialize servers
FileServer(environment, app);
ApiServer(environment, app);

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the ABE Stack API!', status: 'success' });
});

// Only in production, serve the static files from the dist directory
if (process.env.NODE_ENV === 'production') {
  console.log('Running in production mode, serving static files');
  // Check for dist/client directory first (Vite output)
  let staticPath = path.resolve(process.cwd(), 'dist/client');
  
  // If dist/client doesn't exist, try dist
  if (!fs.existsSync(staticPath)) {
    staticPath = path.resolve(process.cwd(), 'dist');
  }
  
  // If dist doesn't exist, try build
  if (!fs.existsSync(staticPath)) {
    staticPath = path.resolve(process.cwd(), 'build');
  }
  
  // If the directory exists, serve static files from it
  if (fs.existsSync(staticPath)) {
    console.log(`Serving static files from: ${staticPath}`);
    app.use(expressApp.static(staticPath));
    
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(staticPath, 'index.html');
      
      // Check if index.html exists
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not found: index.html does not exist in the static directory');
      }
    });
  } else {
    console.warn('No static files directory found (tried dist/client, dist, and build)');
  }
} else {
  console.log('Running in development mode, not serving static files');
  
  // In development mode, handle API 404s but let the Vite dev server handle frontend routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ 
      status: 'error', 
      message: 'API endpoint not found' 
    });
  });
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  
  // Cast WebSocket to EventEmitter to use the 'on' method
  const wsWithEvents = ws as unknown as EventEmitter;
  
  wsWithEvents.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);
      
      // Handle different message types
      if (data.type === 'subscribe') {
        // Handle subscription
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  wsWithEvents.on('close', () => {
    console.log('Client disconnected');
  });
});

// Find an available port starting from the configured port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    
    testServer.on('error', () => {
      // Port is in use, try the next one
      console.log(`Port ${startPort} is in use, trying next port...`);
      resolve(findAvailablePort(startPort + 1));
    });
    
    testServer.on('listening', () => {
      // Found an available port
      const port = (testServer.address() as any).port;
      testServer.close(() => resolve(port));
    });
    
    testServer.listen(startPort);
  });
}

// Start server with dynamic port
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
      port = await findAvailablePort(8086); // Start from 8086 if all preferred ports are taken
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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();