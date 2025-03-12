import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Validator } from '../../shared/dataTypes';
import { ValidationFailedError } from './error';
import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';

type IoTsValidator<T> = t.Type<T>;

function adaptIoTsValidator<T>(validator: IoTsValidator<T>): Validator<T> {
  return {
    validate: (value: unknown) => {
      const result = validator.decode(value);
      return pipe(
        result,
        fold(
          (errors) => {
            const errorMessages = errors.map(error => 
              error.message || `Invalid value at ${error.context.map(c => c.key).join('.')}`
            );
            throw new Error(errorMessages.join(', '));
          },
          (result) => result
        )
      );
    }
  };
}

/**
 * Middleware to validate request data against a validator schema
 * @param schema Validator schema (can be either io-ts type or custom validator)
 * @param source Where to find the data to validate (body, query, params)
 */
export const customValidate = <T>(
  schema: IoTsValidator<T> | Validator<T>,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  const validator = 'decode' in schema ? adaptIoTsValidator(schema) : schema;
  
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let validatedData: T;
      
      switch (source) {
        case 'body':
          validatedData = validator.validate(req.body);
          req.body = validatedData;
          break;
        case 'query':
          validatedData = validator.validate(req.query);
          req.query = validatedData as unknown as ParsedQs;
          break;
        case 'params':
          validatedData = validator.validate(req.params);
          req.params = validatedData as unknown as ParamsDictionary;
          break;
        default:
          validatedData = validator.validate({
            body: req.body,
            query: req.query,
            params: req.params
          });
          req.body = (validatedData as any).body ?? {};
          req.query = (validatedData as any).query ?? {};
          req.params = (validatedData as any).params ?? {};
      }
      
      next();
    } catch (error) {
      // Format the error message
      const errorMessage = (error as Error).message;
      const formattedErrors: Record<string, string[]> = {};
      
      // Extract field name from error message if possible
      const match = errorMessage.match(/Invalid value at ([^,]+)/);
      if (match && match[1]) {
        const field = match[1].trim();
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(errorMessage);
      } else {
        // If we can't extract a field name, use a generic key
        if (!formattedErrors['_error']) {
          formattedErrors['_error'] = [];
        }
        formattedErrors['_error'].push(errorMessage);
      }
      
      next(new ValidationFailedError('Validation failed', formattedErrors));
    }
  };
}; 