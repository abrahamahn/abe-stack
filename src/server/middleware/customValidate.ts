import express, { Response, NextFunction } from 'express';
import { z } from 'zod';

import { Validator } from '../../shared/dataTypes';

import { ValidationFailedError } from './error';

type ZodValidator<T> = z.ZodType<T>;

interface ValidatedData<T> {
  body: T;
  query: Record<string, string>;
  params: Record<string, string>;
}

interface ValidatedRequest<T> extends express.Request {
  body: T;
  query: Record<string, string>;
  params: Record<string, string>;
}

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
  
  return (req: express.Request, _res: Response, next: NextFunction) => {
    try {
      const typedReq = req as ValidatedRequest<T>;
      let validatedData: T;
      let validatedStructure: ValidatedData<T>;
      
      switch (source) {
        case 'body':
          validatedData = validator.validate(typedReq.body);
          typedReq.body = validatedData;
          break;
        case 'query':
          validatedData = validator.validate(typedReq.query);
          typedReq.query = validatedData as Record<string, string>;
          break;
        case 'params':
          validatedData = validator.validate(typedReq.params);
          typedReq.params = validatedData as Record<string, string>;
          break;
        default:
          validatedStructure = validator.validate({
            body: typedReq.body,
            query: typedReq.query,
            params: typedReq.params
          }) as ValidatedData<T>;
          typedReq.body = validatedStructure.body;
          typedReq.query = validatedStructure.query;
          typedReq.params = validatedStructure.params;
          validatedData = validatedStructure.body;
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