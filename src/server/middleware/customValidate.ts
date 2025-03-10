import { Request, Response, NextFunction } from 'express';
import { Validator } from '../../shared/dataTypes';
import { ValidationFailedError } from './error';

/**
 * Middleware to validate request data against a custom validator schema
 * @param schema Custom validator schema
 * @param source Where to find the data to validate (body, query, params)
 */
export const customValidate = <T>(
  schema: Validator<T>,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let dataToValidate: any;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
          dataToValidate = {
            body: req.body,
            query: req.query,
            params: req.params
          };
          break;
      }
      
      // Validate the data using our custom validator
      const validatedData = schema.validate(dataToValidate);
      
      // Replace the request data with the validated data
      if (source === 'body') req.body = validatedData;
      else if (source === 'query') req.query = validatedData;
      else if (source === 'params') req.params = validatedData;
      else if (source === 'all') {
        req.body = validatedData.body;
        req.query = validatedData.query;
        req.params = validatedData.params;
      }
      
      next();
    } catch (error) {
      // Format the error message
      const errorMessage = (error as Error).message;
      const formattedErrors: Record<string, string[]> = {};
      
      // Extract field name from error message if possible
      const match = errorMessage.match(/Invalid property ([^:]+):/);
      if (match && match[1]) {
        const field = match[1];
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