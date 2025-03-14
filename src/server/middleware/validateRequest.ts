import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../../shared/errors/ApiError';

// Create a custom ValidationError class since it's not exported from ApiError
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors?: Record<string, string[]>) {
    super(400, message, errors);
  }
}

/**
 * Middleware to validate request body against a Zod schema
 * @param schema Zod schema to validate against
 */
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a more user-friendly format
        const errors = error.errors.reduce((acc: Record<string, string[]>, curr) => {
          const path = curr.path.join('.');
          if (!acc[path]) {
            acc[path] = [];
          }
          acc[path].push(curr.message);
          return acc;
        }, {});
        
        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}; 