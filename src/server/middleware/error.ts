import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction, ErrorRequestHandler } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { DatabaseError } from 'pg';

import { Logger } from '../services/LoggerService';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
}

const logger = new Logger('ErrorHandler');

type Request = ExpressRequest;
type Response = ExpressResponse;
type NextFunction = ExpressNextFunction;

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
  }
}

export class ValidationFailedError extends AppError {
  errors: Record<string, string[]>;
  
  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 400);
    this.errors = errors;
  }
}

export interface ValidationErrorItem {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  errors: ValidationErrorItem[];
  
  constructor(message: string, errors: ValidationErrorItem[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Export the error handler with the correct Express ErrorRequestHandler type
export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError | DatabaseError | ValidationError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors
  logger.error(`${req.method} ${req.path} - ${err.message}`, err);

  // Handle AppError (our custom error)
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: err.status,
      message: err.message
    };
    
    // Add validation errors if available
    if (err instanceof ValidationFailedError && Object.keys(err.errors).length > 0) {
      response.errors = err.errors;
    }
    
    res.status(err.statusCode).json(response);
    return next();
  }
  
  // Handle our custom validation errors
  if (err instanceof ValidationError) {
    const formattedErrors: Record<string, string[]> = {};
    
    err.errors.forEach((error) => {
      const path = error.path;
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(error.message);
    });
    
    res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors
    });
    return next();
  }
  
  // Handle JWT errors
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    res.status(401).json({
      status: 'fail',
      message: err instanceof TokenExpiredError ? 'Token expired' : 'Invalid token'
    });
    return next();
  }
  
  // Handle PostgreSQL database errors
  if (err instanceof DatabaseError) {
    logger.error('Database error:', {
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint
    });

    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Database error occurred' 
        : err.message
    });
    return next();
  }

  // Handle all other errors
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message || 'Unknown error'
  });
  return next();
};