import express, { Response, NextFunction } from 'express';
import { Validator } from '../../shared/dataTypes';
import { ValidationFailedError } from './error';
import { z } from 'zod';

type ZodValidator<T> = z.ZodType<T>;

function adaptZodValidator<T>(validator: ZodValidator<T>): Validator<T> {
  return {
    validate: (value: unknown) => {
      try {
        return validator.parse(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          );
          throw new Error(errorMessages.join(', '));
        }
        throw error;
      }
    }
  };
}

/**
 * Middleware to validate request data against a validator schema
 * @param schema Validator schema (can be either Zod schema or custom validator)
 * @param source Where to find the data to validate (body, query, params)
 */
export const customValidate = <T>(
  schema: ZodValidator<T> | Validator<T>,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  const validator = schema instanceof z.ZodType ? adaptZodValidator(schema) : schema;
  
  return async (req: express.Request, _res: Response, next: NextFunction) => {
    try {
      const typedReq = req as any;
      let validatedData: T;
      
      switch (source) {
        case 'body':
          validatedData = validator.validate(typedReq.body);
          typedReq.body = validatedData;
          break;
        case 'query':
          validatedData = validator.validate(typedReq.query);
          typedReq.query = validatedData as any;
          break;
        case 'params':
          validatedData = validator.validate(typedReq.params);
          typedReq.params = validatedData as any;
          break;
        default:
          validatedData = validator.validate({
            body: typedReq.body,
            query: typedReq.query,
            params: typedReq.params
          });
          typedReq.body = (validatedData as any).body ?? {};
          typedReq.query = (validatedData as any).query ?? {};
          typedReq.params = (validatedData as any).params ?? {};
      }
      
      next();
    } catch (error) {
      // Format the error message
      const errorMessage = (error as Error).message;
      const formattedErrors: Record<string, string[]> = {};
      
      // Parse Zod error messages which are already in field: message format
      const errorParts = errorMessage.split(', ');
      errorParts.forEach(part => {
        const [field, message] = part.split(': ');
        if (field && message) {
          if (!formattedErrors[field]) {
            formattedErrors[field] = [];
          }
          formattedErrors[field].push(message);
        } else {
          if (!formattedErrors['_error']) {
            formattedErrors['_error'] = [];
          }
          formattedErrors['_error'].push(part);
        }
      });
      
      next(new ValidationFailedError('Validation failed', formattedErrors));
    }
  };
};