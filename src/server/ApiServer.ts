// src/server/ApiServer.ts
import express from 'express';
import type { Express as ExpressCore, RequestHandler, Application } from 'express-serve-static-core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import apiRoutes from './routes';
import { requestLogger, detailedLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from '../shared/errors/ApiError';
import { path } from './helpers/path';
import { env } from './config/environment';
import { ServerEnvironment } from './services/ServerEnvironment';

const expressApp = express as unknown as {
  (): ExpressCore;
  json: (options?: any) => RequestHandler;
  urlencoded: (options?: any) => RequestHandler;
  static: (path: string) => RequestHandler;
};

const jsonParser = expressApp.json({ limit: '10mb' });
const urlencodedParser = expressApp.urlencoded({ extended: true, limit: '10mb' });

export function ApiServer(_environment: ServerEnvironment, app: ExpressCore) {
  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  
  // Request parsing middleware
  app.use(jsonParser);
  app.use(urlencodedParser);
  app.use(cookieParser());
  
  // Compression for better performance
  app.use(compression());
  
  // Logging middleware
  app.use(requestLogger);
  if (env.NODE_ENV === 'development') {
    app.use(detailedLogger);
  }
  
  // Serve static assets
  app.use(expressApp.static(path('build')));
  app.use('/uploads', expressApp.static(path('uploads')));
  
  // API routes
  app.use('/api', apiRoutes);
  
  // Fallback to HTML for client-side routing
  app.use('*', (req, res, next) => {
    // Skip API routes (they should have been handled by now)
    if (req.originalUrl.startsWith('/api')) {
      return next(new NotFoundError('API endpoint not found'));
    }
    
    // Serve the SPA index.html
    res.sendFile(path('build/index.html'));
  });
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
}