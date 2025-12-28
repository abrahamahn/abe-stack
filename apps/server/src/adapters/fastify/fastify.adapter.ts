import { ServerAdapter, ServerConfig, RequestHandler, ErrorHandler } from '../types';

/**
 * Fastify Framework Adapter (Stub)
 * Implements the ServerAdapter interface using Fastify
 *
 * TODO: Implement when switching to Fastify
 */
export class FastifyAdapter implements ServerAdapter {
  async initialize(config: ServerConfig): Promise<void> {
    throw new Error('Fastify adapter not yet implemented');
  }

  registerRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    handler: RequestHandler
  ): void {
    throw new Error('Fastify adapter not yet implemented');
  }

  use(middleware: RequestHandler): void {
    throw new Error('Fastify adapter not yet implemented');
  }

  useErrorHandler(handler: ErrorHandler): void {
    throw new Error('Fastify adapter not yet implemented');
  }

  async start(): Promise<void> {
    throw new Error('Fastify adapter not yet implemented');
  }

  async stop(): Promise<void> {
    throw new Error('Fastify adapter not yet implemented');
  }

  getInstance(): any {
    throw new Error('Fastify adapter not yet implemented');
  }
}
