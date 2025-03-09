import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { ServerEnvironment } from './services/ServerEnvironment';
import { ApiServer } from './ApiServer';
import { FileServer } from './FileServer';
import type { Request, Response } from 'express-serve-static-core';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
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

// Create server environment
const environment: ServerEnvironment = {
  config,
  db,
  pubsub,
  wss
};

// Initialize servers
FileServer(environment, app);
ApiServer(environment, app);

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the ABE Stack API!' });
});

// In production, serve the static files from the dist directory
if (config.production) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const distPath = path.resolve(__dirname, '../../dist');
  
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
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
  
  ws.on('close', () => {
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