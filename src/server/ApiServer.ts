// src/server/ApiServer.ts
import type { Options, OptionsUrlencoded } from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, RequestHandler } from 'express';
import helmet from 'helmet';

import { NotFoundError } from '../shared/errors/ApiError';

import { env } from './config/environment';
import { path } from './helpers/path';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, detailedLogger } from './middleware/logger';
import apiRoutes from './routes';
import { ServerEnvironment } from './services/ServerEnvironment';

const expressApp = express as unknown as {
  (): Express;
  json: (options?: Options) => RequestHandler;
  urlencoded: (options?: OptionsUrlencoded) => RequestHandler;
  static: (path: string) => RequestHandler;
};

const jsonParser = expressApp.json({ limit: '10mb' });
const urlencodedParser = expressApp.urlencoded({ extended: true, limit: '10mb' });

export function ApiServer(_environment: ServerEnvironment, app: Express) {
  // Security middlewares - disable in development for easier debugging
  if (env.NODE_ENV === 'production') {
    app.use(helmet as unknown as () => RequestHandler);
  }
  
  // Add CORS middleware specifically for API routes
  app.use(cors({
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }) as RequestHandler);
  
  // Request parsing middleware
  app.use(jsonParser);
  app.use(urlencodedParser);
  app.use(cookieParser() as RequestHandler);
  
  // Compression for better performance
  app.use(compression());
  
  // Logging middleware
  app.use(requestLogger);
  if (env.NODE_ENV === 'development') {
    app.use(detailedLogger);
  }
  
  // Serve static assets
  if (env.NODE_ENV === 'production') {
    app.use(expressApp.static(path('build')));
    app.use('/uploads', expressApp.static(path('uploads')));
  }
  
  // API routes
  app.use('/api', apiRoutes as RequestHandler);
  
  // Fallback to HTML for client-side routing in production only
  if (env.NODE_ENV === 'production') {
    const handler: RequestHandler = (req, res, next) => {
      // Skip API routes (they should have been handled by now)
      const url = req.originalUrl as string;
      if (url.startsWith('/api')) {
        return next(new NotFoundError('API endpoint not found'));
      }
      
      // Serve the SPA index.html
      (res.sendFile as (path: string) => void)(path('build/index.html'));
    };
    app.use('*', handler);
  } else {
    // In development, only handle API 404s
    const handler: RequestHandler = (_req, _res, next) => {
      next(new NotFoundError('API endpoint not found'));
    };
    app.use('/api/*', handler);
  }
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
}