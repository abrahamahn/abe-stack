import express from 'express';
import type { Express, RequestHandler } from 'express-serve-static-core';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import type { Request, Response } from 'express-serve-static-core';
import { ServerEnvironment } from './services/ServerEnvironment';
import { ApiServer } from './ApiServer';
import { FileServer } from './FileServer';
import { EventEmitter } from 'events';
import { QueueDatabase } from './services/QueueDatabase';

// Create Express app
const expressApp = express as unknown as {
  (): Express;
  json: (options?: any) => RequestHandler;
  urlencoded: (options?: any) => RequestHandler;
  static: (path: string) => RequestHandler;
};

const app = expressApp();
const server = http.createServer(app);

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

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(expressApp.json());
app.use(cookieParser());

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the ABE Stack API!' });
});

// In production, serve the static files from the dist directory
if (config.production) {
  const distPath = path.resolve(process.cwd(), 'dist');
  
  app.use(expressApp.static(distPath));
  
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
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

// Start server
async function startServer() {
  try {
    // Start listening
    server.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();