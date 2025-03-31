/**
 * Interface for application lifecycle management
 */

import { Server } from "http";

/**
 * Order of dependencies for initialization and shutdown
 */
export type DependencyOrder = {
  name: string;
  dependencies?: string[];
  startup?: () => Promise<void>;
  shutdown?: () => Promise<void>;
};

/**
 * Application lifecycle interface for managing startup and shutdown
 */
export interface IApplicationLifecycle {
  /**
   * Start the application and its dependencies
   */
  start(): Promise<void>;

  /**
   * Stop the application and its dependencies
   */
  stop(): Promise<void>;

  /**
   * Register a component to be managed in the lifecycle
   */
  register(
    name: string,
    dependencies: string[],
    component: {
      start?: () => Promise<void>;
      stop?: () => Promise<void>;
    },
  ): void;

  /**
   * Set the HTTP server instance
   */
  setHttpServer(server: Server): void;

  /**
   * Register a shutdown handler
   */
  registerShutdownHandler(handler: () => Promise<void>): void;
}
