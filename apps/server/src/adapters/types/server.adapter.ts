/**
 * Server Adapter Interface
 * This interface defines the contract that all server framework adapters must implement.
 * This allows the application to be framework-agnostic and easily swap between different frameworks.
 */

import { RequestHandler, ErrorHandler } from './handlers';

export interface ServerConfig {
  port: number;
  host?: string;
  cors?: CorsConfig;
  helmet?: boolean;
}

export interface CorsConfig {
  origin: string | string[];
  credentials?: boolean;
  methods?: string[];
}

export interface ServerAdapter {
  /**
   * Initialize the server with configuration
   */
  initialize(config: ServerConfig): Promise<void>;

  /**
   * Register a route handler
   */
  registerRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    handler: RequestHandler
  ): void;

  /**
   * Register middleware
   */
  use(middleware: RequestHandler): void;

  /**
   * Register error handler
   */
  useErrorHandler(handler: ErrorHandler): void;

  /**
   * Start the server
   */
  start(): Promise<void>;

  /**
   * Stop the server
   */
  stop(): Promise<void>;

  /**
   * Get the underlying framework instance (for framework-specific operations)
   */
  getInstance(): any;
}
