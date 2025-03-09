import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Logger } from '../services/LoggerService';
import { DatabaseError } from 'pg';

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

export const errorHandler = (
  err: Error | AppError | ZodError | DatabaseError | ValidationError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors
  logger.error(`${req.method} ${req.path} - ${err.message}`, err);

  // Handle AppError (our custom error)
  if (err instanceof AppError) {
    const response: any = {
      status: err.status,
      message: err.message
    };
    
    // Add validation errors if available
    if (err instanceof ValidationFailedError && Object.keys(err.errors).length > 0) {
      response.errors = err.errors;
    }
    
    return res.status(err.statusCode).json(response);
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(error.message);
    });
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors
    });
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
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  // Handle JWT errors
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return res.status(401).json({
      status: 'fail',
      message: err instanceof TokenExpiredError ? 'Token expired' : 'Invalid token'
    });
  }
  
  // Handle PostgreSQL database errors
  if (err instanceof DatabaseError) {
    logger.error('Database error:', {
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint
    });

    return res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Database error occurred' 
        : err.message
    });
  }

  // Handle all other errors
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message || 'Unknown error'
  });
}; 