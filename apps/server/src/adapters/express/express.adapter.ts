import express, { Express, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import helmet from 'helmet';
import { ServerAdapter, ServerConfig, RequestHandler, ErrorHandler, Request, Response } from '../types';

/**
 * Express Framework Adapter
 * Implements the ServerAdapter interface using Express.js
 */
export class ExpressAdapter implements ServerAdapter {
  private app: Express;
  private server: any;
  private config!: ServerConfig;

  constructor() {
    this.app = express();
  }

  async initialize(config: ServerConfig): Promise<void> {
    this.config = config;

    // Setup middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Security
    if (config.helmet !== false) {
      this.app.use(helmet());
    }

    // CORS
    if (config.cors) {
      this.app.use((req, res, next) => {
        const origin = Array.isArray(config.cors!.origin)
          ? config.cors!.origin.join(', ')
          : config.cors!.origin;

        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', config.cors!.methods?.join(', ') || 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Credentials', config.cors!.credentials ? 'true' : 'false');

        if (req.method === 'OPTIONS') {
          res.sendStatus(204);
        } else {
          next();
        }
      });
    }
  }

  registerRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    handler: RequestHandler
  ): void {
    const expressHandler = this.adaptHandler(handler);
    this.app[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'](path, expressHandler);
  }

  use(middleware: RequestHandler): void {
    this.app.use(this.adaptHandler(middleware));
  }

  useErrorHandler(handler: ErrorHandler): void {
    this.app.use((err: Error, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      const adaptedReq = this.adaptRequest(req);
      const adaptedRes = this.adaptResponse(res);
      handler(err, adaptedReq, adaptedRes, next);
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, this.config.host || '0.0.0.0', () => {
        console.log(`Express server running on ${this.config.host || '0.0.0.0'}:${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Express server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getInstance(): Express {
    return this.app;
  }

  /**
   * Adapt Express request to framework-agnostic request
   */
  private adaptRequest(req: ExpressRequest): Request {
    return {
      body: req.body,
      query: req.query as Record<string, string>,
      params: req.params,
      headers: req.headers as Record<string, string>,
      method: req.method,
      url: req.url,
      ip: req.ip,
      user: (req as any).user,
    };
  }

  /**
   * Adapt Express response to framework-agnostic response
   */
  private adaptResponse(res: ExpressResponse): Response {
    return {
      status: (code: number) => {
        res.status(code);
        return this.adaptResponse(res);
      },
      json: (data: any) => res.json(data),
      send: (data: string) => res.send(data),
      setHeader: (name: string, value: string) => res.setHeader(name, value),
    };
  }

  /**
   * Adapt framework-agnostic handler to Express handler
   */
  private adaptHandler(handler: RequestHandler) {
    return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      const adaptedReq = this.adaptRequest(req);
      const adaptedRes = this.adaptResponse(res);
      await handler(adaptedReq, adaptedRes, next);
    };
  }
}
