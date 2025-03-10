// services/ServerEnvironment.ts
import { WebSocketServer } from 'ws';
import { QueueDatabase } from './QueueDatabase';

export interface ServerEnvironment {
  config: {
    port: number;
    dbConnectionString: string;
    production: boolean;
    domain: string;
    baseUrl: string;
    corsOrigin: string;
    corsOrigins: string[];
    jwtSecret: string;
    uploadDir: string;
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
  };
  db: {
    query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
    getClient: () => Promise<any>;
  };
  pubsub: {
    broadcast: (key: string, value: any) => void;
    subscribe: (key: string, callback: (value: any) => void) => () => void;
  };
  wss: WebSocketServer;
  queue: QueueDatabase; // Added the queue property
}