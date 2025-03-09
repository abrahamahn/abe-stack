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
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
};

// Database connection
const pool = new Pool({
  connectionString: config.dbConnectionString,
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
  subscribe: (key: string, callback: (value: any) => void) => {
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

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API routes
app.get('/api', (req, res) => {
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